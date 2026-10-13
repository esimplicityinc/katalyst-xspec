// A stand-in for a Playwright worker: get the role's session from the shared
// store, "logging in" (appending to LOGINS_FILE) only if no one else has.
import fs from 'node:fs';
import { SessionStore } from '../../auth/session-store.js';

const store = SessionStore.fromEnv();
const key = { role: 'pm', username: 'pm@x.com', loginPath: '/login', app: 'http://app' };

let saved = store.read(key);
if (!saved) {
  await store.withLock(
    key,
    async () => {
      saved = store.read(key);
      if (saved) return;
      fs.appendFileSync(process.env.LOGINS_FILE!, `${process.pid}\n`);
      await new Promise((r) => setTimeout(r, 300)); // a slow login page
      saved = store.write(key, { cookies: [{ name: 'sid', value: 'from-login' }], origins: [] });
    },
    { pollMs: 20 },
  );
}
const cookie = saved!.state.cookies[0];
console.log(`${cookie.name}=${cookie.value}`);
