import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { styles } from './StaffManagementStyles';
import { supabase } from '../../../config/supabase';
import { realtimeService } from '../../../services/realtimeService';

const StaffManagement = () => {
  const [staffList, setStaffList] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading]     = useState(true);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // 'All', 'Active', 'On Break', 'Offline'

  // Modals & Form
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);

  const [formName, setFormName]             = useState('');
  const [formEmail, setFormEmail]           = useState('');
  const [formRole, setFormRole]             = useState('Gate Attendant');
  const [formShift, setFormShift]           = useState('MORNING'); // 'MORNING' | 'EVENING' | 'NIGHT'
  const [formPhone, setFormPhone]           = useState('');
  const [formStatus, setFormStatus]         = useState('Active');
  const [formLocationId, setFormLocationId] = useState(1);

  // ── 1. Load Live Staff Profiles & Location Assignments from DB ───────────
  const loadStaffFromDB = useCallback(async () => {
    try {
      // Fetch parking locations
      const { data: locs } = await supabase
        .from('parking_locations')
        .select('*')
        .order('location_id', { ascending: true });
      if (locs) setLocations(locs);

      // Fetch staff profiles with user details and assigned locations
      const { data: profiles, error } = await supabase
        .from('staff_profiles')
        .select(`
          *,
          users (
            user_id,
            full_name,
            email,
            phone
          ),
          staff_assignments (
            assignment_id,
            location_id,
            parking_locations (
              name,
              city
            )
          )
        `)
        .order('staff_id', { ascending: true });

      if (!error && profiles) {
        const mapped = profiles.map((s) => {
          const firstAssign = s.staff_assignments && s.staff_assignments.length > 0 ? s.staff_assignments[0] : null;
          const assignedLocName = firstAssign?.parking_locations?.name || 'BIT Main Campus';

          let shiftLabel = 'Morning Shift';
          if (s.shift === 'EVENING') shiftLabel = 'Evening Shift';
          else if (s.shift === 'NIGHT') shiftLabel = 'Night Shift';
          else if (s.shift === 'AFTERNOON') shiftLabel = 'Afternoon Shift';

          return {
            id:           String(s.staff_id),
            rawId:        s.staff_id,
            userId:       s.user_id,
            name:         s.users?.full_name || 'Staff Member',
            email:        s.users?.email || 'staff@spoton.in',
            role:         s.job_title || 'Gate Attendant',
            shift:        shiftLabel,
            rawShift:     s.shift || 'MORNING',
            phone:        s.users?.phone || '+91 98765 43210',
            status:       s.employment_status || 'Active',
            locationId:   firstAssign?.location_id || 1,
            assignedLoc:  assignedLocName,
            raw:          s,
          };
        });
        setStaffList(mapped);
      }
    } catch (e) {
      console.log('StaffManagement DB fetch error:', e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaffFromDB();

    // Subscribe to Realtime updates on staff_profiles & staff_assignments
    const channel1 = supabase
      .channel('public:staff_profiles')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_profiles' }, () => {
        loadStaffFromDB();
      })
      .subscribe();

    const channel2 = supabase
      .channel('public:staff_assignments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff_assignments' }, () => {
        loadStaffFromDB();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [loadStaffFromDB]);

  const handleAddNewStaff = () => {
    setEditingStaff(null);
    setFormName('');
    setFormEmail('');
    setFormRole('Gate Attendant');
    setFormShift('MORNING');
    setFormPhone('');
    setFormStatus('Active');
    setFormLocationId(locations.length > 0 ? locations[0].location_id : 1);
    setModalVisible(true);
  };

  const handleEditStaff = (staff) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormEmail(staff.email);
    setFormRole(staff.role);
    setFormShift(staff.rawShift || 'MORNING');
    setFormPhone(staff.phone);
    setFormStatus(staff.status);
    setFormLocationId(staff.locationId || 1);
    setModalVisible(true);
  };

  // Save Staff Details (Insert or Update across users, staff_profiles, staff_assignments)
  const handleSaveStaff = async () => {
    if (!formName.trim()) {
      Alert.alert('Validation Error', 'Please enter staff member name.');
      return;
    }

    try {
      if (editingStaff) {
        // Update user row
        await supabase
          .from('users')
          .update({
            full_name: formName.trim(),
            phone:     formPhone.trim() || '+1 555-0100',
          })
          .eq('user_id', editingStaff.userId);

        // Update staff_profiles row
        await supabase
          .from('staff_profiles')
          .update({
            job_title:         formRole,
            shift:             formShift,
            employment_status: formStatus,
          })
          .eq('staff_id', editingStaff.rawId);

        // Upsert staff_assignments row
        const { data: existingAssign } = await supabase
          .from('staff_assignments')
          .select('assignment_id')
          .eq('staff_id', editingStaff.rawId);

        if (existingAssign && existingAssign.length > 0) {
          await supabase
            .from('staff_assignments')
            .update({ location_id: formLocationId })
            .eq('assignment_id', existingAssign[0].assignment_id);
        } else {
          await supabase
            .from('staff_assignments')
            .insert([{ staff_id: editingStaff.rawId, location_id: formLocationId }]);
        }
      } else {
        // Step 1: Insert user
        const generatedEmail = formEmail.trim() || `${formName.toLowerCase().replace(/\s+/g, '')}@spoton.in`;
        const { data: newUser, error: errUser } = await supabase
          .from('users')
          .insert([
            {
              full_name: formName.trim(),
              email:     generatedEmail,
              phone:     formPhone.trim() || '+1 555-0100',
              role_id:   3, // STAFF
            },
          ])
          .select()
          .single();

        if (errUser) throw errUser;

        // Step 2: Insert staff_profiles row
        const { data: newProfile, error: errProfile } = await supabase
          .from('staff_profiles')
          .insert([
            {
              user_id:           newUser.user_id,
              job_title:         formRole,
              shift:             formShift,
              employment_status: formStatus,
            },
          ])
          .select()
          .single();

        if (errProfile) throw errProfile;

        // Step 3: Insert staff_assignments row
        await supabase
          .from('staff_assignments')
          .insert([
            {
              staff_id:    newProfile.staff_id,
              location_id: formLocationId || 1,
            },
          ]);
      }

      await loadStaffFromDB();
      setModalVisible(false);
    } catch (e) {
      console.error('Save staff error:', e);
      Alert.alert('Error', e.message || 'Could not save staff member details.');
    }
  };

  // Delete Staff Member (Cascades through foreign key)
  const handleDeleteStaff = (id, rawId) => {
    Alert.alert(
      'Remove Staff Member',
      'Are you sure you want to remove this staff member from the database?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive', 
          onPress: async () => {
            try {
              await supabase.from('staff_profiles').delete().eq('staff_id', rawId);
              await loadStaffFromDB();
            } catch (e) {
              console.error('Delete staff error:', e);
            }
          } 
        }
      ]
    );
  };

  // Quick toggle status in DB
  const handleToggleStatus = async (staff) => {
    const cycle = { 'Active': 'On Break', 'On Break': 'Offline', 'Offline': 'Active' };
    const nextStatus = cycle[staff.status] || 'Active';
    try {
      await supabase
        .from('staff_profiles')
        .update({ employment_status: nextStatus })
        .eq('staff_id', staff.rawId);

      await loadStaffFromDB();
    } catch (e) {
      console.log('Toggle staff status error:', e);
    }
  };

  const filteredStaff = staffList.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
                          s.role.toLowerCase().includes(search.toLowerCase()) ||
                          s.assignedLoc.toLowerCase().includes(search.toLowerCase()) ||
                          s.phone.includes(search);
    const matchesFilter = filter === 'All' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      <View style={styles.statusBarSpacer} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Staff Management</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={handleAddNewStaff}
          activeOpacity={0.8}
        >
          <FeatherIcon name="user-plus" size={16} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Staff</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={styles.filterSection}>
        <View style={styles.searchBar}>
          <FeatherIcon name="search" size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, role, facility, or phone..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <FeatherIcon name="x" size={16} color="#94A3B8" />
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.filterChips}>
          {['All', 'Active', 'On Break', 'Offline'].map(chip => (
            <TouchableOpacity
              key={chip}
              style={[styles.chip, filter === chip && styles.chipActive]}
              onPress={() => setFilter(chip)}
            >
              <Text style={[styles.chipText, filter === chip && styles.chipTextActive]}>{chip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Staff List */}
      {loading ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#0052cc" />
          <Text style={{ marginTop: 10, color: '#64748B', fontSize: 13 }}>Loading staff profiles from DB...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredStaff}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FeatherIcon name="users" size={32} color="#94A3B8" />
              <Text style={styles.emptyText}>No matching staff members found.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.staffCard}>
              <View style={styles.cardInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.staffName}>{item.name}</Text>
                  <View style={[
                    styles.statusIndicator,
                    {
                      backgroundColor: item.status === 'Active' ? '#DCFCE7' : item.status === 'On Break' ? '#FEF3C7' : '#F1F5F9',
                      borderColor: item.status === 'Active' ? '#A7F3D0' : item.status === 'On Break' ? '#FDE68A' : '#E2E8F0',
                      borderWidth: 1,
                    }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: item.status === 'Active' ? '#16A34A' : item.status === 'On Break' ? '#D97706' : '#64748B' }
                    ]}>{item.status}</Text>
                  </View>
                </View>

                <Text style={styles.roleText}>{item.role} • {item.shift}</Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                  <FeatherIcon name="map-pin" size={12} color="#0052cc" style={{ marginRight: 4 }} />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#0052cc' }}>{item.assignedLoc}</Text>
                </View>

                <View style={styles.metaRow}>
                  <FeatherIcon name="phone" size={12} color="#64748B" />
                  <Text style={styles.metaText}>{item.phone}</Text>
                </View>
              </View>

              {/* Horizontal Action Buttons Row */}
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.actionIconBtn} 
                  onPress={() => handleToggleStatus(item)}
                  activeOpacity={0.8}
                >
                  <FeatherIcon name="refresh-cw" size={16} color="#0052cc" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.actionIconBtn} 
                  onPress={() => handleEditStaff(item)}
                  activeOpacity={0.8}
                >
                  <FeatherIcon name="edit-2" size={16} color="#0052cc" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionIconBtn, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]} 
                  onPress={() => handleDeleteStaff(item.id, item.rawId)}
                  activeOpacity={0.8}
                >
                  <FeatherIcon name="trash-2" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Add / Edit Staff Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>{editingStaff ? 'Edit Staff Member' : 'Register Staff Member'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FeatherIcon name="x" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Full Name</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. Rajesh Kumar"
                  placeholderTextColor="#94A3B8"
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Assigned Parking Facility (staff_assignments)</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexDirection: 'row', marginVertical: 4 }}>
                  {locations.map((loc) => (
                    <TouchableOpacity
                      key={loc.location_id}
                      style={[
                        styles.optionPill,
                        formLocationId === loc.location_id && styles.optionPillActive,
                        { marginRight: 8 }
                      ]}
                      onPress={() => setFormLocationId(loc.location_id)}
                    >
                      <Text style={[styles.optionPillText, formLocationId === loc.location_id && styles.optionPillTextActive]}>
                        {loc.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Job Title / Role</Text>
                <View style={styles.optionPillRow}>
                  {['Gate Attendant', 'Lot Manager', 'Security Guard'].map(r => (
                    <TouchableOpacity
                      key={r}
                      style={[styles.optionPill, formRole === r && styles.optionPillActive]}
                      onPress={() => setFormRole(r)}
                    >
                      <Text style={[styles.optionPillText, formRole === r && styles.optionPillTextActive]}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Shift (shift_enum)</Text>
                <View style={styles.optionPillRow}>
                  {[
                    { key: 'MORNING',   label: 'Morning' },
                    { key: 'EVENING',   label: 'Evening' },
                    { key: 'NIGHT',     label: 'Night' },
                  ].map(sh => (
                    <TouchableOpacity
                      key={sh.key}
                      style={[styles.optionPill, formShift === sh.key && styles.optionPillActive]}
                      onPress={() => setFormShift(sh.key)}
                    >
                      <Text style={[styles.optionPillText, formShift === sh.key && styles.optionPillTextActive]}>{sh.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Contact Phone</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="e.g. +91 98765 43210"
                  placeholderTextColor="#94A3B8"
                  value={formPhone}
                  onChangeText={setFormPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Employment Status (staff_status_enum)</Text>
                <View style={styles.optionPillRow}>
                  {['Active', 'On Break', 'Offline'].map(st => (
                    <TouchableOpacity
                      key={st}
                      style={[styles.optionPill, formStatus === st && styles.optionPillActive]}
                      onPress={() => setFormStatus(st)}
                    >
                      <Text style={[styles.optionPillText, formStatus === st && styles.optionPillTextActive]}>{st}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveStaff}>
                <Text style={styles.saveBtnText}>Save Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default StaffManagement;
