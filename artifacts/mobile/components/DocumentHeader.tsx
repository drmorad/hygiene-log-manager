import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useApp } from '@/context/AppContext';

interface Props {
  title: string;
  subtitle?: string;
  ccp?: string;
  referenceNo?: string;
  date?: string;
}

export function DocumentHeader({ title, subtitle, ccp, referenceNo, date }: Props) {
  const colors = useColors();
  const { settings } = useApp();

  const displayDate = date ?? new Date().toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.primary, borderBottomColor: colors.border }]}>
      <View style={styles.topRow}>
        <View style={[styles.shield, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={styles.shieldText}>HACCP</Text>
        </View>
        <View style={styles.titleBlock}>
          <Text style={styles.docTitle}>{title}</Text>
          {subtitle ? <Text style={styles.docSubtitle}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.iso, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          <Text style={styles.isoText}>ISO</Text>
          <Text style={styles.isoNum}>22000</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>ESTABLISHMENT</Text>
          <Text style={styles.metaValue} numberOfLines={1}>{settings.establishmentName}</Text>
        </View>
        {ccp && (
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>CCP</Text>
            <Text style={styles.metaValue}>{ccp}</Text>
          </View>
        )}
        {referenceNo && (
          <View style={styles.metaCell}>
            <Text style={styles.metaLabel}>REF No.</Text>
            <Text style={styles.metaValue}>{referenceNo}</Text>
          </View>
        )}
        <View style={styles.metaCell}>
          <Text style={styles.metaLabel}>DATE</Text>
          <Text style={styles.metaValue}>{displayDate}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  shield: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    alignItems: 'center',
  },
  shieldText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 1,
  },
  titleBlock: {
    flex: 1,
  },
  docTitle: {
    color: '#FFFFFF',
    fontFamily: 'Inter_700Bold',
    fontSize: 15,
    letterSpacing: 0.3,
  },
  docSubtitle: {
    color: 'rgba(255,255,255,0.75)',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginTop: 1,
  },
  iso: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
  },
  isoText: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 9,
    letterSpacing: 1,
  },
  isoNum: {
    color: '#fff',
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    padding: 8,
  },
  metaCell: {
    flex: 1,
  },
  metaLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  metaValue: {
    color: '#FFFFFF',
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
});
