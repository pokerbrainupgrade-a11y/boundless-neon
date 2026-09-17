import { useState } from 'preact/hooks';
import { route, navigate } from '@/router';
import { program, foundationExercises, sevenMinuteMoves } from '@/data/program';
import type { Session, FoundationExercise, Override } from '@/data/schema';
import { ctx } from '@/lib/store';
import { allOverridesFor, overrideApplies, overrideIsSoft, overrideData } from '@/lib/prenatal';
import { Pose } from '@/components/Pose';
import { foundationView } from '@/components/Steppers';

function OverrideRows({ ovs }: { ovs: Override[] }) {
  const c = ctx.value;
  if (!ovs.length) return null;
  return (
    <div class="stack" style="gap:6px" data-testid="prenatal-versions">
      {ovs.map((o) => {
        const active = c.on && overrideApplies(o, c.trimester) && !overrideIsSoft(o, c.trimester);
        return (
          <div key={o.id} class={`banner ${active ? 'caution' : 'info'}`} data-active={active}>
            <span>
              <span class={`chip ${active ? 'chip-purple' : 'chip-outline'}`}>{active ? 'ACTIVE' : 'PRENATAL'} · {o.appliesFrom}+</span> {o.replacement}
              <div class="muted small">{o.reason}</div>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function SessionDetail({ s }: { s: Session }) {
  const c = ctx.value;
  const ovs = allOverridesFor(s.id);
  const data = overrideData(s.id, c);
  const name = typeof data.name === 'string' ? data.name : s.name;
  return (
    <main class="screen" data-testid="session-detail">
      <button type="button" class="btn btn-ghost" style="align-self:flex-start" onClick={() => navigate('/moves')}>← Moves</button>
      <div class="row between">
        <div><div class="section-h"><h1 style="font-size:1.3rem">{s.letter ? `${s.letter}. ` : ''}{name}</h1></div>{name !== s.name && <div class="muted small">Original: {s.name}</div>}</div>
        <Pose id={s.drawingId} size={96} glow />
      </div>
      <p>{s.purpose}</p>
      {ovs.length > 0 && <><h2>Prenatal version{c.on ? ' (active)' : ''}</h2><OverrideRows ovs={ovs} /></>}
      <h2>Original cues</h2>
      <ul>{s.cues.map((x) => <li key={x}>{x}</li>)}</ul>
      {s.safety.length > 0 && <><h2>Safety</h2><ul>{s.safety.map((x) => <li key={x}>{x}</li>)}</ul></>}
      {s.dose && <><h2>Dose</h2><p>{s.dose}</p></>}
      {s.ch10System && <div class="muted small">System: {s.ch10System}</div>}
      {s.id === 'A' && <><h2>Rotation</h2><p class="small">W1: {program.tabataRotation.w1.map((m) => program.tabataMovements.find((x) => x.id === m)!.name).join(' → ')}<br />W2: {program.tabataRotation.w2.map((m) => program.tabataMovements.find((x) => x.id === m)!.name).join(' → ')}</p></>}
      {s.id === 'C' && <SevenMinuteList />}
      {s.id === 'F' && <SuperSlowList />}
      {s.id === 'E' && <StationList />}
      {s.id === 'B' && <FoundationList />}
      {s.id === 'decompression' && <ol>{program.foundation.breathing.cues.map((k) => <li key={k.name}><strong>{k.name}.</strong> {k.text}</li>)}</ol>}
    </main>
  );
}

function FoundationDetail({ ex }: { ex: FoundationExercise }) {
  const v = foundationView(ex);
  const ovs = allOverridesFor(ex.id);
  return (
    <main class="screen" data-testid="foundation-detail">
      <button type="button" class="btn btn-ghost" style="align-self:flex-start" onClick={() => navigate('/moves')}>← Moves</button>
      <div class="section-h"><h1 style="font-size:1.3rem">{ex.name}</h1></div>
      <div class="pose-strip">{(ex.frames ?? [ex.drawingId]).map((f) => <Pose key={f} id={f} size={120} />)}</div>
      <ol>{ex.steps.map((s) => <li key={s}>{s}</li>)}</ol>
      <div class="muted small">Should fatigue: <strong>{ex.fatigueTarget}</strong> · 3 reps</div>
      {ovs.length > 0 && <><h2>Prenatal version</h2>{v.frames[0] !== ex.drawingId && <Pose id={v.frames[0]!} size={120} glow />}<OverrideRows ovs={ovs} /></>}
    </main>
  );
}

function FoundationList() {
  return (
    <div class="stack">
      <h2>Sequence A · D1/D3/D5</h2>
      {program.foundation.seqA.map((e, i) => <ExRow key={e.id} n={i + 1} ex={e} />)}
      <h2>Sequence B · D2/D4/D6</h2>
      {program.foundation.seqB.map((e, i) => <ExRow key={e.id} n={i + 1} ex={e} />)}
      <div class="card small"><strong>Day 7.</strong> {program.foundation.day7}</div>
      <div class="card small"><strong>As the warm-up.</strong> {program.foundation.asWarmup}</div>
    </div>
  );
}
function ExRow({ n, ex }: { n: number; ex: FoundationExercise }) {
  const v = foundationView(ex);
  return (
    <button type="button" class="card row" style="text-align:left;cursor:pointer;gap:10px" onClick={() => navigate(`/moves/${ex.id}`)}>
      <Pose id={v.frames[0]!} size={56} />
      <div class="grow"><strong>{n}. {ex.name}</strong><div class="muted small">{ex.fatigueTarget}{v.prenatal ? ' · prenatal version' : ''}</div></div>
      <span class="muted">›</span>
    </button>
  );
}
function SevenMinuteList() {
  const c = ctx.value;
  const swaps = (overrideData('C', c).moveSwaps as Record<string, string> | undefined) ?? {};
  return (
    <div class="stack">
      <h2>The 12 moves</h2>
      {program.sevenMinute.map((m, i) => {
        const pn = c.on ? swaps[m.id] : undefined;
        return (
          <div key={m.id} class="card row" style="gap:10px">
            <Pose id={pn ? sevenMinuteMoves[pn]!.drawingId : m.drawingId} size={56} />
            <div class="grow">
              <strong>{i + 1}. {pn ? sevenMinuteMoves[pn]!.name : m.name}</strong>{pn && <span class="muted small"> (replaces {m.name})</span>}
              <div class="muted small">{pn ? sevenMinuteMoves[pn]!.cue : m.cue}</div>
              {m.w2Swap && <div class="muted small">W2 swap: {m.w2Swap.name}{c.on ? ' (not used in Prenatal Mode)' : ''}</div>}
            </div>
            {m.w2Swap && !c.on && <Pose id={m.w2Swap.drawingId} size={44} />}
          </div>
        );
      })}
    </div>
  );
}
function SuperSlowList() {
  const c = ctx.value;
  const po = (overrideData('F', c).patternOptions as Record<string, string[]> | undefined) ?? {};
  return (
    <div class="stack">
      <h2>Patterns</h2>
      {program.superSlowPatterns.map((p, i) => (
        <div key={p.id} class="card row" style="gap:10px"><Pose id={p.drawingId} size={56} /><div><strong>{i + 1}. {p.name}</strong><div class="muted small">{(c.on && po[p.id] ? po[p.id]! : p.options).join(' · ')}</div></div></div>
      ))}
    </div>
  );
}
function StationList() {
  const c = ctx.value;
  const d = overrideData('E', c);
  const swaps = (d.movementSwaps as Record<string, { name: string }> | undefined) ?? {};
  const pos = (d.positionSwaps as Record<string, string> | undefined) ?? {};
  return (
    <div class="stack">
      <h2>15 stations</h2>
      <table class="tbl"><thead><tr><th>#</th><th>Movement</th><th>Foam roll</th><th></th></tr></thead>
        <tbody>{program.mobilityStations.map((s) => <tr key={s.n}><td>{s.n}</td><td>{c.on && swaps[s.movementId] ? `${s.count} ${swaps[s.movementId]!.name}` : s.movement}</td><td>{s.roll}{c.on && pos[s.rollPosition] ? <div class="muted small">use {pos[s.rollPosition]}</div> : null}</td><td><Pose id={s.rollDrawingId} size={40} /></td></tr>)}</tbody>
      </table>
    </div>
  );
}

function Reference() {
  const c = ctx.value;
  const r = program.rules;
  const fuel = c.on ? (overrideData('fueling', c).text as string | undefined) : undefined;
  return (
    <div class="stack" data-testid="reference">
      <h2>Standing protocols</h2>
      <table class="tbl"><thead><tr><th>Protocol</th><th>Dose</th><th>Frequency</th></tr></thead>
        <tbody>{r.standingProtocols.map((p) => <tr key={p.id}><td>{p.name}</td><td>{p.id === 'fueling' && fuel ? <span><em>Prenatal:</em> {fuel}</span> : p.dose}</td><td>{p.frequency}</td></tr>)}</tbody></table>
      <h2>Phoenix adjustments</h2>
      {r.phoenixAdjustments.map((x) => <div key={x.id} class="card small"><strong>{x.title}.</strong> {x.text}{c.on && x.id === 'phxHeat' ? <div class="banner caution" style="margin-top:6px"><span><strong>Prenatal:</strong> indoor-only when it is likely above 85°F (May–Oct, 7am–7pm). Water reminder on every session start.</span></div> : null}</div>)}
      <h2>Execution rules</h2>
      {r.executionRules.map((x) => <div key={x.id} class="card small"><strong>{x.title}.</strong> {x.text}</div>)}
      <h2>Dose framework (Ch. 10)</h2>
      <table class="tbl"><thead><tr><th>System</th><th>Minimum effective dose</th><th>Covered by</th><th>W1 / W2</th></tr></thead>
        <tbody>{r.doseFramework.map((x) => <tr key={x.system}><td>{x.system}</td><td>{x.dose}</td><td>{x.coveredBy}</td><td>{x.w1w2}</td></tr>)}</tbody></table>
      <h2>Upper-limit check</h2>
      <p class="small muted">{r.upperLimit.text}</p>
      <table class="tbl"><thead><tr><th>Vigorous work</th><th>W1</th><th>W2</th><th>Ceiling</th></tr></thead>
        <tbody>{r.upperLimit.rows.map((x) => <tr key={x.item}><td>{x.item}</td><td>{x.w1}</td><td>{x.w2}</td><td>{x.ceiling}</td></tr>)}</tbody></table>
      <h2>Evidence flags</h2>
      {r.evidenceFlags.map((x) => <div key={x.id} class="card small"><strong>{x.title}.</strong> {x.text}</div>)}
    </div>
  );
}

export function PrenatalTable() {
  const c = ctx.value;
  return (
    <div class="stack" data-testid="prenatal-table">
      <p class="small muted">{program.prenatal.disclaimer} {program.prenatal.source}</p>
      {c.on && <div class="muted small">Active trimester: <strong>{c.trimester}</strong>{c.week !== null ? ` (week ${c.week})` : ' (no due date set; T1 rules apply)'}</div>}
      <table class="tbl"><thead><tr><th>Element</th><th>Applies</th><th>Prenatal version</th><th>Reason</th></tr></thead>
        <tbody>{program.prenatal.overrides.map((o) => {
          const active = c.on && overrideApplies(o, c.trimester);
          const soft = active && overrideIsSoft(o, c.trimester);
          return <tr key={o.id} data-active={active && !soft} style={active && !soft ? 'background:rgba(139,92,246,0.12)' : undefined}><td>{o.label}{active ? <div><span class="chip chip-purple" style="font-size:0.55rem">{soft ? 'OPTIONAL' : 'ACTIVE'}</span></div> : null}</td><td>{o.appliesFrom}+{o.hardFrom ? ` (always ${o.hardFrom}+)` : ''}</td><td>{o.replacement}</td><td class="muted">{o.reason}</td></tr>;
        })}</tbody></table>
      <h2>Stop if…</h2>
      <ul>{program.prenatal.stopIf.map((x) => <li key={x}>{x}</li>)}</ul>
      <p><strong>{program.prenatal.stopIfFooter}</strong></p>
    </div>
  );
}

export function Library() {
  const r = route.value;
  const id = r.parts[1];
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'moves' | 'reference' | 'prenatal'>(id === 'prenatal' ? 'prenatal' : id === 'reference' ? 'reference' : 'moves');
  if (id && id !== 'prenatal' && id !== 'reference') {
    if (program.sessions[id]) return <SessionDetail s={program.sessions[id]!} />;
    if (foundationExercises[id]) return <FoundationDetail ex={foundationExercises[id]!} />;
  }
  const c = ctx.value;
  const ql = q.trim().toLowerCase();
  const match = (...xs: (string | undefined | null)[]) => !ql || xs.some((x) => x && x.toLowerCase().includes(ql));
  const sessions = Object.values(program.sessions).filter((s) => (!s.prenatalOnly || c.on) && match(s.name, s.short, s.letter, s.purpose, ...s.cues));
  const fnd = [...program.foundation.seqA, ...program.foundation.seqB].filter((e) => match(e.name, e.fatigueTarget, ...e.steps));
  return (
    <main class="screen" data-testid="library">
      <div class="section-h"><h1>Moves</h1></div>
      <div class="row">{(['moves', 'reference', 'prenatal'] as const).map((t) => <button key={t} type="button" class={`btn grow ${tab === t ? 'btn-primary' : ''}`} onClick={() => setTab(t)}>{t === 'moves' ? 'Library' : t === 'reference' ? 'Reference' : 'Prenatal'}</button>)}</div>
      {tab === 'reference' && <Reference />}
      {tab === 'prenatal' && <PrenatalTable />}
      {tab === 'moves' && (
        <>
          <input class="input" type="search" placeholder="Search moves, cues, muscles…" value={q} onInput={(e) => setQ((e.target as HTMLInputElement).value)} data-testid="search" />
          <h2>Sessions</h2>
          {sessions.map((s) => {
            const data = overrideData(s.id, c);
            const name = typeof data.name === 'string' ? data.name : s.name;
            const removed = c.on && program.prenatal.overrides.some((o) => o.targets.includes(s.id) && o.action === 'remove' && overrideApplies(o, c.trimester));
            return (
              <button key={s.id} type="button" class="card row" style="text-align:left;cursor:pointer;gap:10px" onClick={() => navigate(`/moves/${s.id}`)} data-testid="library-session">
                <Pose id={s.drawingId} size={56} />
                <div class="grow"><strong>{s.letter ? `${s.letter}. ` : ''}{name}</strong><div class="muted small">{s.purpose}</div>{removed && <span class="chip chip-purple" style="font-size:0.55rem">REMOVED IN PRENATAL MODE</span>}</div>
                <span class="muted">›</span>
              </button>
            );
          })}
          {fnd.length > 0 && <><h2>Foundation</h2>{fnd.map((e) => <ExRow key={e.id} n={(program.foundation.seqA.indexOf(e) >= 0 ? program.foundation.seqA.indexOf(e) : program.foundation.seqB.indexOf(e)) + 1} ex={e} />)}</>}
          {!ql && <><SevenMinuteList /><SuperSlowList /><StationList /></>}
        </>
      )}
    </main>
  );
}
