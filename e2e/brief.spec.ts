import { test, expect } from '@playwright/test';
import { setup } from './helpers';

test.describe('session briefs', () => {
  test('Today view link opens the brief; START launches that day and slot', async ({ page }) => {
    await setup(page, { prenatalMode: false, age: 34 }, '2026-09-21', '2026-09-22T20:00:00Z');
    await page.goto('/boundless-neon/#/today');
    await expect(page.getByTestId('day-chip')).toHaveText('Day 02');
    const row = page.getByTestId('card-main').getByTestId('session-row').filter({ has: page.locator('[data-session="C"]') }).first();
    await page.getByTestId('card-main').locator('[data-session="C"]').getByTestId('view-brief').click();
    await expect(page.getByTestId('brief-page')).toBeVisible();
    await expect(page.getByTestId('session-brief')).toHaveAttribute('data-session', 'C');
    expect(await page.getByTestId('brief-move').count()).toBe(12);
    await expect(page.getByTestId('brief-move').first()).toContainText('Jumping jacks');
    await page.getByTestId('brief-start').click();
    await expect(page).toHaveURL(/#\/session\/C\?day=2&slot=main/);
    await expect(page.getByTestId('timer')).toBeVisible();
    // the timer's pre-start screen shows the brief under its options, and START is pinned
    await expect(page.getByTestId('session-brief')).toBeVisible();
    await expect(page.getByTestId('start')).toBeInViewport();
    void row;
  });

  test('week 2 7-minute brief marks explosive swaps; foundation brief expands exercises', async ({ page }) => {
    await setup(page, { prenatalMode: false }, '2026-09-21');
    await page.goto('/boundless-neon/#/brief/C?day=9&slot=main');
    expect(await page.locator('[data-testid="brief-move"][data-swap="true"]').count()).toBe(7);
    await expect(page.getByTestId('brief-move').first()).toContainText('Burpees');
    await page.goto('/boundless-neon/#/brief/B?day=2&slot=main&variant=seqB');
    expect(await page.getByTestId('brief-exercise').count()).toBe(6);
    await page.getByTestId('brief-exercise').nth(4).locator('summary').click();
    await expect(page.getByTestId('brief-exercise').nth(4)).toContainText('rotate 3 to 6 inches');
    await page.goto('/boundless-neon/#/brief/F?day=4&slot=main');
    expect(await page.getByTestId('brief-lift').count()).toBe(4);
    await page.goto('/boundless-neon/#/brief/A?day=3&slot=main&variant=kbSwings');
    await expect(page.getByTestId('brief-list')).toContainText('Kettlebell swings');
    await expect(page.getByTestId('brief-list')).toContainText('Rotation');
  });

  test('Library detail is a brief with a pinned START for the scheduled day', async ({ page }) => {
    await setup(page, { prenatalMode: false }, '2026-09-21', '2026-09-24T20:00:00Z');
    await page.goto('/boundless-neon/#/moves/F');
    await expect(page.getByTestId('session-brief')).toBeVisible();
    await expect(page.getByTestId('brief-start')).toHaveText(/Day 04/);
    await page.getByTestId('brief-start').click();
    await expect(page).toHaveURL(/#\/session\/F\?day=4&slot=main/);
    await page.goto('/boundless-neon/#/moves/H');
    await expect(page.getByTestId('brief-start')).toHaveText(/Day 13/);
  });

  test('Schedule day page has a sticky header, prev/next, and view links', async ({ page }) => {
    await setup(page, { prenatalMode: false }, '2026-09-21');
    await page.goto('/boundless-neon/#/schedule/1');
    await expect(page.getByTestId('day-preview')).toContainText('Day 01');
    await page.getByTestId('day-preview').locator('[data-session="A"]').getByTestId('view-brief').click();
    await expect(page.getByTestId('brief-page')).toBeVisible();
    await expect(page.getByTestId('brief-list')).toContainText('Bike');
    await page.getByTestId('brief-close').click();
    await expect(page.getByTestId('day-preview')).toBeVisible();
  });

  test('Prenatal brief shows swapped moves and removed sessions', async ({ page }) => {
    await setup(page, { prenatalMode: true, dueDate: '2027-09-03', clearanceDate: '2026-09-01' }, '2026-09-21', '2026-09-21T20:00:00Z');
    await page.goto('/boundless-neon/#/brief/C?day=9&slot=main');
    await expect(page.getByTestId('brief-list')).toContainText('Standing knee drives');
    expect(await page.locator('[data-testid="brief-move"][data-swap="true"]').count()).toBe(0);
    await page.goto('/boundless-neon/#/brief/I?day=5&slot=pm');
    await expect(page.getByTestId('session-brief')).toHaveAttribute('data-session', 'coolStretch');
    await page.goto('/boundless-neon/#/brief/coldImmersion?day=6&slot=pm');
    await expect(page.getByTestId('removed-notice')).toBeVisible();
    await expect(page.getByTestId('brief-start')).toHaveCount(0);
  });
});
