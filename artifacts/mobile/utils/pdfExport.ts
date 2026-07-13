/**
 * PDF Export Utility — Food Safety Manager
 * Generates HACCP / ISO 22000 compliant HTML documents,
 * then uses expo-print + expo-sharing to produce a PDF.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert, Platform } from 'react-native';
import {
  BuffetEntry,
  ThawingEntry,
  ReceivedEntry,
  DisinfectionEntry,
  Settings,
} from '@/context/AppContext';

// ─── Palette (mirrored from colors.ts) ───────────────────────────────────────

const C = {
  navy: '#1A5276',
  navyDark: '#154360',
  navyLight: '#D6EAF8',
  green: '#1E8449',
  greenBg: '#D5F5E3',
  red: '#C0392B',
  redBg: '#FADBD8',
  amber: '#D68910',
  amberBg: '#FDEBD0',
  gray: '#6B7F96',
  grayLight: '#F4F6F8',
  border: '#D5DCE4',
  white: '#FFFFFF',
  text: '#0F1C2E',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function statusBadge(status: 'pass' | 'fail' | 'caution'): string {
  const map = {
    pass:    { bg: C.greenBg, color: C.green,  label: '✓ PASS'    },
    fail:    { bg: C.redBg,   color: C.red,    label: '✗ FAIL'    },
    caution: { bg: C.amberBg, color: C.amber,  label: '⚠ CAUTION' },
  };
  const s = map[status];
  return `<span style="background:${s.bg};color:${s.color};padding:3px 9px;border-radius:20px;font-weight:700;font-size:11px;white-space:nowrap;">${s.label}</span>`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function now(): string {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── Shared HTML Shell ────────────────────────────────────────────────────────

function htmlShell(opts: {
  title: string;
  subtitle: string;
  ccp: string;
  refNo: string;
  date: string;
  establishment: Settings;
  criticalLimits: string;
  tableHtml: string;
  entryCount: number;
  failCount: number;
}): string {
  const { title, subtitle, ccp, refNo, date, establishment, criticalLimits, tableHtml, entryCount, failCount } = opts;
  const overallStatus = failCount > 0 ? 'fail' : entryCount > 0 ? 'pass' : 'caution';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 12px;
    color: ${C.text};
    background: #fff;
  }

  /* ── Page header ── */
  .page-header {
    background: linear-gradient(135deg, ${C.navyDark} 0%, ${C.navy} 100%);
    color: #fff;
    padding: 22px 28px 18px;
  }
  .header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 14px;
  }
  .header-left h1 {
    font-size: 20px;
    font-weight: 800;
    letter-spacing: -0.3px;
    line-height: 1.2;
    margin-bottom: 3px;
  }
  .header-left .subtitle {
    font-size: 12px;
    opacity: 0.8;
    letter-spacing: 0.3px;
  }
  .badges {
    display: flex;
    gap: 8px;
    align-items: center;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .badge {
    background: rgba(255,255,255,0.18);
    border: 1px solid rgba(255,255,255,0.3);
    color: #fff;
    padding: 4px 10px;
    border-radius: 20px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .badge.ccp {
    background: rgba(255,255,255,0.3);
    font-size: 12px;
    padding: 5px 14px;
  }
  .meta-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    background: rgba(255,255,255,0.10);
    border-radius: 8px;
    padding: 12px 16px;
  }
  .meta-item label {
    font-size: 9px;
    opacity: 0.65;
    letter-spacing: 1px;
    text-transform: uppercase;
    display: block;
    margin-bottom: 2px;
  }
  .meta-item span {
    font-size: 12px;
    font-weight: 600;
  }

  /* ── Body ── */
  .body { padding: 20px 28px; }

  /* ── Critical limits ── */
  .limits-box {
    background: ${C.navyLight};
    border: 1.5px solid ${C.navy}40;
    border-radius: 8px;
    padding: 12px 16px;
    margin-bottom: 18px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
  }
  .limits-box .limits-icon {
    color: ${C.navy};
    font-size: 16px;
    margin-top: 1px;
    flex-shrink: 0;
  }
  .limits-box .limits-content strong {
    font-size: 11px;
    color: ${C.navy};
    display: block;
    margin-bottom: 4px;
    letter-spacing: 0.5px;
    text-transform: uppercase;
  }
  .limits-box .limits-content span {
    font-size: 11px;
    color: ${C.navy};
    opacity: 0.85;
  }

  /* ── Summary bar ── */
  .summary-bar {
    display: flex;
    gap: 0;
    background: ${C.grayLight};
    border: 1px solid ${C.border};
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 16px;
  }
  .summary-cell {
    flex: 1;
    padding: 10px 14px;
    text-align: center;
    border-right: 1px solid ${C.border};
  }
  .summary-cell:last-child { border-right: none; }
  .summary-cell .s-num {
    font-size: 22px;
    font-weight: 800;
    display: block;
    line-height: 1;
    margin-bottom: 3px;
  }
  .summary-cell .s-label {
    font-size: 10px;
    color: ${C.gray};
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }

  /* ── Data table ── */
  .section-title {
    font-size: 10px;
    font-weight: 700;
    color: ${C.gray};
    letter-spacing: 1.2px;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  thead tr {
    background: ${C.navy};
    color: #fff;
  }
  thead th {
    padding: 9px 10px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.6px;
    text-transform: uppercase;
  }
  tbody tr:nth-child(even) { background: ${C.grayLight}; }
  tbody tr:nth-child(odd)  { background: #fff; }
  tbody tr:hover           { background: ${C.navyLight}; }
  tbody td {
    padding: 8px 10px;
    border-bottom: 1px solid ${C.border};
    vertical-align: top;
    line-height: 1.4;
  }
  td.mono {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: 700;
  }
  .corrective-note {
    font-size: 10px;
    color: ${C.amber};
    margin-top: 4px;
    padding: 3px 7px;
    background: ${C.amberBg};
    border-radius: 4px;
    display: inline-block;
  }
  .no-data {
    text-align: center;
    padding: 30px;
    color: ${C.gray};
    font-style: italic;
  }

  /* ── Signature block ── */
  .sign-section {
    margin-top: 28px;
    border-top: 2px solid ${C.border};
    padding-top: 18px;
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 20px;
  }
  .sign-box label {
    font-size: 10px;
    color: ${C.gray};
    letter-spacing: 0.8px;
    text-transform: uppercase;
    display: block;
    margin-bottom: 28px;
  }
  .sign-line {
    border-top: 1.5px solid ${C.text};
    padding-top: 5px;
    font-size: 10px;
    color: ${C.gray};
  }

  /* ── Footer ── */
  .footer {
    margin-top: 22px;
    border-top: 1px solid ${C.border};
    padding-top: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    color: ${C.gray};
  }
  .footer-brand {
    font-weight: 700;
    color: ${C.navy};
    font-size: 11px;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page-header { break-inside: avoid; }
  }
</style>
</head>
<body>

<!-- ══ PAGE HEADER ══════════════════════════════════════════════════════════ -->
<div class="page-header">
  <div class="header-top">
    <div class="header-left">
      <h1>${title}</h1>
      <div class="subtitle">${subtitle}</div>
    </div>
    <div class="badges">
      <span class="badge ccp">${ccp}</span>
      <span class="badge">HACCP PLAN</span>
      <span class="badge">ISO 22000</span>
      <span class="badge">FSMS</span>
    </div>
  </div>
  <div class="meta-grid">
    <div class="meta-item">
      <label>Establishment</label>
      <span>${establishment.establishmentName}</span>
    </div>
    <div class="meta-item">
      <label>Address</label>
      <span>${establishment.address || '—'}</span>
    </div>
    <div class="meta-item">
      <label>Document Ref.</label>
      <span>${refNo}</span>
    </div>
    <div class="meta-item">
      <label>Record Date</label>
      <span>${formatDate(date)}</span>
    </div>
  </div>
</div>

<!-- ══ BODY ════════════════════════════════════════════════════════════════ -->
<div class="body">

  <!-- Critical limits -->
  <div class="limits-box">
    <div class="limits-icon">⚠</div>
    <div class="limits-content">
      <strong>Critical Control Point Limits</strong>
      <span>${criticalLimits}</span>
    </div>
  </div>

  <!-- Summary bar -->
  <div class="summary-bar">
    <div class="summary-cell">
      <span class="s-num" style="color:${C.navy}">${entryCount}</span>
      <span class="s-label">Total Records</span>
    </div>
    <div class="summary-cell">
      <span class="s-num" style="color:${failCount > 0 ? C.red : C.green}">${failCount}</span>
      <span class="s-label">Deviations</span>
    </div>
    <div class="summary-cell">
      <span class="s-num">${statusBadge(overallStatus as any)}</span>
      <span class="s-label">Overall Status</span>
    </div>
    <div class="summary-cell">
      <span class="s-num" style="color:${C.gray};font-size:13px;">${now()}</span>
      <span class="s-label">Generated</span>
    </div>
  </div>

  <!-- Data table -->
  <div class="section-title">Monitoring Records</div>
  ${tableHtml}

  <!-- Signature block -->
  <div class="sign-section">
    <div class="sign-box">
      <label>Prepared / Monitored By</label>
      <div class="sign-line">Signature &amp; Name</div>
    </div>
    <div class="sign-box">
      <label>Reviewed By (Supervisor)</label>
      <div class="sign-line">Signature &amp; Name</div>
    </div>
    <div class="sign-box">
      <label>Date &amp; Time Reviewed</label>
      <div class="sign-line">Date / Time</div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div>
      <span class="footer-brand">Food Safety Manager</span>
      &nbsp;·&nbsp; ${refNo} &nbsp;·&nbsp; ${ccp}
    </div>
    <div>${establishment.establishmentName} &nbsp;·&nbsp; Generated: ${now()}</div>
  </div>

</div>
</body>
</html>`;
}

// ─── Buffet Temperature PDF ───────────────────────────────────────────────────

export function generateBuffetHTML(entries: BuffetEntry[], date: string, settings: Settings): string {
  const fails = entries.filter(e => e.status === 'fail').length;

  const rows = entries.length === 0
    ? `<tr><td colspan="7" class="no-data">No temperature readings recorded for this date.</td></tr>`
    : entries.map(e => `
      <tr>
        <td>${e.time}</td>
        <td>${e.zone}</td>
        <td>${e.item}</td>
        <td>
          <span style="background:${e.type === 'hot' ? '#FADBD8' : '#D6EAF8'};
                       color:${e.type === 'hot' ? C.red : C.navy};
                       padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">
            ${e.type === 'hot' ? '🔴 HOT' : '🔵 COLD'}
          </span>
        </td>
        <td class="mono">${e.temperature}°C</td>
        <td>${e.criticalLimit}</td>
        <td>
          ${statusBadge(e.status)}
          ${e.correctiveAction ? `<div class="corrective-note">⚡ ${e.correctiveAction}</div>` : ''}
        </td>
      </tr>
      <tr style="border-bottom:1px solid ${C.border};">
        <td colspan="7" style="padding:2px 10px 8px;font-size:10px;color:${C.gray};">
          Monitored by: <strong>${e.monitoredBy}</strong>
        </td>
      </tr>
    `).join('');

  const table = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Zone / Area</th>
          <th>Food Item</th>
          <th>Type</th>
          <th>Temp (°C)</th>
          <th>Critical Limit</th>
          <th>Status / Corrective Action</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  return htmlShell({
    title: 'Buffet Temperature Log',
    subtitle: 'Hot &amp; Cold Food Temperature Monitoring · CCP-1',
    ccp: 'CCP-1',
    refNo: 'BTL-001',
    date,
    establishment: settings,
    criticalLimits: 'HOT foods: minimum internal temperature ≥ 63°C at all times during service &nbsp;|&nbsp; COLD foods: maximum temperature ≤ 5°C at all times during service. Monitor every 2 hours.',
    tableHtml: table,
    entryCount: entries.length,
    failCount: fails,
  });
}

// ─── Thawing Temperature PDF ──────────────────────────────────────────────────

const THAW_METHOD_LABELS: Record<string, string> = {
  refrigerator: 'Refrigerator (≤5°C)',
  cold_water:   'Cold Water (≤21°C)',
  microwave:    'Microwave → Cook immediately',
  cooking:      'Direct Cooking from frozen',
};

export function generateThawingHTML(entries: ThawingEntry[], date: string, settings: Settings): string {
  const fails = entries.filter(e => e.status === 'fail').length;

  const rows = entries.length === 0
    ? `<tr><td colspan="7" class="no-data">No thawing records for this date.</td></tr>`
    : entries.map(e => `
      <tr>
        <td>${e.time}</td>
        <td>${e.item}</td>
        <td>${e.quantity ? `${e.quantity} ${e.unit}` : '—'}</td>
        <td>${THAW_METHOD_LABELS[e.method] ?? e.method}</td>
        <td class="mono">${e.temperature ? `${e.temperature}°C` : 'N/A'}</td>
        <td>
          ${statusBadge(e.status)}
          ${e.correctiveAction ? `<div class="corrective-note">⚡ ${e.correctiveAction}</div>` : ''}
        </td>
        <td style="font-size:10px;color:${C.gray};">${e.monitoredBy}</td>
      </tr>
    `).join('');

  const table = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Food Item</th>
          <th>Quantity</th>
          <th>Thawing Method</th>
          <th>Temp (°C)</th>
          <th>Status / Corrective Action</th>
          <th>Monitored By</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  return htmlShell({
    title: 'Thawing Temperature Log',
    subtitle: 'Safe Food Thawing Records · CCP-2',
    ccp: 'CCP-2',
    refNo: 'TTL-002',
    date,
    establishment: settings,
    criticalLimits: 'Never thaw at room temperature. Approved: Refrigerator ≤5°C | Cold water ≤21°C (change every 30 min) | Microwave (cook immediately after) | Direct cooking from frozen.',
    tableHtml: table,
    entryCount: entries.length,
    failCount: fails,
  });
}

// ─── Received Items PDF ───────────────────────────────────────────────────────

export function generateReceivedHTML(entries: ReceivedEntry[], date: string, settings: Settings): string {
  const fails = entries.filter(e => e.overallStatus === 'fail').length;

  const rows = entries.length === 0
    ? `<tr><td colspan="7" class="no-data">No deliveries recorded for this date.</td></tr>`
    : entries.flatMap((e, i) => {
        const headerRow = `
          <tr style="background:${C.navyLight}!important;">
            <td colspan="7" style="padding:8px 10px;font-weight:700;color:${C.navy};font-size:12px;">
              #${i + 1} &nbsp; ${e.supplier} &nbsp;
              <span style="font-weight:400;font-size:11px;">DN: ${e.deliveryNote || '—'} · ${e.time} · Received by: ${e.receivedBy}</span>
              &nbsp; ${statusBadge(e.overallStatus)}
              ${e.notes ? `<div style="font-size:10px;color:${C.gray};margin-top:4px;font-weight:400;">Notes: ${e.notes}</div>` : ''}
            </td>
          </tr>`;
        const itemRows = e.items.length === 0
          ? `<tr><td colspan="7" style="padding:6px 22px;color:${C.gray};font-style:italic;font-size:11px;">No items logged</td></tr>`
          : e.items.map(item => `
              <tr>
                <td style="padding-left:22px;">${item.name}</td>
                <td>${item.quantity ? `${item.quantity} ${item.unit}` : '—'}</td>
                <td>${item.batchNumber || '—'}</td>
                <td>${item.expiryDate || '—'}</td>
                <td class="mono">${item.temperature ? `${item.temperature}°C` : '—'}</td>
                <td>
                  <span style="color:${item.packagingOk ? C.green : C.red};font-weight:700;font-size:11px;">
                    ${item.packagingOk ? '✓ OK' : '✗ DAMAGED'}
                  </span>
                </td>
                <td>${statusBadge(item.status)}</td>
              </tr>
            `).join('');
        return [headerRow, itemRows];
      }).join('');

  const table = `
    <table>
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Quantity</th>
          <th>Batch / Lot No.</th>
          <th>Expiry Date</th>
          <th>Temp (°C)</th>
          <th>Packaging</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  return htmlShell({
    title: 'Received Items Inspection Log',
    subtitle: 'Delivery Acceptance &amp; Inspection Records · CCP-3',
    ccp: 'CCP-3',
    refNo: 'RIL-003',
    date,
    establishment: settings,
    criticalLimits: 'Chilled goods: ≤5°C on receipt | Frozen goods: ≤−18°C on receipt | Packaging must be intact with no damage, leaks, or contamination | Reject and document non-conforming deliveries.',
    tableHtml: table,
    entryCount: entries.length,
    failCount: fails,
  });
}

// ─── Disinfection PDF ─────────────────────────────────────────────────────────

export function generateDisinfectionHTML(entries: DisinfectionEntry[], date: string, settings: Settings): string {
  const fails = entries.filter(e => e.status === 'fail').length;

  const rows = entries.length === 0
    ? `<tr><td colspan="7" class="no-data">No disinfection records for this date.</td></tr>`
    : entries.map(e => `
      <tr>
        <td>${e.time}</td>
        <td style="max-width:140px;">${e.items}</td>
        <td>${e.solutionType}</td>
        <td>${e.concentration || '—'}</td>
        <td>${e.contactTime || '—'}</td>
        <td>
          <span style="color:${e.rinsed ? C.green : C.red};font-weight:700;">
            ${e.rinsed ? '✓ YES' : '✗ NO'}
          </span>
        </td>
        <td>
          ${statusBadge(e.status)}
          ${e.notes ? `<div class="corrective-note">📝 ${e.notes}</div>` : ''}
          <div style="font-size:10px;color:${C.gray};margin-top:4px;">${e.monitoredBy}</div>
        </td>
      </tr>
    `).join('');

  const table = `
    <table>
      <thead>
        <tr>
          <th>Time</th>
          <th>Items Disinfected</th>
          <th>Solution Type</th>
          <th>Concentration</th>
          <th>Contact Time</th>
          <th>Rinsed</th>
          <th>Status / Notes</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;

  return htmlShell({
    title: 'Fruit &amp; Vegetable Disinfection Log',
    subtitle: 'Produce Sanitation Records · CCP-4',
    ccp: 'CCP-4',
    refNo: 'FVD-004',
    date,
    establishment: settings,
    criticalLimits: 'Procedure: Wash → Disinfect (food-grade only) → Rinse thoroughly with potable water → Drain &amp; dry before use. All produce must be rinsed after disinfection to remove residues.',
    tableHtml: table,
    entryCount: entries.length,
    failCount: fails,
  });
}

// ─── Full Daily Report (all 4 CCPs) ──────────────────────────────────────────

export function generateFullReportHTML(
  buffet: BuffetEntry[],
  thawing: ThawingEntry[],
  received: ReceivedEntry[],
  disinfection: DisinfectionEntry[],
  date: string,
  settings: Settings,
): string {
  const totalFails =
    buffet.filter(e => e.status === 'fail').length +
    thawing.filter(e => e.status === 'fail').length +
    received.filter(e => e.overallStatus === 'fail').length +
    disinfection.filter(e => e.status === 'fail').length;
  const totalEntries = buffet.length + thawing.length + received.length + disinfection.length;
  const overallStatus = totalFails > 0 ? 'fail' : totalEntries > 0 ? 'pass' : 'caution';

  // Build section HTML for each CCP
  const sections = [
    {
      title: 'CCP-1 — Buffet Temperature Log',
      ref: 'BTL-001',
      limits: 'Hot ≥63°C | Cold ≤5°C',
      html: buildBuffetTableOnly(buffet),
      count: buffet.length,
      fails: buffet.filter(e => e.status === 'fail').length,
    },
    {
      title: 'CCP-2 — Thawing Temperature Log',
      ref: 'TTL-002',
      limits: 'Refrigerator ≤5°C | Cold water ≤21°C',
      html: buildThawingTableOnly(thawing),
      count: thawing.length,
      fails: thawing.filter(e => e.status === 'fail').length,
    },
    {
      title: 'CCP-3 — Received Items Inspection Log',
      ref: 'RIL-003',
      limits: 'Chilled ≤5°C | Frozen ≤−18°C | Packaging intact',
      html: buildReceivedTableOnly(received),
      count: received.length,
      fails: received.filter(e => e.overallStatus === 'fail').length,
    },
    {
      title: 'CCP-4 — Fruit & Vegetable Disinfection Log',
      ref: 'FVD-004',
      limits: 'Rinse required after disinfection',
      html: buildDisinfectionTableOnly(disinfection),
      count: disinfection.length,
      fails: disinfection.filter(e => e.status === 'fail').length,
    },
  ];

  const sectionBlocks = sections.map(s => `
    <div style="margin-bottom:28px;page-break-inside:avoid;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;padding:10px 14px;
                  background:${C.navy};border-radius:8px;color:#fff;">
        <span style="background:rgba(255,255,255,0.2);padding:3px 10px;border-radius:12px;
                     font-size:10px;font-weight:800;letter-spacing:0.5px;">${s.ref}</span>
        <strong style="font-size:13px;flex:1;">${s.title}</strong>
        <span style="font-size:10px;opacity:0.8;">${s.count} records · ${s.fails} deviations</span>
        ${statusBadge(s.fails > 0 ? 'fail' : s.count > 0 ? 'pass' : 'caution')}
      </div>
      <div style="font-size:10px;color:${C.navy};background:${C.navyLight};
                  padding:7px 14px;border-radius:6px;margin-bottom:8px;">
        ⚠ Critical Limits: ${s.limits}
      </div>
      ${s.html}
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Daily Food Safety Report — ${date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif; font-size: 11px; color: ${C.text}; }
  .page-header { background: linear-gradient(135deg, ${C.navyDark}, ${C.navy}); color: #fff; padding: 22px 28px 18px; }
  .header-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
  .header-top h1 { font-size: 22px; font-weight: 800; margin-bottom: 3px; }
  .header-top .sub { font-size: 12px; opacity: 0.8; }
  .badges { display: flex; gap: 6px; flex-wrap: wrap; }
  .badge { background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.3); color: #fff;
           padding: 4px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  .meta-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px;
               background: rgba(255,255,255,0.1); border-radius: 8px; padding: 12px 16px; }
  .meta-item label { font-size: 9px; opacity: 0.65; letter-spacing: 1px; display: block; margin-bottom: 2px; }
  .meta-item span { font-size: 12px; font-weight: 600; }
  .body { padding: 20px 28px; }
  .summary-bar { display: flex; background: ${C.grayLight}; border: 1px solid ${C.border};
                  border-radius: 8px; overflow: hidden; margin-bottom: 22px; }
  .sc { flex: 1; padding: 10px; text-align: center; border-right: 1px solid ${C.border}; }
  .sc:last-child { border-right: none; }
  .sc .n { font-size: 22px; font-weight: 800; display: block; line-height: 1; margin-bottom: 3px; }
  .sc .l { font-size: 10px; color: ${C.gray}; text-transform: uppercase; letter-spacing: 0.8px; }
  table { width: 100%; border-collapse: collapse; font-size: 10.5px; margin-bottom: 0; }
  thead tr { background: ${C.navy}40; }
  thead th { padding: 7px 8px; text-align: left; font-size: 9px; font-weight: 700;
             letter-spacing: 0.5px; text-transform: uppercase; color: ${C.navy}; }
  tbody tr:nth-child(even) { background: ${C.grayLight}; }
  tbody td { padding: 7px 8px; border-bottom: 1px solid ${C.border}; vertical-align: top; line-height: 1.4; }
  .status-pass    { background:${C.greenBg};color:${C.green};padding:2px 8px;border-radius:12px;font-weight:700;font-size:10px;white-space:nowrap; }
  .status-fail    { background:${C.redBg};color:${C.red};padding:2px 8px;border-radius:12px;font-weight:700;font-size:10px;white-space:nowrap; }
  .status-caution { background:${C.amberBg};color:${C.amber};padding:2px 8px;border-radius:12px;font-weight:700;font-size:10px;white-space:nowrap; }
  .no-data { text-align:center;padding:14px;color:${C.gray};font-style:italic; }
  .sign-section { margin-top:28px;border-top:2px solid ${C.border};padding-top:16px;
                   display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px; }
  .sign-box label { font-size:9px;color:${C.gray};letter-spacing:0.8px;text-transform:uppercase;display:block;margin-bottom:24px; }
  .sign-line { border-top:1.5px solid ${C.text};padding-top:4px;font-size:9px;color:${C.gray}; }
  .footer { margin-top:18px;border-top:1px solid ${C.border};padding-top:10px;
             display:flex;justify-content:space-between;font-size:10px;color:${C.gray}; }
  .footer-brand { font-weight:700;color:${C.navy}; }
  @media print { body { -webkit-print-color-adjust:exact;print-color-adjust:exact; } }
</style>
</head>
<body>

<div class="page-header">
  <div class="header-top">
    <div>
      <h1>Daily Food Safety Report</h1>
      <div class="sub">HACCP Plan &amp; ISO 22000 — Complete Daily Record · ${formatDate(date)}</div>
    </div>
    <div class="badges">
      <span class="badge">HACCP PLAN</span>
      <span class="badge">ISO 22000</span>
      <span class="badge">FSMS</span>
      <span class="badge">CCP-1 · CCP-2 · CCP-3 · CCP-4</span>
    </div>
  </div>
  <div class="meta-grid">
    <div class="meta-item"><label>Establishment</label><span>${settings.establishmentName}</span></div>
    <div class="meta-item"><label>Address</label><span>${settings.address || '—'}</span></div>
    <div class="meta-item"><label>Record Date</label><span>${formatDate(date)}</span></div>
    <div class="meta-item"><label>Generated</label><span>${now()}</span></div>
  </div>
</div>

<div class="body">

  <div class="summary-bar">
    <div class="sc"><span class="n" style="color:${C.navy}">${totalEntries}</span><span class="l">Total Records</span></div>
    <div class="sc"><span class="n" style="color:${totalFails > 0 ? C.red : C.green}">${totalFails}</span><span class="l">Deviations</span></div>
    <div class="sc"><span class="n">${statusBadge(overallStatus as any)}</span><span class="l">Overall</span></div>
    <div class="sc"><span class="n" style="color:${C.navy};font-size:13px;">${buffet.length}</span><span class="l">Buffet Readings</span></div>
    <div class="sc"><span class="n" style="color:${C.navy};font-size:13px;">${thawing.length}</span><span class="l">Thawing Records</span></div>
    <div class="sc"><span class="n" style="color:${C.navy};font-size:13px;">${received.length}</span><span class="l">Deliveries</span></div>
    <div class="sc"><span class="n" style="color:${C.navy};font-size:13px;">${disinfection.length}</span><span class="l">Disinfections</span></div>
  </div>

  ${sectionBlocks}

  <div class="sign-section">
    <div class="sign-box"><label>Food Safety Officer</label><div class="sign-line">Signature &amp; Name</div></div>
    <div class="sign-box"><label>Reviewed By (Manager)</label><div class="sign-line">Signature &amp; Name</div></div>
    <div class="sign-box"><label>Date &amp; Time Reviewed</label><div class="sign-line">Date / Time</div></div>
  </div>

  <div class="footer">
    <div><span class="footer-brand">Food Safety Manager</span> &nbsp;·&nbsp; Daily Report · BTL-001 · TTL-002 · RIL-003 · FVD-004</div>
    <div>${settings.establishmentName} &nbsp;·&nbsp; ${formatDate(date)}</div>
  </div>
</div>
</body>
</html>`;
}

// ─── Table-only builders (for full report) ────────────────────────────────────

function badgeInline(status: 'pass' | 'fail' | 'caution'): string {
  const map = { pass: 'status-pass', fail: 'status-fail', caution: 'status-caution' };
  const labels = { pass: '✓ PASS', fail: '✗ FAIL', caution: '⚠ CAUTION' };
  return `<span class="${map[status]}">${labels[status]}</span>`;
}

function buildBuffetTableOnly(entries: BuffetEntry[]): string {
  if (entries.length === 0) return `<table><tbody><tr><td class="no-data" colspan="6">No readings.</td></tr></tbody></table>`;
  return `<table><thead><tr><th>Time</th><th>Zone</th><th>Item</th><th>Type</th><th>Temp</th><th>Status / Action</th></tr></thead><tbody>
    ${entries.map(e => `<tr>
      <td>${e.time}</td><td>${e.zone}</td><td>${e.item}</td>
      <td>${e.type === 'hot' ? '🔴 HOT' : '🔵 COLD'}</td>
      <td style="font-weight:700;">${e.temperature}°C <span style="font-size:9px;font-weight:400;">(${e.criticalLimit})</span></td>
      <td>${badgeInline(e.status)}${e.correctiveAction ? `<div style="font-size:9px;color:${C.amber};margin-top:2px;">⚡ ${e.correctiveAction}</div>` : ''}
          <div style="font-size:9px;color:${C.gray};">${e.monitoredBy}</div></td>
    </tr>`).join('')}
  </tbody></table>`;
}

function buildThawingTableOnly(entries: ThawingEntry[]): string {
  if (entries.length === 0) return `<table><tbody><tr><td class="no-data" colspan="6">No records.</td></tr></tbody></table>`;
  return `<table><thead><tr><th>Time</th><th>Item</th><th>Qty</th><th>Method</th><th>Temp</th><th>Status</th></tr></thead><tbody>
    ${entries.map(e => `<tr>
      <td>${e.time}</td><td>${e.item}</td><td>${e.quantity || '—'} ${e.unit}</td>
      <td>${THAW_METHOD_LABELS[e.method] ?? e.method}</td>
      <td style="font-weight:700;">${e.temperature ? `${e.temperature}°C` : 'N/A'}</td>
      <td>${badgeInline(e.status)}${e.correctiveAction ? `<div style="font-size:9px;color:${C.amber};">⚡ ${e.correctiveAction}</div>` : ''}
          <div style="font-size:9px;color:${C.gray};">${e.monitoredBy}</div></td>
    </tr>`).join('')}
  </tbody></table>`;
}

function buildReceivedTableOnly(entries: ReceivedEntry[]): string {
  if (entries.length === 0) return `<table><tbody><tr><td class="no-data" colspan="6">No deliveries.</td></tr></tbody></table>`;
  const rows = entries.flatMap(e => [
    `<tr style="background:${C.navyLight}!important;"><td colspan="6" style="padding:6px 8px;font-weight:700;color:${C.navy};">
      ${e.supplier} · DN: ${e.deliveryNote || '—'} · ${e.time} · ${e.receivedBy} ${badgeInline(e.overallStatus)}
    </td></tr>`,
    ...e.items.map(i => `<tr>
      <td style="padding-left:18px;">${i.name}</td>
      <td>${i.quantity || '—'} ${i.unit}</td>
      <td>${i.batchNumber || '—'}</td>
      <td>${i.expiryDate || '—'}</td>
      <td>${i.temperature ? `${i.temperature}°C` : '—'}</td>
      <td>${badgeInline(i.status)}</td>
    </tr>`),
  ]);
  return `<table><thead><tr><th>Item</th><th>Qty</th><th>Batch No.</th><th>Expiry</th><th>Temp</th><th>Status</th></tr></thead>
    <tbody>${rows.join('')}</tbody></table>`;
}

function buildDisinfectionTableOnly(entries: DisinfectionEntry[]): string {
  if (entries.length === 0) return `<table><tbody><tr><td class="no-data" colspan="6">No records.</td></tr></tbody></table>`;
  return `<table><thead><tr><th>Time</th><th>Items</th><th>Solution</th><th>Concentration</th><th>Contact Time</th><th>Status</th></tr></thead><tbody>
    ${entries.map(e => `<tr>
      <td>${e.time}</td><td style="max-width:120px;">${e.items}</td><td>${e.solutionType}</td>
      <td>${e.concentration || '—'}</td><td>${e.contactTime || '—'}</td>
      <td>${badgeInline(e.status)}<div style="font-size:9px;color:${C.gray};">${e.monitoredBy}</div></td>
    </tr>`).join('')}
  </tbody></table>`;
}

// ─── Export Runner ────────────────────────────────────────────────────────────

export async function exportPDF(html: string, filename: string): Promise<void> {
  try {
    const { uri } = await Print.printToFileAsync({ html, base64: false });

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share ${filename}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      Alert.alert('PDF Saved', `Report saved to: ${uri}`);
    }
  } catch (err: any) {
    Alert.alert('Export Failed', err?.message ?? 'Could not generate PDF.');
  }
}
