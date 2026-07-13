import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Platform,
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
import { useApp, genId, todayStr, nowTimeStr, DisinfectionEntry, Status } from '@/context/AppContext';
import { DocumentHeader } from '@/components/DocumentHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const SOLUTIONS = [
  { label: 'Chlorine (NaOCl)', concentration: '100-200 ppm', contactTime: '2 min' },
  { label: 'Peracetic Acid', concentration: '80-100 ppm', contactTime: '2 min' },
  { label: 'Quaternary Ammonium', concentration: '200 ppm', contactTime: '30 sec' },
  { label: 'Hydrogen Peroxide', concentration: '50-100 ppm', contactTime: '1 min' },
  { label: 'Ozone Water', concentration: '0.5-1 ppm', contactTime: '1 min' },
  { label: 'Other', concentration: '', contactTime: '' },
];

export default function DisinfectionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { disinfectionLogs, addDisinfectionEntry, deleteDisinfectionEntry, settings } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());
  const [solutionPickerOpen, setSolutionPickerOpen] = useState(false);

  // Form state
  const [items, setItems] = useState('');
  const [solutionType, setSolutionType] = useState('');
  const [concentration, setConcentration] = useState('');
  const [contactTime, setContactTime] = useState('');
  const [rinsed, setRinsed] = useState(true);
  const [notes, setNotes] = useState('');
  const [monitor, setMonitor] = useState(settings.defaultMonitor);
  const [time, setTime] = useState(nowTimeStr());

  const filtered = disinfectionLogs.filter(e => e.date === filterDate);

  const resetForm = () => {
    setItems(''); setSolutionType(''); setConcentration(''); setContactTime('');
    setRinsed(true); setNotes(''); setMonitor(settings.defaultMonitor); setTime(nowTimeStr());
  };

  const pickSolution = (sol: typeof SOLUTIONS[0]) => {
    setSolutionType(sol.label);
    setConcentration(sol.concentration);
    setContactTime(sol.contactTime);
    setSolutionPickerOpen(false);
  };

  const calcStatus = (): Status => {
    if (!solutionType || !concentration || !contactTime) return 'caution';
    if (!rinsed) return 'fail';
    return 'pass';
  };

  const handleSave = () => {
    if (!items.trim() || !solutionType.trim() || !monitor.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Items, Solution Type, and Monitored By.');
      return;
    }
    const status = calcStatus();
    const entry: DisinfectionEntry = {
      id: genId(), date: filterDate, time, items, solutionType, concentration,
      contactTime, rinsed, status, monitoredBy: monitor, notes,
    };
    addDisinfectionEntry(entry);
    Haptics.notificationAsync(
      status === 'pass' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );
    resetForm();
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteDisinfectionEntry(id); Haptics.impactAsync(); } },
    ]);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const renderEntry = ({ item: entry }: { item: DisinfectionEntry }) => (
    <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.entryTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.entryItems, { color: colors.text }]} numberOfLines={2}>{entry.items}</Text>
          <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>{entry.time}</Text>
        </View>
        <View style={styles.entryRight}>
          <StatusBadge status={entry.status} />
          <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.delBtn}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Solution details */}
      <View style={[styles.solutionGrid, { backgroundColor: colors.muted, borderRadius: 8 }]}>
        <View style={styles.solutionCell}>
          <Text style={[styles.solLabel, { color: colors.mutedForeground }]}>SOLUTION</Text>
          <Text style={[styles.solValue, { color: colors.text }]}>{entry.solutionType}</Text>
        </View>
        <View style={styles.solutionCell}>
          <Text style={[styles.solLabel, { color: colors.mutedForeground }]}>CONCENTRATION</Text>
          <Text style={[styles.solValue, { color: colors.text }]}>{entry.concentration || '—'}</Text>
        </View>
        <View style={styles.solutionCell}>
          <Text style={[styles.solLabel, { color: colors.mutedForeground }]}>CONTACT TIME</Text>
          <Text style={[styles.solValue, { color: colors.text }]}>{entry.contactTime || '—'}</Text>
        </View>
        <View style={styles.solutionCell}>
          <Text style={[styles.solLabel, { color: colors.mutedForeground }]}>RINSED</Text>
          <Text style={[styles.solValue, { color: entry.rinsed ? colors.safe : colors.fail }]}>
            {entry.rinsed ? 'Yes' : 'No'}
          </Text>
        </View>
      </View>

      {entry.notes ? (
        <Text style={[styles.notesText, { color: colors.mutedForeground }]}>Notes: {entry.notes}</Text>
      ) : null}
      <Text style={[styles.monitorText, { color: colors.mutedForeground }]}>Monitored by: {entry.monitoredBy}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: topPad }}>
        <DocumentHeader
          title="Fruit & Vegetable Disinfection Log"
          subtitle="Produce Sanitation Records · CCP-4"
          ccp="CCP-4"
          referenceNo="FVD-004"
        />
      </View>

      {/* Procedure summary */}
      <View style={[styles.procedureRow, { backgroundColor: colors.muted }]}>
        <Feather name="list" size={12} color={colors.primary} />
        <Text style={[styles.procedureText, { color: colors.mutedForeground }]}>
          Wash → Disinfect → Rinse thoroughly → Drain & dry before use
        </Text>
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
            <Feather name="droplet" size={36} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No disinfection records</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap + to log a disinfection session</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 100 : 76 }]}
        onPress={() => { resetForm(); setModalOpen(true); }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Main form modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.primary, paddingTop: insets.top + 14 }]}>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Disinfection Record</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>SAVE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TIME</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ITEMS DISINFECTED</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, minHeight: 60, textAlignVertical: 'top' }]}
              value={items} onChangeText={setItems}
              placeholder="e.g. Lettuce (2 heads), Tomatoes (1 kg), Strawberries (500g)..."
              placeholderTextColor={colors.mutedForeground} multiline
            />

            {/* Solution picker */}
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DISINFECTANT SOLUTION</Text>
            <TouchableOpacity
              style={[styles.input, styles.pickerBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              onPress={() => setSolutionPickerOpen(true)}
            >
              <Text style={[styles.pickerBtnText, { color: solutionType ? colors.text : colors.mutedForeground }]}>
                {solutionType || 'Select solution type...'}
              </Text>
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CONCENTRATION</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={concentration} onChangeText={setConcentration} placeholder="e.g. 100-200 ppm" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>CONTACT TIME</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={contactTime} onChangeText={setContactTime} placeholder="e.g. 2 min" placeholderTextColor={colors.mutedForeground} />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Thoroughly Rinsed with Potable Water?</Text>
                <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>Required after disinfection treatment</Text>
              </View>
              <Switch value={rinsed} onValueChange={setRinsed} trackColor={{ true: colors.safe }} />
            </View>

            {!rinsed && (
              <View style={[styles.warnBox, { backgroundColor: colors.failBg ?? '#FADBD8', borderColor: colors.fail }]}>
                <Feather name="alert-triangle" size={14} color={colors.fail} />
                <Text style={[styles.warnText, { color: colors.fail }]}>
                  WARNING: Items must be rinsed with clean potable water to remove disinfectant residues before serving.
                </Text>
              </View>
            )}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ADDITIONAL NOTES</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, minHeight: 50, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Any observations..." placeholderTextColor={colors.mutedForeground} multiline />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>MONITORED BY</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={monitor} onChangeText={setMonitor} placeholder="Name / ID" placeholderTextColor={colors.mutedForeground} />

            <View style={[styles.haccpNote, { backgroundColor: colors.secondary, borderColor: colors.primary + '40' }]}>
              <Feather name="info" size={13} color={colors.primary} />
              <Text style={[styles.haccpNoteText, { color: colors.primary }]}>
                HACCP CCP-4 / ISO 22000 Cl. 8.8: Wash produce with potable water first. Apply food-grade disinfectant. Maintain required contact time. Rinse thoroughly with potable water. Allow to drain before use.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Solution picker modal */}
      <Modal visible={solutionPickerOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: '#7D3C98', paddingTop: insets.top + 14 }]}>
            <TouchableOpacity onPress={() => setSolutionPickerOpen(false)}>
              <Feather name="x" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Select Disinfectant</Text>
            <View style={{ width: 22 }} />
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }}>
            <Text style={[styles.solPickerDesc, { color: colors.mutedForeground }]}>
              Approved food-grade disinfectants for produce sanitation
            </Text>
            {SOLUTIONS.map(sol => (
              <TouchableOpacity
                key={sol.label}
                style={[styles.solOption, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => pickSolution(sol)}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.solOptionTitle, { color: colors.text }]}>{sol.label}</Text>
                  {sol.concentration && (
                    <Text style={[styles.solOptionMeta, { color: colors.mutedForeground }]}>
                      {sol.concentration} · Contact: {sol.contactTime}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  procedureRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8 },
  procedureText: { fontFamily: 'Inter_400Regular', fontSize: 11, flex: 1 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  dateInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  entryCount: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  entryCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14, gap: 8 },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start' },
  entryItems: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  entryMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  entryRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  delBtn: { padding: 4 },
  solutionGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, gap: 8 },
  solutionCell: { width: '47%' },
  solLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 9, letterSpacing: 0.5, marginBottom: 2 },
  solValue: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  notesText: { fontFamily: 'Inter_400Regular', fontSize: 11, fontStyle: 'italic' },
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
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerBtnText: { fontFamily: 'Inter_400Regular', fontSize: 15 },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 4, gap: 10 },
  switchLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  switchSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  warnBox: { flexDirection: 'row', gap: 8, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 8 },
  warnText: { fontFamily: 'Inter_500Medium', fontSize: 12, flex: 1, lineHeight: 17 },
  haccpNote: { borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: 'row', gap: 8, marginTop: 20 },
  haccpNoteText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
  solPickerDesc: { fontFamily: 'Inter_400Regular', fontSize: 13, marginBottom: 16, lineHeight: 18 },
  solOption: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 10, padding: 14, marginBottom: 8 },
  solOptionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  solOptionMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
});
