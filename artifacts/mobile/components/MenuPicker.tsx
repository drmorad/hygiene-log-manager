/**
 * MenuPicker — horizontal chip strip for quick-filling entry forms
 * from the establishment's menu library.
 */
import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '@/hooks/useColors';
import { MenuItem, MenuItemCategory } from '@/context/AppContext';

interface Props {
  items: MenuItem[];
  category: MenuItemCategory;
  onSelect: (item: MenuItem) => void;
  onManage: () => void;
  label?: string;
}

const CATEGORY_COLORS: Record<MenuItemCategory, { bg: string; text: string }> = {
  hot:      { bg: '#FADBD8', text: '#C0392B' },
  cold:     { bg: '#D6EAF8', text: '#1A5276' },
  thawing:  { bg: '#D1F2EB', text: '#1A7B8A' },
  produce:  { bg: '#E8F8F5', text: '#1E8449' },
  received: { bg: '#F4ECF7', text: '#7D3C98' },
};

export function MenuPicker({ items, category, onSelect, onManage, label }: Props) {
  const colors = useColors();
  const filtered = items.filter(i => i.category === category);
  const accent = CATEGORY_COLORS[category];

  return (
    <View style={styles.root}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={[styles.labelPill, { backgroundColor: accent.bg }]}>
          <Feather name="list" size={11} color={accent.text} />
          <Text style={[styles.labelText, { color: accent.text }]}>
            {label ?? 'MENU QUICK-PICK'}
          </Text>
        </View>
        <TouchableOpacity style={styles.manageBtn} onPress={onManage}>
          <Feather name="edit-2" size={12} color={colors.mutedForeground} />
          <Text style={[styles.manageBtnText, { color: colors.mutedForeground }]}>Manage</Text>
        </TouchableOpacity>
      </View>

      {/* Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        keyboardShouldPersistTaps="handled"
      >
        {filtered.length === 0 ? (
          <TouchableOpacity
            style={[styles.emptyChip, { borderColor: colors.border, backgroundColor: colors.muted }]}
            onPress={onManage}
          >
            <Feather name="plus" size={13} color={colors.mutedForeground} />
            <Text style={[styles.emptyChipText, { color: colors.mutedForeground }]}>
              Add menu items
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            {filtered.map(item => (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, { backgroundColor: accent.bg, borderColor: accent.text + '40' }]}
                onPress={() => onSelect(item)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, { color: accent.text }]}>{item.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.addChip, { borderColor: colors.border, backgroundColor: colors.muted }]}
              onPress={onManage}
            >
              <Feather name="plus" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    marginTop: 8,
    marginBottom: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  labelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  labelText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  manageBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  chips: {
    gap: 8,
    paddingBottom: 2,
  },
  chip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  addChip: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  emptyChipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
});
