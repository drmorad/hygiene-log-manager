/**
 * MenuLibraryModal — full-screen modal for managing the food menu library.
 * Staff can add, edit and delete items across all 5 categories.
 */
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
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useApp, genId, MenuItem, MenuItemCategory, DEFAULT_MENU_ITEMS } from '@/context/AppContext';

interface Props {
  visible: boolean;
  onClose: () => void;
  initialCategory?: MenuItemCategory;
}

type ThawMethod = 'refrigerator' | 'cold_water' | 'microwave' | 'cooking';

const CATEGORIES: { value: MenuItemCategory; label: string; icon: React.ComponentProps<typeof Feather>['name']; color: string; bg: string }[] = [
  { value: 'hot',      label: 'Hot Items',      icon: 'thermometer', color: '#C0392B', bg: '#FADBD8' },
  { value: 'cold',     label: 'Cold Items',     icon: 'thermometer', color: '#1A5276', bg: '#D6EAF8' },
  { value: 'thawing',  label: 'Thawing',        icon: 'wind',        color: '#1A7B8A', bg: '#D1F2EB' },
  { value: 'produce',  label: 'Produce',        icon: 'droplet',     color: '#1E8449', bg: '#E8F8F5' },
  { value: 'received', label: 'Received Goods', icon: 'package',     color: '#7D3C98', bg: '#F4ECF7' },
];

const THAW_METHOD_OPTIONS: { value: ThawMethod; label: string }[] = [
  { value: 'refrigerator', label: 'Refrigerator' },
  { value: 'cold_water',   label: 'Cold Water' },
  { value: 'microwave',    label: 'Microwave' },
  { value: 'cooking',      label: 'Direct Cooking' },
];

