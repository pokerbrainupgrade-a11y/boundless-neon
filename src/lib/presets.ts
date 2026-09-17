import { program, sevenMinuteMoves } from '@/data/program';
import type { TimerPreset } from '@/data/schema';
import { prep, rounds, type Segment } from './engine';
import { overrideData, type PrenatalContext } from './prenatal';

export interface PresetOptions {
  leadInSec: number;
  ctx: PrenatalContext;
  week: 1 | 2;
  tabataMove?: string;
  sevenRounds?: number;
  sprintVariant?: 'G1' | 'G2' | 'G3';
  minutes?: number;
  cycles?: number;
  restSec?: number;
  swimRounds?: number;
}

export interface BuiltPreset {
  segments: Segment[];
  title: string;
  totalMs: number;
  meta: Record<string, unknown>;
}

const OFF: PrenatalContext = { on: false, trimester: 'T1', week: null };

export const ENGINE_PRESETS: TimerPreset[] = ['tabata', 'vo2', 'sprints', 'sevenMinute', 'superSlow', 'coldShower', 'coldImmersion', 'sauna', 'contrast', 'stamina', 'countdown', 'swim', 'coolStretch'];
export const STEPPER_PRESETS: TimerPreset[] = ['foundation', 'mobility', 'decompression'];

function finish(segments: Segment[], title: string, meta: Record<string, unknown> = {}): BuiltPreset {
  return { segments, title, totalMs: segments.reduce((a, s) => a + (s.open ? 0 : s.durationMs), 0), meta };
}

function lead(o: PresetOptions): Segment[] {
  return o.leadInSec > 0 ? [prep(o.leadInSec)] : [];
}

/** Which seven-minute moves run this week under the given context. */
export function sevenMinuteSequence(week: 1 | 2, ctx: PrenatalContext = OFF) {
  const data = overrideData('C', ctx);
  const noSwaps = data.noSwaps === true;
  const swaps = (data.moveSwaps as Record<string, string> | undefined) ?? {};
  return program.sevenMinute.map((m) => {
    let id = m.id;
    if (ctx.on && swaps[m.id]) id = swaps[m.id]!;
    else if (week === 2 && !noSwaps && m.w2Swap) id = m.w2Swap.id;
    const move = sevenMinuteMoves[id]!;
    return { ...move, baseId: m.id, swapped: id !== m.id };
  });
}

/** Tabata movements allowed under the context. */
export function tabataMoves(ctx: PrenatalContext = OFF) {
  const data = overrideData('A', ctx);
  const allowed = data.moves as string[] | undefined;
  return program.tabataMovements.filter((m) => !allowed || allowed.includes(m.id));
}

export function superSlowOptions(patternId: string, ctx: PrenatalContext = OFF): string[] {
  const data = overrideData('F', ctx);
  const opts = (data.patternOptions as Record<string, string[]> | undefined)?.[patternId];
  return opts ?? program.superSlowPatterns.find((p) => p.id === patternId)!.options;
}

