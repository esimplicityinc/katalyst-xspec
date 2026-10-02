/**
 * TUI Wizard Step Definitions
 *
 * Advanced step definitions for terminal user interface testing.
 * Tagged with @tui for selective execution.
 * Aligned with ui.wizard.ts patterns for consistency.
 */

import { createBdd } from 'playwright-bdd';
import { interpolate } from '../utils';

export function registerTuiWizardSteps(test: any): void {
  const { Given, When, Then } = createBdd(test as any) as any;

  // ═══════════════════════════════════════════════════════════════════════════
  // Navigation Steps (menu/screen navigation)
  // ═══════════════════════════════════════════════════════════════════════════

  When('I navigate down {int} times', { tags: '@tui' }, async ({ tui }: any, times: number) => {
    for (let i = 0; i < times; i++) {
      await tui.pressKey('down');
    }
  });

  When('I navigate up {int} times', { tags: '@tui' }, async ({ tui }: any, times: number) => {
    for (let i = 0; i < times; i++) {
      await tui.pressKey('up');
    }
  });

  When('I navigate to {string} and select', { tags: '@tui' }, async ({ tui, world }: any, option: string) => {
    const target = interpolate(option, world.vars);
    await tui.waitForText(target);
    await tui.pressKey('enter');
  });

  When('I go back', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.pressKey('escape');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Form Steps (multi-field forms)
  // ═══════════════════════════════════════════════════════════════════════════

  When('I fill the form:', { tags: '@tui' }, async ({ tui, world }: any, dataTable: any) => {
    const rows = dataTable.hashes();

    for (const row of rows) {
      const field = interpolate(row.field || row.Field, world.vars);
      const value = interpolate(row.value || row.Value, world.vars);

      await tui.fillField(field, value);
      await tui.pressKey('tab'); // Move to next field
    }
  });

  When('I submit the form', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.pressKey('enter');
  });

  When('I submit the form with ctrl+s', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.pressKey('s', { ctrl: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Menu Steps
  // ═══════════════════════════════════════════════════════════════════════════

  When('I select menu item {string}', { tags: '@tui' }, async ({ tui, world }: any, item: string) => {
    const target = interpolate(item, world.vars);
    await tui.waitForText(target);
    await tui.selectOption(target);
  });

  When('I open the menu', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.pressKey('m', { alt: true });
  });

  When('I select from dropdown {string} value {string}', { tags: '@tui' }, async ({ tui, world }: any, dropdown: string, value: string) => {
    const dropdownLabel = interpolate(dropdown, world.vars);
    const selectedValue = interpolate(value, world.vars);

    await tui.waitForText(dropdownLabel);
    await tui.pressKey('enter'); // Open dropdown
    await tui.waitForText(selectedValue);
    await tui.pressKey('enter'); // Select value
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Keyboard Shortcut Steps
  // ═══════════════════════════════════════════════════════════════════════════

  When('I press ctrl+{word}', { tags: '@tui' }, async ({ tui }: any, key: string) => {
    await tui.pressKey(key, { ctrl: true });
  });

  When('I press alt+{word}', { tags: '@tui' }, async ({ tui }: any, key: string) => {
    await tui.pressKey(key, { alt: true });
  });

  When('I press shift+{word}', { tags: '@tui' }, async ({ tui }: any, key: string) => {
    await tui.pressKey(key, { shift: true });
  });

  When('I press ctrl+shift+{word}', { tags: '@tui' }, async ({ tui }: any, key: string) => {
    await tui.pressKey(key, { ctrl: true, shift: true });
  });

  When('I quit the application', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.pressKey('q');
  });

  When('I force quit the application', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.pressKey('c', { ctrl: true });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Screen Region Steps
  // ═══════════════════════════════════════════════════════════════════════════

  Then('line {int} should contain {string}', { tags: '@tui' }, async ({ tui, world }: any, lineNum: number, text: string) => {
    const lines = await tui.getScreenLines();
    const expectedText = interpolate(text, world.vars);
    const lineIndex = lineNum - 1; // Convert to 0-based index

    if (lineIndex < 0 || lineIndex >= lines.length) {
      throw new Error(`Line ${lineNum} does not exist. Screen has ${lines.length} lines.`);
    }

    if (!lines[lineIndex].includes(expectedText)) {
      throw new Error(`Expected line ${lineNum} to contain "${expectedText}"\nActual: "${lines[lineIndex]}"`);
    }
  });

  Then('the first line should contain {string}', { tags: '@tui' }, async ({ tui, world }: any, text: string) => {
    const lines = await tui.getScreenLines();
    const expectedText = interpolate(text, world.vars);

    if (!lines[0]?.includes(expectedText)) {
      throw new Error(`Expected first line to contain "${expectedText}"\nActual: "${lines[0]}"`);
    }
  });

  Then('the last line should contain {string}', { tags: '@tui' }, async ({ tui, world }: any, text: string) => {
    const lines = await tui.getScreenLines();
    const expectedText = interpolate(text, world.vars);
    const lastLine = lines[lines.length - 1] || '';

    if (!lastLine.includes(expectedText)) {
      throw new Error(`Expected last line to contain "${expectedText}"\nActual: "${lastLine}"`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Multi-text Assertion Steps
  // ═══════════════════════════════════════════════════════════════════════════

  Then('I should see all of:', { tags: '@tui' }, async ({ tui, world }: any, dataTable: any) => {
    const rows = dataTable.raw();

    for (const row of rows) {
      const text = interpolate(row[0], world.vars);
      await tui.expectText(text);
    }
  });

  Then('I should not see any of:', { tags: '@tui' }, async ({ tui, world }: any, dataTable: any) => {
    const rows = dataTable.raw();

    for (const row of rows) {
      const text = interpolate(row[0], world.vars);
      await tui.expectNotText(text);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Debug/Capture Steps
  // ═══════════════════════════════════════════════════════════════════════════

  When('I capture the screen', { tags: '@tui' }, async ({ tui, world }: any) => {
    const capture = await tui.captureScreen();
    world.vars['lastScreenCapture'] = capture.text;
  });

  Then('I print the screen', { tags: '@tui' }, async ({ tui }: any) => {
    const text = await tui.getScreenText();
    console.log('=== Screen Content ===');
    console.log(text);
    console.log('======================');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Command Execution Steps (for CLI apps)
  // ═══════════════════════════════════════════════════════════════════════════

  When('I execute command {string}', { tags: '@tui' }, async ({ tui, world }: any, command: string) => {
    const cmd = interpolate(command, world.vars);
    await tui.typeText(cmd);
    await tui.pressKey('enter');
  });

  When('I run {string}', { tags: '@tui' }, async ({ tui, world }: any, command: string) => {
    const cmd = interpolate(command, world.vars);
    await tui.typeText(cmd);
    await tui.pressKey('enter');
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Confirmation Dialog Steps
  // ═══════════════════════════════════════════════════════════════════════════

  When('I confirm the dialog', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.typeText('y');
    await tui.pressKey('enter');
  });

  When('I cancel the dialog', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.typeText('n');
    await tui.pressKey('enter');
  });

  When('I dismiss the dialog', { tags: '@tui' }, async ({ tui }: any) => {
    await tui.pressKey('escape');
  });
}