export function MenuLibraryModal({ visible, onClose, initialCategory = 'hot' }: Props) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { menuItems, addMenuItem, deleteMenuItem } = useApp();

  const [activeCategory, setActiveCategory] = useState<MenuItemCategory>(initialCategory);
  const [addOpen, setAddOpen] = useState(false);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newZone, setNewZone] = useState('');
  const [newMethod, setNewMethod] = useState<ThawMethod>('refrigerator');
  const [newUnit, setNewUnit] = useState('');

  const catInfo = CATEGORIES.find(c => c.value === activeCategory)!;
  const filtered = menuItems.filter(m => m.category === activeCategory);

  const resetAddForm = () => {
    setNewName('');
    setNewZone('');
    setNewMethod('refrigerator');
    setNewUnit('');
  };

  const handleAdd = () => {
    if (!newName.trim()) {
      Alert.alert('Missing Name', 'Please enter the item name.');
      return;
    }
    const item: MenuItem = {
      id: genId(),
      name: newName.trim(),
      category: activeCategory,
      ...(newZone.trim() ? { defaultZone: newZone.trim() } : {}),
      ...(activeCategory === 'thawing' ? { defaultMethod: newMethod } : {}),
      ...(newUnit.trim() ? { defaultUnit: newUnit.trim() } : {}),
    };
    addMenuItem(item);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAddForm();
    setAddOpen(false);
  };

  const handleDelete = (item: MenuItem) => {
    Alert.alert('Remove Item', `Remove "${item.name}" from the menu library?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: () => { deleteMenuItem(item.id); Haptics.impactAsync(); },
      },
    ]);
  };

  const handleRestoreDefaults = () => {
    Alert.alert(
      'Restore Default Items',
      'This will add back all factory default menu items (your custom items are kept).',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          onPress: () => {
            const existingIds = menuItems.map(m => m.id);
            DEFAULT_MENU_ITEMS.forEach(di => {
              if (!existingIds.includes(di.id)) addMenuItem(di);
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ],
    );
  };

  const topPad = Platform.OS === 'web' ? 0 : insets.top;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.root, { backgroundColor: colors.background }]}>

        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: topPad + 14 }]}>
          <TouchableOpacity onPress={onClose}>
            <Feather name="x" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Menu Library</Text>
          <TouchableOpacity onPress={handleRestoreDefaults}>
            <Feather name="refresh-ccw" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Category tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
          contentContainerStyle={styles.tabBarContent}
        >
          {CATEGORIES.map(cat => {
            const active = activeCategory === cat.value;
            return (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.tab,
                  active && { borderBottomColor: cat.color, borderBottomWidth: 2.5, backgroundColor: cat.bg },
                ]}
                onPress={() => { setActiveCategory(cat.value); setAddOpen(false); }}
              >
                <Feather name={cat.icon} size={14} color={active ? cat.color : colors.mutedForeground} />
                <Text style={[styles.tabText, { color: active ? cat.color : colors.mutedForeground }]}>
                  {cat.label}
                </Text>
                {menuItems.filter(m => m.category === cat.value).length > 0 && (
                  <View style={[styles.tabCount, { backgroundColor: active ? cat.color : colors.border }]}>
                    <Text style={[styles.tabCountText, { color: active ? '#fff' : colors.mutedForeground }]}>
                      {menuItems.filter(m => m.category === cat.value).length}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Item list */}
        <FlatList
          data={filtered}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 14, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={32} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No {catInfo.label.toLowerCase()} items yet
              </Text>
              <Text style={[styles.emptySub, { color: colors.mutedForeground }]}>
                Tap + Add Item below to get started
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.itemCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.itemDot, { backgroundColor: catInfo.bg }]}>
                <Feather name={catInfo.icon} size={14} color={catInfo.color} />
              </View>
              <View style={styles.itemBody}>
                <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>
                <Text style={[styles.itemMeta, { color: colors.mutedForeground }]}>
                  {item.defaultZone ? `📍 ${item.defaultZone}` : ''}
                  {item.defaultZone && (item.defaultMethod || item.defaultUnit) ? '  ·  ' : ''}
                  {item.defaultMethod ? `❄ ${item.defaultMethod.replace('_', ' ')}` : ''}
                  {item.defaultUnit ? `  ${item.defaultUnit}` : ''}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.deleteBtn, { backgroundColor: colors.muted }]}
                onPress={() => handleDelete(item)}
              >
                <Feather name="trash-2" size={14} color={colors.mutedForeground} />
              </TouchableOpacity>
            </View>
          )}
        />

        {/* Add panel */}
        {addOpen && (
          <View style={[styles.addPanel, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <View style={styles.addPanelHeader}>
                <Text style={[styles.addPanelTitle, { color: colors.text }]}>
                  New {catInfo.label.replace(' Items', '')} Item
                </Text>
                <TouchableOpacity onPress={() => { setAddOpen(false); resetAddForm(); }}>
                  <Feather name="x" size={20} color={colors.mutedForeground} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>ITEM NAME *</Text>
              <TextInput
                style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                value={newName}
                onChangeText={setNewName}
                placeholder={activeCategory === 'hot' ? 'e.g. Roasted Duck' : activeCategory === 'cold' ? 'e.g. Lobster Bisque' : activeCategory === 'produce' ? 'e.g. Rocket Leaves' : 'e.g. Beef Ribeye'}
                placeholderTextColor={colors.mutedForeground}
                autoFocus
              />

              {(activeCategory === 'hot' || activeCategory === 'cold') && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DEFAULT ZONE / STATION</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={newZone}
                    onChangeText={setNewZone}
                    placeholder="e.g. Hot Counter, Carving Station"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </>
              )}

              {activeCategory === 'thawing' && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DEFAULT THAWING METHOD</Text>
                  <View style={styles.methodRow}>
                    {THAW_METHOD_OPTIONS.map(m => (
                      <TouchableOpacity
                        key={m.value}
                        style={[styles.methodChip, {
                          borderColor: newMethod === m.value ? colors.primary : colors.border,
                          backgroundColor: newMethod === m.value ? colors.secondary : colors.background,
                        }]}
                        onPress={() => setNewMethod(m.value)}
                      >
                        <Text style={[styles.methodChipText, { color: newMethod === m.value ? colors.primary : colors.mutedForeground }]}>
                          {m.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DEFAULT UNIT</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={newUnit}
                    onChangeText={setNewUnit}
                    placeholder="e.g. kg, pcs"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </>
              )}

              {(activeCategory === 'received') && (
                <>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DEFAULT UNIT</Text>
                  <TextInput
                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                    value={newUnit}
                    onChangeText={setNewUnit}
                    placeholder="e.g. kg, L, pcs"
                    placeholderTextColor={colors.mutedForeground}
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.addConfirmBtn, { backgroundColor: catInfo.color }]}
                onPress={handleAdd}
              >
                <Feather name="plus" size={16} color="#fff" />
                <Text style={styles.addConfirmBtnText}>Add to Menu</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}

        {/* FAB */}
        {!addOpen && (
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: catInfo.color, bottom: Platform.OS === 'web' ? 24 : insets.bottom + 16 }]}
            onPress={() => { resetAddForm(); setAddOpen(true); }}
          >
            <Feather name="plus" size={22} color="#fff" />
            <Text style={styles.fabText}>Add Item</Text>
          </TouchableOpacity>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  headerTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 18 },
  tabBar: { borderBottomWidth: 1, maxHeight: 52 },
  tabBarContent: { paddingHorizontal: 8, gap: 0 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginHorizontal: 2,
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  tabCount: {
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabCountText: { fontFamily: 'Inter_700Bold', fontSize: 10 },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  itemDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemBody: { flex: 1 },
  itemName: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  itemMeta: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  deleteBtn: { borderRadius: 8, padding: 8 },
  empty: { alignItems: 'center', paddingTop: 50, gap: 8 },
  emptyText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  emptySub: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  // Add panel
  addPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 18,
    paddingBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 10,
  },
  addPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addPanelTitle: { fontFamily: 'Inter_700Bold', fontSize: 16 },
  fieldLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  methodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  methodChip: {
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  methodChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  addConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    paddingVertical: 14,
    marginTop: 16,
  },
  addConfirmBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  fabText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 14 },
});
