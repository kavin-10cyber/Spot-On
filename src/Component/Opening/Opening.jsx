import React, { useState, useRef } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  Image,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { openingStyles as styles } from './OpeningStyles';

const { width } = Dimensions.get('window');

const Opening = ({ onNavigateToLogin }) => {
  const [activeDot, setActiveDot] = useState(0);

  const slides = [
    {
      badge1: 'Live Bay Radar',
      badge2: '98.4% Accuracy',
      slotLabel: 'Nearest Free Slot',
      slotValue: 'Bay A-14 • 40m',
      title: 'Find & Reserve Your\nSpot in Seconds',
      subtitle:
        'Intelligent real-time bay availability, contactless barrier entry, and seamless turn-by-turn indoor parking guidance.',
    },
    {
      badge1: 'Auto-Pay Ready',
      badge2: '₹0 Entry Fee',
      slotLabel: 'Today\'s Savings',
      slotValue: '₹120 saved',
      title: 'Cashless & Contactless\nParking Always',
      subtitle:
        'Pay automatically as you exit. Link your UPI or card once and never queue at a toll booth again.',
    },
    {
      badge1: 'Gate Scan',
      badge2: 'Instant Access',
      slotLabel: 'Your Next Slot',
      slotValue: 'Zone B • Level 2',
      title: 'One QR Code.\nSeamless Entry.',
      subtitle:
        'Scan once at the barrier with your SpotOn QR. The gate opens, your time starts — no tickets, no hassle.',
    },
  ];

  const currentSlide = slides[activeDot];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFF" />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <View style={styles.logoIcon}>
            <Text style={styles.logoP}>P</Text>
          </View>
          <View>
            <View style={styles.logoNameRow}>
              <Text style={styles.logoText}>SpotOn</Text>
              <View style={styles.proBadge}>
                <Text style={styles.proBadgeText}>PRO</Text>
              </View>
            </View>
            <Text style={styles.logoTagline}>PRECISION PARKING</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.langButton} activeOpacity={0.7}>
          <Icon name="globe" size={14} color="#374151" />
          <Text style={styles.langText}>EN</Text>
        </TouchableOpacity>
      </View>

      {/* ── Hero Card ── */}
      <View style={styles.heroCard}>
        {/* Badges Row */}
        <View style={styles.badgesRow}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>{currentSlide.badge1}</Text>
          </View>
          <View style={styles.accuracyBadge}>
            <Icon name="zap" size={11} color="#3B5BDB" />
            <Text style={styles.accuracyText}>{currentSlide.badge2}</Text>
          </View>
        </View>

        {/* Illustration */}
        <Image
          source={require('../../assets/illustration.jpg')}
          style={styles.illustration}
          resizeMode="contain"
        />

        {/* Nearest Slot Footer */}
        <View style={styles.slotFooter}>
          <View style={styles.slotIconWrap}>
            <View style={styles.slotLogoIcon}>
              <Text style={styles.slotLogoP}>P</Text>
            </View>
          </View>
          <View style={styles.slotInfo}>
            <Text style={styles.slotLabel}>{currentSlide.slotLabel}</Text>
            <Text style={styles.slotValue}>{currentSlide.slotValue}</Text>
          </View>
          <TouchableOpacity style={styles.openButton} activeOpacity={0.8}>
            <Text style={styles.openButtonText}>OPEN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Content ── */}
      <View style={styles.contentSection}>
        <Text style={styles.mainTitle}>{currentSlide.title}</Text>
        <Text style={styles.mainSubtitle}>{currentSlide.subtitle}</Text>

        {/* Pagination Dots */}
        <View style={styles.dotsRow}>
          {slides.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => setActiveDot(i)}
              style={[styles.dot, i === activeDot && styles.dotActive]}
            />
          ))}
        </View>
      </View>

      {/* ── Actions ── */}
      <View style={styles.actionsSection}>
        <TouchableOpacity
          style={styles.getStartedButton}
          onPress={onNavigateToLogin}
          activeOpacity={0.88}
        >
          <Text style={styles.getStartedText}>Get Started →</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signInButton}
          onPress={onNavigateToLogin}
          activeOpacity={0.7}
        >
          <Text style={styles.signInText}>Sign In </Text>
          <Icon name="log-in" size={15} color="#111827" />
        </TouchableOpacity>
      </View>

      {/* ── Trust Badges ── */}
      <View style={styles.trustSection}>
        <View style={styles.trustRow}>
          <Icon name="award" size={13} color="#3B5BDB" />
          <Text style={styles.trustHeadline}>TRUSTED BY 500,000+ URBAN DRIVERS</Text>
        </View>
        <View style={styles.trustFeaturesRow}>
          <View style={styles.trustFeature}>
            <Icon name="check-circle" size={12} color="#16A34A" />
            <Text style={styles.trustFeatureText}>Instant Gate Scan</Text>
          </View>
          <View style={styles.trustDivider} />
          <View style={styles.trustFeature}>
            <Icon name="credit-card" size={12} color="#3B5BDB" />
            <Text style={styles.trustFeatureText}>Cashless Auto-Pay</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Opening;
