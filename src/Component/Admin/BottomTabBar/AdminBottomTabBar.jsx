import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import FeatherIcon from 'react-native-vector-icons/Feather';
import { styles } from './AdminBottomTabBarStyles';

const AdminBottomTabBar = ({ activeTab, setActiveTab }) => {
  const tabs = [
    { id: 'Dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'SlotMgmt', label: 'Slots', icon: 'layers' },
    { id: 'StaffMgmt', label: 'Staff', icon: 'users' },
    { id: 'Profile', label: 'Profile', icon: 'user' },
  ];

  return (
    <View style={styles.tabBarContainer}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <TouchableOpacity
            key={tab.id}
            style={isActive ? styles.activeTabItem : styles.tabItem}
            activeOpacity={0.8}
            onPress={() => setActiveTab(tab.id)}
          >
            <FeatherIcon
              name={tab.icon}
              size={20}
              color={isActive ? '#16A34A' : '#6B7280'}
            />
            {isActive ? (
              <Text style={styles.activeTabLabel}>{tab.label}</Text>
            ) : (
              <Text style={styles.tabLabel}>{tab.label}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export default AdminBottomTabBar;
