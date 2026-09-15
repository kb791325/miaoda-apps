import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsUser } from './helpers/auth';

test.describe('Smoke Tests', () => {
  test.describe('Navigation', () => {
    test('should load dashboard page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/');
      await expect(page).toHaveTitle(/./);
    });

    test('should navigate to expenses page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/expenses');
      await expect(
        page.locator('h1, h2, [data-testid="page-title"]').first(),
      ).toBeVisible();
    });

    test('should navigate to fixed-assets page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/fixed-assets');
      await expect(
        page.locator('h1, h2, [data-testid="page-title"]').first(),
      ).toBeVisible();
    });

    test('should navigate to inventory page', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/inventory');
      await expect(
        page.locator('h1, h2, [data-testid="page-title"]').first(),
      ).toBeVisible();
    });
  });

  test.describe('Authorization', () => {
    test('should redirect to login when not authenticated', async ({
      page,
    }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/login|auth/);
    });

    test('should allow admin to access all pages', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/expenses');
      await expect(page).not.toHaveURL(/login|auth/);
    });
  });

  test.describe('API Health', () => {
    test('should respond to API health check', async ({ request }) => {
      const response = await request.get('/api/health');
      expect(response.status()).toBeLessThan(500);
    });
  });
});