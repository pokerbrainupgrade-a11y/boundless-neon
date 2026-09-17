import { route, navigate } from '@/router';
import { getDay } from '@/data/program';
import { block, dateOfDay, dayN, dayLabel } from '@/lib/store';
import { fmtShortDate } from '@/lib/time';
import { SessionRow } from '@/components/SessionRow';
import { PrenatalChip } from './Today';

export function DayPage() {
  const n = Math.max(1, Math.min(14, Number(route.value.parts[1] ?? 1)));
  const d = getDay(n);
  const b = block.value;
  const cls = d.load === 'High' ? 'chip-pink' : d.load === 'Moderate' ? 'chip-yellow' : 'chip-cyan';
  const fnd = d.foundation === 'applied' ? 'applied day' : `Seq ${d.foundation} · ${d.foundationMode}`;
  return (
    <main class="page" data-testid="day-preview" data-day={n}>
      <div class="sticky-head">
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Previous day" disabled={n <= 1} onClick={() => navigate(`/schedule/${n - 1}`, true)} data-testid="day-prev">‹</button>
        <span class="title">{dayLabel(n)} · W{d.week} D{d.day}</span>
        <button type="button" class="btn btn-ghost btn-icon" aria-label="Next day" disabled={n >= 14} onClick={() => navigate(`/schedule/${n + 1}`, true)} data-testid="day-next">›</button>
        <button type="button" class="btn btn-ghost" onClick={() => navigate('/schedule')} data-testid="day-close">Close</button>
      </div>
      <div class="content">
        <div class="row wrap" style="gap:8px">
          <span class={`chip ${cls}`}>{d.load}</span>
          <span class="chip chip-outline">{d.timeEstimate}</span>
          <span class="chip chip-purple">Foundation {fnd}</span>
          {dayN.value === n && <span class="chip chip-lime">TODAY</span>}
          <PrenatalChip />
        </div>
        {b && <div class="muted small">{fmtShortDate(dateOfDay(n)!)}</div>}
        <section class="card stack"><h3>WARM-UP</h3>{d.am.map((r, i) => <SessionRow key={i} r={r} day={n} slot="am" />)}</section>
        <section class="card stack"><h3>MAIN SET</h3>{d.main.map((r, i) => <SessionRow key={i} r={r} day={n} slot="main" />)}</section>
        <section class="card stack"><h3>COOL-DOWN</h3>{d.pm.length ? d.pm.map((r, i) => <SessionRow key={i} r={r} day={n} slot="pm" />) : <div class="muted small">Nothing scheduled. Post-meal walk and evening breaths.</div>}</section>
        <div class="row">
          <button type="button" class="btn grow" disabled={n <= 1} onClick={() => navigate(`/schedule/${n - 1}`, true)}>‹ {n > 1 ? dayLabel(n - 1) : ''}</button>
          <button type="button" class="btn grow" disabled={n >= 14} onClick={() => navigate(`/schedule/${n + 1}`, true)}>{n < 14 ? dayLabel(n + 1) : ''} ›</button>
        </div>
      </div>
    </main>
  );
}
