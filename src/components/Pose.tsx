import { poses, LEN, type Figure, type Prop } from '@/data/poses';
import { settings } from '@/lib/settings';
import { ctx } from '@/lib/store';

const deg = Math.PI / 180;
const off = (p: [number, number], angle: number, len: number): [number, number] => [p[0] + Math.cos(angle * deg) * len, p[1] + Math.sin(angle * deg) * len];

function limb(a: [number, number], b: [number, number], c: [number, number], key: string, dim = false) {
  return <polyline key={key} points={`${a[0]},${a[1]} ${b[0]},${b[1]} ${c[0]},${c[1]}`} opacity={dim ? 0.6 : 1} />;
}

function PropEl({ p }: { p: Prop }) {
  switch (p.type) {
    case 'floor': return <line x1="6" y1="90" x2="94" y2="90" stroke="var(--pink)" />;
    case 'wall': return <line x1={p.x} y1="12" x2={p.x} y2="90" stroke="var(--pink)" />;
    case 'roller': return <rect x={p.x - 9} y={p.y - 3.5} width="18" height="7" rx="3.5" transform={p.angle ? `rotate(${p.angle} ${p.x} ${p.y})` : undefined} />;
    case 'kettlebell': return <g><circle cx={p.x} cy={p.y} r="4.5" /><path d={`M${p.x - 3} ${p.y - 3.5} a3.5 3.5 0 0 1 6 0`} /></g>;
    case 'box': return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx="1.5" />;
    case 'bench': return <g><line x1={p.x} y1={p.y} x2={p.x + p.w} y2={p.y} /><line x1={p.x + 3} y1={p.y} x2={p.x + 3} y2="90" /><line x1={p.x + p.w - 3} y1={p.y} x2={p.x + p.w - 3} y2="90" /></g>;
    case 'bar': return <line x1={p.x - p.w / 2} y1={p.y} x2={p.x + p.w / 2} y2={p.y} transform={p.angle ? `rotate(${p.angle} ${p.x} ${p.y})` : undefined} />;
    case 'bike': return <g><circle cx={p.x - 14} cy={p.y} r="6" /><circle cx={p.x + 14} cy={p.y} r="6" /><path d={`M${p.x - 14} ${p.y} L${p.x - 2} ${p.y - 16} L${p.x + 12} ${p.y - 18}`} /><line x1={p.x - 2} y1={p.y - 16} x2={p.x - 2} y2={p.y} /></g>;
    case 'rower': return <g><line x1={p.x} y1={p.y} x2={p.x + 44} y2={p.y - 4} /><rect x={p.x + 40} y={p.y - 14} width="8" height="10" rx="2" /></g>;
    case 'tub': return <path d={`M${p.x} ${p.y - 20} L${p.x + 4} ${p.y} L${p.x + p.w - 4} ${p.y} L${p.x + p.w} ${p.y - 20}`} />;
    case 'water': return <path d={`M8 ${p.y} q6 -3 12 0 t12 0 t12 0 t12 0 t12 0 t12 0 t12 0`} stroke="var(--cyan)" opacity="0.8" />;
    case 'pillow': return <rect x={p.x - 8} y={p.y - 3} width="16" height="6" rx="3" transform={p.angle ? `rotate(${p.angle} ${p.x} ${p.y})` : undefined} />;
    case 'rope': return <path d={`M${p.x - 18} ${p.y - 30} q18 40 36 0`} />;
    case 'pad': return <line x1={p.x} y1={p.y} x2={p.x + p.w} y2={p.y} stroke-width="4" opacity="0.5" />;
    case 'cable': return <line x1={p.x} y1={p.y} x2={p.toX} y2={p.toY} stroke-dasharray="2 2" />;
    case 'arrow': return <g transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}><line x1="-6" y1="0" x2="6" y2="0" /><polyline points="2,-4 6,0 2,4" /></g>;
    case 'sun': return <g stroke="var(--yellow)"><circle cx="82" cy="18" r="5" /><line x1="82" y1="8" x2="82" y2="10" /><line x1="82" y1="26" x2="82" y2="28" /><line x1="72" y1="18" x2="74" y2="18" /><line x1="90" y1="18" x2="92" y2="18" /></g>;
    case 'heat': return <g stroke="var(--yellow)" opacity="0.8"><path d={`M${p.x} ${p.y} q3 -4 0 -8 t0 -8`} /><path d={`M${p.x + 7} ${p.y} q3 -4 0 -8 t0 -8`} /></g>;
  }
}

export function FigureSvg({ fig, belly }: { fig: Figure; belly: boolean }) {
  const s = fig.scale ?? 1;
  const L = { head: LEN.head * s, neck: LEN.neck * s, torso: LEN.torso * s, uArm: LEN.uArm * s, lArm: LEN.lArm * s, thigh: LEN.thigh * s, shin: LEN.shin * s };
  const hip = fig.hip;
  const sh = off(hip, fig.torso, L.torso);
  const headDir = fig.head ?? fig.torso;
  const neckEnd = off(sh, headDir, L.neck);
  const headC = off(neckEnd, headDir, L.head);
  const elL = off(sh, fig.uArmL, L.uArm);
  const hL = off(elL, fig.lArmL, L.lArm);
  const elR = off(sh, fig.uArmR, L.uArm);
  const hR = off(elR, fig.lArmR, L.lArm);
  const kL = off(hip, fig.thighL, L.thigh);
  const fL = off(kL, fig.shinL, L.shin);
  const kR = off(hip, fig.thighR, L.thigh);
  const fR = off(kR, fig.shinR, L.shin);
  // belly: small arc on the facing side, one third up the torso
  const facing = fig.facing ?? 'right';
  const side = facing === 'right' ? 1 : -1;
  const bc = off(hip, fig.torso, L.torso * 0.4);
  const perp = fig.torso + 90 * side;
  const b1 = off(hip, fig.torso, L.torso * 0.12);
  const b2 = off(hip, fig.torso, L.torso * 0.66);
  const bctl = off(bc, perp, 6.5 * s);
  return (
    <g>
      {limb(sh, elL, hL, 'al', true)}
      {limb(hip, kL, fL, 'll', true)}
      <line x1={hip[0]} y1={hip[1]} x2={sh[0]} y2={sh[1]} />
      <line x1={sh[0]} y1={sh[1]} x2={neckEnd[0]} y2={neckEnd[1]} />
      <circle cx={headC[0]} cy={headC[1]} r={L.head} />
      {belly && <path d={`M${b1[0]} ${b1[1]} Q${bctl[0]} ${bctl[1]} ${b2[0]} ${b2[1]}`} opacity="0.85" />}
      {limb(sh, elR, hR, 'ar')}
      {limb(hip, kR, fR, 'lr')}
    </g>
  );
}

export function Pose({ id, size = 96, glow = false, class: cls = '' }: { id: string; size?: number; glow?: boolean; class?: string }) {
  const pose = poses[id];
  const belly = settings.value.bellyCurve && ctx.value.on && !pose?.noBelly;
  if (!pose) {
    return (
      <svg class={`pose ${cls}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={`Drawing missing: ${id}`}>
        <rect x="10" y="10" width="80" height="80" rx="8" fill="none" stroke="currentColor" stroke-dasharray="4 4" />
        <text x="50" y="55" text-anchor="middle" font-size="9" fill="currentColor">{id}</text>
      </svg>
    );
  }
  return (
    <svg class={`pose ${glow ? 'glow' : ''} ${cls}`} width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={pose.label} fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      {pose.props?.map((p, i) => <PropEl key={i} p={p} />)}
      <FigureSvg fig={pose.figure} belly={belly} />
    </svg>
  );
}
