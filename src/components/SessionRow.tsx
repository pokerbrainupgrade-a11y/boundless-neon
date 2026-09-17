import { navigate } from '@/router';
import type { SessionRef } from '@/data/schema';
import { program } from '@/data/program';
import { resolveSession } from '@/lib/prenatal';
import { tabataMoves } from '@/lib/presets';
import { ctx, logsFor } from '@/lib/store';
import { settings } from '@/lib/settings';
import { Pose } from './Pose';

/** One scheduled session inside a Today/Schedule card. */
export function SessionRow({ r, day, slot, compact = false }: { r: SessionRef; day: number; slot: 'am' | 'main' | 'pm'; compact?: boolean }) {
  const c = ctx.value;
  const res = resolveSession(r, c);
  const original = program.sessions[r.id]!;
  const done = logsFor(day, r.id, slot).some((l) => l.completed);
  if (!res) {
    const o = program.prenatal.overrides.find((x) => x.targets.includes(r.id));
    return (
      <div class="row between" data-testid="session-row" data-session={r.id} data-removed="true" style="min-height:var(--tap);opacity:0.7">
        <span class="muted small"><s>{original.name}</s> · removed in Prenatal Mode. {o?.reason}</span>
      </div>
    );
  }
  const optionalOff = res.optional && !settings.value.prenatalCoolShower;
  if (optionalOff) {
    return (
      <div class="row between" data-testid="session-row" data-session={r.id} data-optional-off="true" style="min-height:var(--tap)">
        <span class="muted small">{res.name} · off by default in Prenatal Mode. Turn on in Settings.</span>
      </div>
    );
  }
  const name = res.name;
  const allowed = r.id === 'A' ? tabataMoves(c) : [];
  const tabataName = r.id === 'A' && r.variant ? (allowed.find((m) => m.id === r.variant) ?? allowed[0])?.name : undefined;
  const variantLabel = r.id === 'A' && r.variant ? tabataName : r.id === 'B' && r.variant ? (r.variant === 'seqA' ? 'Seq A' : r.variant === 'seqB' ? 'Seq B' : 'Applied') : undefined;
  const url = `/session/${r.id}?day=${day}&slot=${slot}${r.variant ? `&variant=${r.variant}` : ''}`;
  return (
    <div class={`row between ${done ? 'done' : ''}`} data-testid="session-row" data-session={r.id} data-ran={res.session.id} data-done={done} style="min-height:var(--tap);gap:10px">
      {!compact && <Pose id={res.session.drawingId} size={44} />}
      <div class="grow" style="min-width:0">
        <div style="font-weight:600">{res.replaced ? <><s class="muted">{original.short ?? original.name}</s> → </> : null}{name}{variantLabel ? <span class="muted"> · {variantLabel}</span> : null}</div>
        <div class="muted small">{r.note}{r.optional ? ' · optional' : ''}{res.overrides.length && !res.replaced ? ' · prenatal-modified' : ''}</div>
      </div>
      <button type="button" class={`btn ${done ? 'btn-lime' : 'btn-primary'}`} data-testid="start-session" onClick={() => navigate(url)} aria-label={`${done ? 'Redo' : 'Start'} ${name}`}>{done ? '✓ Again' : 'Start'}</button>
    </div>
  );
}
