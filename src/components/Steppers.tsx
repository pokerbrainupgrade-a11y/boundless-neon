import { useEffect, useState } from 'preact/hooks';
import { program, foundationSequence, tabataMovements } from '@/data/program';
import type { FoundationExercise } from '@/data/schema';
import { overridesFor, overrideIsSoft, overrideData } from '@/lib/prenatal';
import { ctx } from '@/lib/store';
import { settings } from '@/lib/settings';
import { Pose } from './Pose';
import { BreathRing } from './BreathPacer';
import { StopIfChip } from './StopIf';
import { unlockAudio, chime } from '@/lib/audio';
import { requestWakeLock, releaseWakeLock } from '@/lib/wakelock';

export interface StepperResult {
  startedAt: string;
  endedAt: string;
  completed: boolean;
  data: Record<string, unknown>;
}

function useSessionClock() {
  const [startedAt] = useState(() => new Date().toISOString());
  useEffect(() => {
    unlockAudio();
    void requestWakeLock();
    return () => void releaseWakeLock();
  }, []);
  return startedAt;
}

/** Foundation exercise after prenatal overrides. */
export function foundationView(ex: FoundationExercise) {
  const c = ctx.value;
  const ovs = overridesFor(ex.id, c);
  const data = overrideData(ex.id, c);
  const drawings = (data.drawings as Record<string, string> | undefined) ?? {};
  const swapDrawing = drawings[ex.id];
  const hard = ovs.filter((o) => !overrideIsSoft(o, c.trimester));
  const soft = ovs.filter((o) => overrideIsSoft(o, c.trimester));
  const useSwap = !!swapDrawing && hard.some((o) => o.data && (o.data as { drawings?: object }).drawings);
  return {
    frames: useSwap ? [swapDrawing!] : (ex.frames ?? [ex.drawingId]),
    hard,
    soft,
    prenatal: c.on && ovs.length > 0,
  };
}

