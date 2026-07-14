/**
 * Director Dashboard — private tab visible only to users with role === 'director'
 * Shows real-time analytics across all 3 Rewaya hotels.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
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
import { useAuth, HOTELS, Hotel } from '@/context/AuthContext';
import { useApi } from '@/hooks/useApi';

// ─── Types ────────────────────────────────────────────────────────────────────

interface HotelStat {
  hotel: string;
  totalToday: number;
  totalWeek: number;
  complianceToday: number | null;
  complianceWeek: number | null;
  violationsWeek: number;
  cautionsWeek: number;
  missingCCPs: string[];
  ccpToday: Record<string, number>;
  trend: { date: string; compliance: number | null }[];
  managerActivity: { managerId: string; managerName: string; count: number }[];
  recentViolations: {
    id: string; date: string; hotel: string; managerName: string;
    type: string; item: string; correctiveAction: string;
  }[];
}

interface AnalyticsData {
  global: {
    totalToday: number; totalWeek: number;
    complianceToday: number | null; complianceWeek: number | null;
    violationsToday: number; cautionsToday: number; missingHotels: string[];
  };
  hotels: HotelStat[];
  managerActivity: { managerId: string; managerName: string; hotel: string; count: number }[];
  managers: { id: string; username: string; name: string; role: string; allowedHotels: string[]; createdAt: string }[];
  generatedAt: string;
}

// ─── Micro components ─────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, icon }: { label: string; value: string | number; sub?: string; color: string; icon: React.ComponentProps<typeof Feather>['name'] }) {
  const colors = useColors();
  return (
    <View style={[sty.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[sty.statIcon, { backgroundColor: color + '18' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={[sty.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[sty.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {sub ? <Text style={[sty.statSub, { color: colors.mutedForeground }]}>{sub}</Text> : null}
    </View>
  );
}

function ComplianceBar({ pct, color }: { pct: number | null; color: string }) {
  const colors = useColors();
  if (pct === null) return <Text style={{ color: colors.mutedForeground, fontSize: 11, fontFamily: 'Inter_400Regular' }}>No data</Text>;
  const fill = Math.max(0, Math.min(100, pct));
  const barColor = pct >= 95 ? '#16A34A' : pct >= 80 ? '#D97706' : '#DC2626';
  return (
    <View style={{ gap: 4 }}>
      <View style={[sty.barTrack, { backgroundColor: colors.muted }]}>
        <View style={[sty.barFill, { width: `${fill}%` as any, backgroundColor: barColor }]} />
      </View>
      <Text style={{ color: barColor, fontFamily: 'Inter_700Bold', fontSize: 12 }}>{pct}% compliance</Text>
    </View>
  );
}

function MiniTrendChart({ trend, color }: { trend: { date: string; compliance: number | null }[]; color: string }) {
  const colors = useColors();
  const max = 100;
  const CHART_H = 40;
  return (
    <View style={sty.miniChart}>
      {trend.map((t, i) => {
        const h = t.compliance !== null ? Math.max(4, (t.compliance / max) * CHART_H) : 4;
        const barColor = t.compliance === null ? colors.border : t.compliance >= 95 ? '#16A34A' : t.compliance >= 80 ? '#D97706' : '#DC2626';
        return (
          <View key={i} style={sty.miniBarWrap}>
            <View style={[sty.miniBar, { height: h, backgroundColor: barColor }]} />
            <Text style={[sty.miniBarLabel, { color: colors.mutedForeground }]}>
              {t.date.slice(5)}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

// ─── Add Manager Modal ────────────────────────────────────────────────────────

function AddManagerModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const colors = useColors();
  const { post } = useApi();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [selectedHotels, setSelectedHotels] = useState<Hotel[]>([...HOTELS]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleHotel = (h: Hotel) => {
    setSelectedHotels(prev => prev.includes(h) ? prev.filter(x => x !== h) : [...prev, h]);
  };

  const handleCreate = async () => {
    if (!name.trim() || !username.trim() || !password) { setError('All fields required'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (!selectedHotels.length) { setError('Select at least one hotel'); return; }
    setLoading(true); setError('');
    try {
      await post('/users', { name: name.trim(), username: username.trim().toLowerCase(), password, allowedHotels: selectedHotels });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setName(''); setUsername(''); setPassword(''); setSelectedHotels([...HOTELS]);
      onCreated();
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <ScrollView style={[sty.addModal, { backgroundColor: colors.background }]} keyboardShouldPersistTaps="handled">
        <View style={[sty.addModalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose}><Feather name="x" size={22} color={colors.mutedForeground} /></TouchableOpacity>
          <Text style={[sty.addModalTitle, { color: colors.text }]}>New Manager Account</Text>
          <View style={{ width: 22 }} />
        </View>

        {!!error && (
          <View style={[sty.errBox, { backgroundColor: '#FEF3F2', borderColor: '#FCA5A5' }]}>
            <Text style={{ color: '#DC2626', fontFamily: 'Inter_400Regular', fontSize: 13 }}>{error}</Text>
          </View>
        )}

        <Text style={[sty.fieldLabel, { color: colors.mutedForeground }]}>FULL NAME</Text>
        <TextInput style={[sty.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={name} onChangeText={setName} placeholder="e.g. Ahmed Hassan" placeholderTextColor={colors.mutedForeground} autoFocus />

        <Text style={[sty.fieldLabel, { color: colors.mutedForeground }]}>USERNAME</Text>
        <TextInput style={[sty.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={username} onChangeText={setUsername} placeholder="e.g. ahmed.hassan" placeholderTextColor={colors.mutedForeground} autoCapitalize="none" autoCorrect={false} />

        <Text style={[sty.fieldLabel, { color: colors.mutedForeground }]}>TEMPORARY PASSWORD</Text>
        <TextInput style={[sty.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.card }]} value={password} onChangeText={setPassword} placeholder="Min. 6 characters" placeholderTextColor={colors.mutedForeground} secureTextEntry />

        <Text style={[sty.fieldLabel, { color: colors.mutedForeground }]}>HOTEL ACCESS</Text>
        <Text style={[sty.fieldHint, { color: colors.mutedForeground }]}>Select which hotels this manager can log for</Text>
        <View style={sty.hotelChips}>
          {HOTELS.map(h => {
            const sel = selectedHotels.includes(h);
            return (
              <TouchableOpacity key={h} style={[sty.hotelChip, { borderColor: sel ? '#1A5276' : colors.border, backgroundColor: sel ? '#EBF5FB' : colors.card }]} onPress={() => toggleHotel(h)}>
                <Feather name={sel ? 'check-square' : 'square'} size={14} color={sel ? '#1A5276' : colors.mutedForeground} />
                <Text style={[sty.hotelChipText, { color: sel ? '#1A5276' : colors.mutedForeground }]}>{h}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={[sty.createBtn, { backgroundColor: '#1A5276' }, loading && { opacity: 0.7 }]} onPress={handleCreate} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : (
            <>
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={sty.createBtnText}>Create Manager Account</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

const HOTEL_COLORS: Record<string, string> = {
  'Rewaya Majestic': '#B7791F',
  'Rewaya Inn':      '#1D4ED8',
  'Rewaya Luxury':   '#6D28D9',
};

export default function DirectorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const { get, del } = useApi();

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedHotel, setSelectedHotel] = useState<string>('All');
  const [activeSection, setActiveSection] = useState<'overview' | 'team' | 'violations'>('overview');
  const [addManagerOpen, setAddManagerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const d = await get<AnalyticsData>('/analytics');
      setData(d);
    } catch (e) {
      // keep old data if refresh fails
    }
  }, [get]);

  useEffect(() => { fetchData().finally(() => setLoading(false)); }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleDeleteManager = (manager: AnalyticsData['managers'][0]) => {
    Alert.alert('Remove Manager', `Remove ${manager.name}'s account? This is permanent.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try { await del(`/users/${manager.id}`); fetchData(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        },
      },
    ]);
  };

  // Computed hotel stats
  const displayedHotels = data?.hotels.filter(h => selectedHotel === 'All' || h.hotel === selectedHotel) ?? [];
  const globalViolations = data?.hotels.flatMap(h => h.recentViolations) ?? [];
  const filteredViolations = selectedHotel === 'All' ? globalViolations : globalViolations.filter(v => v.hotel === selectedHotel);

  if (loading) return (
    <View style={[sty.loadWrap, { backgroundColor: colors.background }]}>
      <ActivityIndicator size="large" color="#1A5276" />
      <Text style={[sty.loadText, { color: colors.mutedForeground }]}>Loading director dashboard…</Text>
    </View>
  );

  return (
    <View style={[sty.root, { backgroundColor: colors.background }]}>
      {/* Director header */}
      <View style={[sty.header, { paddingTop: insets.top + 14, backgroundColor: '#0D3349' }]}>
        <View style={sty.headerTop}>
          <View>
            <Text style={sty.headerLabel}>DIRECTOR DASHBOARD</Text>
            <Text style={sty.headerTitle}>Quality & Hygiene</Text>
          </View>
          <TouchableOpacity style={sty.refreshBtn} onPress={onRefresh}>
            <Feather name="refresh-cw" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>

        {/* Global KPIs */}
        {data && (
          <View style={sty.kpiRow}>
            <View style={sty.kpiCard}>
              <Text style={sty.kpiValue}>{data.global.totalToday}</Text>
              <Text style={sty.kpiLabel}>Entries Today</Text>
            </View>
            <View style={[sty.kpiDivider]} />
            <View style={sty.kpiCard}>
              <Text style={[sty.kpiValue, {
                color: data.global.complianceToday === null ? '#fff' :
                  data.global.complianceToday >= 95 ? '#6EE7B7' :
                  data.global.complianceToday >= 80 ? '#FCD34D' : '#FCA5A5',
              }]}>
                {data.global.complianceToday !== null ? `${data.global.complianceToday}%` : '—'}
              </Text>
              <Text style={sty.kpiLabel}>Compliance</Text>
            </View>
            <View style={sty.kpiDivider} />
            <View style={sty.kpiCard}>
              <Text style={[sty.kpiValue, { color: data.global.violationsToday > 0 ? '#FCA5A5' : '#6EE7B7' }]}>
                {data.global.violationsToday}
              </Text>
              <Text style={sty.kpiLabel}>Violations</Text>
            </View>
            <View style={sty.kpiDivider} />
            <View style={sty.kpiCard}>
              <Text style={[sty.kpiValue, { color: data.global.missingHotels.length > 0 ? '#FCD34D' : '#6EE7B7' }]}>
                {data.global.missingHotels.length > 0 ? data.global.missingHotels.length : '✓'}
              </Text>
              <Text style={sty.kpiLabel}>Inactive</Text>
            </View>
          </View>
        )}

        {/* Section tabs */}
        <View style={sty.sectionTabs}>
          {(['overview', 'violations', 'team'] as const).map(s => (
            <TouchableOpacity key={s} style={[sty.sectionTab, activeSection === s && sty.sectionTabActive]} onPress={() => setActiveSection(s)}>
              <Text style={[sty.sectionTabText, activeSection === s && sty.sectionTabTextActive]}>
                {s === 'overview' ? 'Overview' : s === 'violations' ? 'Violations' : 'Team'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hotel filter pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[sty.hotelFilterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]} contentContainerStyle={sty.hotelFilterContent}>
        {['All', ...HOTELS].map(h => {
          const active = selectedHotel === h;
          const col = h === 'All' ? '#1A5276' : HOTEL_COLORS[h];
          return (
            <TouchableOpacity key={h} style={[sty.hotelPill, active && { backgroundColor: col }]} onPress={() => setSelectedHotel(h)}>
              <Text style={[sty.hotelPillText, { color: active ? '#fff' : colors.mutedForeground }]}>{h === 'All' ? 'All Hotels' : h.replace('Rewaya ', '')}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={sty.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1A5276" />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── OVERVIEW ───────────────────────────────────────────────────── */}
        {activeSection === 'overview' && (
          <View style={sty.section}>
            {displayedHotels.map(stat => {
              const hotelColor = HOTEL_COLORS[stat.hotel] ?? '#1A5276';
              return (
                <View key={stat.hotel} style={[sty.hotelCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {/* Hotel header */}
                  <View style={[sty.hotelCardHeader, { backgroundColor: hotelColor }]}>
                    <Text style={sty.hotelCardName}>{stat.hotel}</Text>
                    <View style={sty.hotelHeaderRight}>
                      {stat.missingCCPs.length > 0 && (
                        <View style={sty.alertBadge}>
                          <Feather name="alert-triangle" size={11} color="#fff" />
                          <Text style={sty.alertBadgeText}>{stat.missingCCPs.length} missing</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  <View style={sty.hotelCardBody}>
                    {/* Compliance bar */}
                    <ComplianceBar pct={stat.complianceToday} color={hotelColor} />

                    {/* CCP grid */}
                    <View style={sty.ccpGrid}>
                      {Object.entries(stat.ccpToday).map(([ccp, count]) => {
                        const missing = count === 0;
                        return (
                          <View key={ccp} style={[sty.ccpCell, { borderColor: missing ? '#FCA5A5' : colors.border, backgroundColor: missing ? '#FEF3F2' : colors.background }]}>
                            <Text style={[sty.ccpCount, { color: missing ? '#DC2626' : colors.text }]}>{count}</Text>
                            <Text style={[sty.ccpName, { color: colors.mutedForeground }]}>{ccp}</Text>
                            {missing && <Feather name="alert-circle" size={10} color="#DC2626" />}
                          </View>
                        );
                      })}
                    </View>

                    {/* 7-day trend */}
                    <Text style={[sty.subHeading, { color: colors.mutedForeground }]}>7-DAY COMPLIANCE TREND</Text>
                    <MiniTrendChart trend={stat.trend} color={hotelColor} />

                    {/* Manager activity today */}
                    {stat.managerActivity.length > 0 && (
                      <>
                        <Text style={[sty.subHeading, { color: colors.mutedForeground }]}>ACTIVE TODAY</Text>
                        {stat.managerActivity.map(m => (
                          <View key={m.managerId} style={[sty.activityRow, { borderColor: colors.border }]}>
                            <View style={[sty.avatarCircle, { backgroundColor: hotelColor + '20' }]}>
                              <Text style={[sty.avatarText, { color: hotelColor }]}>{m.managerName.charAt(0).toUpperCase()}</Text>
                            </View>
                            <Text style={[sty.activityName, { color: colors.text }]}>{m.managerName}</Text>
                            <View style={[sty.countPill, { backgroundColor: hotelColor + '18' }]}>
                              <Text style={[sty.countPillText, { color: hotelColor }]}>{m.count} entries</Text>
                            </View>
                          </View>
                        ))}
                      </>
                    )}

                    {stat.managerActivity.length === 0 && (
                      <View style={[sty.emptyToday, { backgroundColor: '#FFF8E7', borderColor: '#FCD34D' }]}>
                        <Feather name="clock" size={14} color="#D97706" />
                        <Text style={{ color: '#D97706', fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 }}>
                          No manager activity recorded yet today
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ── VIOLATIONS ─────────────────────────────────────────────────── */}
        {activeSection === 'violations' && (
          <View style={sty.section}>
            {filteredViolations.length === 0 ? (
              <View style={[sty.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="check-circle" size={40} color="#16A34A" />
                <Text style={[sty.emptyStateTitle, { color: colors.text }]}>No Violations</Text>
                <Text style={[sty.emptyStateSub, { color: colors.mutedForeground }]}>All logs within the last 7 days are passing</Text>
              </View>
            ) : filteredViolations.map((v, i) => (
              <View key={`${v.id}-${i}`} style={[sty.violationCard, { backgroundColor: colors.card, borderColor: '#FCA5A5' }]}>
                <View style={sty.violationTop}>
                  <View style={[sty.failBadge, { backgroundColor: '#FEF3F2' }]}>
                    <Feather name="x-circle" size={12} color="#DC2626" />
                    <Text style={{ color: '#DC2626', fontFamily: 'Inter_700Bold', fontSize: 10 }}>FAIL</Text>
                  </View>
                  <Text style={[sty.violationDate, { color: colors.mutedForeground }]}>{v.date}</Text>
                  <View style={[sty.violationHotelTag, { backgroundColor: (HOTEL_COLORS[v.hotel] ?? '#1A5276') + '18' }]}>
                    <Text style={[sty.violationHotelTagText, { color: HOTEL_COLORS[v.hotel] ?? '#1A5276' }]}>{v.hotel.replace('Rewaya ', '')}</Text>
                  </View>
                </View>
                <Text style={[sty.violationItem, { color: colors.text }]}>{v.item || '—'}</Text>
                <Text style={[sty.violationType, { color: colors.mutedForeground }]}>{v.type} · {v.managerName}</Text>
                {!!v.correctiveAction && (
                  <View style={[sty.correctiveBox, { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }]}>
                    <Feather name="tool" size={12} color="#1D4ED8" />
                    <Text style={{ color: '#1D4ED8', fontFamily: 'Inter_400Regular', fontSize: 12, flex: 1 }}>{v.correctiveAction}</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* ── TEAM ───────────────────────────────────────────────────────── */}
        {activeSection === 'team' && (
          <View style={sty.section}>
            {/* Add manager button */}
            <TouchableOpacity style={[sty.addManagerBtn, { backgroundColor: '#1A5276' }]} onPress={() => setAddManagerOpen(true)}>
              <Feather name="user-plus" size={16} color="#fff" />
              <Text style={sty.addManagerBtnText}>Add New Manager</Text>
            </TouchableOpacity>

            {/* Manager cards */}
            {(data?.managers ?? []).length === 0 && (
              <View style={[sty.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="users" size={32} color={colors.border} />
                <Text style={[sty.emptyStateTitle, { color: colors.text }]}>No Managers Yet</Text>
                <Text style={[sty.emptyStateSub, { color: colors.mutedForeground }]}>Tap "Add New Manager" to create your first account</Text>
              </View>
            )}

            {(data?.managers ?? []).map(m => {
              const todayEntries = data?.managerActivity.filter(a => a.managerId === m.id).reduce((sum, a) => sum + a.count, 0) ?? 0;
              return (
                <View key={m.id} style={[sty.managerCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={sty.managerCardTop}>
                    <View style={[sty.managerAvatar, { backgroundColor: '#1A5276' + '18' }]}>
                      <Text style={[sty.managerAvatarText, { color: '#1A5276' }]}>{m.name.charAt(0).toUpperCase()}</Text>
                    </View>
                    <View style={sty.managerInfo}>
                      <Text style={[sty.managerName, { color: colors.text }]}>{m.name}</Text>
                      <Text style={[sty.managerUsername, { color: colors.mutedForeground }]}>@{m.username}</Text>
                    </View>
                    <View style={[sty.activityCount, { backgroundColor: todayEntries > 0 ? '#EFF6FF' : colors.muted }]}>
                      <Text style={[sty.activityCountNum, { color: todayEntries > 0 ? '#1D4ED8' : colors.mutedForeground }]}>{todayEntries}</Text>
                      <Text style={[sty.activityCountLabel, { color: colors.mutedForeground }]}>today</Text>
                    </View>
                    <TouchableOpacity style={[sty.deleteManagerBtn, { backgroundColor: '#FEF3F2' }]} onPress={() => handleDeleteManager(m)}>
                      <Feather name="trash-2" size={14} color="#DC2626" />
                    </TouchableOpacity>
                  </View>

                  {/* Hotel access chips */}
                  <View style={sty.hotelAccessRow}>
                    {(m.allowedHotels as Hotel[]).map(h => (
                      <View key={h} style={[sty.hotelAccessChip, { backgroundColor: (HOTEL_COLORS[h] ?? '#1A5276') + '14', borderColor: (HOTEL_COLORS[h] ?? '#1A5276') + '30' }]}>
                        <Text style={[sty.hotelAccessChipText, { color: HOTEL_COLORS[h] ?? '#1A5276' }]}>{h.replace('Rewaya ', '')}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <AddManagerModal
        visible={addManagerOpen}
        onClose={() => setAddManagerOpen(false)}
        onCreated={() => { setAddManagerOpen(false); fetchData(); }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const sty = StyleSheet.create({
  root: { flex: 1 },
  loadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  // Header
  header: { paddingHorizontal: 16, paddingBottom: 0 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLabel: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.5 },
  headerTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 22 },
  refreshBtn: { padding: 8 },
  kpiRow: { flexDirection: 'row', marginBottom: 14 },
  kpiCard: { flex: 1, alignItems: 'center', gap: 4 },
  kpiValue: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 20 },
  kpiLabel: { color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter_400Regular', fontSize: 10 },
  kpiDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginHorizontal: 4 },
  sectionTabs: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.12)', marginTop: 4 },
  sectionTab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2.5, borderBottomColor: 'transparent' },
  sectionTabActive: { borderBottomColor: '#fff' },
  sectionTabText: { color: 'rgba(255,255,255,0.5)', fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  sectionTabTextActive: { color: '#fff' },
  // Hotel filter
  hotelFilterBar: { maxHeight: 48, borderBottomWidth: 1 },
  hotelFilterContent: { paddingHorizontal: 12, gap: 8, alignItems: 'center' },
  hotelPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  hotelPillText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  // Scroll
  scroll: { flex: 1 },
  section: { padding: 14, gap: 14 },
  // Hotel card
  hotelCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  hotelCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  hotelCardName: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
  hotelHeaderRight: { flexDirection: 'row', gap: 8 },
  alertBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.25)', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  alertBadgeText: { color: '#fff', fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  hotelCardBody: { padding: 14, gap: 12 },
  // Compliance bar
  barTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  // CCP grid
  ccpGrid: { flexDirection: 'row', gap: 8 },
  ccpCell: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 10, alignItems: 'center', gap: 3 },
  ccpCount: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  ccpName: { fontFamily: 'Inter_400Regular', fontSize: 9, textAlign: 'center' },
  // Chart
  subHeading: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1 },
  miniChart: { flexDirection: 'row', gap: 4, alignItems: 'flex-end', height: 60 },
  miniBarWrap: { flex: 1, alignItems: 'center', gap: 4, justifyContent: 'flex-end' },
  miniBar: { width: '100%', borderRadius: 3, minHeight: 4 },
  miniBarLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  // Activity
  activityRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1 },
  avatarCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  activityName: { flex: 1, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  countPill: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  countPillText: { fontFamily: 'Inter_700Bold', fontSize: 11 },
  emptyToday: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  // Violations
  violationCard: { borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 8 },
  violationTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  failBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  violationDate: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  violationHotelTag: { marginLeft: 'auto' as any, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  violationHotelTagText: { fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  violationItem: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  violationType: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  correctiveBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderRadius: 8, borderWidth: 1, padding: 10 },
  // Empty state
  emptyState: { borderRadius: 14, borderWidth: 1, alignItems: 'center', padding: 40, gap: 10 },
  emptyStateTitle: { fontFamily: 'Inter_700Bold', fontSize: 17 },
  emptyStateSub: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  // Team
  addManagerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 12, paddingVertical: 14 },
  addManagerBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  managerCard: { borderRadius: 12, borderWidth: 1, padding: 14, gap: 10 },
  managerCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  managerAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  managerAvatarText: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  managerInfo: { flex: 1 },
  managerName: { fontFamily: 'Inter_700Bold', fontSize: 15 },
  managerUsername: { fontFamily: 'Inter_400Regular', fontSize: 12 },
  activityCount: { alignItems: 'center', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  activityCountNum: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  activityCountLabel: { fontFamily: 'Inter_400Regular', fontSize: 9 },
  deleteManagerBtn: { borderRadius: 8, padding: 8 },
  hotelAccessRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  hotelAccessChip: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  hotelAccessChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  // Add manager modal
  addModal: { flex: 1, padding: 20 },
  addModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 16, borderBottomWidth: 1, marginBottom: 16 },
  addModalTitle: { fontFamily: 'Inter_700Bold', fontSize: 18 },
  errBox: { borderRadius: 8, borderWidth: 1, padding: 12, marginBottom: 12 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 1, marginBottom: 6, marginTop: 14 },
  fieldHint: { fontFamily: 'Inter_400Regular', fontSize: 12, marginBottom: 10, marginTop: -4 },
  input: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontFamily: 'Inter_400Regular', fontSize: 15 },
  hotelChips: { gap: 8 },
  hotelChip: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderRadius: 10, padding: 12 },
  hotelChipText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 12, paddingVertical: 15, marginTop: 20, marginBottom: 30 },
  createBtnText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 15 },
  // Stat card
  statCard: { borderRadius: 12, borderWidth: 1, padding: 14, alignItems: 'center', gap: 6, flex: 1 },
  statIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontFamily: 'Inter_700Bold', fontSize: 22 },
  statLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 0.5, textAlign: 'center' },
  statSub: { fontFamily: 'Inter_400Regular', fontSize: 10 },
});
