import { route } from '@/router';
import { TabBar } from '@/components/TabBar';
import { Today } from '@/screens/Today';
import { Schedule } from '@/screens/Schedule';
import { Library } from '@/screens/Library';
import { Journal } from '@/screens/Journal';
import { Progress } from '@/screens/Progress';
import { Settings } from '@/screens/Settings';

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
    case 'today':
    default: screen = <Today />;
  }
  return (
    <>
      {screen}
      {tabs && <TabBar />}
    </>
  );
}
