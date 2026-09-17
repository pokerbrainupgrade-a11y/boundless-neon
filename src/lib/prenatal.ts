import { program } from '@/data/program';
import type { Override, Session, SessionRef } from '@/data/schema';
import { daysBetween } from './time';

export type Trimester = 'T1' | 'T2' | 'T3';
const RANK: Record<Trimester, number> = { T1: 1, T2: 2, T3: 3 };

/** gestational week = 40 − ceil((dueDate − today) / 7 days) */
export function gestationalWeek(dueDate: string, today: string): number {
  const daysLeft = daysBetween(today, dueDate);
  return 40 - Math.ceil(daysLeft / 7);
}

export function trimesterForWeek(week: number): Trimester {
  if (week <= 13) return 'T1';
  if (week <= 27) return 'T2';
  return 'T3';
}

export function trimester(dueDate: string, today: string): Trimester {
  return trimesterForWeek(gestationalWeek(dueDate, today));
}

export interface PrenatalContext {
  on: boolean;
  /** Effective trimester. Defaults to T1 when the mode is on and no due date is set. */
  trimester: Trimester;
  week: number | null;
}

export function prenatalContext(settings: { prenatalMode: boolean; dueDate?: string | null }, today: string): PrenatalContext {
  if (!settings.prenatalMode) return { on: false, trimester: 'T1', week: null };
  if (!settings.dueDate) return { on: true, trimester: 'T1', week: null };
  const week = gestationalWeek(settings.dueDate, today);
  return { on: true, trimester: trimesterForWeek(week), week };
}

/** Does this override apply (as a hard rule) in the given trimester? */
export function overrideApplies(o: Override, t: Trimester): boolean {
  return RANK[t] >= RANK[o.appliesFrom];
}

/** Is the override only suggested (soft) in this trimester? */
export function overrideIsSoft(o: Override, t: Trimester): boolean {
  return !!o.hardFrom && RANK[t] < RANK[o.hardFrom];
}

export function overridesFor(targetId: string, ctx: PrenatalContext): Override[] {
  if (!ctx.on) return [];
  return program.prenatal.overrides.filter((o) => o.targets.includes(targetId) && overrideApplies(o, ctx.trimester));
}

/** All overrides for a target regardless of trimester (for the Library). */
export function allOverridesFor(targetId: string): Override[] {
  return program.prenatal.overrides.filter((o) => o.targets.includes(targetId));
}

/** Merge the `data` of all active overrides for a target (later trimesters win). */
export function overrideData(targetId: string, ctx: PrenatalContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const o of overridesFor(targetId, ctx)) {
    for (const [k, v] of Object.entries(o.data ?? {})) {
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object') {
        out[k] = { ...(out[k] as object), ...(v as object) };
      } else out[k] = v;
    }
  }
  return out;
}

export interface ResolvedSession {
  /** The session to actually run (replacement when removed). */
  session: Session;
  /** The originally scheduled session. */
  original: Session;
  removed: boolean;
  replaced: boolean;
  /** Overrides active on the original session. */
  overrides: Override[];
  /** Display name after overrides (e.g. "Morning Movement"). */
  name: string;
  /** Extra pre-start note (e.g. eat a snack). */
  preStart: string | null;
  /** Off by default (prenatal cool shower). */
  optional: boolean;
  data: Record<string, unknown>;
}

/** Resolve a scheduled session through the active prenatal overrides. */
export function resolveSession(ref: SessionRef | string, ctx: PrenatalContext): ResolvedSession | null {
  const id = typeof ref === 'string' ? ref : ref.id;
  const original = program.sessions[id];
  if (!original) return null;
  const overrides = overridesFor(id, ctx);
  const data = overrideData(id, ctx);
  const removal = overrides.find((o) => o.action === 'remove');
  if (removal) {
    if (!removal.replacementId) return null; // removed with no replacement
    const rep = program.sessions[removal.replacementId];
    if (!rep) return null;
    return { session: rep, original, removed: true, replaced: true, overrides, name: rep.name, preStart: null, optional: false, data };
  }
  const name = typeof data.name === 'string' ? data.name : original.name;
  const preStart = typeof data.preStart === 'string' ? data.preStart : null;
  const optional = data.optional === true && data.defaultOff === true;
  return { session: original, original, removed: false, replaced: false, overrides, name, preStart, optional, data };
}

/** Is a session id reachable from Today under this context? */
export function sessionReachable(id: string, ctx: PrenatalContext): boolean {
  const r = resolveSession(id, ctx);
  return !!r && r.session.id === id;
}

export const CONTRAINDICATED_WHEN_PRENATAL = ['I', 'J', 'coldImmersion', 'G'];
