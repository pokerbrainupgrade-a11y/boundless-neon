import { useEffect, useState } from 'preact/hooks';
import { navigate } from '@/router';
import { settings, updateSettings, hrMax, loadSettings } from '@/lib/settings';
import { block, ctx, todayYmd, persisted, setStartDate, reloadBlocks, reloadLogs, blockLabel } from '@/lib/store';
import { gestationalWeek, trimesterForWeek } from '@/lib/prenatal';
import { buildExport, exportFilename, parseImport, applyImport, type ExportFile } from '@/lib/exportImport';
import { recordCounts, db, requestPersistentStorage } from '@/lib/db';
import { HEALTH_GUIDE } from '@/data/healthGuide';
import { program } from '@/data/program';
import { fmtDate } from '@/lib/time';

export function Settings() {
  const s = settings.value;
  const c = ctx.value;
  const [counts, setCounts] = useState<{ blocks: number; logs: number; habits: number; vitals: number } | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<ExportFile | null>(null);
  const [startDate, setStart] = useState(block.value?.startDate ?? todayYmd.value);
  useEffect(() => {
    void recordCounts().then(setCounts);
  }, [s.lastExportAt, msg]);

  const week = s.dueDate ? gestationalWeek(s.dueDate, todayYmd.value) : null;
  const tri = week !== null ? trimesterForWeek(week) : null;
  const max = hrMax(s.age);

  const doExport = async () => {
    const data = await buildExport();
    const text = JSON.stringify(data, null, 2);
    const name = exportFilename();
    const file = new File([text], name, { type: 'application/json' });
    let shared = false;
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Boundless backup' });
        shared = true;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    if (!shared) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
    await updateSettings({ lastExportAt: new Date().toISOString() });
    setMsg(`Exported ${name}.`);
  };

  const onFile = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;
    const r = parseImport(await f.text());
    input.value = '';
    if (!r.ok) {
      setMsg(r.error);
      return;
    }
    setPending(r.data);
  };
  const doImport = async (mode: 'merge' | 'replace') => {
    if (!pending) return;
    await applyImport(pending, mode);
    await loadSettings();
    await reloadBlocks();
    await reloadLogs();
    setPending(null);
    setMsg(`Imported (${mode}): ${pending.logs.length} sessions, ${pending.blocks.length} seasons.`);
  };

  return (
    <main class="screen" data-testid="settings">
      <div class="section-h"><h1>Settings</h1></div>

      <section class="card stack">
        <h3>YOU</h3>
        <label class="field"><span>Display name (stays on this device)</span><input class="input" value={s.displayName} onInput={(e) => updateSettings({ displayName: (e.target as HTMLInputElement).value })} /></label>
        <label class="field"><span>Age (for HRmax = 208 − 0.7 × age)</span><input class="input" type="number" inputMode="numeric" data-testid="age" value={s.age ?? ''} onInput={(e) => updateSettings({ age: Number((e.target as HTMLInputElement).value) || null })} /></label>
        {max && <div class="muted small">{c.on ? 'Prenatal Mode: HR targets are hidden. Sessions show RPE and talk-test targets instead.' : `Estimated HRmax ${max} bpm · 5x4 band ${Math.round(max * 0.87)}–${Math.round(max * 0.97)}`}</div>}
      </section>

      <section class="card stack" data-testid="prenatal-settings">
        <h3>PRENATAL MODE</h3>
        <label class="switch"><span>Prenatal Mode</span><input type="checkbox" data-testid="prenatal-toggle" checked={s.prenatalMode} onChange={(e) => updateSettings({ prenatalMode: (e.target as HTMLInputElement).checked })} /></label>
        <p class="muted small">{program.prenatal.disclaimer} {program.prenatal.source}</p>
        <label class="field"><span>Due date (stays on this device)</span><input class="input" type="date" data-testid="due-date" value={s.dueDate ?? ''} onInput={(e) => updateSettings({ dueDate: (e.target as HTMLInputElement).value || null })} /></label>
        {week !== null && <div class="row"><span class="chip chip-purple" data-testid="computed-trimester">{tri} · {week}w</span><span class="muted small">Gestational week {week}, computed in Phoenix time.</span></div>}
        <label class="field"><span>Provider-clearance date</span><input class="input" type="date" data-testid="clearance-date" value={s.clearanceDate ?? ''} onInput={(e) => updateSettings({ clearanceDate: (e.target as HTMLInputElement).value || null })} /></label>
        <label class="field"><span>My provider's limits (shown on Today)</span><textarea class="input" data-testid="provider-limits" value={s.providerLimits} onInput={(e) => updateSettings({ providerLimits: (e.target as HTMLTextAreaElement).value })} /></label>
        <label class="switch"><span>Cool shower cycle (optional, off by default)</span><input type="checkbox" checked={s.prenatalCoolShower} onChange={(e) => updateSettings({ prenatalCoolShower: (e.target as HTMLInputElement).checked })} /></label>
        <label class="switch"><span>Belly curve on drawings</span><input type="checkbox" checked={s.bellyCurve} onChange={(e) => updateSettings({ bellyCurve: (e.target as HTMLInputElement).checked })} /></label>
        <button type="button" class="btn" onClick={() => navigate('/moves/prenatal')}>Review the override table</button>
      </section>

      <section class="card stack">
        <h3>SEASON</h3>
        <div class="muted small">{block.value ? `${blockLabel(block.value.n)} · Day 01 on ${fmtDate(block.value.startDate)}` : 'No season started yet.'}</div>
        <div class="row">
          <input class="input grow" type="date" value={startDate} onInput={(e) => setStart((e.target as HTMLInputElement).value)} data-testid="settings-start-date" />
          <button type="button" class="btn btn-primary" onClick={() => startDate && setStartDate(startDate)}>Save</button>
        </div>
      </section>

      <section class="card stack">
        <h3>CUES</h3>
        <label class="switch"><span>Sound</span><input type="checkbox" checked={s.sound} onChange={(e) => updateSettings({ sound: (e.target as HTMLInputElement).checked })} /></label>
        <label class="switch"><span>Color flash</span><input type="checkbox" checked={s.flash} onChange={(e) => updateSettings({ flash: (e.target as HTMLInputElement).checked })} /></label>
        <label class="field"><span>Beep volume {Math.round(s.volume * 100)}%</span><input type="range" min="0" max="1" step="0.05" value={s.volume} onInput={(e) => updateSettings({ volume: Number((e.target as HTMLInputElement).value) })} style="min-height:var(--tap)" /></label>
        <label class="field"><span>Countdown lead-in (s)</span><input class="input" type="number" inputMode="numeric" min="0" max="60" value={s.leadInSec} onInput={(e) => updateSettings({ leadInSec: Math.max(0, Math.min(60, Number((e.target as HTMLInputElement).value) || 0)) })} /></label>
        <label class="field"><span>Super-slow rep length (30–60 s)</span><input class="input" type="number" inputMode="numeric" min="30" max="60" value={s.repLengthSec} onChange={(e) => updateSettings({ repLengthSec: Math.max(30, Math.min(60, Number((e.target as HTMLInputElement).value) || 40)) })} /></label>
        <div class="muted small">The iPhone silent switch mutes web audio; the flash is the backup cue.</div>
      </section>

      <section class="card stack" data-testid="backup">
        <h3>BACKUP</h3>
        <p class="muted small">Everything lives on this device. iOS can evict site data; the JSON export is the only backup.</p>
        <button type="button" class="btn btn-cyan btn-lg" data-testid="export-btn" onClick={doExport}>Export JSON</button>
        <label class="btn" style="cursor:pointer"><span>Import JSON</span><input type="file" accept="application/json,.json" data-testid="import-input" class="sr-only" onChange={onFile} /></label>
        {pending && (
          <div class="banner warn stack" data-testid="import-prompt">
            <span>Backup from {pending.exportedAt.slice(0, 10)}: {pending.logs.length} sessions, {pending.blocks.length} seasons. Merge into this device, or replace everything here?</span>
            <div class="row"><button type="button" class="btn btn-lime grow" data-testid="import-merge" onClick={() => doImport('merge')}>Merge</button><button type="button" class="btn btn-caution grow" data-testid="import-replace" onClick={() => confirm('Replace all local data with the file?') && doImport('replace')}>Replace</button><button type="button" class="btn btn-ghost" onClick={() => setPending(null)}>Cancel</button></div>
          </div>
        )}
        {msg && <div class="banner info" role="status" data-testid="settings-msg">{msg}</div>}
        <div class="muted small" data-testid="storage-status">
          Storage persisted: <strong>{persisted.value === null ? '…' : persisted.value ? 'yes' : 'no'}</strong>
          {persisted.value === false && <button type="button" class="btn" style="min-height:36px;margin-left:8px" onClick={async () => { persisted.value = await requestPersistentStorage(); }}>Request</button>}
          {' · '}records: {counts ? `${counts.logs} sessions, ${counts.habits} habits, ${counts.vitals} vitals, ${counts.blocks} seasons` : '…'}
          {' · '}last export: {s.lastExportAt ? s.lastExportAt.slice(0, 10) : 'never'}
        </div>
        <details>
          <summary class="muted small">Danger zone</summary>
          <button type="button" class="btn btn-caution" style="margin-top:8px" onClick={async () => { if (confirm('Delete ALL data on this device? Export first.')) { await db.delete(); location.reload(); } }}>Delete all local data</button>
        </details>
      </section>

      <section class="card stack" data-testid="health-guide">
        <h3>HEALTH SHORTCUT</h3>
        <p class="small muted">{HEALTH_GUIDE.intro}</p>
        <details>
          <summary>Build the "{HEALTH_GUIDE.name}" Shortcut (step by step)</summary>
          <ol class="small" style="display:flex;flex-direction:column;gap:6px;margin-top:8px">
            {HEALTH_GUIDE.steps.map((st, i) => <li key={i}><strong>{st.action}</strong> <span class="muted">{st.detail}</span></li>)}
          </ol>
        </details>
        <details>
          <summary>Using it</summary>
          <ol class="small" style="margin-top:8px">{HEALTH_GUIDE.usage.map((u, i) => <li key={i}>{u}</li>)}</ol>
        </details>
        <details>
          <summary>Troubleshooting</summary>
          <ul class="small" style="margin-top:8px">{HEALTH_GUIDE.troubleshooting.map((u, i) => <li key={i}>{u}</li>)}</ul>
        </details>
      </section>

      <section class="card stack">
        <h3>ABOUT</h3>
        <p class="small muted">BOUNDLESS NEON runs a personal 14-day training program offline. No account, no analytics, no trackers. {program.meta.disclaimer}</p>
        <button type="button" class="btn btn-ghost" onClick={() => navigate('/dev/poses')}>Pose sheet</button>
      </section>
    </main>
  );
}
