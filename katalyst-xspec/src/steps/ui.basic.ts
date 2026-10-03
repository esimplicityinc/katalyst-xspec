import { createBdd } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { interpolate } from '../utils';
import { uiLoginAsRole } from '../auth/login-steps';
import { expectElementAttribute, setFileInputContent } from '../helpers/ui-element';

export function registerUiBasicSteps(test: any): void {
  const { Given, When, Then } = createBdd(test as any) as any;

  Given('I navigate to {string}', async ({ ui, world }: any, path: string) => {
    await ui.goto(interpolate(path, world.vars));
  });

  When('I click the button {string}', async ({ ui, world }: any, name: string) => {
    await ui.clickButton(interpolate(name, world.vars));
  });

  // Alias: "I click the {string} button" (reversed parameter order)
  When('I click the {string} button', async ({ ui, world }: any, name: string) => {
    await ui.clickButton(interpolate(name, world.vars));
  });

  When('I click the link {string}', async ({ ui, world }: any, name: string) => {
    await ui.clickLink(interpolate(name, world.vars));
  });

  When('I fill the placeholder {string} with {string}', async ({ ui, world }: any, placeholder: string, value: string) => {
    await ui.fillPlaceholder(interpolate(placeholder, world.vars), interpolate(value, world.vars));
  });

  When('I fill the field {string} with {string}', async ({ ui, world }: any, label: string, value: string) => {
    await ui.fillLabel(interpolate(label, world.vars), interpolate(value, world.vars));
  });

  // Alias: "I fill in {string} with {string}" (common Cucumber phrasing)
  When('I fill in {string} with {string}', async ({ ui, world }: any, label: string, value: string) => {
    await ui.fillLabel(interpolate(label, world.vars), interpolate(value, world.vars));
  });

  // Logs in through the form once per role, then reuses the saved session
  // (cookies + localStorage) in later scenarios. UI_SESSION_REUSE=false disables.
  Given('I am logged in as {string}', async ({ auth, ui, world }: any, role: string) => {
    void ui; // binds the browser for the auth adapter
    await uiLoginAsRole(auth, world, role, { reuseSession: true });
  });

  // Always submits the login form (use when testing the login itself).
  When('I log in as {string} in UI', async ({ auth, ui, world }: any, role: string) => {
    void ui;
    await uiLoginAsRole(auth, world, role);
  });

  When('I log in as admin in UI', async ({ auth, ui, world }: any) => {
    void ui;
    await uiLoginAsRole(auth, world, 'admin');
  });

  When('I log in as user in UI', async ({ auth, ui, world }: any) => {
    void ui;
    await uiLoginAsRole(auth, world, 'user');
  });

  // Element interaction by CSS selector
  When('I click the element {string}', async ({ page, world }: any, selector: string) => {
    await page.locator(interpolate(selector, world.vars)).click();
  });

  // Dropdown selection by CSS selector
  When('I select {string} from dropdown {string}', async ({ page, world }: any, option: string, selector: string) => {
    await page.locator(interpolate(selector, world.vars)).selectOption({ label: interpolate(option, world.vars) });
  });

  // File upload by CSS selector — attaches an in-memory file to a
  // <input type="file"> so a real upload can be exercised without a fixture on
  // disk. Content-type is inferred from the file name's extension.
  When(
    'I set the file input {string} to a file named {string} with content {string}',
    async ({ page, world }: any, selector: string, fileName: string, content: string) => {
      await setFileInputContent(
        page,
        interpolate(selector, world.vars),
        interpolate(fileName, world.vars),
        interpolate(content, world.vars),
      );
    },
  );

  Then('I should see text {string}', async ({ ui, world }: any, text: string) => {
    await ui.expectText(interpolate(text, world.vars));
  });

  Then('the URL should contain {string}', async ({ ui, world }: any, part: string) => {
    await ui.expectUrlContains(interpolate(part, world.vars));
  });

  // Alias: "I should be on page {string}"
  Then('I should be on page {string}', async ({ ui, world }: any, path: string) => {
    await ui.expectUrlContains(interpolate(path, world.vars));
  });

  // Element visibility by CSS selector
  Then('the element {string} should be visible', async ({ page, world }: any, selector: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).toBeVisible();
  });

  Then('the element {string} should not be visible', async ({ page, world }: any, selector: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).not.toBeVisible();
  });

  // Element value assertion by CSS selector
  Then('the element {string} should have value {string}', async ({ page, world }: any, selector: string, value: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).toHaveValue(interpolate(value, world.vars));
  });

  // Arbitrary attribute assertion by CSS selector — e.g. assert a component's
  // data-state ("expanded"/"collapsed"), aria-*, or any HTML attribute value.
  Then('the element {string} should have attribute {string} equal to {string}', async ({ page, world }: any, selector: string, attribute: string, value: string) => {
    await expectElementAttribute(
      page,
      interpolate(selector, world.vars),
      interpolate(attribute, world.vars),
      interpolate(value, world.vars),
    );
  });

  // Checkbox state assertions
  Then('the element {string} should be checked', async ({ page, world }: any, selector: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).toBeChecked();
  });

  Then('the element {string} should not be checked', async ({ page, world }: any, selector: string) => {
    await expect(page.locator(interpolate(selector, world.vars))).not.toBeChecked();
  });
}
