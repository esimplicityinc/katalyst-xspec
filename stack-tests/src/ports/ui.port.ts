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
}
