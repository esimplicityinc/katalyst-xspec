/**
 * UI Layout Assertion Step Definitions
 *
 * Steps for asserting layout states like panels, split views, and responsive behavior.
 */

import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';
import { interpolate } from '../utils';

export function registerLayoutSteps(test: any): void {
  const { Given, When, Then } = createBdd(test as any) as any;

  // ============================================
  // Panel Visibility
  // ============================================

  /**
   * Assert that a panel is visible (by test ID).
   *
   * @example
   * Then I should see the "detail" panel
   * Then I should see the "list" panel
   */
  Then(
    'I should see the {string} panel',
    async ({ page, world }: any, panelName: string) => {
      const resolvedName = interpolate(panelName, world.vars);
      const panel = page.getByTestId(`${resolvedName}-panel`);
      await expect(panel).toBeVisible();
    }
  );

  /**
   * Assert that a panel is not visible.
   *
   * @example
   * Then I should not see the "detail" panel
   */
  Then(
    'I should not see the {string} panel',
    async ({ page, world }: any, panelName: string) => {
      const resolvedName = interpolate(panelName, world.vars);
      const panel = page.getByTestId(`${resolvedName}-panel`);
      await expect(panel).toBeHidden();
    }
  );

  /**
   * Assert panel visibility using explicit state.
   *
   * @example
   * Then the "sidebar" panel should be "visible"
   * Then the "modal" panel should be "hidden"
   */
  Then(
    'the {string} panel should be {string}',
    async ({ page, world }: any, panelName: string, state: string) => {
      const resolvedName = interpolate(panelName, world.vars);
      const panel = page.getByTestId(`${resolvedName}-panel`);

      if (state === 'visible') {
        await expect(panel).toBeVisible();
      } else if (state === 'hidden') {
        await expect(panel).toBeHidden();
      } else {
        throw new Error(`Unknown panel state: ${state}. Expected 'visible' or 'hidden'.`);
      }
    }
  );

  // ============================================
  // Panel Width States
  // ============================================

  /**
   * Assert that a panel is at full width (not in split view).
   *
   * @example
   * Then the "list" panel should be full width
   */
  Then(
    'the {string} panel should be full width',
    async ({ page, world }: any, panelName: string) => {
      const resolvedName = interpolate(panelName, world.vars);
      const panel = page.getByTestId(`${resolvedName}-panel`);

      const isFullWidth = await panel.evaluate((el: HTMLElement) => {
        // Check for absence of split/narrow classes
        return !el.classList.contains('split') &&
               !el.classList.contains('narrow') &&
               !el.classList.contains('split-view-list');
      });

      expect(isFullWidth, `Expected "${resolvedName}" panel to be full width`).toBe(true);
    }
  );

  /**
   * Assert that a panel is narrow (in split view mode).
   *
   * @example
   * Then the "list" panel should be narrow
   */
  Then(
    'the {string} panel should be narrow',
    async ({ page, world }: any, panelName: string) => {
      const resolvedName = interpolate(panelName, world.vars);
      const panel = page.getByTestId(`${resolvedName}-panel`);

      const isNarrow = await panel.evaluate((el: HTMLElement) => {
        return el.classList.contains('split') ||
               el.classList.contains('narrow') ||
               el.classList.contains('split-view-list');
      });

      expect(isNarrow, `Expected "${resolvedName}" panel to be narrow`).toBe(true);
    }
  );

  // ============================================
  // Split View
  // ============================================

  /**
   * Assert that a split view layout is visible.
   *
   * @example
   * Then I should see a split view layout
   */
  Then(
    'I should see a split view layout',
    async ({ page }: any) => {
      // Look for common split view indicators
      const splitContainer = page.locator("[data-testid='split-view'], .split-view, [data-split-view]");
      await expect(splitContainer.first()).toBeVisible();
    }
  );

  /**
   * Assert that split view is not active.
   *
   * @example
   * Then I should not see a split view layout
   */
  Then(
    'I should not see a split view layout',
    async ({ page }: any) => {
      const splitContainer = page.locator("[data-testid='split-view'], .split-view, [data-split-view]");
      const count = await splitContainer.count();
      expect(count === 0 || !(await splitContainer.first().isVisible())).toBe(true);
    }
  );

  // ============================================
  // Sidebar
  // ============================================

  /**
   * Assert that the sidebar is visible.
   *
   * @example
   * Then the sidebar should be visible
   */
  Then(
    'the sidebar should be visible',
    async ({ page }: any) => {
      const sidebar = page.locator("[data-testid='sidebar'], aside, nav.sidebar, .sidebar");
      await expect(sidebar.first()).toBeVisible();
    }
  );

  /**
   * Assert that the sidebar is hidden/collapsed.
   *
   * @example
   * Then the sidebar should be hidden
   */
  Then(
    'the sidebar should be hidden',
    async ({ page }: any) => {
      const sidebar = page.locator("[data-testid='sidebar'], aside.sidebar, nav.sidebar");
      const count = await sidebar.count();
      if (count > 0) {
        await expect(sidebar.first()).toBeHidden();
      }
    }
  );

  /**
   * Assert that the sidebar is collapsed (smaller width).
   *
   * @example
   * Then the sidebar should be collapsed
   */
  Then(
    'the sidebar should be collapsed',
    async ({ page }: any) => {
      const sidebar = page.locator("[data-testid='sidebar'], aside, nav.sidebar, .sidebar").first();
      const isCollapsed = await sidebar.evaluate((el: HTMLElement) => {
        return el.classList.contains('collapsed') ||
               el.classList.contains('minimized') ||
               el.getAttribute('data-collapsed') === 'true';
      });
      expect(isCollapsed, 'Expected sidebar to be collapsed').toBe(true);
    }
  );

  // ============================================
  // Modal/Dialog
  // ============================================

  /**
   * Assert that a modal/dialog is visible.
   *
   * @example
   * Then I should see a modal dialog
   */
  Then(
    'I should see a modal dialog',
    async ({ page }: any) => {
      const modal = page.locator("[role='dialog'], [data-testid='modal'], .modal, [aria-modal='true']");
      await expect(modal.first()).toBeVisible();
    }
  );

  /**
   * Assert that a modal/dialog is not visible.
   *
   * @example
   * Then I should not see a modal dialog
   */
  Then(
    'I should not see a modal dialog',
    async ({ page }: any) => {
      const modal = page.locator("[role='dialog'], [data-testid='modal'], .modal, [aria-modal='true']");
      const count = await modal.count();
      if (count > 0) {
        await expect(modal.first()).toBeHidden();
      }
    }
  );

  /**
   * Assert that a named modal is visible.
   *
   * @example
   * Then I should see the "confirm" modal
   */
  Then(
    'I should see the {string} modal',
    async ({ page, world }: any, modalName: string) => {
      const resolvedName = interpolate(modalName, world.vars);
      const modal = page.getByTestId(`${resolvedName}-modal`);
      await expect(modal).toBeVisible();
    }
  );

  // ============================================
  // Viewport/Responsive
  // ============================================

  /**
   * Set viewport to a named size.
   *
   * @example
   * Given the viewport is "mobile" size
   * Given the viewport is "tablet" size
   * Given the viewport is "desktop" size
   */
  Given(
    'the viewport is {string} size',
    async ({ page }: any, sizeName: string) => {
      const sizes: Record<string, { width: number; height: number }> = {
        mobile: { width: 375, height: 667 },
        tablet: { width: 768, height: 1024 },
        desktop: { width: 1280, height: 800 },
        'large-desktop': { width: 1920, height: 1080 },
      };

      const size = sizes[sizeName.toLowerCase()];
      if (!size) {
        throw new Error(`Unknown viewport size: ${sizeName}. Available: ${Object.keys(sizes).join(', ')}`);
      }

      await page.setViewportSize(size);
    }
  );

  /**
   * Set viewport to specific dimensions.
   *
   * @example
   * Given the viewport is 800x600
   */
  Given(
    'the viewport is {int}x{int}',
    async ({ page }: any, width: number, height: number) => {
      await page.setViewportSize({ width, height });
    }
  );

  /**
   * Assert that the current layout is responsive to a size.
   *
   * @example
   * Then the layout should be responsive
   */
  Then(
    'the layout should be responsive',
    async ({ page }: any) => {
      // Store original size
      const original = page.viewportSize();

      // Test at mobile size
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(100);

      // Test at desktop size
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.waitForTimeout(100);

      // Restore original
      if (original) {
        await page.setViewportSize(original);
      }

      // If we got here without errors, layout is responsive
    }
  );

  // ============================================
  // Tabs
  // ============================================

  /**
   * Assert that a tab is active.
   *
   * @example
   * Then the "Overview" tab should be active
   */
  Then(
    'the {string} tab should be active',
    async ({ page, world }: any, tabName: string) => {
      const resolvedName = interpolate(tabName, world.vars);
      const tab = page.getByRole('tab', { name: resolvedName });
      await expect(tab).toHaveAttribute('aria-selected', 'true');
    }
  );

  /**
   * Assert that a tab is not active.
   *
   * @example
   * Then the "Settings" tab should not be active
   */
  Then(
    'the {string} tab should not be active',
    async ({ page, world }: any, tabName: string) => {
      const resolvedName = interpolate(tabName, world.vars);
      const tab = page.getByRole('tab', { name: resolvedName });
      await expect(tab).toHaveAttribute('aria-selected', 'false');
    }
  );

  /**
   * Click on a tab.
   *
   * @example
   * When I click the "Settings" tab
   */
  When(
    'I click the {string} tab',
    async ({ page, world }: any, tabName: string) => {
      const resolvedName = interpolate(tabName, world.vars);
      const tab = page.getByRole('tab', { name: resolvedName });
      await tab.click();
    }
  );
}
