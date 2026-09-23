import React, { useState } from 'react';
import {
  SafeAreaView,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { styles } from './LoginStyles';
import { authService } from '../../services/authService';

const Login = ({ onBack, onLoginSuccess }) => {
  const [selectedRole, setSelectedRole] = useState('client');
  const [email, setEmail] = useState('aarav.sharma@gmail.com');
  const [password, setPassword] = useState('user123');
  const [focusedInput, setFocusedInput] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    if (role === 'admin') {
      setEmail('admin@spoton.in');
      setPassword('admin123');
    } else if (role === 'staff') {
      setEmail('vikram@spoton.in');
      setPassword('staff123');
    } else {
      setEmail('aarav.sharma@gmail.com');
      setPassword('user123');
    }
  };

  const handleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
    console.log('Login attempt with role:', selectedRole, 'email:', email);
    try {
      const res = await authService.signIn({ email, password });
      if (res.success && res.user) {
        const userRole = res.user.role?.toLowerCase() || selectedRole;
        if (onLoginSuccess) {
          onLoginSuccess(res.user.email, userRole);
        }
        return;
      }
    } catch (e) {
      console.log('Supabase login fallback:', e.message);
    } finally {
      setIsLoggingIn(false);
    }
    if (onLoginSuccess) {
      onLoginSuccess(email, selectedRole);
    }
  };

  const getRoleLabel = () => {
    if (selectedRole === 'staff') return 'Facility Staff';
    if (selectedRole === 'admin') return 'Admin';
    return 'Driver';
  };

  const getAccessBadge = () => {
    if (selectedRole === 'admin') return 'Admin Access';
    if (selectedRole === 'staff') return 'Staff Access';
    return 'Client Access';
  };

  const getEmailPlaceholder = () => {
    if (selectedRole === 'staff') return 'staff@spoton.in';
    if (selectedRole === 'admin') return 'admin@spoton.in';
    return 'name@company.com';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#EEF2FF" />
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Top Navigation Bar ── */}
          <View style={styles.topNav}>
            {onBack ? (
              <TouchableOpacity onPress={onBack} style={styles.navBackButton} activeOpacity={0.7}>
                <Icon name="arrow-left" size={18} color="#374151" />
              </TouchableOpacity>
            ) : (
              <View style={styles.navBackButton} />
            )}

            {/* SpotOn Ecosystem Pill */}
            <View style={styles.ecosystemPill}>
              <View style={styles.greenDot} />
              <Text style={styles.ecosystemText}>SPOTON ECOSYSTEM</Text>
            </View>

            {/* Help Button */}
            <TouchableOpacity style={styles.helpButton} activeOpacity={0.7}>
              <Icon name="help-circle" size={20} color="#374151" />
            </TouchableOpacity>
          </View>

          {/* ── App Icon + Title ── */}
          <View style={styles.heroSection}>
            <View style={styles.appIconContainer}>
              <View style={styles.appIcon}>
                <Text style={styles.appIconText}>P</Text>
              </View>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.portalTitle}>Portal Access</Text>
              <Text style={styles.portalSubtitle}>Select your workspace access level</Text>
            </View>
          </View>

          {/* ── Role Selector ── */}
          <View style={styles.roleSectionContainer}>
            <View style={styles.roleLabelRow}>
              <Text style={styles.roleSectionLabel}>SELECT ROLE</Text>
              <View style={styles.accessBadge}>
                <Text style={styles.accessBadgeText}>{getAccessBadge()}</Text>
              </View>
            </View>

            <View style={styles.roleTabsContainer}>
              {/* Driver Tab */}
              <TouchableOpacity
                style={[styles.roleTab, selectedRole === 'client' && styles.roleTabActive]}
                onPress={() => handleRoleSelect('client')}
                activeOpacity={0.8}
              >
                <Icon
                  name="navigation"
                  size={18}
                  color={selectedRole === 'client' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.roleTabText, selectedRole === 'client' && styles.roleTabTextActive]}>
                  Driver
                </Text>
              </TouchableOpacity>

              {/* Facility Staff Tab */}
              <TouchableOpacity
                style={[styles.roleTab, selectedRole === 'staff' && styles.roleTabActive]}
                onPress={() => handleRoleSelect('staff')}
                activeOpacity={0.8}
              >
                <Icon
                  name="briefcase"
                  size={18}
                  color={selectedRole === 'staff' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.roleTabText, selectedRole === 'staff' && styles.roleTabTextActive]}>
                  Facility Staff
                </Text>
              </TouchableOpacity>

              {/* Admin Tab */}
              <TouchableOpacity
                style={[styles.roleTab, selectedRole === 'admin' && styles.roleTabActive]}
                onPress={() => handleRoleSelect('admin')}
                activeOpacity={0.8}
              >
                <Icon
                  name="shield"
                  size={18}
                  color={selectedRole === 'admin' ? '#FFFFFF' : '#6B7280'}
                />
                <Text style={[styles.roleTabText, selectedRole === 'admin' && styles.roleTabTextActive]}>
                  Admin
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Form ── */}
          <View style={styles.formContainer}>
            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {selectedRole === 'client' ? 'Work or Driver Email' : 'Work Email'}
              </Text>
              <View style={[styles.inputWrapper, focusedInput === 'email' && styles.inputWrapperFocused]}>
                <Icon name="mail" size={17} color={focusedInput === 'email' ? '#3B5BDB' : '#9CA3AF'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder={getEmailPlaceholder()}
                  placeholderTextColor="#9CA3AF"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Secure Password</Text>
                <TouchableOpacity>
                  <Text style={styles.forgotText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
              <View style={[styles.inputWrapper, focusedInput === 'password' && styles.inputWrapperFocused]}>
                <Icon name="lock" size={17} color={focusedInput === 'password' ? '#3B5BDB' : '#9CA3AF'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••••"
                  placeholderTextColor="#9CA3AF"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Icon name={showPassword ? 'eye' : 'eye-off'} size={17} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Remember + SSL */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.rememberLeft}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                  {rememberMe && <Icon name="check" size={11} color="#FFFFFF" />}
                </View>
                <Text style={styles.rememberText}>Remember this device</Text>
              </TouchableOpacity>
              <View style={styles.sslBadge}>
                <Icon name="lock" size={11} color="#16A34A" />
                <Text style={styles.sslText}>256-bit SSL</Text>
              </View>
            </View>

            {/* CTA Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.88}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.loginButtonText}>
                  Enter Portal as {getRoleLabel()} →
                </Text>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR CONTINUE WITH</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.7}>
                <Icon name="smartphone" size={16} color="#1C1C1E" />
                <Text style={styles.socialButtonText}>Apple ID</Text>
              </TouchableOpacity>
            </View>

            {/* Staff Account Info Box */}
            <View style={styles.infoBox}>
              <Icon name="grid" size={15} color="#3B5BDB" style={styles.infoBoxIcon} />
              <View style={{ flex: 1 }}>
                <Text style={styles.infoBoxText}>Need organization-level credentials?</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.infoBoxLink}>Request Staff Account →</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Login;
