import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { useApp, genId, todayStr, nowTimeStr, ThawingEntry, Status } from '@/context/AppContext';
import { DocumentHeader } from '@/components/DocumentHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const THAW_LIMIT = 5; // °C — thawing temperature must not exceed 5°C in refrigerator

type ThawMethod = 'refrigerator' | 'cold_water' | 'microwave' | 'cooking';

const METHODS: { value: ThawMethod; label: string; limit: string }[] = [
  { value: 'refrigerator', label: 'Refrigerator', limit: '≤5°C' },
  { value: 'cold_water', label: 'Cold Water', limit: '≤21°C (change every 30 min)' },
  { value: 'microwave', label: 'Microwave', limit: 'Cook immediately after' },
  { value: 'cooking', label: 'Direct Cooking', limit: 'Cook from frozen' },
];

function calcStatus(temp: string, method: ThawMethod): Status {
  if (method === 'microwave' || method === 'cooking') return 'pass';
  const t = parseFloat(temp);
  if (isNaN(t)) return 'caution';
  if (method === 'refrigerator') {
    if (t <= THAW_LIMIT) return 'pass';
    if (t <= THAW_LIMIT + 2) return 'caution';
    return 'fail';
  }
  if (method === 'cold_water') {
    if (t <= 21) return 'pass';
    return 'fail';
  }
  return 'pass';
}

