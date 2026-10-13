import type { MailMessage, MailPort, MailQuery } from '../../ports/mail.port';

type Fetch = typeof fetch;

type MailpitAddress = { Name?: string; Address: string };
type MailpitSummary = { ID: string; From?: MailpitAddress; To?: MailpitAddress[]; Subject?: string; Created?: string };
type MailpitMessage = MailpitSummary & { Date?: string; Text?: string; HTML?: string };

export type MailpitAdapterOptions = {
  /** Mailpit's web/API address, e.g. http://localhost:8025 (MAIL_API_URL). */
  baseUrl: string;
  /** How many recent messages to search. Default 50. */
  searchLimit?: number;
  pollMs?: number;
  fetch?: Fetch;
};

/** MailPort for Mailpit (https://mailpit.axllent.org), using its REST API. */
export class MailpitAdapter implements MailPort {
  private readonly baseUrl: string;
  private readonly searchLimit: number;
  private readonly pollMs: number;
  private readonly fetch: Fetch;

  constructor(options: MailpitAdapterOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.searchLimit = options.searchLimit ?? 50;
    this.pollMs = options.pollMs ?? 250;
    this.fetch = options.fetch ?? fetch;
  }

  private async request<T>(method: string, path: string): Promise<T> {
    let res: Response;
    try {
      res = await this.fetch(`${this.baseUrl}${path}`, { method, headers: { Accept: 'application/json' } });
    } catch (err) {
      throw new Error(`Mailpit at ${this.baseUrl} is not reachable (${(err as Error).message}). Check MAIL_API_URL and that Mailpit is running.`);
    }
    if (!res.ok) throw new Error(`Mailpit ${method} ${path} returned ${res.status}. Check MAIL_API_URL (${this.baseUrl}).`);
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }

  private matches(m: MailpitSummary, q: MailQuery): boolean {
    if (q.to && !(m.To || []).some((a) => a.Address.toLowerCase() === q.to!.toLowerCase())) return false;
    if (q.subject && !(m.Subject || '').toLowerCase().includes(q.subject.toLowerCase())) return false;
    if (q.since && m.Created && new Date(m.Created).getTime() < q.since.getTime()) return false;
    return true;
  }

  async latest(query: MailQuery): Promise<MailMessage | undefined> {
    const list = await this.request<{ messages?: MailpitSummary[] }>('GET', `/api/v1/messages?limit=${this.searchLimit}`);
    const found = (list?.messages || [])
      .filter((m) => this.matches(m, query))
      .sort((a, b) => new Date(b.Created || 0).getTime() - new Date(a.Created || 0).getTime())[0];
    if (!found) return undefined;
    const m = await this.request<MailpitMessage>('GET', `/api/v1/message/${encodeURIComponent(found.ID)}`);
    return {
      id: m.ID,
      from: m.From?.Address || '',
      to: (m.To || []).map((a) => a.Address),
      subject: m.Subject || '',
      text: m.Text || '',
      html: m.HTML || '',
      date: new Date(found.Created || m.Date || Date.now()),
    };
  }

  async waitFor(query: MailQuery, timeoutMs: number): Promise<MailMessage> {
    const deadline = Date.now() + timeoutMs;
    for (;;) {
      const m = await this.latest(query);
      if (m) return m;
      if (Date.now() >= deadline) {
        const what = [query.to && `to ${query.to}`, query.subject && `with subject containing "${query.subject}"`].filter(Boolean).join(' ');
        throw new Error(`No email ${what || 'at all'} arrived within ${timeoutMs}ms (searched the newest ${this.searchLimit} in Mailpit at ${this.baseUrl}).`);
      }
      await new Promise((r) => setTimeout(r, this.pollMs));
    }
  }

  async clear(): Promise<void> {
    await this.request('DELETE', '/api/v1/messages');
  }
}
