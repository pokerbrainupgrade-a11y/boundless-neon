/**
 * Parametric stick-figure poses. Every drawing is data: joint angles in degrees
 * (absolute, SVG convention: 0° = +x right, 90° = +y down, -90° = up) plus
 * simple props. Rendered by components/Pose.tsx in a 100×100 box.
 */
export interface Figure {
  /** Hip joint position. */
  hip: [number, number];
  /** Direction from hip to shoulders (default -90 = upright). */
  torso: number;
  /** Direction from shoulders to head centre (default = torso). */
  head?: number;
  /** Arms: absolute directions of upper and lower segments. */
  uArmL: number; lArmL: number; uArmR: number; lArmR: number;
  /** Legs. */
  thighL: number; shinL: number; thighR: number; shinR: number;
  /** Which way the figure faces (belly side). */
  facing?: 'left' | 'right';
  /** Scale factor (default 1). */
  scale?: number;
}

export type Prop =
  | { type: 'floor' }
  | { type: 'wall'; x: number }
  | { type: 'roller'; x: number; y: number; angle?: number }
  | { type: 'kettlebell'; x: number; y: number }
  | { type: 'box'; x: number; y: number; w: number; h: number }
  | { type: 'bench'; x: number; y: number; w: number }
  | { type: 'bar'; x: number; y: number; w: number; angle?: number }
  | { type: 'bike'; x: number; y: number }
  | { type: 'rower'; x: number; y: number }
  | { type: 'tub'; x: number; y: number; w: number }
  | { type: 'water'; y: number }
  | { type: 'pillow'; x: number; y: number; angle?: number }
  | { type: 'rope'; x: number; y: number }
  | { type: 'pad'; x: number; y: number; w: number }
  | { type: 'cable'; x: number; y: number; toX: number; toY: number }
  | { type: 'arrow'; x: number; y: number; angle: number }
  | { type: 'sun' }
  | { type: 'heat'; x: number; y: number };

export interface Pose {
  id: string;
  /** Accessible description of the drawing. */
  label: string;
  figure: Figure;
  props?: Prop[];
  /** Hide the prenatal belly curve for this pose (e.g. face-down). */
  noBelly?: boolean;
}

export const LEN = { head: 6.5, neck: 4, torso: 22, uArm: 13, lArm: 12, thigh: 17, shin: 16 } as const;

/** Upright standing figure used as a base for variations. */
export const STAND: Figure = { hip: [50, 52], torso: -90, uArmL: 100, lArmL: 95, uArmR: 80, lArmR: 85, thighL: 95, shinL: 90, thighR: 85, shinR: 90, facing: 'right' };

const f = (over: Partial<Figure>): Figure => ({ ...STAND, ...over });

export const poses: Record<string, Pose> = {
  // ---- generic ----
  walk: { id: 'walk', label: 'Person walking briskly', figure: f({ hip: [48, 50], uArmL: 120, lArmL: 60, uArmR: 60, lArmR: 20, thighL: 120, shinL: 105, thighR: 60, shinR: 100 }), props: [{ type: 'floor' }] },
  cardioBike: { id: 'cardioBike', label: 'Person riding a stationary bike', figure: f({ hip: [44, 52], torso: -60, uArmL: 10, lArmL: 30, uArmR: 5, lArmR: 25, thighL: 40, shinL: 100, thighR: 100, shinR: 60 }), props: [{ type: 'bike', x: 58, y: 84 }, { type: 'floor' }] },
  rower: { id: 'rower', label: 'Person on a rowing machine', figure: f({ hip: [40, 66], torso: -100, uArmL: 0, lArmL: 175, uArmR: 5, lArmR: 175, thighL: 15, shinL: 100, thighR: 10, shinR: 95 }), props: [{ type: 'rower', x: 30, y: 84 }, { type: 'floor' }] },
  breathing: { id: 'breathing', label: 'Person standing tall with hands on ribs, breathing', figure: f({ hip: [50, 52], uArmL: 120, lArmL: 190, uArmR: 60, lArmR: 350, thighL: 92, shinL: 90, thighR: 88, shinR: 90 }), props: [{ type: 'floor' }] },
  founder: { id: 'founder', label: 'Founder: hips hinged back, arms reaching forward and up', figure: f({ hip: [40, 58], torso: -35, uArmL: -40, lArmL: -35, uArmR: -50, lArmR: -45, thighL: 100, shinL: 95, thighR: 70, shinR: 95 }), props: [{ type: 'floor' }] },
  founderStart: { id: 'founderStart', label: 'Founder start: wide stance, arms open', figure: f({ hip: [50, 52], uArmL: 140, lArmL: 150, uArmR: 40, lArmR: 30, thighL: 110, shinL: 100, thighR: 70, shinR: 80 }), props: [{ type: 'floor' }] },
  founderHinge: { id: 'founderHinge', label: 'Founder: hips hinge back, chest wide', figure: f({ hip: [42, 56], torso: -55, uArmL: 150, lArmL: 160, uArmR: 20, lArmR: 10, thighL: 105, shinL: 95, thighR: 70, shinR: 90 }), props: [{ type: 'floor' }] },
};

export function poseIds(): string[] {
  return Object.keys(poses);
}
