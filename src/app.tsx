import { route } from '@/router';
import { TabBar } from '@/components/TabBar';
import { Today } from '@/screens/Today';
import { Schedule } from '@/screens/Schedule';
import { Library } from '@/screens/Library';
import { Journal } from '@/screens/Journal';
import { Progress } from '@/screens/Progress';
import { Settings } from '@/screens/Settings';
import { DevPoses } from '@/screens/DevPoses';
import { Session } from '@/screens/Session';
import { FlashOverlay } from '@/components/Flash';
import { booted } from '@/lib/store';
import { settings } from '@/lib/settings';
import { FirstLaunch } from '@/screens/FirstLaunch';

export function App() {
  const r = route.value;
  const top = r.parts[0] ?? 'today';
  let screen;
  let tabs = true;
  switch (top) {
    case 'schedule': screen = <Schedule />; break;
    case 'moves': screen = <Library />; break;
    case 'journal': screen = <Journal />; break;
    case 'progress': screen = <Progress />; break;
    case 'settings': screen = <Settings />; break;
    case 'dev': screen = <DevPoses />; tabs = false; break;
    case 'session': screen = <Session />; tabs = false; break;
    case 'today':
    default: screen = <Today />;
  }
  const st = settings.value;
  if (booted.value && st.prenatalMode && !st.firstLaunchDone && top !== 'dev') return <FirstLaunch />;
  if (!booted.value) return <main class="screen" aria-busy="true"><div class="wordmark">BOUNDLESS NEON</div></main>;
  return (
    <>
      <FlashOverlay />
      {screen}
      {tabs && <TabBar />}
    </>
  );
}
