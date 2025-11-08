import { createBdd } from 'playwright-bdd';
import type { UiClickMode, UiElementState, UiInputMode, UiLocatorMethod, UiUrlAssertMode } from '../ports/ui.port';
import { interpolate } from '../utils';
import type { World } from '../world';

function resolveValue(input: string, world: World): string {
  const interpolated = interpolate(input, world.vars);
  if (interpolated === input && world.vars[input] !== undefined) {
    return world.vars[input];
  }
  return interpolated;
}

function parseNumber(input: string, world: World): number {
  const resolved = resolveValue(input, world);
  const n = Number.parseFloat(resolved);
  if (!Number.isFinite(n)) {
    throw new Error(`Expected a number but got '${resolved}'`);
  }
  return n;
}

function parseOrdinalIndex(input: string, world: World): number {
  const resolved = resolveValue(input, world);
  const n = Number.parseInt(resolved, 10);
  if (!Number.isFinite(n) || n < 1) {
    throw new Error(`Expected a 1-based index number but got '${resolved}'`);
  }
  return n - 1;
}

function locatorByPage(page: any, method: UiLocatorMethod, text: string) {
  switch (method) {
    case 'text':
      return page.getByText(text);
    case 'label':
      return page.getByLabel(text);
    case 'placeholder':
      return page.getByPlaceholder(text);
    case 'role':
      return page.getByRole(text);
    case 'test ID':
      return page.getByTestId(text);
    case 'alternative text':
      return page.getByAltText(text);
    case 'title':
      return page.getByTitle(text);
    case 'locator':
      return page.locator(text);
    default: {
      const neverMethod: never = method;
      throw new Error(`Unsupported locator method '${neverMethod}'`);
    }
  }
}

function asClickMode(input: string): UiClickMode {
  const v = input.trim().toLowerCase();
  if (v === 'click' || v === 'dispatch click' || v === 'force click' || v === 'force dispatch click') {
    return v;
  }
  throw new Error(`Unsupported click mode '${input}'`);
}

function asInputMode(input: string): UiInputMode {
  const v = input.trim().toLowerCase();
  if (v === 'type' || v === 'fill' || v === 'choose') {
    return v;
  }
  throw new Error(`Unsupported input mode '${input}'`);
}

function asUrlAssertMode(input: string): UiUrlAssertMode {
  const v = input.trim().toLowerCase();
  if (v === 'contains' || v === 'doesntcontain' || v === 'equals') {
    return v === 'doesntcontain' ? 'doesntContain' : v;
  }
  throw new Error(`Unsupported URL assert mode '${input}'`);
}

function asLocatorMethod(input: string): UiLocatorMethod {
  const v = input.trim().toLowerCase();
  if (v === 'text') return 'text';
  if (v === 'label') return 'label';
  if (v === 'placeholder') return 'placeholder';
  if (v === 'role') return 'role';
  if (v === 'test id' || v === 'testid' || v === 'test-id') return 'test ID';
  if (v === 'alternative text' || v === 'alt text' || v === 'alt') return 'alternative text';
  if (v === 'title') return 'title';
  if (v === 'locator') return 'locator';
  throw new Error(`Unsupported locator method '${input}'`);
}

function asElementState(input: string): UiElementState {
  const v = input.trim().toLowerCase();
  if (v === 'visible' || v === 'hidden' || v === 'editable' || v === 'disabled' || v === 'enabled') return v;
  if (v === 'read-only' || v === 'readonly' || v === 'read only') return 'read-only';
  throw new Error(`Unsupported element state '${input}'`);
}

function parseRegex(input: string): RegExp {
  const raw = String(input);
  if (raw.startsWith('/') && raw.lastIndexOf('/') > 0) {
    const last = raw.lastIndexOf('/');
    const pattern = raw.slice(1, last);
    const flags = raw.slice(last + 1);
    return new RegExp(pattern, flags);
  }
  return new RegExp(raw);
}

