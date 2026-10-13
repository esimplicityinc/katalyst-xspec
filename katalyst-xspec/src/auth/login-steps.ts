import type { AuthPort, UiLoginOptions } from '../ports/auth.port';
import type { World } from '../world';
import { interpolate } from '../utils';
import { oneTimeCode } from './otp';

/** Log in to the API as a role, supporting pre-0.8 adapters that only know admin/user. */
export async function apiLoginAsRole(auth: AuthPort, world: World, role: string): Promise<void> {
  const name = interpolate(role, world.vars);
  if (auth.apiLoginAs) return auth.apiLoginAs(world, name);
  if (name === 'admin') return auth.apiLoginAsAdmin(world);
  if (name === 'user') return auth.apiLoginAsUser(world);
  throw new Error(`Your auth adapter doesn't implement apiLoginAs(world, role), so it can't log in as "${name}".`);
}

/** Log in through the UI as a role, supporting pre-0.8 adapters that only know admin/user. */
export async function uiLoginAsRole(auth: AuthPort, world: World, role: string, options?: UiLoginOptions): Promise<void> {
  const name = interpolate(role, world.vars);
  if (auth.uiLoginAs) return auth.uiLoginAs(world, name, options);
  if (name === 'admin') return auth.uiLoginAsAdmin(world);
  if (name === 'user') return auth.uiLoginAsUser(world);
  throw new Error(`Your auth adapter doesn't implement uiLoginAs(world, role), so it can't log in as "${name}".`);
}

/** The role's current one-time code, from the auth adapter or, for adapters without oneTimeCodeFor, from AUTH_<ROLE>_OTP_*. */
export async function oneTimeCodeForRole(auth: AuthPort | undefined, world: World, role: string): Promise<string> {
  const name = interpolate(role, world.vars);
  // Codes sent by email count only if they arrived during this scenario.
  const since = world.startedAt ? new Date(world.startedAt - 2000) : undefined;
  if (auth?.oneTimeCodeFor) return auth.oneTimeCodeFor(name, { since });
  return oneTimeCode(name);
}
