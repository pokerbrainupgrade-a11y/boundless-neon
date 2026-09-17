import { useEffect, useState } from 'preact/hooks';
import { db, type SessionLog } from '@/lib/db';
import { blocks, block, logs, vitals, blockLabel } from '@/lib/store';
import { buildCharts, type ChartMode } from '@/lib/charts';
import { Chart } from '@/components/Chart';

export function Progress() {
  const [mode, setMode] = useState<ChartMode>('weeks');
  const [blockId, setBlockId] = useState<number | null>(block.value?.id ?? null);
  const [all, setAll] = useState<SessionLog[]>([]);
  useEffect(() => {
    void db.logs.toArray().then(setAll);
  }, [logs.value]);
  useEffect(() => {
    if (blockId === null && block.value) setBlockId(block.value.id!);
  }, [block.value]);
  const charts = buildCharts(all, blocks.value, vitals.value, mode, blockId);
  return (
    <main class="screen" data-testid="progress" data-mode={mode}>
      <div class="section-h"><h1>Progress</h1></div>
      <div class="row" role="radiogroup" aria-label="Compare">
        <button type="button" role="radio" aria-checked={mode === 'weeks'} class={`btn grow ${mode === 'weeks' ? 'btn-primary' : ''}`} data-testid="mode-weeks" onClick={() => setMode('weeks')}>W1 vs W2</button>
        <button type="button" role="radio" aria-checked={mode === 'blocks'} class={`btn grow ${mode === 'blocks' ? 'btn-primary' : ''}`} data-testid="mode-blocks" onClick={() => setMode('blocks')}>Season vs Season</button>
      </div>
      {mode === 'weeks' && blocks.value.length > 1 && (
        <div class="row wrap">{blocks.value.map((b) => <button key={b.id} type="button" class={`btn ${blockId === b.id ? 'btn-cyan' : ''}`} onClick={() => setBlockId(b.id!)}>{blockLabel(b.n)}</button>)}</div>
      )}
      {all.length === 0 && <p class="muted">Charts fill in as you log sessions.</p>}
      {charts.map((c) => <Chart key={c.id} data={c} />)}
    </main>
  );
}
