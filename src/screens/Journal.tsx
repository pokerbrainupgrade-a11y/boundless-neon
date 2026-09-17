import { useState } from 'preact/hooks';
import { route, navigate } from '@/router';
import { program } from '@/data/program';
import { db, type SessionLog } from '@/lib/db';
import { blocks, logs, block, reloadLogs, deleteLog, blockLabel, dayLabel, reloadBlocks } from '@/lib/store';
import { LogForm } from '@/components/LogForm';
import { useEffect } from 'preact/hooks';

function summary(l: SessionLog): string {
  const d = l.data;
  const parts: string[] = [];
  if (Array.isArray(d.rounds) && l.sessionId === 'A') parts.push(`total ${d.total ?? '—'}${d.dropoff !== undefined ? `, drop-off ${d.dropoff}%` : ''}`);
  if (Array.isArray(d.rounds) && l.sessionId === 'H') parts.push(`HR ${(d.rounds as (number | null)[]).filter(Boolean).join('/')}`);
  if (Array.isArray(d.lifts)) parts.push((d.lifts as { exercise?: string; load?: number; seconds?: number }[]).map((x) => `${x.exercise ?? ''} ${x.load ?? ''}×${x.seconds ?? ''}s`).join(', '));
  if (typeof d.minutes === 'number') parts.push(`${d.minutes} min`);
  if (typeof d.durationMin === 'number') parts.push(`${d.durationMin} min`);
  if (typeof d.waterF === 'number') parts.push(`${d.waterF}°F`);
  if (typeof d.cycles === 'number') parts.push(`${d.cycles} cycles`);
  if (typeof d.stations === 'number') parts.push(`${d.stations}/15 stations`);
  if (typeof d.completed === 'number' && d.sequence) parts.push(`Seq ${d.sequence} · ${d.completed} done`);
  if (typeof d.reps === 'number') parts.push(`${d.reps} reps`);
  if (l.rpe) parts.push(`RPE ${l.rpe}`);
  if (l.hr?.avg) parts.push(`avg HR ${l.hr.avg}`);
  return parts.join(' · ');
}

export function Journal() {
  const r = route.value;
  const editId = r.parts[1] ? Number(r.parts[1]) : null;
  const [editing, setEditing] = useState<SessionLog | null>(null);
  const [blockId, setBlockId] = useState<number | 'all'>(block.value?.id ?? 'all');
  const [allLogs, setAllLogs] = useState<SessionLog[]>([]);
  useEffect(() => {
    void db.logs.orderBy('startedAt').reverse().toArray().then(setAllLogs);
  }, [logs.value]);
  useEffect(() => {
    if (editId) void db.logs.get(editId).then((l) => setEditing(l ?? null));
    else setEditing(null);
  }, [editId]);

  if (editId && editing) {
    const s = program.sessions[editing.ranSessionId] ?? program.sessions[editing.sessionId]!;
    return <LogForm session={s} original={program.sessions[editing.sessionId] ?? s} draft={editing} onSaved={() => { void reloadLogs(); navigate('/journal', true); }} onCancel={() => navigate('/journal', true)} />;
  }

  const shown = allLogs.filter((l) => blockId === 'all' || l.blockId === blockId);
  const byDay = new Map<string, SessionLog[]>();
  for (const l of shown) {
    const k = `${l.blockId}-${l.dayN}`;
    byDay.set(k, [...(byDay.get(k) ?? []), l]);
  }
  return (
    <main class="screen" data-testid="journal">
      <div class="section-h"><h1>Journal</h1></div>
      <div class="row wrap">
        <button type="button" class={`btn ${blockId === 'all' ? 'btn-primary' : ''}`} onClick={() => setBlockId('all')}>All</button>
        {blocks.value.map((b) => <button key={b.id} type="button" class={`btn ${blockId === b.id ? 'btn-primary' : ''}`} onClick={() => setBlockId(b.id!)}>{blockLabel(b.n)}</button>)}
      </div>
      {shown.length === 0 && <p class="muted">No sessions yet. Start one from Today.</p>}
      {[...byDay.entries()].map(([k, ls]) => {
        const b = blocks.value.find((x) => x.id === ls[0]!.blockId);
        return (
          <section key={k} class="card stack">
            <div class="row between"><h3>{b ? blockLabel(b.n) : ''} · {dayLabel(ls[0]!.dayN)}</h3><span class="muted small">{ls[0]!.startedAt.slice(0, 10)}</span></div>
            {ls.map((l) => {
              const s = program.sessions[l.ranSessionId] ?? program.sessions[l.sessionId];
              return (
                <div key={l.id} class="row between" data-testid="journal-entry" style="gap:8px">
                  <div class="grow" style="min-width:0">
                    <div><strong>{s?.name ?? l.sessionId}</strong> <span class="muted small">{l.slot}{l.prenatal ? ` · prenatal ${l.trimester ?? ''}` : ''}{!l.completed ? ' · ended early' : ''}</span></div>
                    <div class="muted small">{summary(l)}{l.notes ? ` · ${l.notes}` : ''}</div>
                  </div>
                  <button type="button" class="btn" onClick={() => navigate(`/journal/${l.id}`)} aria-label="Edit">Edit</button>
                  <button type="button" class="btn btn-ghost" onClick={() => confirm('Delete this entry?') && deleteLog(l.id!).then(reloadBlocks)} aria-label="Delete">✕</button>
                </div>
              );
            })}
          </section>
        );
      })}
    </main>
  );
}
