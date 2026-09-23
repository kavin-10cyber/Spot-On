import React, { useState } from 'react';
import {
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { styles } from './CollectPaymentStyles';

const CollectPayment = ({ pendingBooking, onBack, onFinalizePayment }) => {
  const [selectedMethod, setSelectedMethod] = useState('UPI');

  const customerName = pendingBooking?.name || 'Aarav Sharma';
  const slotId = pendingBooking?.slotNum || 'A-12';
  const vehicleLpn = pendingBooking?.lpn || 'TN-38-AB-1234';
  const duration = pendingBooking?.time || '2 Hours';

  // Calculate amount based on duration hours
  const calculateAmount = () => {
    if (duration === '2 Hours') return '15.00';
    if (duration === '4 Hours') return '30.00';
    if (duration === 'Full Day') return '50.00';
    
    // Parse hours from custom duration string e.g. "5.5 Hours (Custom)"
    const numHours = parseFloat(duration);
    if (!isNaN(numHours)) {
      return (numHours * 5 + 10).toFixed(2);
    }
    return '15.00';
  };

  const amount = calculateAmount();

  const handleCollectPayment = () => {
    const randomId = `#PN-${Math.floor(10000 + Math.random() * 90000)}`;
    if (onFinalizePayment) {
      onFinalizePayment({
        ...pendingBooking,
        amount: `$${amount}`,
        paymentMethod: selectedMethod,
        bookingId: randomId,
      });
    }
  };

  const paymentMethods = [
    {
      id: 'UPI',
      title: 'UPI',
      desc: 'GPay, PhonePe, Paytm',
      icon: 'qrcode',
      iconColor: '#22C55E',
      bgColor: '#F0FDF4',
    },
    {
      id: 'Cash',
      title: 'Cash',
      desc: 'Physical Currency',
      icon: 'cash',
      iconColor: '#D97706',
      bgColor: '#FEF3C7',
    },
    {
      id: 'Card',
      title: 'Card',
      desc: 'Visa, Mastercard, RuPay',
      icon: 'credit-card-outline',
      iconColor: '#2563EB',
      bgColor: '#EFF6FF',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar translucent={false} backgroundColor="#FFFFFF" barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.75}>
            <Feather name="arrow-left" size={24} color="#0052cc" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Collect Payment</Text>
        </View>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120' }}
          style={styles.avatar}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Customer & Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <View>
              <Text style={styles.metaLabel}>CUSTOMER</Text>
              <Text style={styles.customerNameText}>{customerName}</Text>
            </View>
            <View style={styles.slotBadge}>
              <Text style={styles.slotBadgeText}>Slot {slotId}</Text>
            </View>
          </View>

          <View style={styles.gridDetailsRow}>
            <View style={styles.detailCol}>
              <Text style={styles.detailMetaLabel}>Vehicle</Text>
              <Text style={styles.detailValueText}>{vehicleLpn}</Text>
            </View>
            <View style={styles.detailCol}>
              <Text style={styles.detailMetaLabel}>Duration</Text>
              <Text style={styles.detailValueText}>{duration}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValueText}>${amount}</Text>
          </View>
        </View>

        {/* Select Payment Method Section */}
        <Text style={styles.sectionTitle}>SELECT PAYMENT METHOD</Text>
        
        {paymentMethods.map((method) => {
          const isSelected = selectedMethod === method.id;
          return (
            <TouchableOpacity
              key={method.id}
              style={[styles.methodCard, isSelected && styles.methodCardSelected]}
              onPress={() => setSelectedMethod(method.id)}
              activeOpacity={0.85}
            >
              <View style={styles.methodCardLeft}>
                <View style={[styles.methodIconBox, { backgroundColor: method.bgColor }]}>
                  <MaterialCommunityIcons name={method.icon} size={24} color={method.iconColor} />
                </View>
                <View style={styles.methodTextCol}>
                  <Text style={styles.methodTitleText}>{method.title}</Text>
                  <Text style={styles.methodDescText}>{method.desc}</Text>
                </View>
              </View>
              {isSelected && (
                <View style={styles.checkCircleActive}>
                  <Feather name="check" size={12} color="#FFFFFF" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Collect Payment Action Button */}
        <TouchableOpacity 
          style={styles.collectBtn}
          onPress={handleCollectPayment}
          activeOpacity={0.85}
        >
          <Text style={styles.collectBtnText}>Collect Payment</Text>
          <Feather name="chevron-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
};

export default CollectPayment;
