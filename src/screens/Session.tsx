import { useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { route, navigate } from '@/router';
import { program, getDay } from '@/data/program';
import type { Session as SessionT, TimerPreset } from '@/data/schema';
import { resolveSession, overrideData } from '@/lib/prenatal';
import { buildPreset, tabataMoves, superSlowOptions, type PresetOptions } from '@/lib/presets';
import { ctx, dayN, block, todayYmd } from '@/lib/store';
import { settings, hrMax } from '@/lib/settings';
import { likelyHotOutside } from '@/lib/time';
import type { SessionLog } from '@/lib/db';
import { TimerRunner, type RunnerApi, type RunResult } from '@/components/TimerRunner';
import { LogForm, tabataTotals } from '@/components/LogForm';
import { FoundationStepper, MobilityStepper, DecompressionPacer, type StepperResult } from '@/components/Steppers';
import { Pose } from '@/components/Pose';
import { BoxBreath } from '@/components/BreathPacer';
import { flash } from '@/components/Flash';
import { chime, tickBeep } from '@/lib/audio';
import { fmtClock } from '@/lib/engine';

type Phase = { kind: 'setup' } | { kind: 'log'; draft: SessionLog; note?: string };

export function Session() {
  const r = route.value;
  const sessionId = r.parts[1] ?? '';
  const q = r.query;
  const day = Number(q.get('day') ?? dayN.value ?? 1);
  const slot = (q.get('slot') ?? 'main') as SessionLog['slot'];
  const variant = q.get('variant') ?? undefined;
  const c = ctx.value;
  const resolved = resolveSession(sessionId, c);
  const [phase, setPhase] = useState<Phase>({ kind: 'setup' });
  const [ack, setAck] = useState(false);

  if (!resolved) {
    const original = program.sessions[sessionId];
    return (
      <main class="screen">
        <div class="section-h"><h1>{original?.name ?? 'Session'}</h1></div>
        <div class="banner caution" data-testid="removed-notice">
          <span>{original ? `${original.name} is removed in Prenatal Mode.` : 'Unknown session.'} {program.prenatal.overrides.find((o) => o.targets.includes(sessionId))?.reason ?? ''}</span>
        </div>
        <button type="button" class="btn" onClick={() => navigate('/today')}>Back to Today</button>
      </main>
    );
  }

  const { session, original } = resolved;
  const dayObj = day >= 1 && day <= 14 ? getDay(day) : getDay(1);
  const week = dayObj.week;
  const b = block.value;
  const draft = (res: { startedAt: string; endedAt: string; completed: boolean }, data: Record<string, unknown>): SessionLog => ({
    blockId: b?.id ?? 0,
    dayN: day,
    week,
    day: dayObj.day,
    slot,
    sessionId: original.id,
    ranSessionId: session.id,
    variant,
    startedAt: res.startedAt,
    endedAt: res.endedAt,
    prenatal: c.on,
    trimester: c.on ? c.trimester : undefined,
    completed: res.completed,
    data,
  });

  if (phase.kind === 'log') {
    return <LogForm session={session} original={original} draft={phase.draft} note={phase.note} onSaved={() => navigate('/today', true)} onCancel={() => navigate('/today', true)} />;
  }

  // First-session clearance lock (Prenatal Mode)
  const needsClearance = c.on && !settings.value.clearanceDate;
  if (needsClearance && !ack) {
    return (
      <main class="screen" data-testid="clearance-lock">
        <div class="section-h"><h1>Before your first session</h1></div>
        <div class="banner caution"><span>{program.prenatal.firstLaunch}</span></div>
        <p class="muted">Sessions unlock once your provider-clearance date is set in Settings.</p>
        <button type="button" class="btn btn-primary btn-lg btn-block" onClick={() => navigate('/settings')}>Set my provider date</button>
        <button type="button" class="btn btn-ghost btn-block" onClick={() => navigate('/today')}>Back</button>
      </main>
    );
  }
  void setAck;

  const onStepper = (res: StepperResult, note?: string) => setPhase({ kind: 'log', draft: draft(res, res.data), note });
  const abort = () => navigate('/today', true);
  const preset: TimerPreset = session.timerPreset;

  if (preset === 'foundation') {
    const v = (variant === 'seqA' || variant === 'seqB' || variant === 'applied' ? variant : dayObj.foundation === 'A' ? 'seqA' : dayObj.foundation === 'B' ? 'seqB' : 'applied') as 'seqA' | 'seqB' | 'applied';
    return <FoundationStepper variant={v} onDone={onStepper} onAbort={abort} />;
  }
  if (preset === 'mobility') return <MobilityStepper onDone={onStepper} onAbort={abort} />;
  if (preset === 'decompression') return <DecompressionPacer title={session.name} onDone={onStepper} onAbort={abort} />;

  return <IntervalSession key={session.id + variant} session={session} original={original} week={week} variant={variant} preStartNotes={resolved.preStart} onDone={(res, data, note) => setPhase({ kind: 'log', draft: draft(res, data), note })} onAbort={abort} />;
}

/* ---------------- interval presets ---------------- */

function IntervalSession({ session, original, week, variant, preStartNotes, onDone, onAbort }: {
  session: SessionT; original: SessionT; week: 1 | 2; variant?: string; preStartNotes: string | null;
  onDone: (r: RunResult, data: Record<string, unknown>, note?: string) => void; onAbort: () => void;
}) {
  const c = ctx.value;
  const s = settings.value;
  const preset = session.timerPreset;
  const day = dayN.value ?? 1;
  const rotation = week === 1 ? program.tabataRotation.w1 : program.tabataRotation.w2;
  const dayObj = day >= 1 && day <= 14 ? getDay(day) : null;
  const dayIdx = dayObj ? [1, 3, 5].indexOf(dayObj.day) : -1;
  const defaultMove = variant ?? (dayIdx >= 0 ? rotation[dayIdx] : rotation[0]) ?? 'bike';
  const allowedMoves = tabataMoves(c);
  const [opts, setOpts] = useState<PresetOptions>(() => ({
    leadInSec: s.leadInSec,
    ctx: c,
    week,
    tabataMove: allowedMoves.some((m) => m.id === defaultMove) ? defaultMove : allowedMoves[0]!.id,
    sevenRounds: 2,
    sprintVariant: 'G1',
    minutes: preset === 'stamina' ? (c.on ? Number(overrideData('L', c).defaultMinutes ?? 45) : 120) : (session.defaultMinutes ?? 20),
    cycles: 2,
    restSec: 90,
    swimRounds: 10,
  }));
  const built = useMemo(() => buildPreset(preset, opts), [preset, opts]);
  const collected = useRef<Record<string, unknown>>({});
  const [, bump] = useState(0);
  const set = (patch: Record<string, unknown>) => { collected.current = { ...collected.current, ...patch }; bump((n) => n + 1); };
  const stamina = useRef({ halfway: false, hydrated: 0, banner: '' });
  const [banner, setBanner] = useState('');
  const superSlow = useRef<{ exercise: string; load?: number; seconds?: number; reps?: number; pattern: string }[]>(program.superSlowPatterns.map((p) => ({ pattern: p.id, exercise: superSlowOptions(p.id, c)[0]! })));
  const lastTick = useRef(-1);

  const preStart: ComponentChildren = (
    <div class="stack">
      {preStartNotes && <div class="banner warn" data-testid="prestart-note"><span>{preStartNotes}</span></div>}
      {c.on && <div class="banner info" data-testid="water-reminder"><span>💧 Water first. Sip every 15–20 min.</span></div>}
      {c.on && likelyHotOutside() && <div class="banner caution" data-testid="indoor-prompt"><span>Likely above 85°F outside right now. Keep this session indoors.</span></div>}
      {preset === 'stamina' && <div class="banner caution"><span><strong>Phoenix rule:</strong> start before dawn or go indoors. Carry 0.5 L water per hour plus sodium. Turn around at the halfway time no matter how you feel. Stop at dizziness, confusion, or cramping.</span></div>}
      {c.on && s.clearanceDate && <div class="muted small">Provider-cleared on {s.clearanceDate}. Follow your provider's limits.</div>}
      {resolvedOverrideNotes(original.id)}
      {preset === 'tabata' && (
        <label class="field"><span>Movement</span>
          <select class="input" data-testid="tabata-move" value={opts.tabataMove} onChange={(e) => setOpts({ ...opts, tabataMove: (e.target as HTMLSelectElement).value })}>
            {allowedMoves.map((m) => <option key={m.id} value={m.id}>{m.name}{rotation.includes(m.id) ? ' · this week' : ''}</option>)}
          </select>
        </label>
      )}
      {preset === 'vo2' && !built.meta.hideHr && hrMax(s.age) && (
        <div class="card"><div class="muted small">Target band</div><div style="font-family:var(--font-timer);font-size:1.4rem">{Math.round(hrMax(s.age)! * 0.87)}–{Math.round(hrMax(s.age)! * 0.97)} bpm</div><div class="muted small">87–97% of HRmax {hrMax(s.age)} (208 − 0.7 × age)</div></div>
      )}
      {preset === 'vo2' && !built.meta.hideHr && !hrMax(s.age) && <div class="muted small">Set your age in Settings to see the 87–97% HRmax band.</div>}
      {preset === 'vo2' && built.meta.hideHr === true && <div class="banner info"><span>Prenatal: HR targets hidden. Use RPE 6–7 and the talk test (short sentences).</span></div>}
      {preset === 'sevenMinute' && (
        <label class="field"><span>Rounds</span>
          <div class="row">{[1, 2, 3].map((n) => <button key={n} type="button" class={`btn grow ${opts.sevenRounds === n ? 'btn-primary' : ''}`} onClick={() => setOpts({ ...opts, sevenRounds: n })}>{n}</button>)}</div>
        </label>
      )}
      {preset === 'sprints' && (
        <label class="field"><span>Preset</span>
          <div class="row">{(['G1', 'G2', 'G3'] as const).map((v) => <button key={v} type="button" class={`btn grow ${opts.sprintVariant === v ? 'btn-primary' : ''}`} onClick={() => setOpts({ ...opts, sprintVariant: v })}>{v}</button>)}</div>
          <div class="muted small">G1: 4 × (0:30 / 4:00) · G2: 5 × (0:04 / 0:20) · G3: 3 sets × 5 × (0:04 / 0:20)</div>
        </label>
      )}
      {(preset === 'coldImmersion' || preset === 'sauna' || preset === 'coolStretch' || preset === 'countdown' || preset === 'stamina') && (
        <MinutesPicker label={preset === 'stamina' ? 'Planned duration (min)' : 'Minutes'} value={opts.minutes!} min={session.minMinutes ?? (preset === 'stamina' ? 20 : 5)} max={preset === 'stamina' ? (c.on ? 60 : 300) : (session.maxMinutes ?? 60)} step={preset === 'stamina' ? 15 : (preset === 'countdown' ? 5 : 1)} onChange={(v) => setOpts({ ...opts, minutes: v })} />
      )}
      {preset === 'contrast' && (
        <label class="field"><span>Cycles</span><div class="row">{[2, 3].map((n) => <button key={n} type="button" class={`btn grow ${opts.cycles === n ? 'btn-primary' : ''}`} onClick={() => setOpts({ ...opts, cycles: n })}>{n}</button>)}</div></label>
      )}
      {preset === 'superSlow' && (
        <div class="stack">
          <MinutesPicker label="Rest between lifts (s)" value={opts.restSec!} min={60} max={120} step={15} onChange={(v) => setOpts({ ...opts, restSec: v })} />
          <div class="muted small">Rep length {s.repLengthSec} s (Settings). Metronome ticks every 5 s, accent on each rep.</div>
        </div>
      )}
      {preset === 'swim' && !built.meta.continuous && (
        <MinutesPicker label="Rounds" value={opts.swimRounds!} min={10} max={12} step={1} onChange={(v) => setOpts({ ...opts, swimRounds: v })} />
      )}
      {session.safety.length > 0 && <details><summary class="muted small">Safety notes</summary><ul class="small">{session.safety.map((x) => <li key={x}>{x}</li>)}</ul></details>}
    </div>
  );

  const renderSegment = (api: RunnerApi) => {
    const seg = api.segment;
    if (!seg) return null;
    const round = seg.meta?.round as number | undefined;
    if (preset === 'tabata' && seg.kind === 'rest' && round) {
      const rounds = ((collected.current.rounds as (number | null)[]) ?? Array(8).fill(null)) as (number | null)[];
      const v = rounds[round - 1] ?? 0;
      const setR = (n: number) => { const r = [...rounds]; r[round - 1] = Math.max(0, n); set({ rounds: r, unit: built.meta.unit }); };
      return (
        <div class="card stack" data-testid="round-log">
          <div class="muted small">Round {round} · {String(built.meta.unit)}</div>
          <div class="row between wrap">
            <div class="stepper">
              <button type="button" class="btn" onClick={() => setR(v - 1)} aria-label="minus one">−</button>
              <span class="val" data-testid="round-val">{v}</span>
              <button type="button" class="btn btn-cyan" onClick={() => setR(v + 1)} aria-label="plus one">+</button>
            </div>
            <div class="row"><button type="button" class="btn" onClick={() => setR(v + 5)}>+5</button><button type="button" class="btn" onClick={() => setR(v + 10)}>+10</button></div>
          </div>
        </div>
      );
    }
    if (preset === 'vo2' && seg.kind === 'rest' && round) {
      const rounds = ((collected.current.rounds as (number | null)[]) ?? Array(5).fill(null)) as (number | null)[];
      return (
        <div class="card stack" data-testid="round-log">
          <label class="field"><span class="muted small">Round {round} avg HR (or paste from Health after)</span>
            <input class="input" type="number" inputMode="numeric" value={rounds[round - 1] ?? ''} onInput={(e) => { const r = [...rounds]; r[round - 1] = Number((e.target as HTMLInputElement).value) || null; set({ rounds: r }); }} />
          </label>
        </div>
      );
    }
    if (preset === 'sprints' && seg.kind === 'rest' && round) {
      const sprints = ((collected.current.sprints as string[]) ?? []) as string[];
      return (
        <label class="field card"><span class="muted small">Sprint {round}: distance / watts / cals (optional)</span>
          <input class="input" value={sprints[round - 1] ?? ''} onInput={(e) => { const r = [...sprints]; r[round - 1] = (e.target as HTMLInputElement).value; set({ sprints: r }); }} />
        </label>
      );
    }
    if (preset === 'sevenMinute') {
      const moveId = seg.meta?.moveId as string;
      const nextId = seg.meta?.next as string | null;
      const move = program.sevenMinute.find((m) => m.id === moveId)?.name;
      void move;
      const isTransition = seg.kind === 'transition';
      return (
        <div class="row" style="justify-content:center;gap:16px" data-testid="seven-move" data-move={moveId}>
          <div class="card" style="padding:8px;display:flex;flex-direction:column;align-items:center"><Pose id={sevenDrawing(moveId)} size={isTransition ? 150 : 170} glow /><span class="small">{isTransition ? 'NEXT' : 'NOW'}</span></div>
          {!isTransition && nextId && <div class="card" style="padding:8px;display:flex;flex-direction:column;align-items:center;opacity:0.7"><Pose id={sevenDrawing(nextId)} size={90} /><span class="small muted">next: {sevenName(nextId)}</span></div>}
        </div>
      );
    }
    if (preset === 'superSlow') {
      const liftIdx = ((seg.meta?.lift as number) ?? 1) - 1;
      const pattern = program.superSlowPatterns[liftIdx]!;
      const cur = superSlow.current[liftIdx]!;
      if (seg.open) {
        return (
          <div class="card stack" data-testid="lift-card">
            <div class="row between">
              <select class="input grow" value={cur.exercise} onChange={(e) => { cur.exercise = (e.target as HTMLSelectElement).value; bump((n) => n + 1); }}>
                {superSlowOptions(pattern.id, c).map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
              <Pose id={pattern.drawingId} size={64} glow />
            </div>
            <label class="field"><span class="muted small">Load</span><input class="input" type="number" inputMode="decimal" value={cur.load ?? ''} onInput={(e) => { cur.load = Number((e.target as HTMLInputElement).value) || undefined; }} /></label>
            <Metronome elapsedMs={api.state.segmentElapsedMs} repLengthSec={s.repLengthSec} />
            {c.on && <div class="muted small">Exhale through the effort. Stop 2–3 reps before failure.</div>}
          </div>
        );
      }
      const flag = cur.seconds !== undefined ? (cur.seconds > 150 ? 'TUT > 150 s: add load' : cur.seconds < 90 ? 'TUT < 90 s: reduce load' : 'TUT in range') : '';
      return (
        <div class="card stack" data-testid="lift-rest">
          <div class="row between"><strong>{cur.exercise}</strong><span class="chip chip-yellow">{cur.seconds ?? 0} s</span></div>
          {flag && <div class="muted small">{flag}</div>}
          <label class="field"><span class="muted small">Reps</span><input class="input" type="number" inputMode="numeric" value={cur.reps ?? ''} onInput={(e) => { cur.reps = Number((e.target as HTMLInputElement).value) || undefined; }} /></label>
        </div>
      );
    }
    if ((preset === 'sauna' || preset === 'coolStretch') && seg.kind !== 'prep') return <BoxBreath running={api.state.status === 'running'} />;
    if (preset === 'stamina' && banner) return <div class="banner caution" data-testid="stamina-banner" role="status"><strong>{banner}</strong></div>;
    return null;
  };

  const onTick = (api: RunnerApi) => {
    if (preset !== 'stamina' || !api.segment || api.segment.kind !== 'work') return;
    const el = api.state.segmentElapsedMs;
    const half = built.meta.halfwayMs as number;
    const hyd = built.meta.hydrateEveryMs as number;
    if (!stamina.current.halfway && el >= half) {
      stamina.current.halfway = true;
      chime(); flash('work');
      setBanner('TURN AROUND');
      setTimeout(() => setBanner(''), 15000);
    }
    const hydN = Math.floor(el / hyd);
    if (hydN > stamina.current.hydrated && el < half + 1 || hydN > stamina.current.hydrated) {
      stamina.current.hydrated = hydN;
      if (hydN > 0) { chime(); setBanner('DRINK WATER'); setTimeout(() => setBanner(''), 8000); }
    }
    const sec = Math.floor(el / 1000);
    if (sec !== lastTick.current) lastTick.current = sec;
  };

  const onSegmentStart = (i: number, seg: { kind: string; meta?: Record<string, unknown> }, api: RunnerApi) => {
    if (preset === 'superSlow' && seg.kind === 'rest') {
      const prev = api.engine.segments[i - 1]!;
      const liftIdx = ((prev.meta?.lift as number) ?? 1) - 1;
      // seconds under tension = elapsed of the open segment just ended
      const totalBefore = api.engine.segments.slice(0, i).reduce((a, s) => a + (s.open ? 0 : s.durationMs), 0);
      const tut = Math.round((api.state.totalElapsedMs - totalBefore) / 1000);
      superSlow.current[liftIdx]!.seconds = tut;
    }
  };

  const finish = (r: RunResult) => {
    const data: Record<string, unknown> = { ...collected.current, ...built.meta };
    if (preset === 'tabata') { const rounds = (collected.current.rounds as (number | null)[]) ?? []; Object.assign(data, { movement: opts.tabataMove, rounds, ...tabataTotals(rounds) }); }
    if (preset === 'sevenMinute') data.rounds = Math.min(opts.sevenRounds ?? 1, r.completed ? opts.sevenRounds ?? 1 : Math.ceil(r.elapsedMs / 470_000));
    if (preset === 'superSlow') {
      // last lift has no rest after it: compute its TUT from total elapsed
      const last = superSlow.current[3]!;
      if (last.seconds === undefined && r.completed) {
        const fixed = built.segments.reduce((a, s) => a + (s.open ? 0 : s.durationMs), 0);
        const otherOpen = superSlow.current.slice(0, 3).reduce((a, l) => a + (l.seconds ?? 0) * 1000, 0);
        last.seconds = Math.max(0, Math.round((r.elapsedMs - fixed - otherOpen) / 1000));
      }
      data.lifts = superSlow.current.map((l) => ({ ...l }));
    }
    if (preset === 'coldImmersion' || preset === 'sauna' || preset === 'coolStretch' || preset === 'countdown' || preset === 'stamina') data.minutes = Math.round(r.elapsedMs / 60000);
    if (preset === 'stamina') data.durationMin = Math.round(r.elapsedMs / 60000);
    if (preset === 'contrast') data.totalMinutes = Math.round(r.elapsedMs / 60000);
    if (preset === 'coldShower' || preset === 'countdown') data.done = r.completed;
    onDone(r, data, preset === 'sauna' ? 'Finish with a cold shower.' : undefined);
  };

  const skipLabel = preset === 'superSlow' ? (c.on ? 'STOP' : 'FAILURE') : preset === 'swim' ? 'LAP DONE' : undefined;
  const subtitle = preset === 'tabata' ? tabataMoves(c).find((m) => m.id === opts.tabataMove)?.name : preset === 'superSlow' ? 'push → pull → squat → hinge' : undefined;
  return <TimerRunner built={built} title={session.name} subtitle={subtitle} preStart={preStart} renderSegment={renderSegment} onTick={onTick} onSegmentStart={onSegmentStart} onDone={finish} onAbort={onAbort} skipLabel={skipLabel} snapshotKey={session.id} />;
}

function Metronome({ elapsedMs, repLengthSec }: { elapsedMs: number; repLengthSec: number }) {
  const last = useRef(-1);
  const tick = Math.floor(elapsedMs / 5000);
  const rep = Math.floor(elapsedMs / (repLengthSec * 1000)) + 1;
  const inRep = (elapsedMs % (repLengthSec * 1000)) / (repLengthSec * 1000);
  if (tick !== last.current) {
    if (last.current >= 0) tickBeep((tick * 5) % repLengthSec === 0);
    last.current = tick;
  }
  return (
    <div class="stack" style="gap:4px" data-testid="metronome" data-rep={rep}>
      <div class="row between"><span class="chip chip-pink">REP {rep}</span><span class="muted small">{repLengthSec} s per rep</span></div>
      <div style="height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden"><div style={`height:100%;width:${inRep * 100}%;background:var(--pink);transition:width 250ms linear`} /></div>
    </div>
  );
}

function MinutesPicker({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <div class="field">
      <span>{label}</span>
      <div class="stepper" data-testid="minutes-picker">
        <button type="button" class="btn" onClick={() => onChange(Math.max(min, value - step))} aria-label="less">−</button>
        <span class="val">{value}</span>
        <button type="button" class="btn btn-cyan" onClick={() => onChange(Math.min(max, value + step))} aria-label="more">+</button>
      </div>
    </div>
  );
}

function resolvedOverrideNotes(id: string) {
  const c = ctx.value;
  if (!c.on) return null;
  const ovs = program.prenatal.overrides.filter((o) => o.targets.includes(id) && (o.appliesFrom === 'T1' || (o.appliesFrom === 'T2' && c.trimester !== 'T1') || (o.appliesFrom === 'T3' && c.trimester === 'T3')));
  if (!ovs.length) return null;
  return <div class="stack" style="gap:6px">{ovs.map((o) => <div key={o.id} class="banner caution" data-testid="override-note"><span><strong>Prenatal:</strong> {o.replacement} <span class="muted">{o.reason}</span></span></div>)}</div>;
}

function sevenDrawing(id: string): string {
  const m = program.sevenMinute.find((x) => x.id === id) ?? program.sevenMinute.find((x) => x.w2Swap?.id === id)?.w2Swap ?? program.sevenMinutePrenatal.find((x) => x.id === id);
  return m?.drawingId ?? 'jumpingJacks';
}
function sevenName(id: string): string {
  const m = program.sevenMinute.find((x) => x.id === id) ?? program.sevenMinute.find((x) => x.w2Swap?.id === id)?.w2Swap ?? program.sevenMinutePrenatal.find((x) => x.id === id);
  return m?.name ?? id;
}

export const _fmt = fmtClock;
export const _today = todayYmd;
