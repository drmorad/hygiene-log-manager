import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import type { Status } from '@/context/AppContext';

interface Props {
  status: Status;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const colors = useColors();

  const config = {
    pass: { label: 'PASS', bg: colors.safeBg, color: colors.safe, icon: 'check-circle' as const },
    fail: { label: 'FAIL', bg: colors.failBg, color: colors.fail, icon: 'x-circle' as const },
    caution: { label: 'CAUTION', bg: colors.cautionBg, color: colors.caution, icon: 'alert-triangle' as const },
  }[status];

  const isSmall = size === 'sm';

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, paddingVertical: isSmall ? 2 : 4, paddingHorizontal: isSmall ? 6 : 10 }]}>
      <Feather name={config.icon} size={isSmall ? 10 : 12} color={config.color} />
      <Text style={[styles.label, { color: config.color, fontSize: isSmall ? 9 : 10 }]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    gap: 4,
  },
  label: {
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.5,
  },
});
