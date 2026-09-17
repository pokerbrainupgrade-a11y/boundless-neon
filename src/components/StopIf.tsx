import { useState } from 'preact/hooks';
import { program } from '@/data/program';
import { ctx } from '@/lib/store';

export function StopIfList() {
  return (
    <div class="stack" data-testid="stop-if-list">
      <ul>
        {program.prenatal.stopIf.map((s) => <li key={s}>{s}</li>)}
      </ul>
      <p><strong>{program.prenatal.stopIfFooter}</strong></p>
    </div>
  );
}

/** Persistent chip on every running timer in Prenatal Mode. Tap opens the warning-signs list. */
export function StopIfChip() {
  const [open, setOpen] = useState(false);
  if (!ctx.value.on) return null;
  return (
    <>
      <button type="button" class="btn chip-caution" data-testid="stop-if-chip" onClick={() => setOpen(true)}
        style="position:fixed;top:calc(var(--safe-top) + 10px);right:12px;z-index:30;min-height:var(--tap);border-radius:999px;background:var(--caution);color:var(--ink);font-weight:700;padding:8px 14px;gap:6px">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><path d="M12 3l10 18H2z M12 10v5 M12 18v.5" /></svg>
        Stop if…
      </button>
      {open && (
        <div class="modal-bg" onClick={() => setOpen(false)}>
          <div class="modal" role="dialog" aria-label="Stop if" onClick={(e) => e.stopPropagation()}>
            <div class="row between"><h2>Stop if…</h2><button type="button" class="btn btn-ghost" onClick={() => setOpen(false)}>Close</button></div>
            <p class="muted small">Stop the session right away if you notice any of these.</p>
            <StopIfList />
          </div>
        </div>
      )}
    </>
  );
}
