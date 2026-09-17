/** Original Memphis-style decorations: squiggle, zigzag, triangle, dots. */
export function Squiggle({ color = 'var(--pink)', class: cls = '' }: { color?: string; class?: string }) {
  return (
    <svg class={`memphis ${cls}`} width="56" height="16" viewBox="0 0 56 16" aria-hidden="true">
      <path d="M2 8c4-8 8-8 12 0s8 8 12 0 8-8 12 0 8 8 12 0" fill="none" stroke={color} stroke-width="2.5" stroke-linecap="round" />
    </svg>
  );
}
export function Zigzag({ color = 'var(--cyan)', class: cls = '' }: { color?: string; class?: string }) {
  return (
    <svg class={`memphis ${cls}`} width="56" height="16" viewBox="0 0 56 16" aria-hidden="true">
      <path d="M2 13l8-10 8 10 8-10 8 10 8-10 8 10" fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" />
    </svg>
  );
}
export function Triangle({ color = 'var(--yellow)', class: cls = '' }: { color?: string; class?: string }) {
  return (
    <svg class={`memphis ${cls}`} width="22" height="20" viewBox="0 0 22 20" aria-hidden="true">
      <path d="M11 2l9 16H2z" fill="none" stroke={color} stroke-width="2.5" stroke-linejoin="round" />
    </svg>
  );
}
export function Dots({ color = 'var(--lime)', class: cls = '' }: { color?: string; class?: string }) {
  return (
    <svg class={`memphis ${cls}`} width="40" height="14" viewBox="0 0 40 14" aria-hidden="true">
      <circle cx="6" cy="7" r="3" fill={color} />
      <circle cx="20" cy="7" r="3" fill={color} />
      <circle cx="34" cy="7" r="3" fill={color} />
    </svg>
  );
}
