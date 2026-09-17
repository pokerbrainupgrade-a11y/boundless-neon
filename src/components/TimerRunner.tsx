import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { IntervalEngine, fmtClock, fmtClockDown, type EngineState, type Segment } from '@/lib/engine';
import type { BuiltPreset } from '@/lib/presets';
import { unlockAudio, countdownBeep, longBeep } from '@/lib/audio';
import { requestWakeLock, releaseWakeLock } from '@/lib/wakelock';
import { settings, updateSettings } from '@/lib/settings';
import { flash } from './Flash';
import { StopIfChip } from './StopIf';

export interface RunResult {
  startedAt: string;
  endedAt: string;
  completed: boolean;
  /** ms actually elapsed */
  elapsedMs: number;
}

export interface RunnerApi {
  state: EngineState;
  segment: Segment | null;
  engine: IntervalEngine;
}

export interface TimerRunnerProps {
  built: BuiltPreset;
  title: string;
  subtitle?: string;
  /** Rendered under the digits for the current segment. */
  renderSegment?: (api: RunnerApi) => ComponentChildren;
  /** Rendered above the Start button before the timer starts. */
  preStart?: ComponentChildren;
  /** Called on every tick, for wrappers with time-based alerts. */
  onTick?: (api: RunnerApi) => void;
  onSegmentStart?: (index: number, seg: Segment, api: RunnerApi) => void;
  onDone: (r: RunResult) => void;
  onAbort: () => void;
  /** Label for the skip control (e.g. "FAILURE"). */
  skipLabel?: string;
  /** Show an elapsed (count-up) clock instead of the remaining one. */
  countUp?: boolean;
  /** Optional id for the localStorage snapshot (resume after reload). */
  snapshotKey?: string;
  /** Hide the skip button. */
  noSkip?: boolean;
}

const STATE_LABEL: Record<string, string> = { prep: 'GET READY', work: 'GO GO GO', rest: 'BREATHE', transition: 'NEXT UP' };

