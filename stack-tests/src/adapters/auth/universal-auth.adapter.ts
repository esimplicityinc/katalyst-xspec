import type { ApiPort } from '../../ports/api.port';
import type { AuthPort } from '../../ports/auth.port';
import type { UiPort } from '../../ports/ui.port';
import type { World } from '../../world';

export class UniversalAuthAdapter implements AuthPort {
  constructor(
    private readonly deps: {
      api: ApiPort;
      ui: UiPort;
    },
  ) {}

  apiSetBearer(world: World, token: string): void {
    world.headers = { ...(world.headers || {}), Authorization: `Bearer ${token}` };
  }

  async apiLoginAsAdmin(world: World): Promise<void> {
    const username = process.env.DEFAULT_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_EMAIL;
    const password = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!username || !password) {
      console.warn('apiLoginAsAdmin skipped: DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD are not set');
      return;
    }
    await this.apiLogin(world, username, password);
  }

  async apiLoginAsUser(world: World): Promise<void> {
    const username = process.env.DEFAULT_USER_USERNAME || process.env.NON_ADMIN_USERNAME;
    const password = process.env.DEFAULT_USER_PASSWORD || process.env.NON_ADMIN_PASSWORD;
    if (!username || !password) {
      console.warn('apiLoginAsUser skipped: DEFAULT_USER_USERNAME and DEFAULT_USER_PASSWORD are not set');
      return;
    }
    await this.apiLogin(world, username, password);
  }

  private async apiLogin(world: World, username: string, password: string): Promise<void> {
    const loginPath = process.env.API_AUTH_LOGIN_PATH || '/auth/login';
    const result = await this.deps.api.sendForm('POST', loginPath, { username, password });
    world.lastStatus = result.status;
    world.lastText = result.text;
    world.lastJson = result.json;
    world.lastHeaders = result.headers;

    const json: any = (result.json || {}) as any;
    const token = json?.access_token;
    if (typeof token !== 'string' || !token) {
      throw new Error(`API login failed for ${username}: ${result.status} ${result.text}`);
    }
    this.apiSetBearer(world, token);
  }

  async uiLoginAsAdmin(world: World): Promise<void> {
    const username = process.env.DEFAULT_ADMIN_USERNAME || process.env.DEFAULT_ADMIN_EMAIL;
    const password = process.env.DEFAULT_ADMIN_PASSWORD;
    if (!username || !password) {
      console.warn('uiLoginAsAdmin skipped: DEFAULT_ADMIN_USERNAME and DEFAULT_ADMIN_PASSWORD are not set');
      return;
    }
    await this.uiLogin(world, username, password);
  }

  async uiLoginAsUser(world: World): Promise<void> {
    const username = process.env.DEFAULT_USER_USERNAME || process.env.NON_ADMIN_USERNAME;
    const password = process.env.DEFAULT_USER_PASSWORD || process.env.NON_ADMIN_PASSWORD;
    if (!username || !password) {
      console.warn('uiLoginAsUser skipped: DEFAULT_USER_USERNAME and DEFAULT_USER_PASSWORD are not set');
      return;
    }
    await this.uiLogin(world, username, password);
  }

  private async uiLogin(_world: World, username: string, password: string): Promise<void> {
    const loginPath = process.env.UI_LOGIN_PATH || '/login';
    const usernameField = process.env.UI_USERNAME_FIELD || 'Username';
    const passwordField = process.env.UI_PASSWORD_FIELD || 'Password';
    const loginButton = process.env.UI_LOGIN_BUTTON || 'Login';

    await this.deps.ui.goto(loginPath);
    await this.deps.ui.fillPlaceholder(usernameField, username);
    await this.deps.ui.fillPlaceholder(passwordField, password);
    await this.deps.ui.clickButton(loginButton);
  }
}
