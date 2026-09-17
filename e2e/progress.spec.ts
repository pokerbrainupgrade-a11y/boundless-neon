import { test, expect } from '@playwright/test';
import { setup } from './helpers';
import { demoExport } from './fixtures';

const CHARTS = ['tabata-total', 'tabata-rounds', 'superslow-seconds', 'superslow-load', 'vo2-hr', 'sauna', 'stamina', 'cold', 'vitals'];

test('seeded data renders every chart in W1/W2 and Season modes', async ({ page }) => {
  await setup(page, { prenatalMode: false });
  await page.evaluate(async (data) => {
    const h = (window as unknown as { __bneon: { applyImport: (d: unknown, m: string) => Promise<void>; reloadBlocks: () => Promise<void>; reloadLogs: () => Promise<void> } }).__bneon;
    await h.applyImport(data, 'replace');
    await h.reloadBlocks();
    await h.reloadLogs();
  }, demoExport());
  await page.goto('/boundless-neon/#/progress');
  await expect(page.getByTestId('progress')).toHaveAttribute('data-mode', 'weeks');
  // default block is the latest (Season 02) which only has tabata + super-slow; pick Season 01 for all charts
  await page.getByRole('button', { name: 'Season 01' }).click();
  for (const id of CHARTS) {
    const c = page.getByTestId(`chart-${id}`);
    await expect(c).toBeVisible();
    await expect(c, id).toHaveAttribute('data-empty', 'false');
    expect(await c.locator('svg rect, svg polyline').count(), id).toBeGreaterThan(0);
  }
  await expect(page.getByTestId('chart-tabata-total')).toContainText('Week 1');
  await expect(page.getByTestId('chart-tabata-total')).toContainText('Week 2');
  await page.getByTestId('mode-blocks').click();
  await expect(page.getByTestId('progress')).toHaveAttribute('data-mode', 'blocks');
  for (const id of CHARTS) {
    const c = page.getByTestId(`chart-${id}`);
    await expect(c, id).toHaveAttribute('data-empty', 'false');
  }
  await expect(page.getByTestId('chart-tabata-total')).toContainText('Season 01');
  await expect(page.getByTestId('chart-tabata-total')).toContainText('Season 02');
  await page.screenshot({ path: 'test-results/progress.png', fullPage: true });
});

test('journal lists seeded sessions and edits one', async ({ page }) => {
  await setup(page, { prenatalMode: false });
  await page.evaluate(async (data) => {
    const h = (window as unknown as { __bneon: { applyImport: (d: unknown, m: string) => Promise<void>; reloadBlocks: () => Promise<void>; reloadLogs: () => Promise<void> } }).__bneon;
    await h.applyImport(data, 'replace');
    await h.reloadBlocks();
    await h.reloadLogs();
  }, demoExport());
  await page.goto('/boundless-neon/#/journal');
  await page.getByRole('button', { name: 'All' }).click();
  expect(await page.getByTestId('journal-entry').count()).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Edit' }).first().click();
  await expect(page.getByTestId('log-form')).toBeVisible();
  await page.getByRole('radio', { name: '8' }).click();
  await page.getByTestId('save-log').click();
  await expect(page).toHaveURL(/#\/journal$/);
  await expect(page.getByTestId('journal-entry').first()).toContainText('RPE 8');
});
