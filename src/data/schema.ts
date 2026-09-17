import { z } from 'zod';

export const Load = z.enum(['High', 'Moderate', 'Recovery', 'Recovery / Stamina']);
export const Trimester = z.enum(['T1', 'T2', 'T3']);
export const Slot = z.enum(['am', 'main', 'pm']);

export const SessionRef = z.object({
  id: z.string(),
  /** e.g. Tabata movement id, or Foundation "seqA" | "seqB" | "applied" */
  variant: z.string().optional(),
  /** "full session" | "warm-up" | free text shown on the card */
  note: z.string().optional(),
  optional: z.boolean().optional(),
});
export type SessionRef = z.infer<typeof SessionRef>;

export const Day = z.object({
  n: z.number().int().min(1).max(14),
  week: z.union([z.literal(1), z.literal(2)]),
  day: z.number().int().min(1).max(7),
  am: z.array(SessionRef),
  main: z.array(SessionRef),
  pm: z.array(SessionRef),
  timeEstimate: z.string(),
  load: Load,
  foundation: z.enum(['A', 'B', 'applied']),
  foundationMode: z.enum(['full', 'warmup', 'applied']),
});
export type Day = z.infer<typeof Day>;

export const TimerPreset = z.enum([
  'tabata', 'vo2', 'sprints', 'sevenMinute', 'superSlow', 'coldShower', 'coldImmersion', 'sauna', 'contrast',
  'stamina', 'countdown', 'foundation', 'mobility', 'decompression', 'swim', 'coolStretch', 'none',
]);
export type TimerPreset = z.infer<typeof TimerPreset>;

export const LogField = z.object({
  key: z.string(),
  label: z.string(),
  type: z.enum(['number', 'text', 'bool', 'select']),
  unit: z.string().optional(),
  options: z.array(z.string()).optional(),
  optional: z.boolean().optional(),
});
export type LogField = z.infer<typeof LogField>;

export const Session = z.object({
  id: z.string(),
  letter: z.string().optional(),
  name: z.string(),
  short: z.string().optional(),
  purpose: z.string(),
  cues: z.array(z.string()),
  safety: z.array(z.string()),
  timerPreset: TimerPreset,
  /** default duration in minutes for countdown-style presets */
  defaultMinutes: z.number().optional(),
  minMinutes: z.number().optional(),
  maxMinutes: z.number().optional(),
  logFields: z.array(LogField),
  ch10System: z.string().nullable(),
  dose: z.string().optional(),
  drawingId: z.string(),
  prenatalOnly: z.boolean().optional(),
  kind: z.enum(['session', 'protocol']).default('session'),
});
export type Session = z.infer<typeof Session>;

export const FoundationExercise = z.object({
  id: z.string(),
  name: z.string(),
  steps: z.array(z.string()).min(1),
  fatigueTarget: z.string(),
  reps: z.literal(3),
  drawingId: z.string(),
  /** extra drawing frames for multi-step moves */
  frames: z.array(z.string()).optional(),
  position: z.enum(['standing', 'supine', 'prone', 'kneeling']),
});
export type FoundationExercise = z.infer<typeof FoundationExercise>;

export const MobilityStation = z.object({
  n: z.number().int(),
  movement: z.string(),
  movementId: z.enum(['burpees', 'legSwingsFB', 'legSwingsSide', 'jumpingJacks']),
  count: z.number().int(),
  roll: z.string(),
  rollDrawingId: z.string(),
  rollPosition: z.enum(['supine', 'prone', 'side', 'seated', 'standing']),
});
export type MobilityStation = z.infer<typeof MobilityStation>;

export const SevenMinuteMove = z.object({
  id: z.string(),
  name: z.string(),
  cue: z.string(),
  drawingId: z.string(),
  isometric: z.boolean().optional(),
  w2Swap: z.object({ id: z.string(), name: z.string(), cue: z.string(), drawingId: z.string() }).nullable(),
});
export type SevenMinuteMove = z.infer<typeof SevenMinuteMove>;

export const SuperSlowPattern = z.object({
  id: z.string(),
  name: z.string(),
  options: z.array(z.string()).min(1),
  drawingId: z.string(),
});
export type SuperSlowPattern = z.infer<typeof SuperSlowPattern>;

export const TabataMovement = z.object({
  id: z.string(),
  name: z.string(),
  drawingId: z.string(),
  impact: z.enum(['low', 'high']),
  unit: z.enum(['reps', 'cals']),
});

export const Rule = z.object({ id: z.string(), title: z.string(), text: z.string() });

export const Override = z.object({
  id: z.string(),
  /** session ids, foundation exercise ids, seven-minute move ids, or rule ids */
  targets: z.array(z.string()).min(1),
  targetType: z.enum(['session', 'foundation', 'sevenMinute', 'rule', 'habit']),
  label: z.string(),
  appliesFrom: Trimester,
  /** if set, the override is only suggested (shown as optional) before this trimester */
  hardFrom: Trimester.optional(),
  action: z.enum(['swap', 'remove', 'modify']),
  replacement: z.string(),
  /** id of the session that replaces the target when action is swap/remove-with-replacement */
  replacementId: z.string().optional(),
  reason: z.string(),
  /** machine-readable details used by timers and screens */
  data: z.record(z.string(), z.unknown()).optional(),
});
export type Override = z.infer<typeof Override>;

export const Program = z.object({
  meta: z.object({ title: z.string(), version: z.string(), disclaimer: z.string(), orderWithinDay: z.string() }),
  days: z.array(Day).length(14),
  sessions: z.record(z.string(), Session),
  foundation: z.object({
    breathing: z.object({
      intro: z.string(),
      cues: z.array(z.object({ name: z.string(), text: z.string() })).length(4),
      dose: z.string(),
      firstTime: z.string(),
    }),
    seqA: z.array(FoundationExercise).length(7),
    seqB: z.array(FoundationExercise).length(6),
    day7: z.string(),
    asWarmup: z.string(),
  }),
  mobilityStations: z.array(MobilityStation).length(15),
  sevenMinute: z.array(SevenMinuteMove).length(12),
  sevenMinutePrenatal: z.array(z.object({ id: z.string(), name: z.string(), cue: z.string(), drawingId: z.string() })),
  superSlowPatterns: z.array(SuperSlowPattern).length(4),
  tabataMovements: z.array(TabataMovement),
  tabataRotation: z.object({ w1: z.array(z.string()).length(3), w2: z.array(z.string()).length(3) }),
  rules: z.object({
    standingProtocols: z.array(z.object({ id: z.string(), name: z.string(), dose: z.string(), frequency: z.string() })),
    phoenixAdjustments: z.array(Rule),
    executionRules: z.array(Rule),
    evidenceFlags: z.array(Rule),
    doseFramework: z.array(z.object({ system: z.string(), dose: z.string(), coveredBy: z.string(), w1w2: z.string() })),
    upperLimit: z.object({ text: z.string(), rows: z.array(z.object({ item: z.string(), w1: z.string(), w2: z.string(), ceiling: z.string() })) }),
  }),
  habits: z.array(z.object({ id: z.string(), label: z.string(), count: z.number().int().min(1), sessionId: z.string().optional() })),
  prenatal: z.object({
    disclaimer: z.string(),
    source: z.string(),
    firstLaunch: z.string(),
    stopIf: z.array(z.string()).min(5),
    stopIfFooter: z.string(),
    overrides: z.array(Override),
  }),
});
export type Program = z.infer<typeof Program>;