export function FoundationStepper({ variant, onDone, onAbort }: { variant: 'seqA' | 'seqB' | 'applied'; onDone: (r: StepperResult) => void; onAbort: () => void }) {
  const startedAt = useSessionClock();
  const seq = variant === 'applied' ? [] : foundationSequence(variant === 'seqA' ? 'A' : 'B');
  const [i, setI] = useState(0);
  const [rep, setRep] = useState(1);
  const [frame, setFrame] = useState(0);
  const [done, setDone] = useState<string[]>([]);
  const [pacer, setPacer] = useState(false);
  const sequence = variant === 'seqA' ? 'A' : variant === 'seqB' ? 'B' : 'applied';

  if (variant === 'applied') {
    return (
      <div class="screen-full grid-bg">
        <div class="row between"><div class="wordmark grow" style="font-size:1rem">Foundation · applied</div><StopIfChip /><button type="button" class="btn btn-ghost" onClick={onAbort}>Back</button></div>
        <div class="stack grow" style="justify-content:center">
          <div class="card stack">
            <h3>Day 7 is applied, not trained</h3>
            <p>{program.foundation.day7}</p>
            {ctx.value.on && <div class="banner caution">Prenatal: keep the belly drawn in gently, never forcefully, and stay near a wall or counter for the standing patterns.</div>}
          </div>
          <div class="card"><Pose id="integratedHinges" size={140} /></div>
          <button type="button" class="btn btn-lime btn-xl btn-block" onClick={() => onDone({ startedAt, endedAt: new Date().toISOString(), completed: true, data: { sequence, completed: 1 } })}>DONE FOR TODAY</button>
        </div>
      </div>
    );
  }

  const ex = seq[i]!;
  const view = foundationView(ex);
  const frames = view.frames;
  const total = seq.length;
  const finish = (completed: boolean) => onDone({ startedAt, endedAt: new Date().toISOString(), completed, data: { sequence, completed: done.length, exercises: done } });
  const nextExercise = () => {
    const d = done.includes(ex.id) ? done : [...done, ex.id];
    setDone(d);
    chime();
    if (i + 1 >= total) {
      onDone({ startedAt, endedAt: new Date().toISOString(), completed: true, data: { sequence, completed: d.length, exercises: d } });
      return;
    }
    setI(i + 1);
    setRep(1);
    setFrame(0);
  };
  const repDone = () => {
    if (rep >= 3) nextExercise();
    else setRep(rep + 1);
  };

  return (
    <div class="screen-full grid-bg" data-testid="foundation-stepper" data-index={i} data-rep={rep}>
      <div class="row between">
        <div class="grow"><div class="wordmark" style="font-size:1rem">Foundation {sequence}</div><div class="muted small">{i + 1} / {total}</div></div>
        <StopIfChip />
        <button type="button" class="btn btn-ghost" onClick={() => finish(false)}>End</button>
      </div>
      <div class="stack grow" style="gap:10px;overflow-y:auto">
        <div class="card active stack" style="gap:8px">
          <div class="row between"><h3 style="font-size:1.1rem">{ex.name}</h3><span class="chip chip-cyan">REP {rep} / 3</span></div>
          {frames.length > 1 ? (
            <div class="pose-strip" role="group" aria-label="Key frames">
              {frames.map((f, k) => (
                <button key={f} type="button" class="btn" style={`padding:4px;background:${k === frame ? 'var(--surface-2)' : 'transparent'}`} onClick={() => setFrame(k)} aria-pressed={k === frame}>
                  <Pose id={f} size={110} glow={k === frame} />
                </button>
              ))}
            </div>
          ) : (
            <div style="display:flex;justify-content:center"><Pose id={frames[0]!} size={150} glow /></div>
          )}
          <ol style="padding-left:1.2em;margin:0;display:flex;flex-direction:column;gap:4px">
            {ex.steps.map((s, k) => <li key={k} class={k === Math.min(frame, ex.steps.length - 1) ? '' : 'muted'}>{s}</li>)}
          </ol>
          <div class="muted small">Should fatigue: <strong>{ex.fatigueTarget}</strong></div>
          {view.hard.map((o) => <div key={o.id} class="banner caution" data-testid="override-note"><span><strong>Prenatal:</strong> {o.replacement} <span class="muted">{o.reason}</span></span></div>)}
          {view.soft.map((o) => <div key={o.id} class="banner warn"><span><strong>Option:</strong> {o.replacement} <span class="muted">{o.reason}</span></span></div>)}
        </div>
        {pacer ? <BreathRing /> : null}
        <div class="row">
          <button type="button" class="btn grow" onClick={() => setPacer(!pacer)}>{pacer ? 'Hide pacer' : 'Breath pacer'}</button>
          <button type="button" class="btn grow" disabled={i === 0} onClick={() => { setI(i - 1); setRep(1); setFrame(0); }}>Prev</button>
        </div>
        <button type="button" class="btn btn-primary btn-xl btn-block" data-testid="rep-done" onClick={repDone}>{rep >= 3 ? (i + 1 >= total ? 'FINISH' : 'NEXT EXERCISE') : 'REP DONE'}</button>
      </div>
    </div>
  );
}

