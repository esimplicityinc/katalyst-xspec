/**
 * Just enough HTML form parsing to submit a provider's login page without a
 * browser: finds forms, their action/method and inputs. Server-rendered login
 * pages (Keycloak, Okta, Auth0 Universal Login) are simple enough for this;
 * pages that build the form in JavaScript need the browser driver.
 */

export type HtmlInput = { name: string; type: string; value: string };
export type HtmlForm = { action?: string; method: 'GET' | 'POST'; inputs: HtmlInput[]; hasSubmit: boolean };

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === '#') {
      const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e.toLowerCase()] ?? m;
  });
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = m[1].toLowerCase();
    if (name in out) continue;
    out[name] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

export function parseForms(html: string): HtmlForm[] {
  const forms: HtmlForm[] = [];
  const clean = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<script\b[\s\S]*?<\/script>/gi, '');
  for (const m of clean.matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
    const a = attrs(m[1]);
    const inputs: HtmlInput[] = [];
    let hasSubmit = false;
    for (const t of m[2].matchAll(/<(input|button|textarea|select)\b([^>]*)>/gi)) {
      const el = t[1].toLowerCase();
      const ia = attrs(t[2]);
      const type = (ia.type || (el === 'button' ? 'submit' : el === 'input' ? 'text' : el)).toLowerCase();
      if (type === 'submit' || type === 'image') hasSubmit = true;
      if (!ia.name || 'disabled' in ia) continue;
      if (['checkbox', 'radio'].includes(type) && !('checked' in ia)) continue;
      inputs.push({ name: ia.name, type, value: ia.value ?? '' });
    }
    forms.push({ action: a.action || undefined, method: (a.method || 'get').toUpperCase() === 'POST' ? 'POST' : 'GET', inputs, hasSubmit });
  }
  return forms;
}

const USERNAME_TYPES = new Set(['text', 'email', 'tel']);

/** The form that asks for a username and/or password, with which fields to fill. */
export function findLoginForm(
  forms: HtmlForm[],
  { usernameField, passwordField }: { usernameField?: string; passwordField?: string } = {},
): { form: HtmlForm; username?: string; password?: string } | undefined {
  for (const form of forms) {
    const password = passwordField
      ? form.inputs.find((i) => i.name === passwordField)?.name
      : form.inputs.find((i) => i.type === 'password')?.name;
    const username = usernameField
      ? form.inputs.find((i) => i.name === usernameField)?.name
      : form.inputs.find((i) => USERNAME_TYPES.has(i.type) && /user|email|login|name|identifier/i.test(i.name))?.name ??
        (password ? form.inputs.find((i) => USERNAME_TYPES.has(i.type))?.name : undefined);
    if (password || username) return { form, username, password };
  }
  return undefined;
}

/** Form fields to submit: every named input except other submit buttons; the first submit button is included. */
export function formFields(form: HtmlForm, values: Record<string, string>): Record<string, string> {
  const fields: Record<string, string> = {};
  let submitIncluded = false;
  for (const input of form.inputs) {
    if (input.type === 'submit' || input.type === 'image') {
      if (submitIncluded) continue;
      submitIncluded = true;
    }
    if (input.type === 'file') continue;
    fields[input.name] = input.value;
  }
  return { ...fields, ...values };
}

/** Visible error text on a login page (elements whose class or id mentions error/alert/feedback). */
export function pageErrorText(html: string): string | undefined {
  const clean = html.replace(/<script\b[\s\S]*?<\/script>/gi, '').replace(/<style\b[\s\S]*?<\/style>/gi, '');
  for (const m of clean.matchAll(/<(\w+)\b[^>]*(?:class|id)\s*=\s*["'][^"']*(?:error|alert|feedback)[^"']*["'][^>]*>([\s\S]*?)<\/\1>/gi)) {
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
    if (text) return text.length > 200 ? `${text.slice(0, 200)}…` : text;
  }
  return undefined;
}

export function pageTitle(html: string): string | undefined {
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return t ? decodeEntities(t).replace(/\s+/g, ' ').trim() : undefined;
}
