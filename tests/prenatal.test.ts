import { describe, it, expect } from 'vitest';
import { gestationalWeek, trimesterForWeek, trimester, prenatalContext, resolveSession, sessionReachable, overridesFor, overrideIsSoft, overrideData } from '@/lib/prenatal';
import { addDays } from '@/lib/time';
import { program, allTargetIds, foundationExercises } from '@/data/program';

const due = '2027-09-03';
/** today such that gestational age is w weeks d days */
const at = (w: number, d: number) => addDays(due, -(280 - (w * 7 + d)));

describe('gestational math', () => {
  it('matches week/day boundaries', () => {
    expect(gestationalWeek(due, at(13, 6))).toBe(13);
    expect(trimester(due, at(13, 6))).toBe('T1');
    expect(gestationalWeek(due, at(14, 0))).toBe(14);
    expect(trimester(due, at(14, 0))).toBe('T2');
    expect(gestationalWeek(due, at(27, 6))).toBe(27);
    expect(trimester(due, at(27, 6))).toBe('T2');
    expect(gestationalWeek(due, at(28, 0))).toBe(28);
    expect(trimester(due, at(28, 0))).toBe('T3');
    expect(trimesterForWeek(0)).toBe('T1');
    expect(trimesterForWeek(40)).toBe('T3');
  });

  it('builds a context; T1 default without due date', () => {
    expect(prenatalContext({ prenatalMode: false }, at(20, 0))).toEqual({ on: false, trimester: 'T1', week: null });
    expect(prenatalContext({ prenatalMode: true }, at(20, 0))).toEqual({ on: true, trimester: 'T1', week: null });
    expect(prenatalContext({ prenatalMode: true, dueDate: due }, at(20, 3))).toEqual({ on: true, trimester: 'T2', week: 20 });
  });
});

describe('overrides', () => {
  const ids = allTargetIds();
  it('every override id resolves', () => {
    for (const o of program.prenatal.overrides) {
      for (const t of o.targets) expect(ids.has(t), `${o.id} → ${t}`).toBe(true);
      if (o.replacementId) expect(program.sessions[o.replacementId], `${o.id} replacement`).toBeTruthy();
    }
  });

  it('renders every row with a reason', () => {
    for (const o of program.prenatal.overrides) {
      expect(o.reason.length).toBeGreaterThan(10);
      expect(o.replacement.length).toBeGreaterThan(5);
    }
  });

  it('sauna, contrast, immersion, sprints are unreachable when the mode is on', () => {
    for (const t of ['T1', 'T2', 'T3'] as const) {
      const ctx = { on: true, trimester: t, week: 10 };
      for (const id of ['I', 'J', 'coldImmersion', 'G']) expect(sessionReachable(id, ctx), `${id} in ${t}`).toBe(false);
      expect(resolveSession('I', ctx)?.session.id).toBe('coolStretch');
      expect(resolveSession('J', ctx)?.session.id).toBe('lukewarmShower');
      expect(resolveSession('G', ctx)?.session.id).toBe('easyAerobic');
      expect(resolveSession('coldImmersion', ctx)).toBeNull();
    }
  });

  it('toggling the mode off restores the original program exactly', () => {
    const off = { on: false, trimester: 'T1' as const, week: null };
    for (const d of program.days) {
      for (const ref of [...d.am, ...d.main, ...d.pm]) {
        const r = resolveSession(ref, off)!;
        expect(r.session.id).toBe(ref.id);
        expect(r.overrides).toEqual([]);
        expect(r.name).toBe(program.sessions[ref.id]!.name);
        expect(r.removed).toBe(false);
      }
    }
  });

  it('T2 adds overrides on top of T1', () => {
    const t1 = { on: true, trimester: 'T1' as const, week: 8 };
    const t2 = { on: true, trimester: 'T2' as const, week: 20 };
    expect(overridesFor('C', t1).map((o) => o.id)).toEqual(['pn-seven-t1']);
    expect(overridesFor('C', t2).map((o) => o.id)).toEqual(['pn-seven-t1', 'pn-seven-t2']);
    const swaps = overrideData('C', t2).moveSwaps as Record<string, string>;
    expect(swaps.plank).toBe('inclinePlank');
    expect(swaps.crunches).toBe('standingKneeDrives');
    expect(overridesFor('internalLegTracing', t1)).toEqual([]);
    expect(overridesFor('internalLegTracing', t2).length).toBe(1);
  });

  it('prone foundation moves are soft in T1 and hard from T2', () => {
    const o = program.prenatal.overrides.find((x) => x.id === 'pn-foundation-prone')!;
    expect(overrideIsSoft(o, 'T1')).toBe(true);
    expect(overrideIsSoft(o, 'T2')).toBe(false);
    expect(foundationExercises.anchoredBackExtension).toBeTruthy();
  });

  it('renames fasted sessions and flags the cool shower as optional', () => {
    const ctx = { on: true, trimester: 'T1' as const, week: 8 };
    const fc = resolveSession('fastedCardio', ctx)!;
    expect(fc.name).toBe('Morning Movement');
    expect(fc.preStart).toContain('snack');
    const cs = resolveSession('coldShower', ctx)!;
    expect(cs.optional).toBe(true);
  });
});
