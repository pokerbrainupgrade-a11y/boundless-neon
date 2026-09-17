import { useState } from 'preact/hooks';
import { program } from '@/data/program';
import { updateSettings } from '@/lib/settings';
import { todayYmd } from '@/lib/store';
import { StopIfList } from '@/components/StopIf';

export function FirstLaunch() {
  const [pick, setPick] = useState(false);
  const [date, setDate] = useState(todayYmd.value);
  return (
    <main class="screen grid-bg" data-testid="first-launch">
      <div class="wordmark">BOUNDLESS NEON</div>
      <div class="card stack">
        <span class="chip chip-purple">PRENATAL MODE</span>
        <h3 style="font-size:1.1rem">Prenatal Mode is on.</h3>
        <p>{program.prenatal.firstLaunch}</p>
        <p class="muted small">{program.prenatal.source}</p>
        {!pick ? (
          <>
            <button type="button" class="btn btn-primary btn-lg btn-block" data-testid="cleared-btn" onClick={() => setPick(true)}>I've been cleared, set my provider date</button>
            <button type="button" class="btn btn-ghost btn-block" data-testid="later-btn" onClick={() => updateSettings({ firstLaunchDone: true })}>Remind me later</button>
          </>
        ) : (
          <div class="stack">
            <label class="field"><span>Provider-clearance date</span><input class="input" type="date" value={date} data-testid="clearance-input" onInput={(e) => setDate((e.target as HTMLInputElement).value)} /></label>
            <button type="button" class="btn btn-lime btn-lg btn-block" data-testid="clearance-save" onClick={() => date && updateSettings({ firstLaunchDone: true, clearanceDate: date })}>Save and continue</button>
          </div>
        )}
      </div>
      <details class="card">
        <summary>Stop if…</summary>
        <div style="margin-top:8px"><StopIfList /></div>
      </details>
      <p class="muted small">You can turn Prenatal Mode off in Settings.</p>
    </main>
  );
}
