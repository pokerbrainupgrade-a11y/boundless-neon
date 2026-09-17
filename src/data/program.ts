import raw from './program.json';
import { Program as ProgramSchema, type Program, type Session, type Day, type FoundationExercise } from './schema';

export const program: Program = ProgramSchema.parse(raw);

export function getSession(id: string): Session {
  const s = program.sessions[id];
  if (!s) throw new Error(`Unknown session ${id}`);
  return s;
}

export function getDay(n: number): Day {
  const d = program.days[n - 1];
  if (!d) throw new Error(`Unknown day ${n}`);
  return d;
}

export const foundationExercises: Record<string, FoundationExercise> = Object.fromEntries(
  [...program.foundation.seqA, ...program.foundation.seqB].map((e) => [e.id, e]),
);

export function foundationSequence(seq: 'A' | 'B' | 'applied'): FoundationExercise[] {
  if (seq === 'A') return program.foundation.seqA;
  if (seq === 'B') return program.foundation.seqB;
  return [];
}

export const sevenMinuteMoves = Object.fromEntries(
  [
    ...program.sevenMinute.map((m) => [m.id, { id: m.id, name: m.name, cue: m.cue, drawingId: m.drawingId, isometric: !!m.isometric }]),
    ...program.sevenMinute.filter((m) => m.w2Swap).map((m) => [m.w2Swap!.id, { ...m.w2Swap!, isometric: false }]),
    ...program.sevenMinutePrenatal.map((m) => [m.id, { ...m, isometric: m.id.includes('lank') }]),
  ] as [string, { id: string; name: string; cue: string; drawingId: string; isometric: boolean }][],
);

export const tabataMovements = Object.fromEntries(program.tabataMovements.map((m) => [m.id, m]));

/** All ids an override may target. */
export function allTargetIds(): Set<string> {
  const ids = new Set<string>();
  Object.keys(program.sessions).forEach((k) => ids.add(k));
  Object.keys(foundationExercises).forEach((k) => ids.add(k));
  program.sevenMinute.forEach((m) => ids.add(m.id));
  program.rules.standingProtocols.forEach((r) => ids.add(r.id));
  program.rules.phoenixAdjustments.forEach((r) => ids.add(r.id));
  program.rules.executionRules.forEach((r) => ids.add(r.id));
  program.habits.forEach((h) => ids.add(h.id));
  return ids;
}

/** Every drawing id referenced by the program. */
export function allDrawingIds(): string[] {
  const ids = new Set<string>();
  Object.values(program.sessions).forEach((s) => ids.add(s.drawingId));
  [...program.foundation.seqA, ...program.foundation.seqB].forEach((e) => {
    ids.add(e.drawingId);
    e.frames?.forEach((f) => ids.add(f));
  });
  program.mobilityStations.forEach((s) => ids.add(s.rollDrawingId));
  program.sevenMinute.forEach((m) => {
    ids.add(m.drawingId);
    if (m.w2Swap) ids.add(m.w2Swap.drawingId);
  });
  program.sevenMinutePrenatal.forEach((m) => ids.add(m.drawingId));
  program.superSlowPatterns.forEach((p) => ids.add(p.drawingId));
  program.tabataMovements.forEach((m) => ids.add(m.drawingId));
  for (const o of program.prenatal.overrides) {
    const d = o.data as Record<string, unknown> | undefined;
    if (!d) continue;
    if (d.drawings) Object.values(d.drawings as Record<string, string>).forEach((v) => ids.add(v));
    if (d.movementSwaps) Object.values(d.movementSwaps as Record<string, { drawingId: string }>).forEach((v) => ids.add(v.drawingId));
  }
  return [...ids].sort();
}
