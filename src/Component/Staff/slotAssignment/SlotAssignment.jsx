import React, { useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Navbar from '../Components/navbar';
import { styles } from './SlotAssignmentStyles';

const SlotAssignment = ({ pendingBooking, onBack, onFinalizeAssignment, onNavigateToScanner, onNavigateToScreen }) => {
  // Mock layout slots with coordinate rows
  // status: 'available', 'occupied', 'maintenance'
  const [slots, setSlots] = useState([
    // Top Row (T-01 to T-10)
    ...Array.from({ length: 10 }, (_, i) => ({
      id: `T-${(i + 1).toString().padStart(2, '0')}`,
      type: 'Standard',
      status: i === 2 || i === 7 ? 'maintenance' : 'available',
      zone: 'Central Plaza P1',
    })),
    // Left Lane (L-01 to L-08)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `L-${(i + 1).toString().padStart(2, '0')}`,
      type: 'Standard',
      status: i === 0 ? 'available' : 'occupied', // L-01 available, others occupied with cars
      zone: 'Central Plaza P1',
    })),
    // Aisle A (A-01 to A-16) - Double side
    ...Array.from({ length: 16 }, (_, i) => ({
      id: `A-${(i + 1).toString().padStart(2, '0')}`,
      type: i % 4 === 0 ? 'Electric' : 'Standard',
      status: i < 8 ? 'occupied' : (i === 11 ? 'maintenance' : 'available'),
      zone: 'Central Plaza P1',
    })),
    // Aisle B (B-01 to B-16) - Double side
    ...Array.from({ length: 16 }, (_, i) => ({
      id: `B-${(i + 1).toString().padStart(2, '0')}`,
      type: 'Standard',
      status: i % 3 === 0 ? 'occupied' : 'available',
      zone: 'Central Plaza P1',
    })),
    // Right Lane (R-01 to R-08)
    ...Array.from({ length: 8 }, (_, i) => ({
      id: `R-${(i + 1).toString().padStart(2, '0')}`,
      type: 'Standard',
      status: i % 2 === 0 ? 'occupied' : 'available',
      zone: 'Central Plaza P1',
    })),
  ]);

  const [selectedSlotId, setSelectedSlotId] = useState(null);

  const selectedSlot = slots.find(s => s.id === selectedSlotId);

  const handleSlotPress = (slot) => {
    if (slot.status === 'occupied') {
      Alert.alert('Slot Occupied', `Slot ${slot.id} currently has a vehicle parked in it.`);
      return;
    }
    if (slot.status === 'maintenance') {
      Alert.alert('Under Maintenance', `Slot ${slot.id} is offline for maintenance work.`);
      return;
    }
    setSelectedSlotId(slot.id === selectedSlotId ? null : slot.id);
  };

  const handleAssignConfirm = () => {
    if (!selectedSlotId) {
      Alert.alert('No Slot Selected', 'Please select an available parking slot from the grid map.');
      return;
    }

    if (onFinalizeAssignment) {
      onFinalizeAssignment({
        ...pendingBooking,
        slotNum: selectedSlotId,
        slotClass: selectedSlot.type,
      });
    }
  };

  // Helper filters to split layout sectors
  const topSlots = slots.filter(s => s.id.startsWith('T-'));
  const leftSlots = slots.filter(s => s.id.startsWith('L-'));
  const rightSlots = slots.filter(s => s.id.startsWith('R-'));
  
  // Aisle A splits (A-01 to A-08 is left row, A-09 to A-16 is right row)
  const aisleALeft = slots.filter(s => s.id.startsWith('A-')).slice(0, 8);
  const aisleARight = slots.filter(s => s.id.startsWith('A-')).slice(8, 16);
  
  // Aisle B splits
  const aisleBLeft = slots.filter(s => s.id.startsWith('B-')).slice(0, 8);
  const aisleBRight = slots.filter(s => s.id.startsWith('B-')).slice(8, 16);

  const renderSlotCell = (slot) => {
    const isSelected = selectedSlotId === slot.id;
    let cellStyle = styles.cellAvailable;
    let labelColor = '#475569';

    if (slot.status === 'occupied') {
      cellStyle = styles.cellOccupied;
    } else if (slot.status === 'maintenance') {
      cellStyle = styles.cellMaintenance;
      labelColor = '#94A3B8';
    }

    if (isSelected) {
      cellStyle = styles.cellSelected;
      labelColor = '#FFFFFF';
    }

    return (
      <TouchableOpacity
        key={slot.id}
        style={[styles.slotCell, cellStyle]}
        onPress={() => handleSlotPress(slot)}
        activeOpacity={0.8}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        {slot.status === 'occupied' ? (
          <MaterialCommunityIcons name="car" size={18} color="#EF4444" />
        ) : slot.status === 'maintenance' ? (
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#94A3B8" />
        ) : (
          <Text style={[styles.slotCellText, { color: labelColor }]}>{slot.id}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent={false} backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.menuButton} activeOpacity={0.75}>
            <Feather name="arrow-left" size={24} color="#0052cc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Slot Assignment</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>SP</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Global Occupancy summary card */}
        <View style={styles.occupancyCard}>
          <Text style={styles.occupancySubtitle}>GLOBAL OCCUPANCY</Text>
          <Text style={styles.occupancyTitle}>42 Slots Available</Text>
          <View style={styles.chipsRow}>
            <View style={styles.chip}><Text style={styles.chipText}>Zone P1</Text></View>
            <View style={styles.chip}><Text style={styles.chipText}>Central Plaza</Text></View>
          </View>
        </View>

        {/* Legend status indicators */}
        <Text style={styles.legendTitle}>Status Legend</Text>
        <View style={styles.legendContainer}>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
              <Text style={styles.legendLabel}>Available</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#0052cc' }]} />
              <Text style={styles.legendLabel}>Selected</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
              <Text style={styles.legendLabel}>Occupied</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: '#94A3B8' }]} />
              <Text style={styles.legendLabel}>Maintenance</Text>
            </View>
          </View>
        </View>

        {/* Central Plaza P1 Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Central Plaza P1</Text>
          <TouchableOpacity style={styles.filterBtn} activeOpacity={0.7}>
            <Feather name="sliders" size={14} color="#0052cc" style={{ marginRight: 6 }} />
            <Text style={styles.filterBtnText}>Filter</Text>
          </TouchableOpacity>
        </View>

        {/* Parking Grid Map Container */}
        <View style={styles.gridMapContainer}>
          
          {/* Top Row of horizontal slots */}
          <View style={styles.topSlotsRow}>
            {topSlots.map(renderSlotCell)}
          </View>

          {/* Core grid body containing Left, aisles, Right rows */}
          <View style={styles.gridBodyRow}>
            
            {/* Left Lane vertical slots */}
            <View style={styles.verticalLane}>
              {leftSlots.map(renderSlotCell)}
            </View>

            {/* Middle aisles separator space */}
            <View style={styles.aislesContainer}>
              
              {/* Aisle A Column double-sided */}
              <View style={styles.aisleColumn}>
                <View style={styles.aisleSubCol}>
                  {aisleALeft.map(renderSlotCell)}
                </View>
                <View style={styles.dividerDots}>
                  <Text style={styles.dotsText}>...</Text>
                </View>
                <View style={styles.aisleSubCol}>
                  {aisleARight.map(renderSlotCell)}
                </View>
              </View>

              {/* Aisle B Column double-sided */}
              <View style={styles.aisleColumn}>
                <View style={styles.aisleSubCol}>
                  {aisleBLeft.map(renderSlotCell)}
                </View>
                <View style={styles.dividerDots}>
                  <Text style={styles.dotsText}>...</Text>
                </View>
                <View style={styles.aisleSubCol}>
                  {aisleBRight.map(renderSlotCell)}
                </View>
              </View>

            </View>

            {/* Right Lane vertical slots */}
            <View style={styles.verticalLane}>
              {rightSlots.map(renderSlotCell)}
            </View>

          </View>

          {/* Bottom car decals / indicators */}
          <View style={styles.bottomDecalsRow}>
            <MaterialCommunityIcons name="arrow-left-right" size={24} color="#94A3B8" />
            <MaterialCommunityIcons name="arrow-left-right" size={24} color="#94A3B8" />
          </View>

        </View>

        {/* Selected Slot Information Panel */}
        <View style={styles.detailsPanel}>
          {selectedSlot ? (
            <View style={styles.detailsContent}>
              <View style={styles.detailsHeaderRow}>
                <View>
                  <Text style={styles.detailsSlotId}>Slot {selectedSlot.id}</Text>
                  <Text style={styles.detailsMetadata}>Zone: {selectedSlot.zone}</Text>
                  <Text style={styles.detailsMetadata}>Type: {selectedSlot.type} Space</Text>
                </View>
                <View style={styles.badgeAvailable}>
                  <Text style={styles.badgeTextAvailable}>Available</Text>
                </View>
              </View>

              <TouchableOpacity 
                style={styles.confirmBtn}
                onPress={handleAssignConfirm}
                activeOpacity={0.85}
              >
                <MaterialCommunityIcons name="credit-card-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.confirmBtnText}>Proceed to Payment</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.detailsPlaceholder}>
              <Feather name="info" size={20} color="#0052cc" style={{ marginBottom: 6 }} />
              <Text style={styles.placeholderText}>
                Select an available parking slot from the map above to assign.
              </Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Global navbar active assignments tab */}
      <Navbar 
        activeTab="Assignments"
        onTabPress={(tab) => {
          if (tab === 'Dashboard') {
            onBack();
          } else if (tab === 'Scanner') {
            onNavigateToScanner();
          } else if (onNavigateToScreen) {
            onNavigateToScreen(tab);
          }
        }}
      />
    </View>
  );
};

export default SlotAssignment;
