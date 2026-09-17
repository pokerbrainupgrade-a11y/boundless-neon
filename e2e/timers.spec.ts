import { test, expect } from '@playwright/test';
import { setup } from './helpers';

const OFF = { prenatalMode: false, clearanceDate: null, age: 34, leadInSec: 10 };

interface Case { name: string; url: string; segments: number; totalMs: number; prenatal?: boolean }
const cases: Case[] = [
  { name: 'Tabata', url: '/boundless-neon/#/session/A?day=1&slot=main&variant=bike', segments: 17, totalMs: 250_000 },
  { name: '5x4 VO2 max', url: '/boundless-neon/#/session/H?day=13&slot=main', segments: 11, totalMs: 2_410_000 },
  { name: 'Sprints G1', url: '/boundless-neon/#/session/G?day=6&slot=main', segments: 9, totalMs: 1_090_000 },
  { name: '7-Minute (2 rounds)', url: '/boundless-neon/#/session/C?day=2&slot=main', segments: 48, totalMs: 960_000 },
  { name: 'Super-slow', url: '/boundless-neon/#/session/F?day=4&slot=main', segments: 8, totalMs: 280_000 },
  { name: 'Cold shower', url: '/boundless-neon/#/session/coldShower?day=1&slot=am', segments: 21, totalMs: 310_000 },
  { name: 'Cold immersion', url: '/boundless-neon/#/session/coldImmersion?day=6&slot=pm', segments: 2, totalMs: 190_000 },
  { name: 'Sauna', url: '/boundless-neon/#/session/I?day=5&slot=pm', segments: 2, totalMs: 1_210_000 },
  { name: 'Contrast', url: '/boundless-neon/#/session/J?day=7&slot=pm', segments: 5, totalMs: 1_810_000 },
  { name: 'Stamina', url: '/boundless-neon/#/session/L?day=14&slot=am', segments: 2, totalMs: 7_210_000 },
  { name: 'Fasted cardio', url: '/boundless-neon/#/session/fastedCardio?day=2&slot=am', segments: 2, totalMs: 1_210_000 },
  { name: 'Light movement', url: '/boundless-neon/#/session/lightMovement?day=1&slot=am', segments: 2, totalMs: 610_000 },
  { name: 'Post-meal walk', url: '/boundless-neon/#/session/postMealWalk?day=1&slot=habit', segments: 2, totalMs: 910_000 },
  { name: 'Hypoxic swim', url: '/boundless-neon/#/session/D?day=2&slot=main', segments: 20, totalMs: 100_000 },
  { name: 'Yoga', url: '/boundless-neon/#/session/K?day=7&slot=main', segments: 2, totalMs: 2_710_000 },
];

