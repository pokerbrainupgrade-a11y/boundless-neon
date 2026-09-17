/**
 * Build-time gate for program.json. Exits non-zero on any failure and prints
 * the day-by-day table for a by-eye diff against the source pages 1 and 7.
 */
import { program, allTargetIds, foundationExercises, sevenMinuteMoves } from '../src/data/program';

let failures = 0;
function assert(cond: unknown, msg: string) {
  if (cond) console.log(`  ok   ${msg}`);
  else {
    failures++;
    console.log(`  FAIL ${msg}`);
  }
}

console.log('verify-program');
assert(program.days.length === 14, '14 days');
assert(program.foundation.seqA.length === 7, 'Seq A = 7');
assert(program.foundation.seqB.length === 6, 'Seq B = 6');
assert(program.foundation.seqB[4]?.name === 'Woodpecker Rotation', 'Seq B #5 is Woodpecker Rotation');
assert(program.mobilityStations.length === 15, '15 mobility stations');
assert(program.sevenMinute.length === 12, '12 seven-minute moves');
assert(program.superSlowPatterns.length === 4, '4 super-slow patterns');

const w2d6 = program.days[12];
const w2d7 = program.days[13];
const refs = (d: typeof w2d6) => [...d.am, ...d.main, ...d.pm].map((r) => r.id);
assert(w2d6.week === 2 && w2d6.day === 6 && refs(w2d6).includes('H'), 'W2 D6 = H');
assert(w2d7.week === 2 && w2d7.day === 7 && refs(w2d7).includes('L'), 'W2 D7 contains L');

// Every SessionRef resolves
let unresolved: string[] = [];
for (const d of program.days) {
  assert(d.n === (d.week - 1) * 7 + d.day, `day ${d.n} numbering (W${d.week} D${d.day})`);
  for (const r of [...d.am, ...d.main, ...d.pm]) {
    if (!program.sessions[r.id]) unresolved.push(`day ${d.n}: ${r.id}`);
    if (r.id === 'A' && r.variant && !program.tabataMovements.find((m) => m.id === r.variant)) unresolved.push(`day ${d.n}: tabata movement ${r.variant}`);
    if (r.id === 'B' && r.variant && !['seqA', 'seqB', 'applied'].includes(r.variant)) unresolved.push(`day ${d.n}: foundation variant ${r.variant}`);
  }
}
assert(unresolved.length === 0, `every SessionRef resolves ${unresolved.join(', ')}`);

// Tabata rotation
const rot = program.tabataRotation;
const tabataDays = program.days.filter((d) => d.main.some((r) => r.id === 'A'));
const w1 = tabataDays.filter((d) => d.week === 1).map((d) => d.main.find((r) => r.id === 'A')!.variant);
const w2 = tabataDays.filter((d) => d.week === 2).map((d) => d.main.find((r) => r.id === 'A')!.variant);
assert(JSON.stringify(w1) === JSON.stringify(rot.w1), `W1 tabata rotation ${w1.join('/')}`);
assert(JSON.stringify(w2) === JSON.stringify(rot.w2), `W2 tabata rotation ${w2.join('/')}`);
for (const id of [...rot.w1, ...rot.w2]) assert(!!program.tabataMovements.find((m) => m.id === id), `tabata movement ${id} defined`);

// Prenatal overrides resolve
const ids = allTargetIds();
const badTargets: string[] = [];
for (const o of program.prenatal.overrides) {
  for (const t of o.targets) if (!ids.has(t)) badTargets.push(`${o.id} → ${t}`);
  if (o.replacementId && !program.sessions[o.replacementId]) badTargets.push(`${o.id} replacementId ${o.replacementId}`);
  const data = o.data as Record<string, unknown> | undefined;
  if (data?.moveSwaps) {
    for (const [from, to] of Object.entries(data.moveSwaps as Record<string, string>)) {
      if (!program.sevenMinute.find((m) => m.id === from)) badTargets.push(`${o.id} moveSwap from ${from}`);
      if (!sevenMinuteMoves[to]) badTargets.push(`${o.id} moveSwap to ${to}`);
    }
  }
  if (data?.moves) for (const m of data.moves as string[]) if (!program.tabataMovements.find((x) => x.id === m)) badTargets.push(`${o.id} tabata move ${m}`);
  if (data?.drawings) for (const k of Object.keys(data.drawings as object)) if (!foundationExercises[k]) badTargets.push(`${o.id} drawing key ${k}`);
  if (data?.patternOptions) for (const k of Object.keys(data.patternOptions as object)) if (!program.superSlowPatterns.find((p) => p.id === k)) badTargets.push(`${o.id} pattern ${k}`);
}
assert(badTargets.length === 0, `every Prenatal override id resolves ${badTargets.join(', ')}`);
assert(program.prenatal.overrides.length === 23, `23 override rows (${program.prenatal.overrides.length})`);
assert(program.prenatal.stopIf.length === 10, '10 stop-if signs');

// Contraindicated sessions all have an override
for (const id of ['G', 'I', 'J', 'coldImmersion', 'D', 'A', 'H', 'F', 'C', 'L', 'K', 'E']) {
  assert(program.prenatal.overrides.some((o) => o.targets.includes(id)), `override exists for ${id}`);
}

// Day table
const label = (r: { id: string; variant?: string; note?: string; optional?: boolean }) => {
  const s = program.sessions[r.id];
  let t = s.letter ? `${s.letter}. ${s.short ?? s.name}` : (s.short ?? s.name);
  if (r.variant) t += ` (${r.variant})`;
  if (r.note) t += ` [${r.note}]`;
  if (r.optional) t += ' (opt)';
  return t;
};
console.log('\nDay table (compare with source pages 1 and 7)');
console.log('N  | W D | Load               | Time        | Fnd     | AM                            | MAIN                                                        | PM');
for (const d of program.days) {
  const row = [
    String(d.n).padEnd(2),
    `${d.week} ${d.day}`,
    d.load.padEnd(18),
    d.timeEstimate.padEnd(11),
    `${d.foundation}/${d.foundationMode}`.padEnd(7),
    d.am.map(label).join(' + ').padEnd(29),
    d.main.map(label).join(' + ').padEnd(59),
    d.pm.map(label).join(' + ') || '—',
  ];
  console.log(row.join(' | '));
}

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'}: ${failures} failure(s)`);
if (failures > 0) process.exit(1);
