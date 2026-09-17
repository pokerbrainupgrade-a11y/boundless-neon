import { test, expect } from '@playwright/test';

const tabs = ['today', 'schedule', 'moves', 'journal', 'progress', 'settings'];

test.describe('smoke', () => {
  for (const tab of tabs) {
    test(`loads #/${tab} at the base path`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(`/boundless-neon/#/${tab}`);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('nav.tabbar')).toBeVisible();
      expect(errors).toEqual([]);
    });
  }

  test('manifest is served with the right scope', async ({ request }) => {
    const res = await request.get('/boundless-neon/manifest.webmanifest');
    expect(res.status()).toBe(200);
    const m = await res.json();
    expect(m.scope).toBe('/boundless-neon/');
    expect(m.start_url.startsWith('/boundless-neon/')).toBe(true);
  });
});