export function registerWizardSteps(test: any): void {
  const { Given, When, Then } = createBdd(test as any) as any;

  Given('I open {string} page', { tags: '@ui' }, async ({ ui, world }, urlOrVar: string) => {
    await ui.goto(resolveValue(urlOrVar, world));
  });

  Given('I open {string} in the browser', { tags: '@ui' }, async ({ ui, world }, urlOrVar: string) => {
    await ui.goto(resolveValue(urlOrVar, world));
  });

  When('I go back in the browser', { tags: '@ui' }, async ({ ui }) => {
    await ui.goBack();
  });

  When('I save the current URL as {string}', { tags: '@ui' }, async ({ ui, world }, varName: string) => {
    world.vars[varName] = await ui.getCurrentUrl();
  });

  When('I save the current url as {string}', { tags: '@ui' }, async ({ ui, world }, varName: string) => {
    world.vars[varName] = await ui.getCurrentUrl();
  });

  Then('I zoom to {string} in the browser', { tags: '@ui' }, async ({ ui, world }, scale: string) => {
    await ui.zoomTo(parseNumber(scale, world));
  });

  When('I reload the page', { tags: '@ui' }, async ({ ui }) => {
    await ui.reload();
  });

  Then('I wait {string} seconds', { tags: '@ui' }, async ({ ui, world }, seconds: string) => {
    await ui.waitSeconds(parseNumber(seconds, world));
  });

  Then('I wait for the page to load', { tags: '@ui' }, async ({ ui }) => {
    await ui.waitForPageLoad();
  });

  When(
    'I get a part of the URL based on {string} regular expression and save it as {string}',
    { tags: '@ui' },
    async ({ ui, world }, regexString: string, varName: string) => {
      const url = await ui.getCurrentUrl();
      const regex = parseRegex(resolveValue(regexString, world));
      const match = regex.exec(url);
      if (!match) throw new Error(`Regex '${regex}' did not match URL '${url}'`);
      world.vars[varName] = match[1] ?? match[0];
    },
  );

  Then('I {string} {string}', { tags: '@ui' }, async ({ ui, world }, action: string, value: string) => {
    const verb = action.trim().toLowerCase();
    const resolved = resolveValue(value, world);
    if (verb === 'type') {
      await ui.typeText(resolved);
      return;
    }
    if (verb === 'press') {
      await ui.pressKey(resolved);
      return;
    }
    throw new Error(`Unsupported keyboard action '${action}'. Expected 'type' or 'press'.`);
  });

  When(
    'I {string} the {string} element that contains {string}',
    { tags: '@ui' },
    async ({ ui, world }, clickMode: string, elementType: string, text: string) => {
      await ui.clickElementThatContains(
        asClickMode(resolveValue(clickMode, world)),
        resolveValue(elementType, world),
        resolveValue(text, world),
      );
    },
  );

  When(
    'I {string} the {string} element with {string} {string}',
    { tags: '@ui' },
    async ({ ui, world }, clickMode: string, ordinal: string, text: string, method: string) => {
      await ui.clickElementWith(
        asClickMode(resolveValue(clickMode, world)),
        resolveValue(ordinal, world),
        resolveValue(text, world),
        asLocatorMethod(resolveValue(method, world)),
      );
    },
  );

  When('I click on the top left corner of the page', { tags: '@ui' }, async ({ page }) => {
    await page.mouse.click(0, 0);
  });

  When(
    'If its visible, I {string} the {string} element with {string} {string}',
    { tags: '@ui' },
    async ({ page, ui, world }, clickMode: string, ordinal: string, text: string, method: string) => {
      const idx = parseOrdinalIndex(ordinal, world);
      const resolvedText = resolveValue(text, world);
      const resolvedMethod = asLocatorMethod(resolveValue(method, world));
      const locator = locatorByPage(page, resolvedMethod, resolvedText).nth(idx);

      if ((await locator.count()) === 0) return;
      if (!(await locator.isVisible())) return;

      await ui.clickElementWith(asClickMode(resolveValue(clickMode, world)), ordinal, resolvedText, resolvedMethod);
    },
  );

  Then('I fill {string} into the {string} dropdown', { tags: '@ui' }, async ({ ui, world }, value: string, label: string) => {
    await ui.fillDropdown(resolveValue(value, world), resolveValue(label, world));
  });

  When(
    'I {string} {string} in the {string} element with {string} {string}',
    { tags: '@ui' },
    async ({ ui, world }, action: string, value: string, ordinal: string, text: string, method: string) => {
      await ui.inputInElement(
        asInputMode(resolveValue(action, world)),
        resolveValue(value, world),
        resolveValue(ordinal, world),
        resolveValue(text, world),
        asLocatorMethod(resolveValue(method, world)),
      );
    },
  );

  Then(
    'I verify if a new tab which URL {string} {string} opens',
    { tags: '@ui' },
    async ({ ui, world }, mode: string, expected: string) => {
      await ui.expectNewTabUrl(asUrlAssertMode(resolveValue(mode, world)), resolveValue(expected, world));
    },
  );

  Then(
    'I verify if a new tab which url {string} {string} opens',
    { tags: '@ui' },
    async ({ ui, world }, mode: string, expected: string) => {
      await ui.expectNewTabUrl(asUrlAssertMode(resolveValue(mode, world)), resolveValue(expected, world));
    },
  );

  Then('I verify if the URL {string} {string}', { tags: '@ui' }, async ({ ui, world }, mode: string, expected: string) => {
    await ui.expectUrl(asUrlAssertMode(resolveValue(mode, world)), resolveValue(expected, world));
  });

  Then('I verify if the url {string} {string}', { tags: '@ui' }, async ({ ui, world }, mode: string, expected: string) => {
    await ui.expectUrl(asUrlAssertMode(resolveValue(mode, world)), resolveValue(expected, world));
  });

  Then('I verify if the URL {string} {string} opens', { tags: '@ui' }, async ({ ui, world }, mode: string, expected: string) => {
    await ui.expectUrl(asUrlAssertMode(resolveValue(mode, world)), resolveValue(expected, world));
  });

  Then('I verify if the url {string} {string} opens', { tags: '@ui' }, async ({ ui, world }, mode: string, expected: string) => {
    await ui.expectUrl(asUrlAssertMode(resolveValue(mode, world)), resolveValue(expected, world));
  });

  Then(
    'I verify that a {string} element with {string} text {string} visible',
    { tags: '@ui' },
    async ({ ui, world }, elementType: string, text: string, assertion: string) => {
      const normalized = resolveValue(assertion, world).trim().toLowerCase();
      const shouldBeVisible = normalized === 'is';
      if (!shouldBeVisible && normalized !== 'is not') {
        throw new Error(`Expected 'is' or 'is not' but got '${assertion}'`);
      }
      await ui.expectElementWithTextVisible(resolveValue(elementType, world), resolveValue(text, world), shouldBeVisible);
    },
  );

  Then(
    'I verify that {string} element with {string} {string} is {string}',
    { tags: '@ui' },
    async ({ ui, world }, ordinal: string, text: string, method: string, state: string) => {
      await ui.expectElementState(
        resolveValue(ordinal, world),
        resolveValue(text, world),
        asLocatorMethod(resolveValue(method, world)),
        asElementState(resolveValue(state, world)),
      );
    },
  );

  Then(
    'I verify that {string} element with {string} {string} becomes {string} during {string} seconds',
    { tags: '@ui' },
    async ({ ui, world }, ordinal: string, text: string, method: string, state: string, seconds: string) => {
      await ui.expectElementStateWithin(
        resolveValue(ordinal, world),
        resolveValue(text, world),
        asLocatorMethod(resolveValue(method, world)),
        asElementState(resolveValue(state, world)),
        parseNumber(seconds, world),
      );
    },
  );
}
