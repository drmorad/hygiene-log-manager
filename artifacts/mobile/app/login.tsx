import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/context/AuthContext';

export default function LoginScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError('Please enter your username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (e: any) {
      setError(e.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">

        {/* Logo / Brand */}
        <View style={styles.brand}>
          <View style={styles.logoWrap}>
            <Feather name="shield" size={40} color="#fff" />
          </View>
          <Text style={styles.brandTitle}>Food Safety Manager</Text>
          <Text style={styles.brandSub}>HACCP · ISO 22000 Compliant</Text>
          <View style={styles.hotelGroup}>
            <Text style={styles.hotelName}>Rewaya Majestic</Text>
            <Text style={styles.hotelDot}>·</Text>
            <Text style={styles.hotelName}>Rewaya Inn</Text>
            <Text style={styles.hotelDot}>·</Text>
            <Text style={styles.hotelName}>Rewaya Luxury</Text>
          </View>
        </View>

        {/* Card */}
        <View style={[styles.card, { backgroundColor: colors.background }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Sign In</Text>
          <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
            Use your staff credentials to access the system
          </Text>

          {/* Error */}
          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: '#FEF3F2', borderColor: '#FCA5A5' }]}>
              <Feather name="alert-circle" size={14} color="#DC2626" />
              <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
            </View>
          )}

          {/* Username */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>USERNAME</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="user" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="default"
              returnKeyType="next"
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { color: colors.mutedForeground }]}>PASSWORD</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry={!showPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPassword(p => !p)} style={styles.eyeBtn}>
              <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {/* Login button */}
          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary }, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="log-in" size={18} color="#fff" />
                <Text style={styles.loginBtnText}>Sign In</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Quality & Hygiene Department{'\n'}Contact your administrator for access
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  brandTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 24, textAlign: 'center' },
  brandSub: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 },
  hotelGroup: { flexDirection: 'row', gap: 6, marginTop: 12, flexWrap: 'wrap', justifyContent: 'center' },
  hotelName: { color: 'rgba(255,255,255,0.9)', fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  hotelDot: { color: 'rgba(255,255,255,0.4)', fontFamily: 'Inter_400Regular', fontSize: 11 },
  card: { borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 8 },
  cardTitle: { fontFamily: 'Inter_700Bold', fontSize: 22, marginBottom: 4 },
  cardSub: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 20 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 16 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, paddingVertical: 13 },
  eyeBtn: { padding: 4 },
  loginBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 14, paddingVertical: 16, marginTop: 24,
  },
  loginBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  footer: { textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 24, lineHeight: 18 },
});
