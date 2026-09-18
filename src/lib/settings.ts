import { signal, effect } from '@preact/signals';
import { z } from 'zod';
import { db } from './db';

export const SettingsSchema = z.object({
  displayName: z.string().default(''),
  prenatalMode: z.boolean().default(true),
  dueDate: z.string().nullable().default(null),
  clearanceDate: z.string().nullable().default(null),
  providerLimits: z.string().default(''),
  age: z.number().nullable().default(null),
  sound: z.boolean().default(true),
  flash: z.boolean().default(true),
  volume: z.number().min(0).max(1).default(0.8),
  leadInSec: z.number().int().min(0).max(60).default(10),
  repLengthSec: z.number().int().min(30).max(60).default(40),
  silentSwitchWarned: z.boolean().default(false),
  firstLaunchDone: z.boolean().default(false),
  lastExportAt: z.string().nullable().default(null),
  bellyCurve: z.boolean().default(true),
  /** Prenatal cool shower opted in (off by default). */
  prenatalCoolShower: z.boolean().default(false),
  /** Appearance: dark (default), light, or follow the system. */
  theme: z.enum(['dark', 'light', 'system']).default('dark'),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = SettingsSchema.parse({});
export const settings = signal<Settings>(DEFAULT_SETTINGS);
export const settingsLoaded = signal(false);

const KEY = 'settings';

export async function loadSettings(): Promise<Settings> {
  try {
    const row = await db.kv.get(KEY);
    const parsed = SettingsSchema.safeParse(row?.value ?? {});
    settings.value = parsed.success ? parsed.data : DEFAULT_SETTINGS;
  } catch {
    settings.value = DEFAULT_SETTINGS;
  }
  settingsLoaded.value = true;
  return settings.value;
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  settings.value = { ...settings.value, ...patch };
  await db.kv.put({ key: KEY, value: settings.value });
}

/** Persist any change that came through updateSettings; also expose for tests. */
export function applySettings(next: Settings): void {
  settings.value = next;
}

export function hrMax(age: number | null): number | null {
  if (!age || age < 5) return null;
  return Math.round(208 - 0.7 * age);
}

// keep audio module in sync
effect(() => {
  const s = settings.value;
  void import('./audio').then((a) => a.setAudio({ volume: s.volume, enabled: s.sound }));
});

// Apply the theme to <html> so every token switches; keep the browser chrome in step.
const THEME_COLORS = { dark: '#140A26', light: '#F7F3FF' } as const;
export function applyTheme(theme: Settings['theme']): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', theme);
  const light = theme === 'light' || (theme === 'system' && typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? THEME_COLORS.light : THEME_COLORS.dark);
  document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]')?.setAttribute('content', light ? 'default' : 'black-translucent');
}
effect(() => applyTheme(settings.value.theme));
if (typeof matchMedia !== 'undefined') {
  matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => applyTheme(settings.value.theme));
}
