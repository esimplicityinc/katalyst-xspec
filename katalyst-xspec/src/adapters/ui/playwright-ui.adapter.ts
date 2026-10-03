import { expect, type Locator, type Page } from '@playwright/test';
import type {
  UiClickMode,
  UiElementState,
  UiInputMode,
  UiLocatorMethod,
  UiPort,
  UiSessionState,
  UiUrlAssertMode,
} from '../../ports/ui.port';

export class PlaywrightUiAdapter implements UiPort {
  constructor(private readonly page: Page) {}

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async clickButton(name: string): Promise<void> {
    await this.page.getByRole('button', { name }).first().click();
  }

  async clickLink(name: string): Promise<void> {
    await this.page.getByRole('link', { name }).first().click();
  }

  async fillPlaceholder(placeholder: string, value: string): Promise<void> {
    await this.page.getByPlaceholder(placeholder).first().fill(value);
  }

  async fillLabel(label: string, value: string): Promise<void> {
    await this.page.getByLabel(label).first().fill(value);
  }

  async expectText(text: string): Promise<void> {
    await expect(this.page.getByText(text).first()).toBeVisible();
  }

  async expectUrlContains(part: string): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  async goBack(): Promise<void> {
    await this.page.goBack();
  }

  async reload(): Promise<void> {
    await this.page.reload();
  }

  async waitSeconds(seconds: number): Promise<void> {
    await this.page.waitForTimeout(seconds * 1000);
  }

  async waitForPageLoad(): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForLoadState('load');
    try {
      await this.page.waitForLoadState('networkidle', { timeout: 5000 });
    } catch {
      // ignore
    }
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  async zoomTo(scale: number): Promise<void> {
    await this.page.evaluate((z) => {
      document.documentElement.style.zoom = String(z);
    }, scale);
  }

  async typeText(text: string): Promise<void> {
    await this.page.keyboard.type(text);
  }

  async pressKey(key: string): Promise<void> {
    await this.page.keyboard.press(key);
  }

  async clickElementThatContains(clickMode: UiClickMode, elementType: string, text: string): Promise<void> {
    const locator = this.page.locator(elementType).filter({ hasText: text }).first();
    await this.performClick(locator, clickMode);
  }

  async clickElementWith(clickMode: UiClickMode, ordinal: string, text: string, method: UiLocatorMethod): Promise<void> {
    const idx = this.parseOrdinal(ordinal);
    const locator = this.locatorBy(method, text).nth(idx);
    await this.performClick(locator, clickMode);
  }

  async fillDropdown(value: string, dropdownLabel: string): Promise<void> {
    const select = this.page.getByLabel(dropdownLabel).first();
    try {
      await select.selectOption({ label: value });
    } catch {
      await select.selectOption(value);
    }
  }

  async inputInElement(action: UiInputMode, value: string, ordinal: string, text: string, method: UiLocatorMethod): Promise<void> {
    const idx = this.parseOrdinal(ordinal);
    const locator = this.locatorBy(method, text).nth(idx);

    if (action === 'type') {
      await locator.type(value);
      return;
    }

    if (action === 'fill') {
      await locator.fill(value);
      return;
    }

    try {
      await locator.selectOption({ label: value });
    } catch {
      await locator.click({ force: true }).catch(() => {});
      await this.page.getByRole('option', { name: value }).first().click().catch(() => {});
      await this.page.getByText(value).first().click();
    }
  }

  async expectUrl(mode: UiUrlAssertMode, expected: string): Promise<void> {
    this.assertUrlAgainst(this.page.url(), mode, expected);
  }

  async expectNewTabUrl(mode: UiUrlAssertMode, expected: string): Promise<void> {
    const context = this.page.context();
    const alreadyOpen = context.pages().filter((p) => p !== this.page);
    const newPage =
      alreadyOpen.length > 0
        ? alreadyOpen[alreadyOpen.length - 1]
        : await context.waitForEvent('page', {
            timeout: 10_000,
          });

    await newPage.waitForLoadState('domcontentloaded');
    this.assertUrlAgainst(newPage.url(), mode, expected);
  }

  async expectElementWithTextVisible(elementType: string, text: string, shouldBeVisible: boolean): Promise<void> {
    const locator = this.page.locator(elementType).filter({ hasText: text });

    if (shouldBeVisible) {
      await expect(locator.first()).toBeVisible();
      return;
    }

    if ((await locator.count()) === 0) {
      await expect(locator).toHaveCount(0);
      return;
    }

    await expect(locator.first()).toBeHidden();
  }

  async expectElementState(ordinal: string, text: string, method: UiLocatorMethod, state: UiElementState): Promise<void> {
    const idx = this.parseOrdinal(ordinal);
    const locator = this.locatorBy(method, text).nth(idx);
    await this.expectState(locator, state);
  }

  async expectElementStateWithin(
    ordinal: string,
    text: string,
    method: UiLocatorMethod,
    state: UiElementState,
    seconds: number,
  ): Promise<void> {
    const idx = this.parseOrdinal(ordinal);
    const locator = this.locatorBy(method, text).nth(idx);
    await this.expectState(locator, state, { timeout: seconds * 1000 });
  }

