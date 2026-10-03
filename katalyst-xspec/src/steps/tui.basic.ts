/**
 * TUI Basic Step Definitions
 *
 * Basic step definitions for terminal user interface testing.
 * Aligned with ui.basic.ts patterns for consistency.
 */

import { createBdd } from 'playwright-bdd';
import { interpolate } from '../utils';

export function registerTuiBasicSteps(test: any): void {
  const { Given, When, Then } = createBdd(test as any) as any;

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle Steps
  // ═══════════════════════════════════════════════════════════════════════════

  Given('I start the TUI application', async ({ tui }: any) => {
    await tui.start();
    await tui.waitForReady();
  });

  Given('the TUI application is running', async ({ tui }: any) => {
    if (!tui.isRunning()) {
      await tui.start();
      await tui.waitForReady();
    }
  });

  When('I restart the TUI application', async ({ tui }: any) => {
    await tui.restart();
    await tui.waitForReady();
  });

  When('I stop the TUI application', async ({ tui }: any) => {
    await tui.stop();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Input Steps (aligned with ui.basic.ts patterns)
  // ═══════════════════════════════════════════════════════════════════════════

  When('I type {string}', async ({ tui, world }: any, text: string) => {
    await tui.typeText(interpolate(text, world.vars));
  });

  When('I type {string} slowly', async ({ tui, world }: any, text: string) => {
    await tui.typeText(interpolate(text, world.vars), { delay: 50 });
  });

  When('I press {string}', async ({ tui }: any, key: string) => {
    await tui.pressKey(key);
  });

  When('I press {string} with ctrl', async ({ tui }: any, key: string) => {
    await tui.pressKey(key, { ctrl: true });
  });

  When('I press {string} with alt', async ({ tui }: any, key: string) => {
    await tui.pressKey(key, { alt: true });
  });

  When('I press {string} with shift', async ({ tui }: any, key: string) => {
    await tui.pressKey(key, { shift: true });
  });

  When('I press enter', async ({ tui }: any) => {
    await tui.pressKey('enter');
  });

  When('I press tab', async ({ tui }: any) => {
    await tui.pressKey('tab');
  });

  When('I press escape', async ({ tui }: any) => {
    await tui.pressKey('escape');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Field Input Steps (aligned with UiPort.fillLabel)
  // ═══════════════════════════════════════════════════════════════════════════

  When(
    'I fill the TUI field {string} with {string}',
    async ({ tui, world }: any, field: string, value: string) => {
      await tui.fillField(interpolate(field, world.vars), interpolate(value, world.vars));
    },
  );

  When(
    'I enter {string} in the {string} field',
    async ({ tui, world }: any, value: string, field: string) => {
      await tui.fillField(interpolate(field, world.vars), interpolate(value, world.vars));
    },
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // Selection Steps
  // ═══════════════════════════════════════════════════════════════════════════

  When('I select {string}', async ({ tui, world }: any, option: string) => {
    await tui.selectOption(interpolate(option, world.vars));
  });

  When('I select option {string}', async ({ tui, world }: any, option: string) => {
    await tui.selectOption(interpolate(option, world.vars));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Mouse Steps (for TUI apps with mouse support)
  // ═══════════════════════════════════════════════════════════════════════════

  When('I click at position {int}, {int}', async ({ tui }: any, x: number, y: number) => {
    await tui.click(x, y);
  });

  When('I click on {string}', async ({ tui, world }: any, text: string) => {
    await tui.clickOnText(interpolate(text, world.vars));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Assertion Steps (aligned with ui.basic.ts patterns)
  // ═══════════════════════════════════════════════════════════════════════════

  Then('I should see {string}', async ({ tui, world }: any, text: string) => {
    await tui.expectText(interpolate(text, world.vars));
  });

  Then('I should see {string} in the terminal', async ({ tui, world }: any, text: string) => {
    await tui.expectText(interpolate(text, world.vars));
  });

  Then('I should not see {string}', async ({ tui, world }: any, text: string) => {
    await tui.expectNotText(interpolate(text, world.vars));
  });

  Then('the screen should contain {string}', async ({ tui, world }: any, text: string) => {
    await tui.assertScreenContains(interpolate(text, world.vars));
  });

  Then('the screen should match pattern {string}', async ({ tui }: any, pattern: string) => {
    await tui.assertScreenMatches(new RegExp(pattern));
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Wait Steps (aligned with UiPort.waitSeconds)
  // ═══════════════════════════════════════════════════════════════════════════

  When('I wait for {string}', async ({ tui, world }: any, text: string) => {
    await tui.waitForText(interpolate(text, world.vars));
  });

  When(
    'I wait for {string} for {int} seconds',
    async ({ tui, world }: any, text: string, seconds: number) => {
      await tui.waitForText(interpolate(text, world.vars), { timeout: seconds * 1000 });
    },
  );

  When('I wait {int} seconds', async ({ tui }: any, seconds: number) => {
    await tui.waitSeconds(seconds);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Snapshot Steps
  // ═══════════════════════════════════════════════════════════════════════════

  Then('the screen should match snapshot {string}', async ({ tui }: any, name: string) => {
    const result = await tui.matchSnapshot(name);
    if (!result.pass) {
      throw new Error(`Snapshot "${name}" mismatch:\n${result.diff || 'No diff available'}`);
    }
  });

  Then('I take a snapshot named {string}', async ({ tui }: any, name: string) => {
    await tui.takeSnapshot(name);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Utility Steps
  // ═══════════════════════════════════════════════════════════════════════════

  When('I clear the terminal', async ({ tui }: any) => {
    await tui.clear();
  });

  When('I resize the terminal to {int}x{int}', async ({ tui }: any, cols: number, rows: number) => {
    await tui.resize({ cols, rows });
  });
}
