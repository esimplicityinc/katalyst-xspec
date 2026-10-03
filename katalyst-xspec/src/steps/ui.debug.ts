/**
 * UI Debug Step Definitions
 *
 * Steps for debugging and troubleshooting UI tests.
 */

import { createBdd } from 'playwright-bdd';
import { interpolate } from '../utils';

export function registerDebugSteps(test: any): void {
  const { When, Then } = createBdd(test as any) as any;

  /**
   * Capture the current page HTML content and store in a variable.
   *
   * @example
   * When I capture the page HTML as "pageContent"
   */
  When(
    'I capture the page HTML as {string}',
    async ({ page, world }: any, varName: string) => {
      const content = await page.content();
      world.vars[varName] = content;
    }
  );

  /**
   * Log the current URL to console for debugging.
   *
   * @example
   * Then I log the current URL
   */
  Then(
    'I log the current URL',
    async ({ page }: any) => {
      console.log(`[DEBUG] Current URL: ${page.url()}`);
    }
  );

  /**
   * Log the page title to console for debugging.
   *
   * @example
   * Then I log the page title
   */
  Then(
    'I log the page title',
    async ({ page }: any) => {
      const title = await page.title();
      console.log(`[DEBUG] Page title: ${title}`);
    }
  );

  /**
   * Save a screenshot with a custom filename.
   *
   * @example
   * When I save a screenshot as "login-page.png"
   */
  When(
    'I save a screenshot as {string}',
    async ({ page, world }: any, filename: string) => {
      const resolvedFilename = interpolate(filename, world.vars);
      await page.screenshot({ path: resolvedFilename });
      console.log(`[DEBUG] Screenshot saved: ${resolvedFilename}`);
    }
  );

  /**
   * Save a full-page screenshot with a custom filename.
   *
   * @example
   * When I save a full page screenshot as "full-page.png"
   */
  When(
    'I save a full page screenshot as {string}',
    async ({ page, world }: any, filename: string) => {
      const resolvedFilename = interpolate(filename, world.vars);
      await page.screenshot({ path: resolvedFilename, fullPage: true });
      console.log(`[DEBUG] Full page screenshot saved: ${resolvedFilename}`);
    }
  );

  /**
   * Pause execution for interactive debugging.
   * Opens Playwright Inspector.
   *
   * @example
   * When I pause for debugging
   */
  When(
    'I pause for debugging',
    async ({ page }: any) => {
      console.log('[DEBUG] Pausing for debugging. Press "Resume" in Playwright Inspector to continue.');
      await page.pause();
    }
  );

  /**
   * Print visible text content from the page body.
   *
   * @example
   * Then I print visible text
   */
  Then(
    'I print visible text',
    async ({ page }: any) => {
      const text = await page.innerText('body');
      const truncated = text.length > 2000 ? `${text.substring(0, 2000)}...(truncated)` : text;
      console.log(`[DEBUG] Visible text:\n${truncated}`);
    }
  );

  /**
   * Print the count of elements matching a selector.
   *
   * @example
   * Then I count elements matching "button"
   */
  Then(
    'I count elements matching {string}',
    async ({ page, world }: any, selector: string) => {
      const resolvedSelector = interpolate(selector, world.vars);
      const count = await page.locator(resolvedSelector).count();
      console.log(`[DEBUG] Found ${count} elements matching "${resolvedSelector}"`);
    }
  );

  /**
   * Print all console messages from the page.
   *
   * @example
   * Then I print browser console messages
   */
  Then(
    'I print browser console messages',
    async ({ page }: any) => {
      // Note: This captures messages going forward, not historical
      console.log('[DEBUG] Browser console messages will be captured from this point.');
      page.on('console', (msg: any) => {
        console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
      });
    }
  );

  /**
   * Store the current viewport size in variables.
   *
   * @example
   * When I capture viewport size
   */
  When(
    'I capture viewport size',
    async ({ page, world }: any) => {
      const viewport = page.viewportSize();
      if (viewport) {
        world.vars.viewportWidth = String(viewport.width);
        world.vars.viewportHeight = String(viewport.height);
        console.log(`[DEBUG] Viewport size: ${viewport.width}x${viewport.height}`);
      } else {
        console.log('[DEBUG] Viewport size not available');
      }
    }
  );

  /**
   * Log all cookies for debugging.
   *
   * @example
   * Then I log all cookies
   */
  Then(
    'I log all cookies',
    async ({ page }: any) => {
      const context = page.context();
      const cookies = await context.cookies();
      console.log(`[DEBUG] Cookies (${cookies.length}):`);
      for (const cookie of cookies) {
        console.log(`  - ${cookie.name}: ${cookie.value.substring(0, 50)}${cookie.value.length > 50 ? '...' : ''}`);
      }
    }
  );

  /**
   * Log localStorage contents for debugging.
   *
   * @example
   * Then I log localStorage
   */
  Then(
    'I log localStorage',
    async ({ page }: any) => {
      const storage = await page.evaluate(() => {
        const items: Record<string, string> = {};
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            items[key] = localStorage.getItem(key) || '';
          }
        }
        return items;
      });
      console.log('[DEBUG] localStorage:');
      for (const [key, value] of Object.entries(storage) as [string, string][]) {
        const truncated = value.length > 100 ? `${value.substring(0, 100)}...` : value;
        console.log(`  - ${key}: ${truncated}`);
      }
    }
  );

  /**
   * Highlight an element for visual debugging (adds red border).
   *
   * @example
   * When I highlight element "button.submit"
   */
  When(
    'I highlight element {string}',
    async ({ page, world }: any, selector: string) => {
      const resolvedSelector = interpolate(selector, world.vars);
      await page.evaluate((sel: string) => {
        const elements = document.querySelectorAll(sel);
        elements.forEach((el: Element) => {
          (el as HTMLElement).style.outline = '3px solid red';
          (el as HTMLElement).style.outlineOffset = '2px';
        });
      }, resolvedSelector);
      console.log(`[DEBUG] Highlighted ${await page.locator(resolvedSelector).count()} element(s) matching "${resolvedSelector}"`);
    }
  );
}
