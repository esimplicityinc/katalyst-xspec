import { createBdd } from 'playwright-bdd';
import { interpolate } from '../utils';

export function registerUiBasicSteps(test: any): void {
  const { Given, When, Then } = createBdd(test as any) as any;

  Given('I navigate to {string}', { tags: '@ui' }, async ({ ui, world }: any, path: string) => {
    await ui.goto(interpolate(path, world.vars));
  });

  When('I click the button {string}', { tags: '@ui' }, async ({ ui, world }: any, name: string) => {
    await ui.clickButton(interpolate(name, world.vars));
  });

  When('I click the link {string}', { tags: '@ui' }, async ({ ui, world }: any, name: string) => {
    await ui.clickLink(interpolate(name, world.vars));
  });

  When('I fill the placeholder {string} with {string}', { tags: '@ui' }, async ({ ui, world }: any, placeholder: string, value: string) => {
    await ui.fillPlaceholder(interpolate(placeholder, world.vars), interpolate(value, world.vars));
  });

  When('I fill the field {string} with {string}', { tags: '@ui' }, async ({ ui, world }: any, label: string, value: string) => {
    await ui.fillLabel(interpolate(label, world.vars), interpolate(value, world.vars));
  });

  When('I log in as admin in UI', { tags: '@ui' }, async ({ auth, world }: any) => {
    await auth.uiLoginAsAdmin(world);
  });

  When('I log in as user in UI', { tags: '@ui' }, async ({ auth, world }: any) => {
    await auth.uiLoginAsUser(world);
  });

  Then('I should see text {string}', { tags: '@ui' }, async ({ ui, world }: any, text: string) => {
    await ui.expectText(interpolate(text, world.vars));
  });

  Then('the URL should contain {string}', { tags: '@ui' }, async ({ ui, world }: any, part: string) => {
    await ui.expectUrlContains(interpolate(part, world.vars));
  });
}
