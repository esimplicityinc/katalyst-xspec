import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { interpolate } from '../utils';

export function registerUiBasicSteps(test: any): void {
  const { Given, When, Then } = createBdd(test as any) as any;

  Given('I navigate to {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, path: string) => {
    await ui.goto(interpolate(path, world.vars));
  });

  When('I click the button {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, name: string) => {
    await ui.clickButton(interpolate(name, world.vars));
  });

  // Alias: "I click the {string} button" (reversed parameter order)
  When('I click the {string} button', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, name: string) => {
    await ui.clickButton(interpolate(name, world.vars));
  });

  When('I click the link {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, name: string) => {
    await ui.clickLink(interpolate(name, world.vars));
  });

  When('I fill the placeholder {string} with {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, placeholder: string, value: string) => {
    await ui.fillPlaceholder(interpolate(placeholder, world.vars), interpolate(value, world.vars));
  });

  When('I fill the field {string} with {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, label: string, value: string) => {
    await ui.fillLabel(interpolate(label, world.vars), interpolate(value, world.vars));
  });

  // Alias: "I fill in {string} with {string}" (common Cucumber phrasing)
  When('I fill in {string} with {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, label: string, value: string) => {
    await ui.fillLabel(interpolate(label, world.vars), interpolate(value, world.vars));
  });

  When('I log in as admin in UI', { tags: '@ui or @hybrid' }, async ({ auth, world }: any) => {
    await auth.uiLoginAsAdmin(world);
  });

  When('I log in as user in UI', { tags: '@ui or @hybrid' }, async ({ auth, world }: any) => {
    await auth.uiLoginAsUser(world);
  });

  // Element interaction by CSS selector
  When('I click the element {string}', { tags: '@ui or @hybrid' }, async ({ page, world }: any, selector: string) => {
    await page.locator(interpolate(selector, world.vars)).click();
  });

  // Dropdown selection by CSS selector
  When('I select {string} from dropdown {string}', { tags: '@ui or @hybrid' }, async ({ page, world }: any, option: string, selector: string) => {
    await page.locator(interpolate(selector, world.vars)).selectOption({ label: interpolate(option, world.vars) });
  });

  // File upload by CSS selector — attaches an in-memory file to a
  // <input type="file"> so a real upload can be exercised without a fixture on
  // disk. Content-type is inferred from the file name's extension.
  When(
    'I set the file input {string} to a file named {string} with content {string}',
    { tags: '@ui or @hybrid' },
    async ({ page, world }: any, selector: string, fileName: string, content: string) => {
      const name = interpolate(fileName, world.vars);
      const ext = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
      const mimeType =
        ext === 'csv'
          ? 'text/csv'
          : ext === 'json'
            ? 'application/json'
            : ext === 'xml'
              ? 'application/xml'
              : 'text/plain';
      await page.locator(interpolate(selector, world.vars)).setInputFiles({
        name,
        mimeType,
        buffer: Buffer.from(interpolate(content, world.vars)),
      });
    },
  );

  Then('I should see text {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, text: string) => {
    await ui.expectText(interpolate(text, world.vars));
  });

  Then('the URL should contain {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, part: string) => {
    await ui.expectUrlContains(interpolate(part, world.vars));
  });

  // Alias: "I should be on page {string}"
  Then('I should be on page {string}', { tags: '@ui or @hybrid' }, async ({ ui, world }: any, path: string) => {
    await ui.expectUrlContains(interpolate(path, world.vars));
  });

  // Element visibility by CSS selector
  Then('the element {string} should be visible', { tags: '@ui or @hybrid' }, async ({ page, world }: any, selector: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).toBeVisible();
  });

  Then('the element {string} should not be visible', { tags: '@ui or @hybrid' }, async ({ page, world }: any, selector: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).not.toBeVisible();
  });

  // Element value assertion by CSS selector
  Then('the element {string} should have value {string}', { tags: '@ui or @hybrid' }, async ({ page, world }: any, selector: string, value: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).toHaveValue(interpolate(value, world.vars));
  });

  // Checkbox state assertions
  Then('the element {string} should be checked', { tags: '@ui or @hybrid' }, async ({ page, world }: any, selector: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).toBeChecked();
  });

  Then('the element {string} should not be checked', { tags: '@ui or @hybrid' }, async ({ page, world }: any, selector: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).not.toBeChecked();
  });
}
