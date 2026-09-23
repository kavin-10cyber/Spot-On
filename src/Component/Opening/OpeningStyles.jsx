import { StyleSheet, Platform, Dimensions, StatusBar } from 'react-native';

const { width } = Dimensions.get('window');

export const openingStyles = StyleSheet.create({
  /* ── Root ── */
  container: {
    flex: 1,
    backgroundColor: '#F8FAFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
  },

  /* ── Header ── */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#3B5BDB',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#3B5BDB', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 },
      android: { elevation: 5 },
    }),
  },
  logoP: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  logoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  proBadge: {
    backgroundColor: '#111827',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  proBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  logoTagline: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.5,
    marginTop: 1,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  langText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },

  /* ── Hero Card ── */
  heroCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 16 },
      android: { elevation: 5 },
    }),
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F9FAFB',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
  },
  accuracyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EEF2FF',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  accuracyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3B5BDB',
  },
  illustration: {
    width: '100%',
    height: 170,
    marginBottom: 12,
  },
  slotFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  slotIconWrap: {},
  slotLogoIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  slotLogoP: {
    fontSize: 16,
    fontWeight: '900',
    color: '#3B5BDB',
  },
  slotInfo: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  slotValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  openButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#22C55E',
  },
  openButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#16A34A',
    letterSpacing: 0.5,
  },

  /* ── Content Section ── */
  contentSection: {
    paddingHorizontal: 20,
    marginBottom: 22,
    alignItems: 'center',
  },
  mainTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 33,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  mainSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
    fontWeight: '500',
    paddingHorizontal: 8,
    marginBottom: 18,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#D1D5DB',
  },
  dotActive: {
    width: 28,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B5BDB',
  },

  /* ── Actions ── */
  actionsSection: {
    paddingHorizontal: 20,
    gap: 10,
    marginBottom: 20,
  },
  getStartedButton: {
    backgroundColor: '#3B5BDB',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#3B5BDB', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 12 },
      android: { elevation: 6 },
    }),
  },
  getStartedText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  signInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    gap: 4,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },

  /* ── Trust Section ── */
  trustSection: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8,
  },
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  trustHeadline: {
    fontSize: 11,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.5,
  },
  trustFeaturesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  trustFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  trustFeatureText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
  },
  trustDivider: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
});

// Legacy export for backward compat (in case some file imports `styles`)
export const styles = openingStyles;