export default function ThawingScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { thawingLogs, addThawingEntry, deleteThawingEntry, settings } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());

  const [itemName, setItemName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [method, setMethod] = useState<ThawMethod>('refrigerator');
  const [temp, setTemp] = useState('');
  const [corrective, setCorrective] = useState('');
  const [monitor, setMonitor] = useState(settings.defaultMonitor);
  const [time, setTime] = useState(nowTimeStr());

  const filtered = thawingLogs.filter(e => e.date === filterDate);

  const resetForm = () => {
    setItemName(''); setQuantity(''); setUnit('kg'); setMethod('refrigerator');
    setTemp(''); setCorrective(''); setMonitor(settings.defaultMonitor); setTime(nowTimeStr());
  };

  const handleSave = () => {
    if (!itemName.trim() || !monitor.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Item and Monitored By.');
      return;
    }
    const status = calcStatus(temp, method);
    const entry: ThawingEntry = {
      id: genId(),
      date: filterDate,
      time,
      item: itemName,
      quantity,
      unit,
      method,
      temperature: temp,
      status,
      correctiveAction: corrective,
      monitoredBy: monitor,
    };
    addThawingEntry(entry);
    Haptics.notificationAsync(
      status === 'pass' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteThawingEntry(id); Haptics.impactAsync(); } },
    ]);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const methodConfig = {
    refrigerator: { icon: 'thermometer' as const, color: '#2E86C1', label: 'Refrigerator' },
    cold_water: { icon: 'droplet' as const, color: '#1A7B8A', label: 'Cold Water' },
    microwave: { icon: 'zap' as const, color: '#D68910', label: 'Microwave' },
    cooking: { icon: 'sun' as const, color: '#E74C3C', label: 'Direct Cooking' },
  };

  const renderEntry = ({ item: entry }: { item: ThawingEntry }) => {
    const mc = methodConfig[entry.method];
    return (
      <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.entryTop}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.entryItem, { color: colors.text }]}>{entry.item}</Text>
            <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
              {entry.quantity} {entry.unit} · {entry.time}
            </Text>
          </View>
          <View style={styles.entryRight}>
            <View style={[styles.methodBadge, { backgroundColor: mc.color + '18' }]}>
              <Feather name={mc.icon} size={12} color={mc.color} />
              <Text style={[styles.methodBadgeText, { color: mc.color }]}>{mc.label}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.delBtn}>
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.entryBottom}>
          {entry.temperature ? (
            <View>
              <Text style={[styles.tempVal, { color: colors.primary }]}>{entry.temperature}°C</Text>
              <Text style={[styles.tempLabel, { color: colors.mutedForeground }]}>Recorded temp</Text>
            </View>
          ) : (
            <Text style={[styles.noTemp, { color: colors.mutedForeground }]}>No temp required</Text>
          )}
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
        <Text style={[styles.monitorText, { color: colors.mutedForeground }]}>Monitored by: {entry.monitoredBy}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: topPad }}>
        <DocumentHeader
          title="Thawing Temperature Log"
          subtitle="Safe Food Thawing Records · CCP-2"
          ccp="CCP-2"
          referenceNo="TTL-002"
        />
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        <Feather name="calendar" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.dateInput, { color: colors.text }]}
          value={filterDate} onChangeText={setFilterDate}
          placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.entryCount, { color: colors.mutedForeground }]}>{filtered.length} entries</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        renderItem={renderEntry}
        contentContainerStyle={{ padding: 14, paddingBottom: Platform.OS === 'web' ? 120 : 90 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="wind" size={36} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No thawing records</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap + to log a thawing record</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 100 : 76 }]}
        onPress={() => { resetForm(); setModalOpen(true); }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <Modal visible={modalOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.primary, paddingTop: insets.top + 14 }]}>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Thawing Record</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>SAVE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>THAWING METHOD</Text>
            <View style={styles.methodGrid}>
              {METHODS.map(m => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.methodBtn, { borderColor: method === m.value ? colors.primary : colors.border, backgroundColor: method === m.value ? colors.secondary : colors.card }]}
                  onPress={() => setMethod(m.value)}
                >
                  <Text style={[styles.methodBtnTitle, { color: method === m.value ? colors.primary : colors.text }]}>{m.label}</Text>
                  <Text style={[styles.methodBtnSub, { color: colors.mutedForeground }]}>{m.limit}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TIME</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>FOOD ITEM</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={itemName} onChangeText={setItemName} placeholder="e.g. Beef Tenderloin" placeholderTextColor={colors.mutedForeground} />

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>QUANTITY</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={quantity} onChangeText={setQuantity} placeholder="e.g. 2.5" keyboardType="numeric" placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>UNIT</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={unit} onChangeText={setUnit} placeholder="kg" placeholderTextColor={colors.mutedForeground} />
              </View>
            </View>

            {(method === 'refrigerator' || method === 'cold_water') && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TEMPERATURE (°C)</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={temp} onChangeText={setTemp} placeholder={method === 'refrigerator' ? 'Must be ≤5°C' : 'Must be ≤21°C'} keyboardType="numeric" placeholderTextColor={colors.mutedForeground} />
                {temp !== '' && (
                  <View style={[styles.previewBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                    <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Status:</Text>
                    <StatusBadge status={calcStatus(temp, method)} />
                  </View>
                )}
              </>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CORRECTIVE ACTION (if needed)</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, minHeight: 60, textAlignVertical: 'top' }]} value={corrective} onChangeText={setCorrective} placeholder="Describe corrective action..." placeholderTextColor={colors.mutedForeground} multiline />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>MONITORED BY</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={monitor} onChangeText={setMonitor} placeholder="Name / ID" placeholderTextColor={colors.mutedForeground} />

            <View style={[styles.haccpNote, { backgroundColor: colors.secondary, borderColor: colors.primary + '40' }]}>
              <Feather name="info" size={13} color={colors.primary} />
              <Text style={[styles.haccpNoteText, { color: colors.primary }]}>
                HACCP CCP-2: Never thaw food at room temperature. Approved methods: refrigerator (≤5°C), cold running water (≤21°C), microwave (cook immediately), or direct cooking.
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
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  dateInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  entryCount: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  entryCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14, gap: 8 },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start' },
  entryItem: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  entryMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  entryRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  methodBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  methodBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  delBtn: { padding: 4 },
  entryBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tempVal: { fontFamily: 'Inter_700Bold', fontSize: 26 },
  tempLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
  noTemp: { fontFamily: 'Inter_400Regular', fontSize: 13, fontStyle: 'italic' },
  corrective: { borderRadius: 8, padding: 8, flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  correctiveText: { fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1 },
  monitorText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  fab: { position: 'absolute', right: 20, width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 6 },
  modalRoot: { flex: 1 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, gap: 10 },
  modalTitle: { flex: 1, color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 17 },
  saveText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  modalScroll: { flex: 1, padding: 16 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: 16 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  methodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  methodBtn: { width: '47%', borderWidth: 1.5, borderRadius: 10, padding: 12 },
  methodBtnTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 2 },
  methodBtnSub: { fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 14 },
  row: { flexDirection: 'row' },
  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  previewLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  haccpNote: { borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: 'row', gap: 8, marginTop: 20 },
  haccpNoteText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
});
