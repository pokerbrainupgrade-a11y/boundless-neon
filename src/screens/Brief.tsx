import { route, navigate, back } from '@/router';
import { BriefPage, sessionUrl, type BriefTarget } from '@/components/SessionBrief';
import { program } from '@/data/program';
import { dayN, dayLabel } from '@/lib/store';

export function Brief() {
  const r = route.value;
  const t: BriefTarget = {
    sessionId: r.parts[1] ?? '',
    day: Number(r.query.get('day') ?? dayN.value ?? 1),
    slot: (r.query.get('slot') ?? 'main') as BriefTarget['slot'],
    variant: r.query.get('variant') ?? undefined,
  };
  const s = program.sessions[t.sessionId];
  const title = `${s?.short ?? s?.name ?? 'Session'} · ${dayLabel(t.day)}`;
  return <BriefPage target={t} title={title} onStart={() => navigate(sessionUrl(t), true)} onClose={back} />;
}