test.describe('timer presets (mocked clock)', () => {
  test.beforeEach(async ({ page }) => {
    await setup(page, OFF, '2026-09-21');
  });

  for (const c of cases) {
    test(`${c.name}: ${c.segments} segments, ${c.totalMs / 1000}s`, async ({ page }) => {
      await page.clock.install({ time: new Date('2026-09-21T14:00:00-07:00') });
      await page.goto(c.url);
      const timer = page.getByTestId('timer');
      await expect(timer).toBeVisible();
      await expect(timer).toHaveAttribute('data-segments', String(c.segments));
      await expect(timer).toHaveAttribute('data-total-ms', String(c.totalMs));
    });
  }

  test('Tabata runs to completion under a mocked clock and logs per-round reps', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-21T14:00:00-07:00') });
    await page.goto('/boundless-neon/#/session/A?day=1&slot=main&variant=bike');
    const timer = page.getByTestId('timer');
    await page.getByTestId('start').click();
    await expect(timer).toHaveAttribute('data-status', 'running');
    await expect(page.getByTestId('state-label')).toHaveText('GET READY');
    await page.clock.runFor(10_000);
    await expect(page.getByTestId('state-label')).toHaveText('GO GO GO');
    await expect(timer).toHaveAttribute('data-index', '1');
    await page.clock.runFor(20_000);
    await expect(page.getByTestId('state-label')).toHaveText('BREATHE');
    // per-round log during the 10 s rest
    await page.getByTestId('round-log').getByText('+10').click();
    await page.getByTestId('round-log').getByLabel('plus one').click();
    await expect(page.getByTestId('round-val')).toHaveText('11');
    // pause holds time
    await page.getByTestId('pause').click();
    await expect(timer).toHaveAttribute('data-status', 'paused');
    await page.clock.runFor(30_000);
    await expect(timer).toHaveAttribute('data-index', '2');
    await page.getByTestId('pause').click();
    await page.clock.runFor(250_000);
    await expect(timer).toHaveAttribute('data-status', 'done');
    await expect(page.getByText('YOU CRUSHED IT')).toBeVisible();
    await page.getByTestId('log-it').click();
    await expect(page.getByTestId('log-form')).toBeVisible();
    await expect(page.locator('[data-testid="log-form"] input[type=number]').first()).toHaveValue('11');
    await page.getByRole('radio', { name: '7' }).click();
    await page.getByTestId('save-log').click();
    await expect(page).toHaveURL(/#\/today/);
    const count = await page.evaluate(() => (window as unknown as { __bneon: { db: { logs: { count(): Promise<number> } } } }).__bneon.db.logs.count());
    expect(count).toBe(1);
  });

  test('Super-slow FAILURE button ends the open lift and records seconds', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-24T14:00:00-07:00') });
    await page.goto('/boundless-neon/#/session/F?day=4&slot=main');
    await page.getByTestId('start').click();
    await page.clock.runFor(10_000);
    await expect(page.getByTestId('lift-card')).toBeVisible();
    await page.clock.runFor(112_000);
    await expect(page.getByTestId('metronome')).toHaveAttribute('data-rep', '3');
    await page.getByTestId('skip').click(); // FAILURE
    await expect(page.getByTestId('lift-rest')).toBeVisible();
    await expect(page.getByTestId('lift-rest')).toContainText('112 s');
    await expect(page.getByTestId('lift-rest')).toContainText('in range');
  });

  test('7-Minute shows the current move drawing and the next preview', async ({ page }) => {
    await page.clock.install({ time: new Date('2026-09-22T14:00:00-07:00') });
    await page.goto('/boundless-neon/#/session/C?day=2&slot=main');
    await page.getByTestId('start').click();
    await page.clock.runFor(10_000);
    await expect(page.getByTestId('seven-move')).toHaveAttribute('data-move', 'jumpingJacks');
    await expect(page.getByTestId('seven-move')).toContainText('next: Wall sit');
    await page.clock.runFor(30_000);
    await expect(page.getByTestId('seven-move')).toHaveAttribute('data-move', 'wallSit');
  });

  test('Steppers: foundation, mobility, decompression reach the log form', async ({ page }) => {
    await page.goto('/boundless-neon/#/session/B?day=1&slot=main&variant=seqA');
    const f = page.getByTestId('foundation-stepper');
    await expect(f).toBeVisible();
    for (let i = 0; i < 3; i++) await page.getByTestId('rep-done').click();
    await expect(f).toHaveAttribute('data-index', '1');
    await page.goto('/boundless-neon/#/session/E?day=3&slot=main');
    await expect(page.getByTestId('mobility-stepper')).toBeVisible();
    await page.getByLabel('plus one pass').click();
    await expect(page.getByTestId('passes')).toHaveText('1');
    await page.getByTestId('station-done').click();
    await expect(page.getByTestId('mobility-stepper')).toHaveAttribute('data-index', '1');
    await page.goto('/boundless-neon/#/session/decompression?day=1&slot=habit');
    await page.getByTestId('start').click();
    await page.getByTestId('rep-done').click();
    await page.getByTestId('rep-done').click();
    await page.getByTestId('rep-done').click();
    await expect(page.getByTestId('log-form')).toBeVisible();
  });
});