export function MobilityStepper({ onDone, onAbort }: { onDone: (r: StepperResult) => void; onAbort: () => void }) {
  const startedAt = useSessionClock();
  const [i, setI] = useState(0);
  const [passes, setPasses] = useState(0);
  const [moveDone, setMoveDone] = useState(false);
  const c = ctx.value;
  const data = overrideData('E', c);
  const swaps = (data.movementSwaps as Record<string, { name: string; drawingId: string }> | undefined) ?? {};
  const posSwaps = (data.positionSwaps as Record<string, string> | undefined) ?? {};
  const st = program.mobilityStations[i]!;
  const swap = c.on ? swaps[st.movementId] : undefined;
  const moveName = swap ? `${st.count} ${swap.name}` : st.movement;
  const moveDrawing = swap?.drawingId ?? (st.movementId === 'burpees' ? 'burpee' : st.movementId === 'jumpingJacks' ? 'jumpingJacks' : 'marching');
  const posNote = c.on ? posSwaps[st.rollPosition] : undefined;
  const finish = (completed: boolean, stations: number) => onDone({ startedAt, endedAt: new Date().toISOString(), completed, data: { stations } });
  const next = () => {
    chime();
    if (i + 1 >= 15) {
      finish(true, 15);
      return;
    }
    setI(i + 1);
    setPasses(0);
    setMoveDone(false);
  };
  void tabataMovements;
  return (
    <div class="screen-full grid-bg" data-testid="mobility-stepper" data-index={i}>
      <div class="row between">
        <div class="grow"><div class="wordmark" style="font-size:1rem">Metabolic Mobility</div><div class="muted small">Station {st.n} / 15</div></div>
        <StopIfChip />
        <button type="button" class="btn btn-ghost" onClick={() => (i === 0 && passes === 0 ? onAbort() : finish(false, i))}>End</button>
      </div>
      <div class="stack grow" style="justify-content:space-between">
        <div class="card active stack">
          <div class="row between">
            <div><div class="muted small">MOVEMENT</div><h3 style="font-size:1.2rem">{moveName}</h3></div>
            <Pose id={moveDrawing} size={84} glow={!moveDone} />
          </div>
          <button type="button" class={`btn ${moveDone ? 'btn-lime' : ''}`} onClick={() => setMoveDone(!moveDone)} aria-pressed={moveDone}>{moveDone ? 'Movement done ✓' : 'Mark movement done'}</button>
        </div>
        <div class="card stack">
          <div class="row between">
            <div><div class="muted small">FOAM ROLL</div><h3 style="font-size:1.2rem">{st.roll}</h3><div class="muted small">20–30 slow passes</div></div>
            <Pose id={st.rollDrawingId} size={84} glow={moveDone} />
          </div>
          {posNote && <div class="banner caution" data-testid="override-note"><span><strong>Prenatal:</strong> use {posNote} instead of lying {st.rollPosition}.</span></div>}
          <div class="row between">
            <div class="stepper">
              <button type="button" class="btn" onClick={() => setPasses(Math.max(0, passes - 1))} aria-label="minus one pass">−</button>
              <span class="val" data-testid="passes">{passes}</span>
              <button type="button" class="btn btn-cyan" onClick={() => setPasses(passes + 1)} aria-label="plus one pass">+</button>
            </div>
            <span class="muted small">{passes >= 20 ? 'in range' : `${20 - passes} to go`}</span>
          </div>
        </div>
        <button type="button" class="btn btn-primary btn-xl btn-block" data-testid="station-done" onClick={next}>{i + 1 >= 15 ? 'FINISH' : 'NEXT STATION'}</button>
      </div>
    </div>
  );
}

export function DecompressionPacer({ onDone, onAbort, title = 'Decompression Breathing' }: { onDone: (r: StepperResult) => void; onAbort: () => void; title?: string }) {
  const startedAt = useSessionClock();
  const [rep, setRep] = useState(0);
  const [running, setRunning] = useState(false);
  const cues = program.foundation.breathing.cues;
  const pn = ctx.value.on ? overridesFor('decompression', ctx.value)[0] : undefined;
  const finish = (n: number) => onDone({ startedAt, endedAt: new Date().toISOString(), completed: n >= 3, data: { reps: n } });
  return (
    <div class="screen-full grid-bg" data-testid="decompression" data-rep={rep}>
      <div class="row between"><div class="wordmark grow" style="font-size:1rem">{title}</div><StopIfChip /><button type="button" class="btn btn-ghost" onClick={() => (rep === 0 ? onAbort() : finish(rep))}>End</button></div>
      <div class="stack grow" style="justify-content:space-between;overflow-y:auto">
        <div class="row between"><span class="chip chip-cyan">REP {Math.min(rep + 1, 3)} / 3</span><span class="muted small">{settings.value.displayName ? `Go ${settings.value.displayName}` : ''}</span></div>
        {running ? <BreathRing /> : (
          <ol style="padding-left:1.2em;display:flex;flex-direction:column;gap:6px">
            {cues.map((c) => <li key={c.name}><strong>{c.name}.</strong> {c.text}</li>)}
          </ol>
        )}
        {pn && <div class="banner caution"><span><strong>Prenatal:</strong> {pn.replacement}</span></div>}
        {!running ? (
          <button type="button" class="btn btn-primary btn-xl btn-block" data-testid="start" onClick={() => setRunning(true)}>START PACER</button>
        ) : (
          <button type="button" class="btn btn-lime btn-xl btn-block" data-testid="rep-done" onClick={() => { const n = rep + 1; setRep(n); chime(); if (n >= 3) finish(n); }}>{rep >= 2 ? 'FINISH' : 'BREATH DONE'}</button>
        )}
      </div>
    </div>
  );
}
