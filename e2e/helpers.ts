import type { Page } from '@playwright/test';

export interface TestSettings {
  prenatalMode?: boolean;
  dueDate?: string | null;
  clearanceDate?: string | null;
  age?: number | null;
  leadInSec?: number;
  firstLaunchDone?: boolean;
  sound?: boolean;
  flash?: boolean;
}

/** Load the app, apply settings through the debug hook, and start a block if asked. */
export async function setup(page: Page, s: TestSettings = {}, startDate?: string, time?: Date | string) {
  if (time) await page.clock.install({ time: typeof time === 'string' ? new Date(time) : time });
  await page.goto('/boundless-neon/#/settings');
  await page.waitForFunction(() => !!(window as unknown as { __bneon?: unknown }).__bneon);
  await page.evaluate(async ({ s, startDate }) => {
    const h = (window as unknown as { __bneon: { updateSettings: (p: object) => Promise<void>; startBlock: (d: string) => Promise<unknown>; db: { blocks: { count(): Promise<number> } } } }).__bneon;
    await h.updateSettings({ firstLaunchDone: true, silentSwitchWarned: true, sound: false, flash: false, ...s });
    if (startDate && (await h.db.blocks.count()) === 0) await h.startBlock(startDate);
  }, { s, startDate });
}

export async function wipe(page: Page) {
  await page.goto('/boundless-neon/#/settings');
  await page.waitForFunction(() => !!(window as unknown as { __bneon?: unknown }).__bneon);
  await page.evaluate(async () => {
    const h = (window as unknown as { __bneon: { db: { delete(): Promise<void> } } }).__bneon;
    await h.db.delete();
  });
  await page.reload();
}
