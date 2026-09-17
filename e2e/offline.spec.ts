import { test, expect } from '@playwright/test';
import { setup } from './helpers';

test('installs the service worker, then works offline on every screen and a timer', async ({ page, context }) => {
  await setup(page, { prenatalMode: false, clearanceDate: null }, '2026-09-21', '2026-09-23T20:00:00Z');
  await page.goto('/boundless-neon/#/today');
  // wait for the SW to be active and the precache to be populated
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg?.active;
  }, undefined, { timeout: 30_000 });
  await page.waitForFunction(async () => (await caches.keys()).length > 0, undefined, { timeout: 30_000 });
  await page.waitForTimeout(1000);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByTestId('today')).toBeVisible({ timeout: 15_000 });
  for (const tab of ['schedule', 'moves', 'journal', 'progress', 'settings']) {
    await page.goto(`/boundless-neon/#/${tab}`);
    await expect(page.locator('main')).toBeVisible();
  }
  await page.goto('/boundless-neon/#/moves/A');
  await expect(page.getByTestId('session-detail')).toBeVisible();
  // a timer runs offline
  await page.goto('/boundless-neon/#/session/coldShower?day=1&slot=am');
  await page.getByTestId('start').click();
  await expect(page.getByTestId('timer')).toHaveAttribute('data-status', 'running');
  await page.getByTestId('skip').click();
  await expect(page.getByTestId('timer')).toHaveAttribute('data-index', '1');
  // fonts came from the cache, not the network
  const fontOk = await page.evaluate(() => document.fonts.check('16px Bungee') && document.fonts.check('700 16px Orbitron'));
  expect(fontOk).toBe(true);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto('/boundless-neon/#/dev/poses');
  await expect(page.getByTestId('pose-sheet')).toBeVisible();
  expect(errors).toEqual([]);
  await context.setOffline(false);
});

test('manifest and apple meta tags are present', async ({ page, request }) => {
  const m = await (await request.get('/boundless-neon/manifest.webmanifest')).json();
  expect(m.display).toBe('standalone');
  expect(m.icons.some((i: { purpose?: string }) => i.purpose === 'maskable')).toBe(true);
  await page.goto('/boundless-neon/');
  await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute('content', 'yes');
  await expect(page.locator('meta[name="apple-mobile-web-app-status-bar-style"]')).toHaveCount(1);
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveCount(1);
  const icon = await request.get('/boundless-neon/icons/apple-touch-icon.png');
  expect(icon.status()).toBe(200);
});
