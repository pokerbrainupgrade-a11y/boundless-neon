import { describe, it, expect } from 'vitest';
import { buildPreset, sevenMinuteSequence, tabataMoves, superSlowOptions, ENGINE_PRESETS, type PresetOptions } from '@/lib/presets';
import type { PrenatalContext } from '@/lib/prenatal';

const OFF: PrenatalContext = { on: false, trimester: 'T1', week: null };
const T1: PrenatalContext = { on: true, trimester: 'T1', week: 8 };
const T2: PrenatalContext = { on: true, trimester: 'T2', week: 20 };
const base = (ctx: PrenatalContext, extra: Partial<PresetOptions> = {}): PresetOptions => ({ leadInSec: 10, ctx, week: 1, ...extra });

describe('presets (segment count + total duration)', () => {
  it('tabata = 10 s prep + 8 × (20/10) = 4:10', () => {
    const b = buildPreset('tabata', base(OFF));
    expect(b.segments.length).toBe(17);
    expect(b.totalMs).toBe(250_000);
    expect(b.segments[1]!.label).toBe('GO GO GO');
  });
  it('5x4 = prep + 5 × (4:00/4:00) = 40:10', () => {
    const b = buildPreset('vo2', base(OFF));
    expect(b.segments.length).toBe(11);
    expect(b.totalMs).toBe(10_000 + 5 * 480_000);
  });
  it('sprints G1/G2/G3', () => {
    expect(buildPreset('sprints', base(OFF, { sprintVariant: 'G1' })).totalMs).toBe(10_000 + 4 * 270_000);
    expect(buildPreset('sprints', base(OFF, { sprintVariant: 'G1' })).segments.length).toBe(9);
    expect(buildPreset('sprints', base(OFF, { sprintVariant: 'G2' })).totalMs).toBe(10_000 + 5 * 24_000);
    expect(buildPreset('sprints', base(OFF, { sprintVariant: 'G2' })).segments.length).toBe(11);
    const g3 = buildPreset('sprints', base(OFF, { sprintVariant: 'G3' }));
    expect(g3.segments.length).toBe(1 + 3 * 10 + 2);
    expect(g3.totalMs).toBe(10_000 + 3 * 120_000 + 2 * 60_000);
  });
  it('7-minute: 12 × (30/10) per round, no transition after the last move', () => {
    const one = buildPreset('sevenMinute', base(OFF, { sevenRounds: 1 }));
    expect(one.segments.length).toBe(1 + 12 + 11);
    expect(one.totalMs).toBe(10_000 + 12 * 30_000 + 11 * 10_000);
    const three = buildPreset('sevenMinute', base(OFF, { sevenRounds: 3 }));
    expect(three.segments.length).toBe(1 + 36 + 35);
    expect(three.totalMs).toBe(10_000 + 36 * 30_000 + 35 * 10_000);
    expect(three.segments[1]!.meta?.next).toBe('wallSit');
  });
  it('7-minute W2 uses explosive swaps unless prenatal', () => {
    expect(sevenMinuteSequence(1).map((m) => m.id)[0]).toBe('jumpingJacks');
    expect(sevenMinuteSequence(2).map((m) => m.id)[0]).toBe('burpees');
    const pn = sevenMinuteSequence(2, T1).map((m) => m.id);
    expect(pn).not.toContain('burpees');
    expect(pn).toContain('standingKneeDrives');
    expect(pn).toContain('inclinePushups');
    expect(pn).toContain('wallPushups');
    expect(sevenMinuteSequence(2, T1).map((m) => m.id)).toContain('plank');
    expect(sevenMinuteSequence(2, T2).map((m) => m.id)).toContain('inclinePlank');
    expect(sevenMinuteSequence(2, T2).map((m) => m.id)).toContain('kneelingSidePlank');
  });
  it('super-slow: 4 open lifts with 3 rests', () => {
    const b = buildPreset('superSlow', base(OFF, { restSec: 90 }));
    expect(b.segments.length).toBe(1 + 4 + 3);
    expect(b.totalMs).toBe(10_000 + 3 * 90_000);
    expect(b.segments[1]!.open).toBe(true);
    expect(superSlowOptions('lowerPull', OFF)).toContain('Deadlift');
    expect(superSlowOptions('lowerPull', T1)).toEqual(['Cable pull-through', 'Light Romanian deadlift']);
    expect(superSlowOptions('upperPush', T2)).toContain('Incline press');
    expect(superSlowOptions('upperPush', T1)).toContain('Chest press');
  });
  it('cold shower = prep + 10 × (10/20) = 5:10', () => {
    const b = buildPreset('coldShower', base(OFF));
    expect(b.segments.length).toBe(21);
    expect(b.totalMs).toBe(310_000);
    expect(buildPreset('coldShower', base(T1)).segments[2]!.label).toBe('COOL');
  });
  it('immersion / sauna / contrast / stamina / countdown / cool stretch', () => {
    expect(buildPreset('coldImmersion', base(OFF, { minutes: 4 })).totalMs).toBe(10_000 + 240_000);
    expect(buildPreset('coldImmersion', base(OFF, { minutes: 9 })).totalMs).toBe(10_000 + 300_000);
    expect(buildPreset('sauna', base(OFF, { minutes: 30 })).totalMs).toBe(10_000 + 1_800_000);
    const c = buildPreset('contrast', base(OFF, { cycles: 3 }));
    expect(c.segments.length).toBe(7);
    expect(c.totalMs).toBe(10_000 + 3 * 900_000);
    expect(c.segments[c.segments.length - 1]!.label).toBe('COLD');
    expect(buildPreset('stamina', base(OFF, { minutes: 150 })).totalMs).toBe(10_000 + 150 * 60_000);
    expect(buildPreset('stamina', base(T1)).meta.minutes).toBe(45);
    expect(buildPreset('stamina', base(T1, { minutes: 120 })).meta.minutes).toBe(60);
    expect(buildPreset('countdown', base(OFF, { minutes: 15, leadInSec: 0 })).totalMs).toBe(900_000);
    expect(buildPreset('coolStretch', base(T1)).totalMs).toBe(10_000 + 1_200_000);
  });
  it('swim rounds and prenatal continuous swim', () => {
    const s = buildPreset('swim', base(OFF, { swimRounds: 12 }));
    expect(s.segments.length).toBe(1 + 12 + 11);
    expect(s.totalMs).toBe(10_000 + 11 * 10_000);
    const p = buildPreset('swim', base(T1));
    expect(p.segments.length).toBe(2);
    expect(p.segments[1]!.open).toBe(true);
  });
  it('prenatal: tabata limits moves and never labels all-out', () => {
    expect(tabataMoves(OFF).length).toBe(10);
    expect(tabataMoves(T1).map((m) => m.id)).toEqual(['bike', 'rower', 'marching', 'stepBacks']);
    const b = buildPreset('tabata', base(T1, { tabataMove: 'burpees' }));
    expect(b.meta.move).toBe('bike');
  });
  it('prenatal: no engine preset can produce an all-out or sprint segment; contraindicated presets throw', () => {
    for (const ctx of [T1, T2]) {
      for (const p of ENGINE_PRESETS) {
        let built;
        try {
          built = buildPreset(p, base(ctx));
        } catch {
          expect(['sprints', 'coldImmersion', 'sauna', 'contrast']).toContain(p);
          continue;
        }
        for (const s of built.segments) {
          expect(`${s.label} ${s.cue ?? ''}`).not.toMatch(/all.?out|sprint|failure/i);
        }
      }
    }
    expect(buildPreset('vo2', base(T1)).meta.hideHr).toBe(true);
  });
  it('steppers are not interval presets', () => {
    expect(() => buildPreset('foundation', base(OFF))).toThrow();
  });
});