export function TimerRunner(p: TimerRunnerProps) {
  const [state, setState] = useState<EngineState | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showSilentWarn, setShowSilentWarn] = useState(false);
  const doneRef = useRef(false);
  const apiRef = useRef<RunnerApi | null>(null);

  const engine = useMemo(() => {
    const e = new IntervalEngine(p.built.segments, {
      onSegmentStart: (i, seg, prev) => {
        if (prev && seg.kind !== prev.kind) flash(seg.kind === 'work' ? 'work' : 'rest');
        else if (prev) flash(seg.kind === 'rest' || seg.kind === 'transition' ? 'rest' : 'work');
        if (apiRef.current) p.onSegmentStart?.(i, seg, { ...apiRef.current, state: e.getState(), segment: seg });
        persist(e);
      },
      onCountdown: (n) => countdownBeep(n),
      onSegmentZero: () => longBeep(),
      onTick: (s) => {
        setState(s);
        const api = { state: s, segment: s.segment, engine: e };
        apiRef.current = api;
        p.onTick?.(api);
      },
      onStatus: (st) => {
        setState(e.getState());
        if (st === 'paused' || st === 'running') persist(e);
      },
      onDone: () => {
        doneRef.current = true;
        localStorage.removeItem('bneon.active');
        void releaseWakeLock();
        setState(e.getState());
      },
    });
    apiRef.current = { state: e.getState(), segment: e.getState().segment, engine: e };
    return e;
    function persist(en: IntervalEngine) {
      if (!p.snapshotKey) return;
      try {
        localStorage.setItem('bneon.active', JSON.stringify({ key: p.snapshotKey, snap: en.snapshot(), startedAt: startedAtRef.current }));
      } catch {
        /* ignore */
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.built]);
  const startedAtRef = useRef<string | null>(null);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') engine.sync();
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', onVis);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('focus', onVis);
      engine.dispose();
      void releaseWakeLock();
    };
  }, [engine]);

  const start = () => {
    unlockAudio();
    void requestWakeLock();
    const now = new Date().toISOString();
    startedAtRef.current = now;
    setStartedAt(now);
    if (settings.value.sound && !settings.value.silentSwitchWarned) {
      setShowSilentWarn(true);
      void updateSettings({ silentSwitchWarned: true });
    }
    engine.start();
  };

  const finish = () => {
    const s = engine.getState();
    p.onDone({ startedAt: startedAt ?? new Date().toISOString(), endedAt: new Date().toISOString(), completed: s.status === 'done', elapsedMs: s.totalElapsedMs });
  };

  const st = state ?? engine.getState();
  const seg = st.segment;
  const kind = seg?.kind ?? 'prep';
  const label = st.status === 'done' ? 'YOU CRUSHED IT' : seg ? (seg.label in STATE_LABEL ? STATE_LABEL[seg.label]! : seg.label) : '';
  const total = seg && !seg.open ? seg.durationMs : 0;
  const frac = seg && !seg.open && total > 0 ? Math.max(0, Math.min(1, st.segmentRemainingMs / total)) : 0;
  const R = 140, C = 2 * Math.PI * R;
  const round = seg?.meta?.round as number | undefined;
  const of = seg?.meta?.of as number | undefined;
  const digits = seg?.open || p.countUp ? fmtClock(st.segmentElapsedMs) : fmtClockDown(st.segmentRemainingMs);
  const api: RunnerApi = { state: st, segment: seg, engine };

  return (
    <div class="screen-full grid-bg" data-testid="timer" data-status={st.status} data-index={st.index} data-segments={p.built.segments.length} data-total-ms={p.built.totalMs} data-kind={kind}>
      <div class="row between" style="margin-bottom:6px">
        <div class="grow" style="min-width:0">
          <div class="wordmark" style="font-size:1rem">{p.title}</div>
          {p.subtitle && <div class="muted small">{p.subtitle}</div>}
        </div>
        <StopIfChip />
        {st.status !== 'done' && (
          <button type="button" class="btn btn-ghost" onClick={() => (st.status === 'idle' ? p.onAbort() : (engine.end(), finish()))}>
            {st.status === 'idle' ? 'Back' : 'End'}
          </button>
        )}
      </div>

      {st.status === 'idle' ? (
        <div class="stack grow" style="justify-content:center">
          {p.preStart}
          <div class="card">
            <div class="muted small">Plan</div>
            <div style="font-family:var(--font-timer);font-size:1.4rem">{fmtClock(p.built.totalMs)}{p.built.segments.some((s) => s.open) ? ' +' : ''}</div>
            <div class="muted small">{p.built.segments.length} segments · lead-in {settings.value.leadInSec} s</div>
          </div>
          <button type="button" class="btn btn-primary btn-xl btn-block" data-testid="start" onClick={start}>START</button>
        </div>
      ) : st.status === 'done' ? (
        <div class="stack grow fade-in" style="justify-content:center;align-items:center">
          <div class="timer-state" style="color:var(--lime);font-size:2rem">YOU CRUSHED IT</div>
          <div class="muted">{fmtClock(st.totalElapsedMs)} total</div>
          <button type="button" class="btn btn-lime btn-lg btn-block" data-testid="log-it" onClick={finish}>LOG IT</button>
        </div>
      ) : (
        <div class="stack grow" style="justify-content:space-between">
          <div class={`timer-state ${kind}`} data-testid="state-label" style={`color:${kind === 'work' ? 'var(--pink)' : kind === 'rest' ? 'var(--cyan)' : 'var(--yellow)'}`}>{label}</div>
          <div style="position:relative">
            <svg class={`timer-ring ${st.status === 'running' ? 'pulse' : ''}`} viewBox="0 0 320 320" aria-hidden="true">
              <circle class="track" cx="160" cy="160" r={R} />
              <circle class="prog" cx="160" cy="160" r={R} stroke={kind === 'work' ? 'var(--pink)' : kind === 'rest' ? 'var(--cyan)' : 'var(--yellow)'} stroke-dasharray={C} stroke-dashoffset={seg?.open ? 0 : C * (1 - frac)} transform="rotate(-90 160 160)" style="color:currentColor" />
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">
              <div class={`timer-digits ${kind}`} data-testid="digits" style="font-size:min(20vh,18vw)" aria-live="off">{digits}</div>
              {round && of && <div class="chip chip-muted">{seg?.kind === 'transition' ? 'NEXT' : 'ROUND'} {round} / {of}</div>}
            </div>
          </div>
          {seg?.cue && <div class="muted" style="text-align:center;font-weight:600">{seg.cue}</div>}
          <div>{p.renderSegment?.(api)}</div>
          <div class="timer-controls">
            <button type="button" class="btn btn-lg" data-testid="pause" onClick={() => engine.toggle()}>{st.status === 'paused' ? 'RESUME' : 'PAUSE'}</button>
            {!p.noSkip ? (
              <button type="button" class={`btn btn-lg ${p.skipLabel ? 'btn-primary' : ''}`} data-testid="skip" onClick={() => engine.skip()}>{p.skipLabel ?? 'SKIP'}</button>
            ) : <span />}
            <button type="button" class="btn btn-lg btn-ghost" data-testid="end" onClick={() => { engine.end(); }}>END</button>
          </div>
          <div class="muted small" style="text-align:center">{fmtClock(st.totalElapsedMs)} / {fmtClock(st.totalDurationMs)}{p.built.segments.some((s) => s.open) ? ' +' : ''}</div>
        </div>
      )}

      {showSilentWarn && (
        <div class="banner warn" role="status" style="position:fixed;left:12px;right:12px;bottom:calc(12px + var(--safe-bottom));z-index:35">
          <span>The iPhone silent switch mutes web audio. The color flash is your backup cue.</span>
          <button type="button" class="btn" style="min-height:40px" onClick={() => setShowSilentWarn(false)}>OK</button>
        </div>
      )}
    </div>
  );
}
