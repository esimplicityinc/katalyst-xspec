/**
 * Where tests point: the frontend (UI) and the API.
 *
 * Canonical variables are FRONTEND_URL and API_BASE_URL. BASE_URL and
 * TARGET_BASE_URL are accepted as older aliases. When no API URL is set, API
 * requests go to the frontend URL, so same-origin apps (`/api/...`) and
 * scenarios that mix API and UI steps work with a single setting.
 */
type Env = Record<string, string | undefined>;

const DEFAULT_URL = 'http://localhost:3000';

export type Targets = {
  frontendUrl: string;
  frontendSource: 'FRONTEND_URL' | 'BASE_URL' | 'default';
  apiBaseUrl: string;
  apiSource: 'API_BASE_URL' | 'TARGET_BASE_URL' | 'TARGET_PORT' | 'FRONTEND_URL' | 'default';
};

/** Resolve the frontend and API targets from environment variables. */
export function resolveTargets(env: Env = process.env): Targets {
  const frontend = env.FRONTEND_URL
    ? { frontendUrl: env.FRONTEND_URL, frontendSource: 'FRONTEND_URL' as const }
    : env.BASE_URL
      ? { frontendUrl: env.BASE_URL, frontendSource: 'BASE_URL' as const }
      : { frontendUrl: DEFAULT_URL, frontendSource: 'default' as const };

  const api = env.API_BASE_URL
    ? { apiBaseUrl: env.API_BASE_URL, apiSource: 'API_BASE_URL' as const }
    : env.TARGET_BASE_URL
      ? { apiBaseUrl: env.TARGET_BASE_URL, apiSource: 'TARGET_BASE_URL' as const }
      : env.TARGET_PORT
        ? { apiBaseUrl: `http://localhost:${env.TARGET_PORT}`, apiSource: 'TARGET_PORT' as const }
        : frontend.frontendSource !== 'default'
          ? { apiBaseUrl: frontend.frontendUrl, apiSource: 'FRONTEND_URL' as const }
          : { apiBaseUrl: DEFAULT_URL, apiSource: 'default' as const };

  return { ...frontend, ...api };
}

/**
 * Base URL for the API request context in a given Playwright project.
 * Order: API_BASE_URL > TARGET_BASE_URL > baseURL of a project named like
 * "api" > TARGET_PORT > the project's baseURL (any project) > localhost:3000.
 */
export function resolveApiBaseUrl({
  env = process.env,
  projectName = '',
  projectBaseURL,
}: {
  env?: Env;
  projectName?: string;
  projectBaseURL?: string;
}): string {
  return (
    env.API_BASE_URL ||
    env.TARGET_BASE_URL ||
    (projectName.includes('api') ? projectBaseURL : undefined) ||
    (env.TARGET_PORT ? `http://localhost:${env.TARGET_PORT}` : undefined) ||
    projectBaseURL ||
    DEFAULT_URL
  );
}

export function formatTargets(t: Targets): string {
  return `katalyst-xspec targets: UI ${t.frontendUrl} (${t.frontendSource}) | API ${t.apiBaseUrl} (${t.apiSource})`;
}

/** Only the main `playwright test` process logs (not workers, not bddgen). */
export function shouldLogTargets(env: Env = process.env, argv: string[] = process.argv): boolean {
  const quiet = env.KATALYST_XSPEC_QUIET?.trim().toLowerCase();
  if (quiet && quiet !== 'false' && quiet !== '0') return false;
  if (env.TEST_WORKER_INDEX !== undefined) return false;
  if (argv.some((a) => /bddgen/.test(a))) return false;
  return true;
}

/**
 * Print the resolved targets once per run. Call from playwright.config.ts.
 * Silence with KATALYST_XSPEC_QUIET=true.
 */
export function logTargets(targets: Targets = resolveTargets()): Targets {
  if (shouldLogTargets()) console.log(formatTargets(targets));
  return targets;
}
