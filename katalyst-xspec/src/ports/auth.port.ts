import type { World } from '../world';

export type UiLoginOptions = {
  /** Log in through the form once per role (per worker), then restore the saved session. */
  reuseSession?: boolean;
};

export interface AuthPort {
  apiLoginAsAdmin(world: World): Promise<void>;
  apiLoginAsUser(world: World): Promise<void>;
  apiSetBearer(world: World, token: string): void;

  uiLoginAsAdmin(world: World): Promise<void>;
  uiLoginAsUser(world: World): Promise<void>;

  /**
   * Log in to the API as any named role. Optional so pre-0.8 custom adapters
   * keep compiling; the built-in steps fall back to the admin/user methods.
   */
  apiLoginAs?(world: World, role: string): Promise<void>;
  /** Log in through the UI as any named role. */
  uiLoginAs?(world: World, role: string, options?: UiLoginOptions): Promise<void>;
}
