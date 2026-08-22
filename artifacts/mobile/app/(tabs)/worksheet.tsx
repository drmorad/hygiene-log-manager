/**
 * Fresh-Graduate Daily Follow-Up Worksheet.
 * Structured daily form: morning stand-up Q&A, today's audit target,
 * non-conformities, director mentorship notes, and an end-of-day self-score.
 * Submits to the Director via the /graduate-worksheets API.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { useApp, genId, todayStr } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface NC {
  location: string;
  violation: string;
  correctiveAction: string;
}

const EMPTY_NC: NC = { location: '', violation: '', correctiveAction: '' };

export default function WorksheetScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { worksheets, submitWorksheet } = useApp();
  const { currentHotel } = useAuth();
  const today = todayStr();

  const [standupRisk, setStandupRisk] = useState('');
  const [standupFixed, setStandupFixed] = useState('');
  const [standupVip, setStandupVip] = useState('');
  const [auditZone, setAuditZone] = useState('');
  const [auditTime, setAuditTime] = useState('');
  const [auditStandard, setAuditStandard] = useState('');
  const [auditFinding, setAuditFinding] = useState('');
  const [photoRef, setPhotoRef] = useState('');
  const [nonConf, setNonConf] = useState<NC[]>([{ ...EMPTY_NC }]);
  const [mentorConcept, setMentorConcept] = useState('');
  const [mentorChange, setMentorChange] = useState('');
  const [mentorQuestion, setMentorQuestion] = useState('');
  const [selfLogs, setSelfLogs] = useState<null | boolean>(null);
  const [selfHonest, setSelfHonest] = useState<null | boolean>(null);
  const [selfZones, setSelfZones] = useState<null | boolean>(null);
  const [selfPhotos, setSelfPhotos] = useState<null | boolean>(null);
  const [signature, setSignature] = useState('');
  const [savedId, setSavedId] = useState<string | null>(null);

  // Prefill today's existing worksheet (if already submitted today).
  useEffect(() => {
    const existing = worksheets.find(w => w.date === today && w.hotelId === currentHotel);
    if (!existing) return;
    setSavedId(existing.id);
    setStandupRisk(existing.standupRisk ?? '');
    setStandupFixed(existing.standupFixed ?? '');
    setStandupVip(existing.standupVip ?? '');
    setAuditZone(existing.auditZone ?? '');
    setAuditTime(existing.auditTimeInOut ?? '');
    setAuditStandard(existing.auditStandard ?? '');
    setAuditFinding(existing.auditFinding ?? '');
    setPhotoRef(existing.photoRef ?? '');
    setNonConf(existing.nonConformities?.length ? existing.nonConformities.map(n => ({ ...n })) : [{ ...EMPTY_NC }]);
    setMentorConcept(existing.mentorConcept ?? '');
    setMentorChange(existing.mentorChange ?? '');
    setMentorQuestion(existing.mentorQuestion ?? '');
    setSelfLogs(existing.selfLogsOnTime ?? null);
    setSelfHonest(existing.selfAuditHonest ?? null);
    setSelfZones(existing.selfZonesCovered ?? null);
    setSelfPhotos(existing.selfPhotosAttached ?? null);
    setSignature(existing.signature ?? '');
  }, [worksheets, today, currentHotel]);

  const updateNc = (i: number, key: keyof NC, val: string) => {
    setNonConf(prev => prev.map((n, idx) => idx === i ? { ...n, [key]: val } : n));
  };
  const addNc = () => setNonConf(prev => [...prev, { ...EMPTY_NC }]);
  const removeNc = (i: number) => setNonConf(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = useCallback(() => {
    if (!currentHotel) { Alert.alert('No hotel selected'); return; }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    submitWorksheet({
      id: savedId ?? genId(),
      hotelId: currentHotel,
      managerId: '',
      managerName: '',
      date: today,
      standupRisk, standupFixed, standupVip,
      auditZone, auditTimeInOut: auditTime, auditStandard, auditFinding, photoRef,
      nonConformities: nonConf.filter(n => n.location.trim() || n.violation.trim()),
      mentorConcept, mentorChange, mentorQuestion,
      selfLogsOnTime: selfLogs ?? undefined,
      selfAuditHonest: selfHonest ?? undefined,
      selfZonesCovered: selfZones ?? undefined,
      selfPhotosAttached: selfPhotos ?? undefined,
      signature: signature.trim() ? signature.trim() : undefined,
    });
    Alert.alert('Worksheet submitted', 'The Director has been notified via the dashboard.');
  }, [currentHotel, savedId, today, standupRisk, standupFixed, standupVip, auditZone, auditTime, auditStandard, auditFinding, photoRef, nonConf, mentorConcept, mentorChange, mentorQuestion, selfLogs, selfHonest, selfZones, selfPhotos, signature, submitWorksheet]);

  const displayDate = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const YesNo = ({ value, onChange, label }: { value: null | boolean; onChange: (v: boolean) => void; label: string }) => (
    <View style={sty.scoreRow}>
      <Text style={[sty.scoreLabel, { color: colors.text }]}>{label}</Text>
      <View style={sty.yesNo}>
        <TouchableOpacity style={[sty.yesNoBtn, value === true && sty.yesActive, value === true && { backgroundColor: '#16A34A' }]} onPress={() => onChange(true)}>
          <Text style={[sty.yesNoText, value === true && { color: '#fff' }]}>YES</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[sty.yesNoBtn, value === false && sty.noActive, value === false && { backgroundColor: '#DC2626' }]} onPress={() => onChange(false)}>
          <Text style={[sty.yesNoText, value === false && { color: '#fff' }]}>NO</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[sty.root, { backgroundColor: colors.background }]}>
      <View style={[sty.header, { backgroundColor: colors.primary, paddingTop: topPad + 12 }]}>
        <Text style={sty.headerLabel}>FRESH GRADUATE · DAILY FOLLOW-UP</Text>
        <Text style={sty.headerTitle}>Worksheet</Text>
        <Text style={sty.headerDate}>{displayDate}{currentHotel ? `  ·  ${currentHotel}` : ''}</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView style={sty.scroll} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* A. Stand-up */}
          <Section title="A · Morning Stand-Up (08:00 call)" colors={colors}>
            <Field label="Biggest hygiene risk TODAY" value={standupRisk} onChange={setStandupRisk} placeholder="e.g. Walk-in chiller 2 temp drift" />
            <Field label="What was FIXED yesterday" value={standupFixed} onChange={setStandupFixed} placeholder="e.g. Dishwasher rinse arm replaced" />
            <Field label="VIP / event status" value={standupVip} onChange={setStandupVip} placeholder="e.g. Wedding banquet 220 pax" />
          </Section>

          {/* B. Audit target */}
          <Section title="B · Today's Audit Target (one deep-dive zone)" colors={colors}>
            <Field label="Zone chosen" value={auditZone} onChange={setAuditZone} placeholder="e.g. Main Kitchen" />
            <Field label="Time in / out" value={auditTime} onChange={setAuditTime} placeholder="e.g. 08:30 – 09:15" />
            <Field label="Standard checked" value={auditStandard} onChange={setAuditStandard} placeholder="e.g. Chiller 1–4°C" />
            <Field label="Actual finding" value={auditFinding} onChange={setAuditFinding} placeholder="e.g. 5.2°C on top shelf — action taken" />
            <Field label="Photo evidence ref (WhatsApp)" value={photoRef} onChange={setPhotoRef} placeholder="e.g. WA-14:22" />
          </Section>

          {/* C. Non-conformities */}
          <Section title="C · Non-Conformities Found" colors={colors}>
            {nonConf.map((n, i) => (
              <View key={i} style={[sty.ncCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={sty.ncHead}>
                  <Text style={[sty.ncIndex, { color: colors.primary }]}>#{i + 1}</Text>
                  {nonConf.length > 1 && (
                    <TouchableOpacity onPress={() => removeNc(i)}>
                      <Feather name="trash-2" size={16} color="#DC2626" />
                    </TouchableOpacity>
                  )}
                </View>
                <Field label="Location" value={n.location} onChange={(v) => updateNc(i, 'location', v)} placeholder="e.g. Prep Area" />
                <Field label="Violation (standard breached)" value={n.violation} onChange={(v) => updateNc(i, 'violation', v)} placeholder="e.g. Cut board not sanitized" />
                <Field label="Corrective action + time closed" value={n.correctiveAction} onChange={(v) => updateNc(i, 'correctiveAction', v)} placeholder="e.g. Re-sanitized 09:40" />
              </View>
            ))}
            <TouchableOpacity style={[sty.addNc, { borderColor: colors.primary }]} onPress={addNc}>
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[sty.addNcText, { color: colors.primary }]}>Add non-conformity</Text>
            </TouchableOpacity>
          </Section>

          {/* D. Mentorship */}
          <Section title="D · Director Mentorship Notes (04:30)" colors={colors}>
            <Field label="Concept the Director explained (WHY)" value={mentorConcept} onChange={setMentorConcept} placeholder="e.g. Why we chase temp at delivery, not at storage" />
            <Field label="One thing I'll do differently tomorrow" value={mentorChange} onChange={setMentorChange} placeholder="e.g. Photograph the probe in situ" />
            <Field label="Question for the Director" value={mentorQuestion} onChange={setMentorQuestion} placeholder="e.g. When is a chiller fail a CCP breach?" />
          </Section>

          {/* E. Self-score */}
          <Section title="E · End-of-Day Self-Score" colors={colors}>
            <YesNo label="Logs submitted on time?" value={selfLogs} onChange={setSelfLogs} />
            <YesNo label="Audit honest (no copying)?" value={selfHonest} onChange={setSelfHonest} />
            <YesNo label="Zones fully covered?" value={selfZones} onChange={setSelfZones} />
            <YesNo label="Photos attached?" value={selfPhotos} onChange={setSelfPhotos} />
            <Field label="Signature" value={signature} onChange={setSignature} placeholder="Type your name" />
          </Section>

          <TouchableOpacity style={[sty.submit, { backgroundColor: colors.primary }]} onPress={handleSubmit} activeOpacity={0.85}>
            <Feather name="send" size={18} color="#fff" />
            <Text style={sty.submitText}>{savedId ? 'Update Worksheet' : 'Submit Worksheet'}</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Section({ title, colors, children }: { title: string; colors: ReturnType<typeof useColors>; children: React.ReactNode }) {
  return (
    <View style={[sty.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[sty.sectionHead, { backgroundColor: colors.primary + '12' }]}>
        <Text style={[sty.sectionTitle, { color: colors.primary }]}>{title}</Text>
      </View>
      <View style={sty.sectionBody}>
        {children}
      </View>
    </View>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <View style={sty.field}>
      <Text style={sty.fieldLabel}>{label}</Text>
      <TextInput
        style={[sty.input, { color: '#111', borderColor: '#D6DCE5', backgroundColor: '#fff' }]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#9AA5B1"
        multiline
      />
    </View>
  );
}

const sty = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 16 },
  headerLabel: { color: 'rgba(255,255,255,0.65)', fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 1.5, marginBottom: 2 },
  headerTitle: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 22 },
  headerDate: { color: 'rgba(255,255,255,0.72)', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 2 },
  scroll: { flex: 1 },
  sectionCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sectionHead: { paddingHorizontal: 14, paddingVertical: 10 },
  sectionTitle: { fontFamily: 'Inter_700Bold', fontSize: 13 },
  sectionBody: { padding: 14, gap: 12 },
  field: { gap: 6 },
  fieldLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 11, letterSpacing: 0.5, color: '#374151' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontFamily: 'Inter_400Regular', fontSize: 14, minHeight: 44, textAlignVertical: 'top' },
  ncCard: { borderRadius: 12, borderWidth: 1, padding: 12, gap: 10, marginBottom: 10 },
  ncHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ncIndex: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  addNc: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, borderWidth: 1.5, borderStyle: 'dashed', paddingVertical: 12 },
  addNcText: { fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  scoreLabel: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 13 },
  yesNo: { flexDirection: 'row', gap: 8 },
  yesNoBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#D6DCE5', backgroundColor: '#F1F5F9' },
  yesNoText: { fontFamily: 'Inter_700Bold', fontSize: 12, color: '#64748B' },
  yesActive: { borderColor: '#16A34A' },
  noActive: { borderColor: '#DC2626' },
  submit: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginHorizontal: 16, marginTop: 4, marginBottom: 8, borderRadius: 14, paddingVertical: 16 },
  submitText: { color: '#fff', fontFamily: 'Inter_700Bold', fontSize: 16 },
});
