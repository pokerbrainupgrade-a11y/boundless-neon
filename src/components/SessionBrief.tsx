import { program, getDay, foundationSequence, sevenMinuteMoves } from '@/data/program';
import type { FoundationExercise, Session } from '@/data/schema';
import { resolveSession, overrideData, overridesFor } from '@/lib/prenatal';
import { sevenMinuteSequence, tabataMoves, superSlowOptions } from '@/lib/presets';
import { ctx } from '@/lib/store';
import { Pose } from './Pose';
import { foundationView } from './Steppers';

export interface BriefTarget {
  sessionId: string;
  day: number;
  slot: 'am' | 'main' | 'pm' | 'habit';
  variant?: string;
}

/** Resolve a brief target into the session that will actually run. */
export function resolveBrief(t: BriefTarget) {
  const c = ctx.value;
  const res = resolveSession(t.sessionId, c);
  const original = program.sessions[t.sessionId];
  const dayObj = t.day >= 1 && t.day <= 14 ? getDay(t.day) : getDay(1);
  return { res, original, dayObj, week: dayObj.week, ctx: c };
}

export function sessionUrl(t: BriefTarget): string {
  return `/session/${t.sessionId}?day=${t.day}&slot=${t.slot}${t.variant ? `&variant=${t.variant}` : ''}`;
}
export function briefUrl(t: BriefTarget): string {
  return `/brief/${t.sessionId}?day=${t.day}&slot=${t.slot}${t.variant ? `&variant=${t.variant}` : ''}`;
}

