import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import { useAuth, Hotel, HOTELS } from '@/context/AuthContext';

const HOTEL_META: Record<Hotel, { icon: React.ComponentProps<typeof Feather>['name']; tagline: string; bg: string; accent: string }> = {
  'Rewaya Majestic': { icon: 'star', tagline: 'Flagship Property · Fine Dining', bg: '#FFF8E7', accent: '#B7791F' },
  'Rewaya Inn':      { icon: 'home', tagline: 'Boutique · À la carte',           bg: '#EFF6FF', accent: '#1D4ED8' },
  'Rewaya Luxury':   { icon: 'award', tagline: 'Five-Star · Premium Buffets',     bg: '#F5F3FF', accent: '#6D28D9' },
};

export default function HotelPickerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, selectHotel, logout } = useAuth();

  const available = (user?.allowedHotels ?? HOTELS.slice()) as Hotel[];

  return (
    <View style={[styles.root, { backgroundColor: colors.primary }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
        <View>
          <Text style={styles.headerGreet}>Welcome back,</Text>
          <Text style={styles.headerName}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Feather name="log-out" size={18} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>
      </View>

      <Text style={styles.headerSub}>Select the hotel you are working at today</Text>

      {/* Hotel cards */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {(HOTELS as readonly Hotel[]).map(hotel => {
          const meta = HOTEL_META[hotel];
          const isAvailable = available.includes(hotel);

          return (
            <TouchableOpacity
              key={hotel}
              style={[
                styles.hotelCard,
                { backgroundColor: isAvailable ? colors.background : colors.muted },
                !isAvailable && { opacity: 0.5 },
              ]}
              onPress={() => {
                if (!isAvailable) return;
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                selectHotel(hotel);
              }}
              disabled={!isAvailable}
              activeOpacity={0.85}
            >
              <View style={[styles.hotelIconWrap, { backgroundColor: meta.bg }]}>
                <Feather name={meta.icon} size={26} color={meta.accent} />
              </View>
              <View style={styles.hotelBody}>
                <Text style={[styles.hotelName, { color: colors.text }]}>{hotel}</Text>
                <Text style={[styles.hotelTagline, { color: colors.mutedForeground }]}>{meta.tagline}</Text>
                {!isAvailable && (
                  <Text style={[styles.noAccess, { color: colors.mutedForeground }]}>
                    No access — contact your Director
                  </Text>
                )}
              </View>
              {isAvailable && (
                <View style={[styles.selectBadge, { backgroundColor: meta.accent }]}>
                  <Feather name="arrow-right" size={16} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {/* Identity info */}
        <View style={[styles.identityCard, { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.15)' }]}>
          <Feather name="user" size={14} color="rgba(255,255,255,0.6)" />
          <Text style={styles.identityText}>
            Signed in as <Text style={{ fontFamily: 'Inter_700Bold' }}>{user?.username}</Text>
            {user?.role === 'director' ? ' · Director' : ' · Manager'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 24, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 6 },
  headerGreet: { color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter_400Regular', fontSize: 14 },
  headerName: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 26 },
  headerSub: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', fontSize: 13, paddingHorizontal: 24, marginTop: 6, marginBottom: 20 },
  logoutBtn: { padding: 8 },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, gap: 14 },
  hotelCard: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    borderRadius: 18, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 4,
  },
  hotelIconWrap: { width: 58, height: 58, borderRadius: 16, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  hotelBody: { flex: 1, gap: 3 },
  hotelName: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  hotelTagline: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  noAccess: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 2 },
  selectBadge: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  identityCard: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 8 },
  identityText: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_400Regular', fontSize: 12 },
});