export function buildPreset(preset: TimerPreset, o: PresetOptions): BuiltPreset {
  const { ctx } = o;
  switch (preset) {
    case 'tabata': {
      const data = overrideData('A', ctx);
      const work = ctx.on ? String(data.workLabel ?? 'RPE 6–7') : 'GO GO GO';
      const rest = ctx.on ? String(data.restLabel ?? 'EASY') : 'BREATHE';
      const moves = tabataMoves(ctx);
      const move = moves.find((m) => m.id === o.tabataMove) ?? moves[0]!;
      const segs = [...lead(o), ...rounds(8, { label: work, durationMs: 20_000, cue: move.name }, { label: rest, durationMs: 10_000, logPrompt: move.unit, meta: { unit: move.unit } })];
      return finish(segs, 'Tabata', { move: move.id, unit: move.unit });
    }
    case 'vo2': {
      const data = overrideData('H', ctx);
      const work = ctx.on ? String(data.workLabel ?? 'RPE 6–7') : 'GO GO GO';
      const rest = ctx.on ? String(data.restLabel ?? 'EASY') : 'EASY';
      const segs = [...lead(o), ...rounds(5, { label: work, durationMs: 240_000, cue: ctx.on ? 'Talk test: short sentences' : '87–97% HRmax' }, { label: rest, durationMs: 240_000, logPrompt: 'avgHr' })];
      return finish(segs, '5x4 VO2 max', { hideHr: ctx.on && data.hideHr === true });
    }
    case 'sprints': {
      if (ctx.on) throw new Error('Sprints are removed in Prenatal Mode');
      const v = o.sprintVariant ?? 'G1';
      let segs: Segment[];
      if (v === 'G1') segs = rounds(4, { label: 'ALL OUT', durationMs: 30_000, cue: 'Rower, bike, or elliptical' }, { label: 'ACTIVE REST', durationMs: 240_000, cue: 'Easy walk, jog, or spin', logPrompt: 'sprint' });
      else if (v === 'G2') segs = rounds(5, { label: 'SPRINT', durationMs: 4_000 }, { label: 'REST', durationMs: 20_000, logPrompt: 'sprint' });
      else {
        segs = [];
        for (let set = 1; set <= 3; set++) {
          segs.push(...rounds(5, { label: 'SPRINT', durationMs: 4_000, meta: { set } }, { label: 'REST', durationMs: 20_000, meta: { set }, logPrompt: 'sprint' }));
          if (set < 3) segs.push({ label: 'SET BREAK', kind: 'transition', durationMs: 60_000, meta: { set } });
        }
      }
      return finish([...lead(o), ...segs], `Sprints ${v}`, { variant: v });
    }
    case 'sevenMinute': {
      const n = Math.min(3, Math.max(1, o.sevenRounds ?? 1));
      const seq = sevenMinuteSequence(o.week, ctx);
      const segs: Segment[] = [...lead(o)];
      for (let r = 1; r <= n; r++) {
        seq.forEach((m, i) => {
          const next = seq[(i + 1) % seq.length]!;
          const last = r === n && i === seq.length - 1;
          segs.push({ label: m.name.toUpperCase(), kind: 'work', durationMs: 30_000, cue: m.cue, meta: { moveId: m.id, next: last ? null : next.id, round: r, of: n, i, isometric: m.isometric } });
          if (!last) segs.push({ label: 'NEXT UP', kind: 'transition', durationMs: 10_000, cue: next.name, meta: { moveId: next.id, next: next.id, round: r, of: n, i, transition: true } });
        });
      }
      return finish(segs, '7-Minute Workout', { rounds: n, moves: seq.map((m) => m.id) });
    }
    case 'superSlow': {
      const data = overrideData('F', ctx);
      const rest = Math.min(120, Math.max(60, o.restSec ?? 90));
      const label = ctx.on ? String(data.failureLabel ?? 'STOP 2–3 REPS EARLY') : 'TO FAILURE';
      const segs: Segment[] = [...lead(o)];
      program.superSlowPatterns.forEach((p, i) => {
        segs.push({ label, kind: 'work', durationMs: 0, open: true, cue: p.name, meta: { pattern: p.id, lift: i + 1 }, logPrompt: 'lift' });
        if (i < program.superSlowPatterns.length - 1) segs.push({ label: 'REST', kind: 'rest', durationMs: rest * 1000, cue: 'Next: ' + program.superSlowPatterns[i + 1]!.name, meta: { pattern: p.id, lift: i + 1 } });
      });
      return finish(segs, 'Super-Slow Strength', { restSec: rest, stopBeforeFailure: ctx.on && data.stopBeforeFailure === true });
    }
    case 'coldShower': {
      const data = overrideData('coldShower', ctx);
      const cold = ctx.on ? String(data.coldLabel ?? 'COOL') : 'COLD';
      const segs = [...lead(o), ...rounds(10, { label: 'WARM', durationMs: 10_000 }, { label: cold, durationMs: 20_000 })];
      return finish(segs, ctx.on ? 'Cool Shower Cycle' : 'Cold Shower Cycle');
    }
    case 'coldImmersion': {
      if (ctx.on) throw new Error('Cold immersion is removed in Prenatal Mode');
      const min = Math.min(5, Math.max(2, o.minutes ?? 3));
      return finish([...lead(o), { label: 'IN THE COLD', kind: 'rest', durationMs: min * 60_000, cue: '≤ 55°F' }], 'Cold Immersion', { minutes: min });
    }
    case 'sauna': {
      if (ctx.on) throw new Error('Sauna is removed in Prenatal Mode');
      const min = Math.min(40, Math.max(20, o.minutes ?? 20));
      return finish([...lead(o), { label: 'BREATHE', kind: 'work', durationMs: min * 60_000, cue: 'Box breathing 4-4-4-4' }], 'Sauna', { minutes: min, box: true, finishCold: true });
    }
    case 'coolStretch': {
      const min = Math.min(30, Math.max(10, o.minutes ?? 20));
      return finish([...lead(o), { label: 'BREATHE', kind: 'rest', durationMs: min * 60_000, cue: 'Cool room · box breathing 4-4-4-4' }], 'Cool-Room Stretch', { minutes: min, box: true });
    }
    case 'contrast': {
      if (ctx.on) throw new Error('Hot-cold contrast is removed in Prenatal Mode');
      const c = Math.min(3, Math.max(2, o.cycles ?? 2));
      const segs = [...lead(o), ...rounds(c, { label: 'HOT', durationMs: 600_000, cue: 'Sauna' }, { label: 'COLD', durationMs: 300_000, cue: '≤ 55°F · end on cold' })];
      return finish(segs, 'Hot-Cold Contrast', { cycles: c });
    }
    case 'stamina': {
      const data = overrideData('L', ctx);
      const max = ctx.on ? Number(data.maxMinutes ?? 60) : 600;
      const def = ctx.on ? Number(data.defaultMinutes ?? 45) : 120;
      const min = Math.min(max, Math.max(20, o.minutes ?? def));
      const hydrate = ctx.on ? Number(data.hydrationEveryMin ?? 15) : 20;
      return finish([...lead(o), { label: 'STEADY', kind: 'work', durationMs: min * 60_000, cue: 'Conversational the whole time' }], 'Stamina Session', { minutes: min, halfwayMs: (min * 60_000) / 2, hydrateEveryMs: hydrate * 60_000 });
    }
    case 'countdown': {
      const min = Math.max(1, o.minutes ?? 20);
      return finish([...lead(o), { label: 'EASY', kind: 'work', durationMs: min * 60_000 }], 'Countdown', { minutes: min });
    }
    case 'swim': {
      const data = overrideData('D', ctx);
      if (ctx.on && data.continuous === true) {
        return finish([...lead(o), { label: 'EASY SWIM', kind: 'work', durationMs: 0, open: true, cue: 'Normal breathing, smooth stroke' }], 'Easy Swim', { continuous: true });
      }
      const n = Math.min(12, Math.max(10, o.swimRounds ?? 10));
      const segs: Segment[] = [...lead(o)];
      for (let i = 1; i <= n; i++) {
        segs.push({ label: 'SWIM 25 m', kind: 'work', durationMs: 0, open: true, cue: 'Breathe as seldom as is comfortable', meta: { round: i, of: n } });
        if (i < n) segs.push({ label: 'REST', kind: 'rest', durationMs: 10_000, meta: { round: i, of: n } });
      }
      return finish(segs, 'Hypoxic Swim', { rounds: n });
    }
    case 'foundation':
    case 'mobility':
    case 'decompression':
    case 'none':
      throw new Error(`${preset} is a stepper, not an interval preset`);
  }
}
