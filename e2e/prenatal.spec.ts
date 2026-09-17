import { test, expect } from '@playwright/test';
import { setup } from './helpers';
import { addDays } from '../src/lib/time';

const due = '2027-05-15';
const at = (w: number, d: number) => addDays(due, -(280 - (w * 7 + d)));
const CONTRA = ['I', 'J', 'coldImmersion', 'G'];

test.describe('Prenatal Mode', () => {
  test('first-launch screen gates once, then the clearance date unlocks sessions', async ({ page }) => {
    await page.goto('/boundless-neon/#/today');
    await expect(page.getByTestId('first-launch')).toBeVisible();
    await expect(page.getByTestId('first-launch')).toContainText('Prenatal Mode is on');
    await page.getByTestId('later-btn').click();
    await expect(page.getByTestId('start-date-card')).toBeVisible();
    await page.getByTestId('start-block').click();
    await expect(page.getByTestId('today')).toBeVisible();
    // sessions are locked until the clearance date is set
    await page.getByTestId('card-main').getByTestId('start-session').first().click();
    await expect(page.getByTestId('clearance-lock')).toBeVisible();
    await page.getByRole('button', { name: 'Set my provider date' }).click();
    await page.getByTestId('clearance-date').fill('2026-09-20');
    await page.goto('/boundless-neon/#/today');
    await page.getByTestId('card-main').getByTestId('start-session').first().click();
    await expect(page.getByTestId('foundation-stepper')).toBeVisible();
    await expect(page.getByTestId('stop-if-chip')).toBeVisible();
    await page.getByTestId('stop-if-chip').click();
    await expect(page.getByTestId('stop-if-list')).toContainText('decreased fetal movement');
    await expect(page.getByTestId('stop-if-list')).toContainText('Stop and contact your provider.');
  });

  for (const tri of ['T1', 'T2'] as const) {
    test(`walk every day in ${tri}: no contraindicated session reachable from Today`, async ({ page }) => {
      const today = tri === 'T1' ? at(10, 0) : at(20, 0);
      await setup(page, { prenatalMode: true, dueDate: due, clearanceDate: '2026-09-01', age: 34 }, today, `${today}T20:00:00Z`);
      await page.goto('/boundless-neon/#/today');
      await expect(page.getByTestId('trimester-chip')).toContainText(tri);
      for (let d = 1; d <= 14; d++) {
        await page.clock.setSystemTime(new Date(`${addDays(today, d - 1)}T20:00:00Z`));
        await page.reload();
        await expect(page.getByTestId('day-chip')).toHaveText(`Day ${String(d).padStart(2, '0')}`);
        const rows = page.getByTestId('session-row');
        const n = await rows.count();
        for (let i = 0; i < n; i++) {
          const row = rows.nth(i);
          const ran = await row.getAttribute('data-ran');
          const removed = await row.getAttribute('data-removed');
          const original = await row.getAttribute('data-session');
          if (ran) expect(CONTRA, `day ${d} row ${original} runs ${ran}`).not.toContain(ran);
          if (CONTRA.includes(original!)) expect(removed === 'true' || (ran && !CONTRA.includes(ran)), `day ${d}: ${original} must be removed or replaced`).toBeTruthy();
          expect(await row.getAttribute('data-optional-off') === 'true' || !!ran || removed === 'true').toBe(true);
        }
        // direct navigation to a contraindicated session is refused
        if (d === 5) {
          await page.goto(`/boundless-neon/#/session/coldImmersion?day=${d}&slot=pm`);
          await expect(page.getByTestId('removed-notice')).toBeVisible();
          await page.goto('/boundless-neon/#/today');
        }
      }
    });
  }

  test('W1 D5 and W2 D7 in T2 show the overrides applied (walkthrough screenshot)', async ({ page }) => {
    const today = at(20, 0);
    await setup(page, { prenatalMode: true, dueDate: due, clearanceDate: '2026-09-01', age: 34, providerLimits: 'Keep it conversational. No lifting over 25 lb.' } as never, today, `${addDays(today, 4)}T20:00:00Z`);
    await page.goto('/boundless-neon/#/today');
    await expect(page.getByTestId('day-chip')).toHaveText('Day 05');
    await expect(page.getByTestId('trimester-chip')).toContainText('T2');
    const pm = page.getByTestId('card-pm').getByTestId('session-row').first();
    await expect(pm).toHaveAttribute('data-session', 'I');
    await expect(pm).toHaveAttribute('data-ran', 'coolStretch');
    await expect(page.getByTestId('provider-limits')).toBeVisible();
    await page.screenshot({ path: 'test-results/walk-w1d5.png', fullPage: true });
    await page.clock.setSystemTime(new Date(`${addDays(today, 13)}T20:00:00Z`));
    await page.reload();
    await expect(page.getByTestId('day-chip')).toHaveText('Day 14');
    const am = page.getByTestId('card-am').getByTestId('session-row').first();
    await expect(am).toHaveAttribute('data-session', 'L');
    await expect(page.getByTestId('card-pm').getByTestId('session-row').first()).toHaveAttribute('data-ran', 'lukewarmShower');
    await page.screenshot({ path: 'test-results/walk-w2d7.png', fullPage: true });
    // The stamina session in T2 is capped to 60 min and fueled
    await am.getByTestId('start-session').click();
    await expect(page.getByTestId('timer')).toHaveAttribute('data-total-ms', String(10_000 + 45 * 60_000));
    await expect(page.getByTestId('water-reminder')).toBeVisible();
  });

  test('T2 swaps foundation supine moves and 7-minute planks', async ({ page }) => {
    const today = at(20, 0);
    await setup(page, { prenatalMode: true, dueDate: due, clearanceDate: '2026-09-01' }, today, `${today}T20:00:00Z`);
    await page.goto('/boundless-neon/#/session/B?day=1&slot=main&variant=seqA');
    for (let i = 0; i < 9; i++) await page.getByTestId('rep-done').click(); // to exercise 4 (Internal Leg Tracing)
    await expect(page.getByTestId('foundation-stepper')).toHaveAttribute('data-index', '3');
    await expect(page.getByTestId('override-note')).toContainText('Side-lying or seated');
    await page.goto('/boundless-neon/#/session/C?day=9&slot=main');
    await page.getByTestId('start').click();
    await page.clock.runFor(10_000 + 7 * 40_000);
    await expect(page.getByTestId('seven-move')).toHaveAttribute('data-move', 'inclinePlank');
  });

  test('toggling the mode off restores the original program on Today', async ({ page }) => {
    await setup(page, { prenatalMode: true, dueDate: due, clearanceDate: '2026-09-01' }, '2026-09-21', '2026-09-25T20:00:00Z');
    await page.goto('/boundless-neon/#/today');
    await expect(page.getByTestId('card-pm').getByTestId('session-row').first()).toHaveAttribute('data-ran', 'coolStretch');
    await page.goto('/boundless-neon/#/settings');
    await page.getByTestId('prenatal-toggle').click();
    await page.goto('/boundless-neon/#/today');
    await expect(page.getByTestId('card-pm').getByTestId('session-row').first()).toHaveAttribute('data-ran', 'I');
    await expect(page.getByTestId('trimester-chip')).toHaveCount(0);
    await expect(page.getByTestId('card-am').getByTestId('session-row').first()).toContainText('Light Fasted Movement');
  });

  test('settings computes gestational week and trimester', async ({ page }) => {
    await setup(page, { prenatalMode: true, dueDate: due }, undefined, `${at(27, 6)}T20:00:00Z`);
    await page.goto('/boundless-neon/#/settings');
    await expect(page.getByTestId('computed-trimester')).toHaveText('T2 · 27w');
    await page.clock.setSystemTime(new Date(`${at(28, 0)}T20:00:00Z`));
    await page.reload();
    await expect(page.getByTestId('computed-trimester')).toHaveText('T3 · 28w');
  });
});
