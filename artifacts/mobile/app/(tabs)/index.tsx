import React, { useState } from 'react';
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp, todayStr } from '@/context/AppContext';
import { StatusBadge } from '@/components/StatusBadge';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { generateFullReportHTML, exportPDF } from '@/utils/pdfExport';
import { MenuLibraryModal } from '@/components/MenuLibraryModal';

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings, buffetLogs, thawingLogs, receivedLogs, disinfectionLogs } = useApp();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [menuLibraryOpen, setMenuLibraryOpen] = useState(false);
  const [name, setName] = useState(settings.establishmentName);
  const [address, setAddress] = useState(settings.address);
  const [monitor, setMonitor] = useState(settings.defaultMonitor);

  const today = todayStr();

  const todayBuffet = buffetLogs.filter(e => e.date === today);
  const todayThawing = thawingLogs.filter(e => e.date === today);
  const todayReceived = receivedLogs.filter(e => e.date === today);
  const todayDisinfection = disinfectionLogs.filter(e => e.date === today);

  const failCount = [
    ...todayBuffet.filter(e => e.status === 'fail'),
    ...todayThawing.filter(e => e.status === 'fail'),
    ...todayReceived.filter(e => e.overallStatus === 'fail'),
    ...todayDisinfection.filter(e => e.status === 'fail'),
  ].length;

  const totalEntries = todayBuffet.length + todayThawing.length + todayReceived.length + todayDisinfection.length;

  const displayDate = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });

  const saveSettings = () => {
    updateSettings({ establishmentName: name, address, defaultMonitor: monitor });
    setSettingsOpen(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleExportFullReport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const html = generateFullReportHTML(
      buffetLogs.filter(e => e.date === today),
      thawingLogs.filter(e => e.date === today),
      receivedLogs.filter(e => e.date === today),
      disinfectionLogs.filter(e => e.date === today),
      today,
      settings,
    );
    await exportPDF(html, `Daily-Food-Safety-Report-${today}.pdf`);
  };

  const cards = [
    {
      title: 'Buffet Temperature',
      subtitle: 'Hot & Cold Items',
      count: todayBuffet.length,
      fails: todayBuffet.filter(e => e.status === 'fail').length,
      icon: 'thermometer' as const,
      ccp: 'CCP-1',
      color: '#E74C3C',
    },
    {
      title: 'Thawing Log',
      subtitle: 'Safe Thawing Records',
      count: todayThawing.length,
      fails: todayThawing.filter(e => e.status === 'fail').length,
      icon: 'wind' as const,
      ccp: 'CCP-2',
      color: '#2E86C1',
    },
    {
      title: 'Received Items',
      subtitle: 'Delivery Inspection',
      count: todayReceived.length,
      fails: todayReceived.filter(e => e.overallStatus === 'fail').length,
      icon: 'package' as const,
      ccp: 'CCP-3',
      color: '#1E8449',
    },
    {
      title: 'Disinfection Log',
      subtitle: 'Fruit & Vegetable Sanitation',
      count: todayDisinfection.length,
      fails: todayDisinfection.filter(e => e.status === 'fail').length,
      icon: 'droplet' as const,
      ccp: 'CCP-4',
      color: '#7D3C98',
    },
  ];

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerLabel}>FOOD SAFETY MANAGER</Text>
            <Text style={styles.headerTitle} numberOfLines={1}>{settings.establishmentName}</Text>
            <Text style={styles.headerDate}>{displayDate}</Text>
          </View>
          <TouchableOpacity
            style={[styles.settingsBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
            onPress={() => { setName(settings.establishmentName); setAddress(settings.address); setMonitor(settings.defaultMonitor); setSettingsOpen(true); }}
          >
            <Feather name="settings" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Daily summary */}
        <View style={[styles.summaryBar, { backgroundColor: 'rgba(255,255,255,0.12)' }]}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNum}>{totalEntries}</Text>
            <Text style={styles.summaryLabel}>Total Entries</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: failCount > 0 ? '#F1948A' : '#82E0AA' }]}>
              {failCount}
            </Text>
            <Text style={styles.summaryLabel}>Failures Today</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNum, { color: totalEntries > 0 && failCount === 0 ? '#82E0AA' : '#F8C471' }]}>
              {totalEntries > 0 && failCount === 0 ? '✓ OK' : failCount > 0 ? '⚠ Alert' : '— None'}
            </Text>
            <Text style={styles.summaryLabel}>Status</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 120 : 90 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
          TODAY'S RECORDS
        </Text>

        {cards.map(card => (
          <View key={card.title} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.cardAccent, { backgroundColor: card.color }]} />
            <View style={styles.cardBody}>
              <View style={styles.cardRow}>
                <View style={[styles.cardIcon, { backgroundColor: card.color + '18' }]}>
                  <Feather name={card.icon} size={20} color={card.color} />
                </View>
                <View style={styles.cardInfo}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.text }]}>{card.title}</Text>
                    <View style={[styles.ccpBadge, { backgroundColor: colors.muted }]}>
                      <Text style={[styles.ccpText, { color: colors.mutedForeground }]}>{card.ccp}</Text>
                    </View>
                  </View>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{card.subtitle}</Text>
                </View>
              </View>
              <View style={styles.cardStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNum, { color: colors.primary }]}>{card.count}</Text>
                  <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>entries</Text>
                </View>
                {card.fails > 0 && (
                  <StatusBadge status="fail" size="sm" />
                )}
                {card.count > 0 && card.fails === 0 && (
                  <StatusBadge status="pass" size="sm" />
                )}
              </View>
            </View>
          </View>
        ))}

        {/* HACCP/ISO info */}
        <View style={[styles.infoCard, { backgroundColor: colors.secondary, borderColor: colors.primary + '30' }]}>
          <Feather name="info" size={16} color={colors.primary} />
          <View style={styles.infoText}>
            <Text style={[styles.infoTitle, { color: colors.primary }]}>HACCP Plan · ISO 22000 Compliant</Text>
            <Text style={[styles.infoSub, { color: colors.mutedForeground }]}>
              All records are monitored against critical control point limits. Corrective actions are logged for any deviations.
            </Text>
          </View>
        </View>

        {/* Export Today's Full Report */}
        <TouchableOpacity
          style={[styles.exportCard, { backgroundColor: colors.card, borderColor: colors.primary + '50' }]}
          onPress={handleExportFullReport}
          activeOpacity={0.85}
        >
          <View style={[styles.exportIconWrap, { backgroundColor: colors.primary }]}>
            <Feather name="file-text" size={20} color="#fff" />
          </View>
          <View style={styles.exportCardBody}>
            <Text style={[styles.exportCardTitle, { color: colors.text }]}>Export Today's Full Report</Text>
            <Text style={[styles.exportCardSub, { color: colors.mutedForeground }]}>
              PDF · All 4 CCP logs · HACCP / ISO 22000 layout
            </Text>
          </View>
          <Feather name="share" size={18} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>

      {/* Settings Modal */}
      <Modal visible={settingsOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.primary, paddingTop: insets.top + 12 }]}>
            <Text style={styles.modalTitle}>Establishment Settings</Text>
            <TouchableOpacity onPress={() => setSettingsOpen(false)}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ESTABLISHMENT NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Grand Hotel & Spa"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ADDRESS</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Full address"
              placeholderTextColor={colors.mutedForeground}
            />
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DEFAULT MONITOR NAME</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={monitor}
              onChangeText={setMonitor}
              placeholder="Quality Control Officer"
              placeholderTextColor={colors.mutedForeground}
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary }]}
              onPress={saveSettings}
            >
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>

            {/* Menu Library shortcut */}
            <TouchableOpacity
              style={[styles.menuLibraryBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
              onPress={() => { setSettingsOpen(false); setTimeout(() => setMenuLibraryOpen(true), 300); }}
            >
              <Feather name="list" size={18} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.menuLibraryTitle, { color: colors.text }]}>Manage Menu Library</Text>
                <Text style={[styles.menuLibrarySub, { color: colors.mutedForeground }]}>
                  Add, edit or remove quick-pick food items for all logs
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <MenuLibraryModal
        visible={menuLibraryOpen}
        onClose={() => setMenuLibraryOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  headerLeft: { flex: 1 },
  headerLabel: { color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 22 },
  headerDate: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  settingsBtn: { padding: 10, borderRadius: 10, marginLeft: 10 },
  summaryBar: { flexDirection: 'row', borderRadius: 10, padding: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryNum: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 22 },
  summaryLabel: { color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 4 },
  scroll: { flex: 1 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginTop: 20, marginBottom: 10, marginHorizontal: 16 },
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 12, borderWidth: 1, flexDirection: 'row', overflow: 'hidden' },
  cardAccent: { width: 4 },
  cardBody: { flex: 1, padding: 14 },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  cardIcon: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14, flex: 1 },
  ccpBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  ccpText: { fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 0.5 },
  cardSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  cardStats: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statItem: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  statNum: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  infoCard: { marginHorizontal: 16, marginTop: 6, marginBottom: 10, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 14 },
  infoText: { flex: 1 },
  infoTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 4 },
  infoSub: { fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 16 },
  exportCard: { marginHorizontal: 16, marginTop: 8, marginBottom: 10, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14 },
  exportIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  exportCardBody: { flex: 1 },
  exportCardTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  exportCardSub: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  menuLibraryBtn: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 12 },
  menuLibraryTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  menuLibrarySub: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  // Modal
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 16 },
  modalTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 18 },
  modalScroll: { flex: 1, padding: 20 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  saveBtn: { borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 28 },
  saveBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
});
