import { test, expect } from '@playwright/test';
import { setup } from './helpers';

test('Light mode switches the whole app and persists across reloads', async ({ page }) => {
  await setup(page, { prenatalMode: false }, '2026-09-21', '2026-09-23T20:00:00Z');
  await page.goto('/boundless-neon/#/settings');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await page.getByTestId('theme-light').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  expect(lightBg).not.toBe(darkBg);
  expect(lightBg).toBe('rgb(247, 243, 255)');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#F7F3FF');
  // every screen picks up the light tokens
  for (const path of ['today', 'schedule', 'moves', 'journal', 'progress', 'brief/A?day=1&slot=main', 'session/A?day=1&slot=main']) {
    await page.goto(`/boundless-neon/#/${path}`);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), path).toBe('rgb(247, 243, 255)');
    expect(await page.evaluate(() => getComputedStyle(document.body).color), path).toBe('rgb(27, 16, 48)');
  }
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.screenshot({ path: 'test-results/light-session.png', fullPage: false });
  await page.goto('/boundless-neon/#/settings');
  await page.getByTestId('theme-dark').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(darkBg);
});

test('Auto follows the system color scheme', async ({ page }) => {
  await setup(page, { prenatalMode: false });
  await page.goto('/boundless-neon/#/settings');
  await page.getByTestId('theme-system').click();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(247, 243, 255)');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(20, 10, 38)');
});
