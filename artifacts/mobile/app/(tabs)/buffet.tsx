import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp, genId, todayStr, nowTimeStr, BuffetEntry, Status } from '@/context/AppContext';
import { DocumentHeader } from '@/components/DocumentHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// HACCP critical limits
const HOT_LIMIT = 63;  // °C minimum for hot foods
const COLD_LIMIT = 5;  // °C maximum for cold foods

function calcStatus(temp: string, type: 'hot' | 'cold'): Status {
  const t = parseFloat(temp);
  if (isNaN(t)) return 'caution';
  if (type === 'hot') {
    if (t >= HOT_LIMIT) return 'pass';
    if (t >= HOT_LIMIT - 3) return 'caution';
    return 'fail';
  } else {
    if (t <= COLD_LIMIT) return 'pass';
    if (t <= COLD_LIMIT + 2) return 'caution';
    return 'fail';
  }
}

export default function BuffetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { buffetLogs, addBuffetEntry, deleteBuffetEntry, settings } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());

  // Form state
  const [zone, setZone] = useState('');
  const [item, setItem] = useState('');
  const [type, setType] = useState<'hot' | 'cold'>('hot');
  const [temp, setTemp] = useState('');
  const [corrective, setCorrective] = useState('');
  const [monitor, setMonitor] = useState(settings.defaultMonitor);
  const [time, setTime] = useState(nowTimeStr());

  const filtered = buffetLogs.filter(e => e.date === filterDate);

  const resetForm = () => {
    setZone(''); setItem(''); setType('hot'); setTemp(''); setCorrective('');
    setMonitor(settings.defaultMonitor); setTime(nowTimeStr());
  };

  const openModal = () => { resetForm(); setModalOpen(true); };

  const handleSave = () => {
    if (!zone.trim() || !item.trim() || !temp.trim() || !monitor.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Zone, Item, Temperature, and Monitored By.');
      return;
    }
    const status = calcStatus(temp, type);
    const entry: BuffetEntry = {
      id: genId(),
      date: filterDate,
      time,
      zone,
      item,
      type,
      temperature: temp,
      criticalLimit: type === 'hot' ? `≥${HOT_LIMIT}°C` : `≤${COLD_LIMIT}°C`,
      status,
      correctiveAction: corrective,
      monitoredBy: monitor,
    };
    addBuffetEntry(entry);
    Haptics.notificationAsync(
      status === 'pass' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteBuffetEntry(id); Haptics.impactAsync(); } },
    ]);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : 0;

  const renderEntry = ({ item: entry }: { item: BuffetEntry }) => (
    <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.entryTop}>
        <View style={styles.entryLeft}>
          <Text style={[styles.entryItem, { color: colors.text }]}>{entry.item}</Text>
          <Text style={[styles.entryZone, { color: colors.mutedForeground }]}>{entry.zone} · {entry.time}</Text>
        </View>
        <View style={styles.entryRight}>
          <View style={[styles.typePill, { backgroundColor: entry.type === 'hot' ? '#FADBD8' : '#D6EAF8' }]}>
            <Text style={[styles.typePillText, { color: entry.type === 'hot' ? '#C0392B' : '#1A5276' }]}>
              {entry.type === 'hot' ? '🔴 HOT' : '🔵 COLD'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.delBtn}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.entryBottom}>
        <View style={styles.tempBlock}>
          <Text style={[styles.tempVal, { color: colors.primary }]}>{entry.temperature}°C</Text>
          <Text style={[styles.limitLabel, { color: colors.mutedForeground }]}>Limit: {entry.criticalLimit}</Text>
        </View>
        <StatusBadge status={entry.status} />
      </View>
      {entry.status !== 'pass' && entry.correctiveAction ? (
        <View style={[styles.corrective, { backgroundColor: colors.cautionBg ?? '#FDEBD0' }]}>
          <Feather name="alert-triangle" size={11} color={colors.caution ?? '#D68910'} />
          <Text style={[styles.correctiveText, { color: colors.caution ?? '#D68910' }]}>
            Corrective: {entry.correctiveAction}
          </Text>
        </View>
      ) : null}
      <Text style={[styles.monitorText, { color: colors.mutedForeground }]}>
        Monitored by: {entry.monitoredBy}
      </Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: topPad }}>
        <DocumentHeader
          title="Buffet Temperature Log"
          subtitle="Hot & Cold Food Monitoring · CCP-1"
          ccp="CCP-1"
          referenceNo="BTL-001"
        />
      </View>

      {/* Critical limits banner */}
      <View style={styles.limitsRow}>
        <View style={[styles.limitCard, { backgroundColor: '#FADBD8' }]}>
          <Feather name="thermometer" size={14} color="#C0392B" />
          <Text style={[styles.limitCardText, { color: '#C0392B' }]}>HOT foods: min {HOT_LIMIT}°C</Text>
        </View>
        <View style={[styles.limitCard, { backgroundColor: '#D6EAF8' }]}>
          <Feather name="thermometer" size={14} color="#1A5276" />
          <Text style={[styles.limitCardText, { color: '#1A5276' }]}>COLD foods: max {COLD_LIMIT}°C</Text>
        </View>
      </View>

      {/* Date filter */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        <Feather name="calendar" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.dateInput, { color: colors.text }]}
          value={filterDate}
          onChangeText={setFilterDate}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.entryCount, { color: colors.mutedForeground }]}>
          {filtered.length} entries
        </Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        renderItem={renderEntry}
        contentContainerStyle={{ padding: 14, paddingBottom: Platform.OS === 'web' ? 120 : 90 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="thermometer" size={36} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No temperature readings</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap + to add a reading</Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 100 : 76 }]}
        onPress={openModal}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Add Entry Modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.primary, paddingTop: insets.top + 14 }]}>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Temperature Reading</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>SAVE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            {/* Type selector */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>FOOD TYPE</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'hot' && { backgroundColor: '#FADBD8', borderColor: '#C0392B' }, { borderColor: colors.border }]}
                onPress={() => setType('hot')}
              >
                <Text style={[styles.typeBtnText, { color: type === 'hot' ? '#C0392B' : colors.mutedForeground }]}>
                  HOT (min {HOT_LIMIT}°C)
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'cold' && { backgroundColor: '#D6EAF8', borderColor: '#1A5276' }, { borderColor: colors.border }]}
                onPress={() => setType('cold')}
              >
                <Text style={[styles.typeBtnText, { color: type === 'cold' ? '#1A5276' : colors.mutedForeground }]}>
                  COLD (max {COLD_LIMIT}°C)
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TIME</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={time} onChangeText={setTime} placeholder="HH:MM"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ZONE / AREA</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={zone} onChangeText={setZone} placeholder="e.g. Buffet Station A"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>FOOD ITEM</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={item} onChangeText={setItem} placeholder="e.g. Roasted Chicken"
              placeholderTextColor={colors.mutedForeground}
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TEMPERATURE (°C)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={temp} onChangeText={setTemp} placeholder="e.g. 75"
              keyboardType="numeric" placeholderTextColor={colors.mutedForeground}
            />

            {/* Live status preview */}
            {temp !== '' && (
              <View style={[styles.previewBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Status Preview:</Text>
                <StatusBadge status={calcStatus(temp, type)} />
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CORRECTIVE ACTION (if needed)</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, minHeight: 60, textAlignVertical: 'top' }]}
              value={corrective} onChangeText={setCorrective}
              placeholder="Describe corrective action taken..."
              placeholderTextColor={colors.mutedForeground} multiline
            />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>MONITORED BY</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]}
              value={monitor} onChangeText={setMonitor} placeholder="Name / ID"
              placeholderTextColor={colors.mutedForeground}
            />

            <View style={[styles.haccpNote, { backgroundColor: colors.secondary, borderColor: colors.primary + '40' }]}>
              <Feather name="info" size={13} color={colors.primary} />
              <Text style={[styles.haccpNoteText, { color: colors.primary }]}>
                HACCP CCP-1: Hot foods must be maintained at ≥{HOT_LIMIT}°C. Cold foods must be maintained at ≤{COLD_LIMIT}°C. Monitor every 2 hours.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  limitsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  limitCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 8, padding: 10 },
  limitCardText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  dateInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  entryCount: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  entryCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14, gap: 8 },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  entryLeft: { flex: 1 },
  entryItem: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  entryZone: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  entryRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typePill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  typePillText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  delBtn: { padding: 4 },
  entryBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tempBlock: {},
  tempVal: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  limitLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
  corrective: { borderRadius: 8, padding: 8, flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  correctiveText: { fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1 },
  monitorText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  // Modal
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  modalTitle: { flex: 1, color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 17 },
  saveText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  modalScroll: { flex: 1, padding: 16 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeBtn: { flex: 1, borderWidth: 1.5, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  typeBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  previewLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  haccpNote: { borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: 'row', gap: 8, marginTop: 20 },
  haccpNoteText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
});
