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
import { useApp, genId, todayStr, nowTimeStr, ReceivedEntry, ReceivedItem, Status } from '@/context/AppContext';
import { DocumentHeader } from '@/components/DocumentHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const CHILLED_LIMIT = 5;
const FROZEN_LIMIT = -18;

function itemStatus(temp: string, packOk: boolean): Status {
  if (!packOk) return 'fail';
  const t = parseFloat(temp);
  if (isNaN(t)) return 'caution';
  if (t <= CHILLED_LIMIT) return 'pass';
  if (t <= CHILLED_LIMIT + 2) return 'caution';
  return 'fail';
}

export default function ReceivedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { receivedLogs, addReceivedEntry, deleteReceivedEntry, settings } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [filterDate, setFilterDate] = useState(todayStr());

  // Delivery form
  const [supplier, setSupplier] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [receivedBy, setReceivedBy] = useState(settings.defaultMonitor);
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState(nowTimeStr());

  // Items
  const [items, setItems] = useState<ReceivedItem[]>([]);
  const [itemModal, setItemModal] = useState(false);
  const [iName, setIName] = useState('');
  const [iQty, setIQty] = useState('');
  const [iUnit, setIUnit] = useState('');
  const [iBatch, setIBatch] = useState('');
  const [iExpiry, setIExpiry] = useState('');
  const [iTemp, setITemp] = useState('');
  const [iPack, setIPack] = useState(true);

  const filtered = receivedLogs.filter(e => e.date === filterDate);

  const resetForm = () => {
    setSupplier(''); setDeliveryNote(''); setReceivedBy(settings.defaultMonitor);
    setNotes(''); setTime(nowTimeStr()); setItems([]);
  };

  const addItem = () => {
    if (!iName.trim()) { Alert.alert('Missing', 'Enter item name.'); return; }
    const status = itemStatus(iTemp, iPack);
    const newItem: ReceivedItem = {
      id: genId(), name: iName, quantity: iQty, unit: iUnit,
      batchNumber: iBatch, expiryDate: iExpiry, temperature: iTemp,
      packagingOk: iPack, status,
    };
    setItems(prev => [...prev, newItem]);
    setIName(''); setIQty(''); setIUnit(''); setIBatch(''); setIExpiry(''); setITemp(''); setIPack(true);
    setItemModal(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSave = () => {
    if (!supplier.trim() || !receivedBy.trim()) {
      Alert.alert('Missing Fields', 'Please fill in Supplier and Received By.');
      return;
    }
    const fails = items.filter(i => i.status === 'fail').length;
    const cautions = items.filter(i => i.status === 'caution').length;
    const overall: Status = fails > 0 ? 'fail' : cautions > 0 ? 'caution' : 'pass';
    const entry: ReceivedEntry = {
      id: genId(), date: filterDate, time, supplier, deliveryNote,
      items, overallStatus: overall, receivedBy, notes,
    };
    addReceivedEntry(entry);
    Haptics.notificationAsync(
      overall === 'pass' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error
    );
    resetForm();
    setModalOpen(false);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Entry', 'Remove this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => { deleteReceivedEntry(id); Haptics.impactAsync(); } },
    ]);
  };

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const renderEntry = ({ item: entry }: { item: ReceivedEntry }) => (
    <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.entryTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.entrySupplier, { color: colors.text }]}>{entry.supplier}</Text>
          <Text style={[styles.entryMeta, { color: colors.mutedForeground }]}>
            DN: {entry.deliveryNote || '—'} · {entry.time}
          </Text>
        </View>
        <View style={styles.entryRight}>
          <StatusBadge status={entry.overallStatus} />
          <TouchableOpacity onPress={() => handleDelete(entry.id)} style={styles.delBtn}>
            <Feather name="trash-2" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Items list */}
      {entry.items.length > 0 && (
        <View style={[styles.itemsContainer, { borderColor: colors.border }]}>
          {entry.items.map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                idx < entry.items.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                  {item.quantity} {item.unit}
                  {item.temperature ? ` · ${item.temperature}°C` : ''}
                  {item.expiryDate ? ` · Exp: ${item.expiryDate}` : ''}
                </Text>
              </View>
              <StatusBadge status={item.status} size="sm" />
            </View>
          ))}
        </View>
      )}

      {entry.notes ? (
        <Text style={[styles.notesText, { color: colors.mutedForeground }]}>Notes: {entry.notes}</Text>
      ) : null}
      <Text style={[styles.monitorText, { color: colors.mutedForeground }]}>Received by: {entry.receivedBy}</Text>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={{ paddingTop: topPad }}>
        <DocumentHeader
          title="Received Items Log"
          subtitle="Delivery Inspection Records · CCP-3"
          ccp="CCP-3"
          referenceNo="RIL-003"
        />
      </View>

      {/* Acceptance criteria */}
      <View style={[styles.criteriaRow, { backgroundColor: colors.muted }]}>
        <View style={styles.criteriaItem}>
          <Feather name="check-circle" size={12} color={colors.safe} />
          <Text style={[styles.criteriaText, { color: colors.mutedForeground }]}>Chilled: ≤{CHILLED_LIMIT}°C</Text>
        </View>
        <View style={styles.criteriaItem}>
          <Feather name="check-circle" size={12} color={colors.safe} />
          <Text style={[styles.criteriaText, { color: colors.mutedForeground }]}>Frozen: ≤{FROZEN_LIMIT}°C</Text>
        </View>
        <View style={styles.criteriaItem}>
          <Feather name="check-circle" size={12} color={colors.safe} />
          <Text style={[styles.criteriaText, { color: colors.mutedForeground }]}>Packaging intact</Text>
        </View>
      </View>

      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        <Feather name="calendar" size={15} color={colors.mutedForeground} />
        <TextInput
          style={[styles.dateInput, { color: colors.text }]}
          value={filterDate} onChangeText={setFilterDate}
          placeholder="YYYY-MM-DD" placeholderTextColor={colors.mutedForeground}
        />
        <Text style={[styles.entryCount, { color: colors.mutedForeground }]}>{filtered.length} deliveries</Text>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={e => e.id}
        renderItem={renderEntry}
        contentContainerStyle={{ padding: 14, paddingBottom: Platform.OS === 'web' ? 120 : 90 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="package" size={36} color={colors.border} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No deliveries recorded</Text>
            <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>Tap + to log a delivery</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary, bottom: Platform.OS === 'web' ? 100 : 76 }]}
        onPress={() => { resetForm(); setModalOpen(true); }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Main delivery modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: colors.primary, paddingTop: insets.top + 14 }]}>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Delivery Record</Text>
            <TouchableOpacity onPress={handleSave}>
              <Text style={styles.saveText}>SAVE</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TIME</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={time} onChangeText={setTime} placeholder="HH:MM" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>SUPPLIER NAME</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={supplier} onChangeText={setSupplier} placeholder="e.g. Fresh Foods Ltd." placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DELIVERY NOTE / INVOICE NO.</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={deliveryNote} onChangeText={setDeliveryNote} placeholder="e.g. DN-2024-001" placeholderTextColor={colors.mutedForeground} />

            {/* Items section */}
            <View style={styles.itemsHeader}>
              <Text style={[styles.fieldLabel, { color: colors.mutedForeground, marginTop: 0 }]}>RECEIVED ITEMS ({items.length})</Text>
              <TouchableOpacity
                style={[styles.addItemBtn, { backgroundColor: colors.primary }]}
                onPress={() => setItemModal(true)}
              >
                <Feather name="plus" size={14} color="#fff" />
                <Text style={styles.addItemText}>Add Item</Text>
              </TouchableOpacity>
            </View>

            {items.map(item => (
              <View key={item.id} style={[styles.itemChip, { backgroundColor: colors.muted, borderColor: colors.border }]}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chipName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.chipMeta, { color: colors.mutedForeground }]}>
                    {item.quantity} {item.unit} · {item.temperature ? `${item.temperature}°C` : 'no temp'}
                  </Text>
                </View>
                <StatusBadge status={item.status} size="sm" />
                <TouchableOpacity onPress={() => setItems(prev => prev.filter(i => i.id !== item.id))}>
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>
            ))}

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NOTES / OBSERVATIONS</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card, minHeight: 60, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Any observations, complaints, rejections..." placeholderTextColor={colors.mutedForeground} multiline />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>RECEIVED BY</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={receivedBy} onChangeText={setReceivedBy} placeholder="Name / ID" placeholderTextColor={colors.mutedForeground} />

            <View style={[styles.haccpNote, { backgroundColor: colors.secondary, borderColor: colors.primary + '40' }]}>
              <Feather name="info" size={13} color={colors.primary} />
              <Text style={[styles.haccpNoteText, { color: colors.primary }]}>
                ISO 22000 Cl. 8.3: All received goods must be inspected. Reject items with damaged packaging, improper temperature, or missing documentation.
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Add item modal */}
      <Modal visible={itemModal} animationType="slide" presentationStyle="formSheet">
        <View style={[styles.modalRoot, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { backgroundColor: '#1E8449', paddingTop: insets.top + 14 }]}>
            <TouchableOpacity onPress={() => setItemModal(false)}>
              <Feather name="arrow-left" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Add Received Item</Text>
            <TouchableOpacity onPress={addItem}>
              <Text style={styles.saveText}>ADD</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalScroll} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ITEM NAME</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={iName} onChangeText={setIName} placeholder="e.g. Whole Chicken" placeholderTextColor={colors.mutedForeground} autoFocus />

            <View style={styles.row}>
              <View style={{ flex: 2 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>QUANTITY</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={iQty} onChangeText={setIQty} placeholder="e.g. 10" keyboardType="numeric" placeholderTextColor={colors.mutedForeground} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>UNIT</Text>
                <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={iUnit} onChangeText={setIUnit} placeholder="kg" placeholderTextColor={colors.mutedForeground} />
              </View>
            </View>

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>BATCH / LOT NUMBER</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={iBatch} onChangeText={setIBatch} placeholder="e.g. LOT-2024-001" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>EXPIRY DATE</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={iExpiry} onChangeText={setIExpiry} placeholder="DD/MM/YYYY" placeholderTextColor={colors.mutedForeground} />

            <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>TEMPERATURE (°C)</Text>
            <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={iTemp} onChangeText={setITemp} placeholder="e.g. 3.5" keyboardType="numeric" placeholderTextColor={colors.mutedForeground} />

            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>Packaging Intact?</Text>
                <Text style={[styles.switchSub, { color: colors.mutedForeground }]}>No damage, leaks, or contamination</Text>
              </View>
              <Switch value={iPack} onValueChange={setIPack} trackColor={{ true: colors.safe }} />
            </View>

            {iTemp !== '' && (
              <View style={[styles.previewBox, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                <Text style={[styles.previewLabel, { color: colors.mutedForeground }]}>Item Status Preview:</Text>
                <StatusBadge status={itemStatus(iTemp, iPack)} />
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  criteriaRow: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 8, gap: 12 },
  criteriaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  criteriaText: { fontFamily: 'Inter_400Regular', fontSize: 11 },
  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderBottomWidth: 1 },
  dateInput: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14 },
  entryCount: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  entryCard: { borderRadius: 12, borderWidth: 1, marginBottom: 10, padding: 14, gap: 8 },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start' },
  entrySupplier: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  entryMeta: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  entryRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 6 },
  delBtn: { padding: 4 },
  itemsContainer: { borderRadius: 8, borderWidth: 1, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 8 },
  itemName: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  itemMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
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
  itemsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  addItemText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  itemChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 10, marginBottom: 6 },
  chipName: { fontFamily: 'Inter_500Medium', fontSize: 13 },
  chipMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 1 },
  row: { flexDirection: 'row' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, paddingVertical: 4 },
  switchLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  switchSub: { fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  previewBox: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 12 },
  previewLabel: { fontFamily: 'Inter_400Regular', fontSize: 13 },
  haccpNote: { borderRadius: 10, borderWidth: 1, padding: 12, flexDirection: 'row', gap: 8, marginTop: 20 },
  haccpNoteText: { fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1, lineHeight: 17 },
});
