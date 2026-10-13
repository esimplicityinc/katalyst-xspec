import type { Locator, Page } from '@playwright/test';
import type { LoginFieldKind, LoginPage } from '../../ports/ui.port';

const TEXT_INPUT = 'input:is([type="text" i], [type="email" i], [type="tel" i], :not([type]))';

// Common login fields, for pages whose labels the settings don't name (identity providers).
const AUTO_SELECTORS: Record<LoginFieldKind, string[]> = {
  username: [
    'input[autocomplete="username"]',
    'input[type="email"]',
    `${TEXT_INPUT}[name*="user" i]`,
    `${TEXT_INPUT}[name*="email" i]`,
    `${TEXT_INPUT}[name*="login" i]`,
    `${TEXT_INPUT}[id*="user" i]`,
    `${TEXT_INPUT}[name*="identifier" i]`,
  ],
  password: ['input[type="password"]'],
  otp: [
    'input[autocomplete="one-time-code"]',
    `${TEXT_INPUT}[name*="otp" i]`,
    `${TEXT_INPUT}[id*="otp" i]`,
    'input[inputmode="numeric"][name*="code" i]',
    `${TEXT_INPUT}[name="code" i]`,
    `${TEXT_INPUT}[name*="passcode" i]`,
    `${TEXT_INPUT}[name*="totp" i]`,
  ],
};
const DEFAULT_NAMES: Partial<Record<LoginFieldKind, string>> = { username: 'Username', password: 'Password' };
const OTP_LABEL = /one[- ]?time|verification code|security code|authentication code|passcode|\bcode\b/i;

/** The page-by-page login primitives on a Playwright page. */
export class PlaywrightLoginPage implements LoginPage {
  private lastFilled?: Locator;

  constructor(private readonly page: Page) {}

  url(): string {
    return this.page.url();
  }

  async goto(path: string): Promise<void> {
    await this.page.goto(path);
    await this.page.waitForLoadState('domcontentloaded');
  }

  /** The configured field only, if set; otherwise the default label plus common login fields. */
  private locator(kind: LoginFieldKind, field?: string): Locator {
    const p = this.page;
    const byName = (name: string) => [
      p.getByLabel(name, { exact: true }),
      p.getByPlaceholder(name, { exact: true }),
      p.getByLabel(name),
      p.getByPlaceholder(name),
      p.locator(`[name="${name.replace(/"/g, '\\"')}"]`),
    ];
    const candidates: Locator[] = [];
    if (field) {
      candidates.push(...byName(field));
    } else {
      if (DEFAULT_NAMES[kind]) candidates.push(...byName(DEFAULT_NAMES[kind]!));
      if (kind === 'otp') candidates.push(p.getByLabel(OTP_LABEL));
      candidates.push(p.locator(AUTO_SELECTORS[kind].join(', ')));
    }
    const visible = candidates.map((c) => c.locator('visible=true'));
    return visible.reduce((acc, loc) => acc.or(loc)).first();
  }

  async hasField(kind: LoginFieldKind, field?: string): Promise<boolean> {
    const loc = this.locator(kind, field);
    try {
      if (!(await loc.isVisible())) return false;
      if (kind !== 'password' && (await loc.getAttribute('type'))?.toLowerCase() === 'password') return false;
      return await loc.isEditable();
    } catch {
      return false;
    }
  }

  async fill(kind: LoginFieldKind, value: string, field?: string): Promise<void> {
    this.lastFilled = this.locator(kind, field);
    await this.lastFilled.fill(value);
  }

  private button(name: string): Locator {
    return this.page
      .getByRole('button', { name, exact: true })
      .or(this.page.getByRole('button', { name }))
      .or(this.page.locator(`input[type="submit" i][value="${name.replace(/"/g, '\\"')}" i]`))
      .locator('visible=true')
      .first();
  }

  async hasButton(name: string): Promise<boolean> {
    return this.button(name).isVisible().catch(() => false);
  }

  async submit(last: LoginFieldKind | undefined, buttons: string[], timeoutMs: number): Promise<void> {
    const main = this.page.mainFrame();
    const navigated = this.page
      .waitForEvent('framenavigated', { predicate: (f) => f === main, timeout: timeoutMs })
      .catch(() => undefined);
    let clicked = false;
    for (const name of buttons) {
      if (await this.hasButton(name)) {
        await this.button(name).click({ timeout: timeoutMs });
        clicked = true;
        break;
      }
    }
    const field = last ? (this.lastFilled ?? this.locator(last)) : undefined;
    if (!clicked) {
      if (!field) return;
      await field.press('Enter', { timeout: timeoutMs });
    }
    const gone = field?.waitFor({ state: 'hidden', timeout: timeoutMs }).catch(() => undefined);
    await Promise.race([navigated, ...(gone ? [gone] : [])]);
    await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }

  async hasText(text: string): Promise<boolean> {
    return this.page.getByText(text).first().isVisible().catch(() => false);
  }

  async errorText(): Promise<string | undefined> {
    const text = await this.page
      .locator('[role="alert"], [class*="error" i], [id*="error" i], [class*="alert" i]')
      .locator('visible=true')
      .first()
      .innerText({ timeout: 300 })
      .catch(() => '');
    const clean = text.replace(/\s+/g, ' ').trim();
    return clean ? clean.slice(0, 200) : undefined;
  }

  wait(ms: number): Promise<void> {
    return this.page.waitForTimeout(ms);
  }
}
