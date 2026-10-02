/**
 * UI Auth Step Definitions
 *
 * Steps for authenticating in UI tests using fetch interception.
 * Tagged with @ui for selective execution.
 */

import { createBdd } from 'playwright-bdd';
import {
  setupFetchIntercept,
  setupBypassAuth,
  setupBearerAuth,
  defaultBypassConfig,
  type FetchInterceptAuthData,
} from '../adapters/ui/fetch-intercept-auth.adapter';
import { interpolate } from '../utils';

export function registerUiAuthSteps(test: any): void {
  const { Given } = createBdd(test as any) as any;

  /**
   * Authenticate in UI with roles using fetch interception (bypass mode).
   * This injects x-user-id, x-tenant-id, and x-user-roles headers into all API calls.
   *
   * @example
   * Given I am authenticated in UI as "pm,analyst"
   * Given I am authenticated in UI as "admin"
   */
  Given(
    'I am authenticated in UI as {string}',
    { tags: '@ui' },
    async ({ page, world }: any, rolesStr: string) => {
      const roles = rolesStr.split(',').map((r: string) => r.trim());
      const testRunId = world.testRunId || world.vars.test_run_id || Date.now();
      const userId = `test-user-${testRunId}`;

      // Admin users don't have a tenantId, others default to org-a
      const isAdmin = roles.includes('admin');
      const tenantId = isAdmin ? undefined : 'org-a';

      await setupBypassAuth(page, userId, roles, tenantId);

      // Store in world for reference
      world.vars.currentUserId = userId;
      world.vars.currentRoles = roles.join(',');
      if (tenantId) {
        world.vars.currentTenantId = tenantId;
      }

      console.log(`[BDD] UI authenticated as ${roles.join(', ')} (user: ${userId})`);
    }
  );

  /**
   * Authenticate in UI with roles and specific tenant.
   *
   * @example
   * Given I am authenticated in UI as "pm" for tenant "org-b"
   */
  Given(
    'I am authenticated in UI as {string} for tenant {string}',
    { tags: '@ui' },
    async ({ page, world }: any, rolesStr: string, tenantId: string) => {
      const roles = rolesStr.split(',').map((r: string) => r.trim());
      const testRunId = world.testRunId || world.vars.test_run_id || Date.now();
      const userId = `test-user-${testRunId}`;
      const resolvedTenantId = interpolate(tenantId, world.vars);

      await setupBypassAuth(page, userId, roles, resolvedTenantId);

      world.vars.currentUserId = userId;
      world.vars.currentTenantId = resolvedTenantId;
      world.vars.currentRoles = roles.join(',');

      console.log(`[BDD] UI authenticated as ${roles.join(', ')} for tenant ${resolvedTenantId}`);
    }
  );

  /**
   * Authenticate in UI with specific user ID.
   *
   * @example
   * Given I am authenticated in UI as "analyst" with id "user-123"
   */
  Given(
    'I am authenticated in UI as {string} with id {string}',
    { tags: '@ui' },
    async ({ page, world }: any, rolesStr: string, userId: string) => {
      const roles = rolesStr.split(',').map((r: string) => r.trim());
      const resolvedUserId = interpolate(userId, world.vars);
      const tenantId = 'org-a';

      await setupBypassAuth(page, resolvedUserId, roles, tenantId);

      world.vars.currentUserId = resolvedUserId;
      world.vars.currentTenantId = tenantId;
      world.vars.currentRoles = roles.join(',');

      console.log(`[BDD] UI authenticated as ${roles.join(', ')} with id ${resolvedUserId}`);
    }
  );

  /**
   * Authenticate in UI with a bearer token.
   *
   * @example
   * Given I am authenticated in UI with bearer token "{access_token}"
   */
  Given(
    'I am authenticated in UI with bearer token {string}',
    { tags: '@ui' },
    async ({ page, world }: any, token: string) => {
      const resolvedToken = interpolate(token, world.vars);
      await setupBearerAuth(page, resolvedToken);
      console.log('[BDD] UI authenticated with bearer token');
    }
  );

  /**
   * Authenticate in UI with custom headers.
   *
   * @example
   * Given I am authenticated in UI with headers:
   *   | header        | value         |
   *   | x-user-id     | custom-user   |
   *   | x-api-key     | secret-key    |
   */
  Given(
    'I am authenticated in UI with headers:',
    { tags: '@ui' },
    async ({ page, world }: any, dataTable: any) => {
      const rows = dataTable.hashes ? dataTable.hashes() : dataTable.rawTable?.slice(1).map((row: string[]) => ({
        header: row[0],
        value: row[1],
      })) || [];

      const headers: Record<string, string> = {};
      for (const row of rows) {
        headers[row.header] = interpolate(row.value, world.vars);
      }

      await setupFetchIntercept(
        page,
        { userId: headers['x-user-id'] || '', roles: (headers['x-user-roles'] || '').split(','), tenantId: headers['x-tenant-id'] },
        {
          urlPattern: '/api/',
          headers,
          localStorageKey: 'mockAuth',
        }
      );

      console.log(`[BDD] UI authenticated with custom headers: ${Object.keys(headers).join(', ')}`);
    }
  );

  /**
   * Switch to a different user in UI mid-test.
   *
   * @example
   * Given I switch UI user to "reviewer" with id "reviewer-user-1"
   */
  Given(
    'I switch UI user to {string} with id {string}',
    { tags: '@ui' },
    async ({ page, world }: any, rolesStr: string, userId: string) => {
      const roles = rolesStr.split(',').map((r: string) => r.trim());
      const resolvedUserId = interpolate(userId, world.vars);
      const tenantId = world.vars.currentTenantId || 'org-a';

      // Need to reload page to clear previous intercept, then set up new one
      await page.reload();
      await setupBypassAuth(page, resolvedUserId, roles, tenantId);

      world.vars.currentUserId = resolvedUserId;
      world.vars.currentRoles = roles.join(',');

      console.log(`[BDD] UI switched to user ${resolvedUserId} with roles ${roles.join(', ')}`);
    }
  );
}