  private parseOrdinal(ordinal: string): number {
    const n = Number.parseInt(String(ordinal), 10);
    if (!Number.isFinite(n) || n < 1) {
      throw new Error(`Invalid element ordinal '${ordinal}'. Expected 1,2,3...`);
    }
    return n - 1;
  }

  private locatorBy(method: UiLocatorMethod, text: string): Locator {
    switch (method) {
      case 'text':
        return this.page.getByText(text);
      case 'label':
        return this.page.getByLabel(text);
      case 'placeholder':
        return this.page.getByPlaceholder(text);
      case 'role':
        return this.page.getByRole(text as any);
      case 'test ID':
        return this.page.getByTestId(text);
      case 'alternative text':
        return this.page.getByAltText(text);
      case 'title':
        return this.page.getByTitle(text);
      case 'locator':
        return this.page.locator(text);
      default: {
        const neverMethod: never = method;
        throw new Error(`Unsupported locator method: ${neverMethod}`);
      }
    }
  }

  async fillField(name: string, value: string, options: { timeoutMs?: number } = {}): Promise<boolean> {
    const candidates = [
      this.page.getByLabel(name, { exact: true }),
      this.page.getByPlaceholder(name, { exact: true }),
      this.page.getByLabel(name),
      this.page.getByPlaceholder(name),
      this.page.locator(`[name="${name.replace(/"/g, '\\"')}"]`),
    ];
    const any = candidates.reduce((acc, loc) => acc.or(loc));
    try {
      await any.first().waitFor({ state: 'visible', timeout: options.timeoutMs ?? 10_000 });
    } catch {
      return false;
    }
    for (const loc of candidates) {
      if ((await loc.count()) > 0) {
        await loc.first().fill(value);
        return true;
      }
    }
    return false;
  }

  async waitForUrl(predicate: (url: string) => boolean, timeoutMs: number): Promise<boolean> {
    try {
      await this.page.waitForURL((u) => predicate(u.toString()), { timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  async waitForText(text: string, timeoutMs: number): Promise<boolean> {
    try {
      await this.page.getByText(text).first().waitFor({ state: 'visible', timeout: timeoutMs });
      return true;
    } catch {
      return false;
    }
  }

  async saveSession(): Promise<UiSessionState> {
    return (await this.page.context().storageState()) as unknown as UiSessionState;
  }

  async restoreSession(state: UiSessionState): Promise<void> {
    const context = this.page.context();
    if (state.cookies.length) await context.addCookies(state.cookies as any);
    if (state.origins.some((o) => o.localStorage.length)) {
      // Seed localStorage once per tab, so later app changes (e.g. logout) stick.
      await context.addInitScript((origins: UiSessionState['origins']) => {
        try {
          if (sessionStorage.getItem('__katalyst_xspec_session_restored')) return;
          for (const o of origins) {
            if (o.origin !== location.origin) continue;
            for (const { name, value } of o.localStorage) localStorage.setItem(name, value);
          }
          sessionStorage.setItem('__katalyst_xspec_session_restored', '1');
        } catch {
          /* storage unavailable (e.g. about:blank) */
        }
      }, state.origins);
    }
  }

  private async performClick(locator: Locator, clickMode: UiClickMode): Promise<void> {
    if (clickMode === 'dispatch click') {
      await locator.dispatchEvent('click');
      return;
    }

    if (clickMode === 'force click') {
      await locator.click({ force: true });
      return;
    }

    if (clickMode === 'force dispatch click') {
      await locator.dispatchEvent('click');
      return;
    }

    await locator.click();
  }

  private async expectState(locator: Locator, state: UiElementState, options?: { timeout?: number }): Promise<void> {
    if (state === 'visible') {
      await expect(locator).toBeVisible(options);
      return;
    }

    if (state === 'hidden') {
      await expect(locator).toBeHidden(options);
      return;
    }

    if (state === 'editable') {
      await expect(locator).toBeEditable(options);
      return;
    }

    if (state === 'disabled') {
      await expect(locator).toBeDisabled(options);
      return;
    }

    if (state === 'enabled') {
      await expect(locator).toBeEnabled(options);
      return;
    }

    if (state === 'read-only') {
      await expect(locator).toHaveJSProperty('readOnly', true, options);
      return;
    }

    const neverState: never = state;
    throw new Error(`Unsupported expected state: ${neverState}`);
  }

  private assertUrlAgainst(actualUrl: string, mode: UiUrlAssertMode, expected: string): void {
    const expectedStr = String(expected);

    const assertFor = (actual: string): void => {
      if (mode === 'contains') {
        expect(actual).toContain(expectedStr);
        return;
      }

      if (mode === 'doesntContain') {
        expect(actual).not.toContain(expectedStr);
        return;
      }

      if (mode === 'equals') {
        expect(actual).toBe(expectedStr);
        return;
      }

      const neverMode: never = mode;
      throw new Error(`Unsupported URL assertion mode: ${neverMode}`);
    };

    if (expectedStr.startsWith('/')) {
      const u = new URL(actualUrl);
      const actualPath = `${u.pathname}${u.search}${u.hash}`;
      assertFor(actualPath);
      return;
    }

    assertFor(actualUrl);
  }
}
