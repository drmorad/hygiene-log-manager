import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApi } from '@/hooks/useApi';

interface Props {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  force?: boolean;
  currentPasswordRequired?: boolean;
}

export default function PasswordChangeModal({
  visible,
  onClose,
  onSuccess,
  force = false,
  currentPasswordRequired = true,
}: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { patch } = useApi();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError('');
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError('');

    if (currentPasswordRequired && !currentPassword) {
      setError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (currentPasswordRequired && newPassword === currentPassword) {
      setError('New password must be different from the current one.');
      return;
    }

    setLoading(true);
    try {
      await patch('/users/me/password', {
        currentPassword: currentPasswordRequired ? currentPassword : undefined,
        newPassword,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      reset();
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Failed to change password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={force ? 'fullScreen' : 'formSheet'}
      onRequestClose={handleClose}
    >
      <ScrollView
        style={[styles.root, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 30 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.header, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              {force ? 'Security Setup Required' : 'Change Password'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              {force
                ? 'Your account is using the default password. Create a secure password to continue.'
                : 'Update your password to keep your account secure.'}
            </Text>
          </View>
        </View>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: '#FEF3F2', borderColor: '#FCA5A5' }]}>
            <Feather name="alert-circle" size={16} color="#DC2626" />
            <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
          </View>
        )}

        <View style={styles.body}>
          {currentPasswordRequired && (
            <>
              <Text style={[styles.label, { color: colors.mutedForeground }]}>CURRENT PASSWORD</Text>
              <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
                <Feather name="lock" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: colors.text }]}
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  placeholder="Enter current password"
                  placeholderTextColor={colors.mutedForeground}
                  secureTextEntry
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>
            </>
          )}

          <Text style={[styles.label, { color: colors.mutedForeground }]}>NEW PASSWORD</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="key" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min. 6 characters"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <Text style={[styles.label, { color: colors.mutedForeground }]}>CONFIRM NEW PASSWORD</Text>
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Feather name="check-circle" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              placeholderTextColor={colors.mutedForeground}
              secureTextEntry
              autoCapitalize="none"
              editable={!loading}
              onSubmitEditing={handleSubmit}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: '#1A5276' }, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="shield" size={18} color="#fff" />
                <Text style={styles.submitBtnText}>{force ? 'Set Secure Password' : 'Update Password'}</Text>
              </>
            )}
          </TouchableOpacity>

          {!force && (
            <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} disabled={loading}>
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  title: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 4 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 10, margin: 16, borderRadius: 10, borderWidth: 1, padding: 12 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, flex: 1 },
  body: { padding: 20, gap: 4 },
  label: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, paddingVertical: 13 },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderRadius: 14, paddingVertical: 16, marginTop: 24,
  },
  submitBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  cancelBtn: { alignItems: 'center', paddingVertical: 14 },
  cancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
});
