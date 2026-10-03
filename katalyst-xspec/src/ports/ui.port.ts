export type UiClickMode = 'click' | 'dispatch click' | 'force click' | 'force dispatch click';
export type UiInputMode = 'type' | 'fill' | 'choose';
export type UiUrlAssertMode = 'contains' | 'doesntContain' | 'equals';
export type UiLocatorMethod = 'text' | 'label' | 'placeholder' | 'role' | 'test ID' | 'alternative text' | 'title' | 'locator';

export type UiElementState = 'visible' | 'hidden' | 'editable' | 'disabled' | 'enabled' | 'read-only';

export interface UiPort {
  goto(path: string): Promise<void>;
  clickButton(name: string): Promise<void>;
  clickLink(name: string): Promise<void>;
  fillPlaceholder(placeholder: string, value: string): Promise<void>;
  fillLabel(label: string, value: string): Promise<void>;
  expectText(text: string): Promise<void>;
  expectUrlContains(part: string): Promise<void>;

  goBack(): Promise<void>;
  reload(): Promise<void>;
  waitSeconds(seconds: number): Promise<void>;
  waitForPageLoad(): Promise<void>;
  getCurrentUrl(): Promise<string>;
  zoomTo(scale: number): Promise<void>;

  typeText(text: string): Promise<void>;
  pressKey(key: string): Promise<void>;

  clickElementThatContains(clickMode: UiClickMode, elementType: string, text: string): Promise<void>;
  clickElementWith(clickMode: UiClickMode, ordinal: string, text: string, method: UiLocatorMethod): Promise<void>;

  fillDropdown(value: string, dropdownLabel: string): Promise<void>;
  inputInElement(action: UiInputMode, value: string, ordinal: string, text: string, method: UiLocatorMethod): Promise<void>;

  expectUrl(mode: UiUrlAssertMode, expected: string): Promise<void>;
  expectNewTabUrl(mode: UiUrlAssertMode, expected: string): Promise<void>;

  expectElementWithTextVisible(elementType: string, text: string, shouldBeVisible: boolean): Promise<void>;
  expectElementState(ordinal: string, text: string, method: UiLocatorMethod, state: UiElementState): Promise<void>;
  expectElementStateWithin(
    ordinal: string,
    text: string,
    method: UiLocatorMethod,
    state: UiElementState,
    seconds: number,
  ): Promise<void>;

  // ── Optional: used by UniversalAuthAdapter for UI login. Custom UiPort
  //    implementations can omit them; login then falls back to fillPlaceholder
  //    and skips the success check and session reuse. ─────────────────────────

  /**
   * Fill a field found by (in order) exact label, exact placeholder, label,
   * placeholder, or name attribute. Resolves false if none appears in time.
   */
  fillField?(name: string, value: string, options?: { timeoutMs?: number }): Promise<boolean>;
  /** Wait until the URL satisfies `predicate`; resolves false on timeout. */
  waitForUrl?(predicate: (url: string) => boolean, timeoutMs: number): Promise<boolean>;
  /** Wait until `text` is visible; resolves false on timeout. */
  waitForText?(text: string, timeoutMs: number): Promise<boolean>;
  /** Snapshot cookies + localStorage (Playwright storageState). */
  saveSession?(): Promise<UiSessionState>;
  /** Apply a snapshot from saveSession() to the current browser context. */
  restoreSession?(state: UiSessionState): Promise<void>;
}

/** Opaque browser session snapshot (Playwright `storageState()` shape). */
export type UiSessionState = {
  cookies: Array<Record<string, unknown>>;
  origins: Array<{ origin: string; localStorage: Array<{ name: string; value: string }> }>;
};