function ExerciseRow({ ex, n }: { ex: FoundationExercise; n: number }) {
  const v = foundationView(ex);
  return (
    <details class="ex card" style="padding:10px 14px" data-testid="brief-exercise">
      <summary>
        <Pose id={v.frames[0]!} size={48} />
        <div style="min-width:0"><strong>{n}. {ex.name}</strong><div class="muted small">{ex.fatigueTarget} · 3 reps{v.prenatal ? ' · prenatal version' : ''}</div></div>
      </summary>
      <div class="stack" style="margin-top:8px">
        {v.frames.length > 1 ? <div class="pose-strip">{v.frames.map((f) => <Pose key={f} id={f} size={110} />)}</div> : <Pose id={v.frames[0]!} size={130} />}
        <ol style="margin:0;display:flex;flex-direction:column;gap:4px">{ex.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
        {v.hard.map((o) => <div key={o.id} class="banner caution"><span><strong>Prenatal:</strong> {o.replacement} <span class="muted">{o.reason}</span></span></div>)}
        {v.soft.map((o) => <div key={o.id} class="banner warn"><span><strong>Option:</strong> {o.replacement} <span class="muted">{o.reason}</span></span></div>)}
      </div>
    </details>
  );
}

function WhatYoullDo({ session, original, t, week }: { session: Session; original: Session; t: BriefTarget; week: 1 | 2 }) {
  const c = ctx.value;
  const preset = session.timerPreset;
  if (preset === 'foundation') {
    const dayObj = t.day >= 1 && t.day <= 14 ? getDay(t.day) : getDay(1);
    const v = t.variant === 'seqA' || t.variant === 'seqB' || t.variant === 'applied' ? t.variant : dayObj.foundation === 'A' ? 'seqA' : dayObj.foundation === 'B' ? 'seqB' : 'applied';
    if (v === 'applied') return <section class="stack"><h2>Applied day</h2><div class="card">{program.foundation.day7}</div></section>;
    const seq = foundationSequence(v === 'seqA' ? 'A' : 'B');
    return (
      <section class="stack" data-testid="brief-list">
        <h2>Sequence {v === 'seqA' ? 'A' : 'B'} · {seq.length} exercises</h2>
        <div class="muted small">Tap an exercise for its key frames and steps. Decompression breathing runs inside every one.</div>
        {seq.map((ex, i) => <ExerciseRow key={ex.id} ex={ex} n={i + 1} />)}
      </section>
    );
  }
  if (preset === 'sevenMinute') {
    const seq = sevenMinuteSequence(week, c);
    return (
      <section class="stack" data-testid="brief-list">
        <h2>The 12 moves · week {week}</h2>
        <div class="muted small">30 s each, 10 s between. 2–3 rounds.{week === 2 && !c.on ? ' Week 2 uses the explosive swaps.' : ''}</div>
        {seq.map((m, i) => {
          const base = program.sevenMinute[i]!;
          const w2 = m.swapped && !c.on;
          return (
            <div key={m.id} class="card row" style="gap:10px;padding:10px 14px" data-testid="brief-move" data-swap={w2}>
              <Pose id={m.drawingId} size={48} />
              <div class="grow" style="min-width:0"><strong>{i + 1}. {m.name}</strong>{m.swapped && <span class="muted small"> (for {base.name})</span>}<div class="muted small">{m.cue}</div></div>
              {w2 && <span class="chip chip-yellow">W2 SWAP</span>}
              {m.swapped && c.on && <span class="chip chip-purple">PRENATAL</span>}
            </div>
          );
        })}
      </section>
    );
  }
  if (preset === 'mobility') {
    const d = overrideData('E', c);
    const swaps = (d.movementSwaps as Record<string, { name: string }> | undefined) ?? {};
    const pos = (d.positionSwaps as Record<string, string> | undefined) ?? {};
    return (
      <section class="stack" data-testid="brief-list">
        <h2>15 stations</h2>
        <div class="muted small">20–30 slow passes per roll target, paired with the movement.</div>
        {program.mobilityStations.map((s) => (
          <div key={s.n} class="card row" style="gap:10px;padding:10px 14px" data-testid="brief-station">
            <span class="chip chip-muted" style="min-width:34px;justify-content:center">{s.n}</span>
            <div class="grow" style="min-width:0"><strong>{c.on && swaps[s.movementId] ? `${s.count} ${swaps[s.movementId]!.name}` : s.movement}</strong><div class="muted small">Roll: {s.roll}{c.on && pos[s.rollPosition] ? ` · use ${pos[s.rollPosition]}` : ''}</div></div>
            <Pose id={s.rollDrawingId} size={44} />
          </div>
        ))}
      </section>
    );
  }
  if (preset === 'superSlow') {
    return (
      <section class="stack" data-testid="brief-list">
        <h2>Four lifts, in order</h2>
        <div class="muted small">One set each. 30–60 s per rep, about 2 min under tension. Rest 1–2 min between lifts.</div>
        {program.superSlowPatterns.map((p, i) => (
          <div key={p.id} class="card row" style="gap:10px;padding:10px 14px" data-testid="brief-lift">
            <Pose id={p.drawingId} size={48} />
            <div class="grow"><strong>{i + 1}. {p.name}</strong><div class="muted small">{superSlowOptions(p.id, c).join(' · ')}</div></div>
          </div>
        ))}
      </section>
    );
  }
  if (preset === 'tabata') {
    const allowed = tabataMoves(c);
    const move = allowed.find((m) => m.id === t.variant) ?? allowed[0]!;
    const rot = (ids: string[]) => ids.map((id) => program.tabataMovements.find((m) => m.id === id)!.name).join(' → ');
    return (
      <section class="stack" data-testid="brief-list">
        <h2>Today's movement</h2>
        <div class="card row" style="gap:12px"><Pose id={move.drawingId} size={64} glow /><div><strong>{move.name}</strong><div class="muted small">8 × 20 s {c.on ? 'at RPE 6–7' : 'all-out'} / 10 s {c.on ? 'easy' : 'rest'} · log {move.unit} per round</div></div></div>
        <div class="card small"><strong>Rotation.</strong> W1: {rot(program.tabataRotation.w1)}. W2: {rot(program.tabataRotation.w2)}.{c.on ? ` Prenatal: ${allowed.map((m) => m.name).join(', ')} only.` : ''}</div>
      </section>
    );
  }
  if (preset === 'sprints') {
    return <section class="stack" data-testid="brief-list"><h2>Presets</h2><div class="card small"><strong>G1.</strong> 4 × (0:30 all-out / 4:00 active rest).<br /><strong>G2.</strong> 5 × (0:04 / 0:20).<br /><strong>G3.</strong> 3 sets × 5 × (0:04 / 0:20).</div></section>;
  }
  if (preset === 'vo2') {
    return <section class="stack" data-testid="brief-list"><h2>Structure</h2><div class="card small">5 × (4:00 {c.on ? 'at RPE 6–7, short sentences' : 'at 87–97% HRmax'} / 4:00 easy). Warm up first. Log average HR per round.</div></section>;
  }
  if (preset === 'decompression' || session.id === 'lukewarmShower') {
    return <section class="stack" data-testid="brief-list"><h2>The four cues</h2><ol style="margin:0;display:flex;flex-direction:column;gap:4px">{program.foundation.breathing.cues.map((k) => <li key={k.name}><strong>{k.name}.</strong> {k.text}</li>)}</ol></section>;
  }
  void original;
  return null;
}

/** Full brief for a scheduled session: drawing, purpose, what you'll do, cues, safety. */
export function SessionBrief({ target }: { target: BriefTarget }) {
  const { res, original, week, ctx: c } = resolveBrief(target);
  if (!original) return <div class="banner caution">Unknown session.</div>;
  if (!res) {
    const o = program.prenatal.overrides.find((x) => x.targets.includes(original.id));
    return <div class="banner caution" data-testid="removed-notice"><span>{original.name} is removed in Prenatal Mode. {o?.reason}</span></div>;
  }
  const s = res.session;
  const active = overridesFor(original.id, c).filter((o) => o.action !== 'remove');
  return (
    <div class="stack" data-testid="session-brief" data-session={s.id}>
      <div class="row" style="gap:14px;align-items:flex-start">
        <Pose id={s.drawingId} size={110} glow />
        <div class="grow" style="min-width:0">
          {s.letter && <span class="chip chip-cyan">{s.letter}</span>}
          <h1 style="font-size:1.3rem;margin-top:4px">{res.name}</h1>
          {res.replaced && <div class="muted small">Replaces {original.name} in Prenatal Mode.</div>}
          <p class="muted" style="margin-top:6px">{s.purpose}</p>
        </div>
      </div>
      {res.preStart && <div class="banner warn"><span>{res.preStart}</span></div>}
      {active.map((o) => <div key={o.id} class="banner caution" data-testid="override-note"><span><strong>Prenatal:</strong> {o.replacement} <span class="muted">{o.reason}</span></span></div>)}
      <WhatYoullDo session={s} original={original} t={target} week={week} />
      <section class="stack"><h2>Cues</h2><ul style="display:flex;flex-direction:column;gap:4px">{s.cues.map((x) => <li key={x}>{x}</li>)}</ul></section>
      {s.safety.length > 0 && <section class="stack"><h2>Safety</h2><ul style="display:flex;flex-direction:column;gap:4px">{s.safety.map((x) => <li key={x}>{x}</li>)}</ul></section>}
      {s.dose && <div class="card small"><strong>Dose.</strong> {s.dose}</div>}
      {s.id === 'B' && <div class="card small"><strong>As the warm-up.</strong> {program.foundation.asWarmup}</div>}
      {s.id === 'decompression' && <div class="muted small">{Object.keys(sevenMinuteMoves).length ? '' : ''}</div>}
    </div>
  );
}

/** Page chrome shared by the brief route and the brief-first steppers. */
export function BriefPage({ target, title, onStart, onClose, startLabel = 'START' }: { target: BriefTarget; title: string; onStart: () => void; onClose: () => void; startLabel?: string }) {
  const { res } = resolveBrief(target);
  return (
    <main class="page" data-testid="brief-page">
      <div class="sticky-head">
        <span class="title">{title}</span>
        <button type="button" class="btn btn-ghost" onClick={onClose} data-testid="brief-close">Close</button>
      </div>
      <div class="content"><SessionBrief target={target} /></div>
      {res && (
        <div class="pinned-cta"><button type="button" class="btn btn-primary btn-xl btn-block" data-testid="brief-start" onClick={onStart}>{startLabel}</button></div>
      )}
    </main>
  );
}
