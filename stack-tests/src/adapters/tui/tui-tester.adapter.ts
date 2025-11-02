/**
 * TUI Tester Adapter
 *
 * Implements TuiPort using the tui-tester library (https://github.com/luxquant/tui-tester).
 * Provides end-to-end testing capabilities for terminal user interfaces via tmux.
 */

import type {
  TuiPort,
  TuiConfig,
  TuiKeyModifiers,
  TuiWaitOptions,
  TuiScreenCapture,
  TuiSnapshotResult,
  TuiMouseEvent,
  TuiMouseButton,
} from '../../ports/tui.port';

// Type definitions for tui-tester (since it may not have complete types)
interface TmuxTesterOptions {
  command: string[];
  size?: { cols: number; rows: number };
  cwd?: string;
  env?: Record<string, string>;
  debug?: boolean;
  shell?: string;
  sessionName?: string;
  snapshotDir?: string;
}

interface TmuxTester {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  isRunning(): boolean;
  sendText(text: string): Promise<void>;
  sendKey(key: string, modifiers?: { ctrl?: boolean; alt?: boolean; shift?: boolean }): Promise<void>;
  typeText(text: string, delay?: number): Promise<void>;
  sendMouse(event: { type: string; position: { x: number; y: number }; button?: string }): Promise<void>;
  waitForText(text: string, options?: { timeout?: number }): Promise<void>;
  waitForPattern(pattern: RegExp, options?: { timeout?: number }): Promise<void>;
  captureScreen(): Promise<{ text: string; lines?: string[] }>;
  getScreenText(): Promise<string>;
  getScreenLines(): Promise<string[]>;
  assertScreenContains(text: string): Promise<void>;
  takeSnapshot(name: string): Promise<void>;
  compareSnapshot(name: string): Promise<{ pass: boolean; diff?: string }>;
  clear(): Promise<void>;
  resize(size: { cols: number; rows: number }): Promise<void>;
  getSize(): { cols: number; rows: number };
  sleep(ms: number): Promise<void>;
}

// Dynamic import type for tui-tester
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TuiTesterModule = {
  TmuxTester: new (options: TmuxTesterOptions) => TmuxTester;
  createTester: (command: string, options?: Partial<TmuxTesterOptions>) => TmuxTester;
  // Allow additional exports
  [key: string]: unknown;
};

/**
 * Default wait options for assertions
 */
const DEFAULT_WAIT_OPTIONS: TuiWaitOptions = {
  timeout: 30000,
  interval: 100,
};

/**
 * Map of common key names to tui-tester key names
 */
const KEY_MAP: Record<string, string> = {
  enter: 'enter',
  return: 'enter',
  tab: 'tab',
  escape: 'escape',
  esc: 'escape',
  backspace: 'backspace',
  delete: 'delete',
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right',
  home: 'home',
  end: 'end',
  pageup: 'pageup',
  pagedown: 'pagedown',
  space: 'space',
  f1: 'f1',
  f2: 'f2',
  f3: 'f3',
  f4: 'f4',
  f5: 'f5',
  f6: 'f6',
  f7: 'f7',
  f8: 'f8',
  f9: 'f9',
  f10: 'f10',
  f11: 'f11',
  f12: 'f12',
};

export class TuiTesterAdapter implements TuiPort {
  private tester: TmuxTester | null = null;
  private config: TuiConfig;
  private running = false;
  private tuiTesterModule: TuiTesterModule | null = null;

  constructor(config: TuiConfig) {
    this.config = {
      size: { cols: 80, rows: 24 },
      ...config,
    };
  }

  /**
   * Lazily load the tui-tester module to support optional dependency
   */
  private async loadTuiTester(): Promise<TuiTesterModule> {
    if (this.tuiTesterModule) {
      return this.tuiTesterModule;
    }

    try {
      // Dynamic import with type assertion for optional dependency
      // @ts-expect-error - tui-tester is an optional peer dependency
      const module = await import('tui-tester') as TuiTesterModule;
      this.tuiTesterModule = module;
      return module;
    } catch (error) {
      throw new Error(
        'tui-tester is not installed. Please install it with: npm install tui-tester\n' +
          'Also ensure tmux is installed on your system.',
      );
    }
  }

  /**
   * Get the tester instance, throwing if not started
   */
  private getTester(): TmuxTester {
    if (!this.tester) {
      throw new Error('TUI tester not started. Call start() first.');
    }
    return this.tester;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async start(): Promise<void> {
    if (this.running) {
      return;
    }

    const { TmuxTester } = await this.loadTuiTester();

    this.tester = new TmuxTester({
      command: this.config.command,
      size: this.config.size,
      cwd: this.config.cwd,
      env: this.config.env,
      debug: this.config.debug,
      shell: this.config.shell,
      snapshotDir: this.config.snapshotDir,
    });

    await this.tester.start();
    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running || !this.tester) {
      return;
    }

    try {
      await this.tester.stop();
    } finally {
      this.running = false;
      this.tester = null;
    }
  }

  async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  isRunning(): boolean {
    return this.running && this.tester !== null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Input Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async typeText(text: string, options?: { delay?: number }): Promise<void> {
    const tester = this.getTester();
    await tester.typeText(text, options?.delay);
  }

  async pressKey(key: string, modifiers?: TuiKeyModifiers): Promise<void> {
    const tester = this.getTester();
    const normalizedKey = KEY_MAP[key.toLowerCase()] || key.toLowerCase();

    await tester.sendKey(normalizedKey, {
      ctrl: modifiers?.ctrl,
      alt: modifiers?.alt,
      shift: modifiers?.shift,
    });
  }

  async sendText(text: string): Promise<void> {
    const tester = this.getTester();
    await tester.sendText(text);
  }

  async fillField(fieldLabel: string, value: string): Promise<void> {
    const tester = this.getTester();

    // Strategy: Look for the field label, then type the value
    // This is a simplified implementation - real apps may need custom logic
    await tester.waitForText(fieldLabel, { timeout: DEFAULT_WAIT_OPTIONS.timeout });

    // Type the value
    await tester.typeText(value);
  }

  async selectOption(option: string): Promise<void> {
    const tester = this.getTester();

    // Strategy: Wait for option to be visible, then try to select it
    await tester.waitForText(option, { timeout: DEFAULT_WAIT_OPTIONS.timeout });

    // Send enter to select (common pattern for menu selections)
    await tester.sendKey('enter');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Mouse Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async sendMouse(event: TuiMouseEvent): Promise<void> {
    const tester = this.getTester();
    await tester.sendMouse({
      type: event.type,
      position: event.position,
      button: event.button,
    });
  }

  async click(x: number, y: number, button: TuiMouseButton = 'left'): Promise<void> {
    await this.sendMouse({
      type: 'click',
      position: { x, y },
      button,
    });
  }

  async clickOnText(text: string): Promise<void> {
    const tester = this.getTester();

    // Get screen content and find text position
    const lines = await tester.getScreenLines();
    let found = false;

    for (let y = 0; y < lines.length; y++) {
      const x = lines[y].indexOf(text);
      if (x !== -1) {
        await this.click(x, y);
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error(`Text "${text}" not found on screen`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Assertion Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async expectText(text: string, options?: TuiWaitOptions): Promise<void> {
    const tester = this.getTester();
    const opts = { ...DEFAULT_WAIT_OPTIONS, ...options };

    await tester.waitForText(text, { timeout: opts.timeout });
  }

  async expectPattern(pattern: RegExp, options?: TuiWaitOptions): Promise<void> {
    const tester = this.getTester();
    const opts = { ...DEFAULT_WAIT_OPTIONS, ...options };

    await tester.waitForPattern(pattern, { timeout: opts.timeout });
  }

  async expectNotText(text: string): Promise<void> {
    const screenText = await this.getScreenText();

    if (screenText.includes(text)) {
      throw new Error(`Expected text "${text}" to NOT be present on screen, but it was found.`);
    }
  }

  async assertScreenContains(text: string): Promise<void> {
    const tester = this.getTester();
    await tester.assertScreenContains(text);
  }

  async assertScreenMatches(pattern: RegExp): Promise<void> {
    const screenText = await this.getScreenText();

    if (!pattern.test(screenText)) {
      throw new Error(`Screen content does not match pattern: ${pattern}\nScreen content:\n${screenText}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Wait Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async waitForText(text: string, options?: TuiWaitOptions): Promise<void> {
    await this.expectText(text, options);
  }

  async waitForPattern(pattern: RegExp, options?: TuiWaitOptions): Promise<void> {
    await this.expectPattern(pattern, options);
  }

  async waitForReady(): Promise<void> {
    const tester = this.getTester();
    // Wait a short time for the application to initialize
    // Real implementations might wait for a specific prompt or screen
    await tester.sleep(500);
  }

  async waitSeconds(seconds: number): Promise<void> {
    const tester = this.getTester();
    await tester.sleep(seconds * 1000);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Screen Capture Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async captureScreen(): Promise<TuiScreenCapture> {
    const tester = this.getTester();
    const capture = await tester.captureScreen();
    const lines = capture.lines || (await tester.getScreenLines());

    return {
      text: capture.text,
      lines,
      timestamp: Date.now(),
      size: this.getSize(),
    };
  }

  async getScreenText(): Promise<string> {
    const tester = this.getTester();
    return tester.getScreenText();
  }

  async getScreenLines(): Promise<string[]> {
    const tester = this.getTester();
    return tester.getScreenLines();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Snapshot Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async takeSnapshot(name: string): Promise<void> {
    const tester = this.getTester();
    await tester.takeSnapshot(name);
  }

  async matchSnapshot(name: string): Promise<TuiSnapshotResult> {
    const tester = this.getTester();

    try {
      const result = await tester.compareSnapshot(name);
      return {
        pass: result.pass,
        diff: result.diff,
      };
    } catch (error) {
      // If snapshot doesn't exist, create it (first run behavior)
      if (error instanceof Error && error.message.includes('not found')) {
        await this.takeSnapshot(name);
        return { pass: true };
      }
      throw error;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async clear(): Promise<void> {
    const tester = this.getTester();
    await tester.clear();
  }

  async resize(size: { cols: number; rows: number }): Promise<void> {
    const tester = this.getTester();
    await tester.resize(size);
    this.config.size = size;
  }

  getSize(): { cols: number; rows: number } {
    if (this.tester) {
      return this.tester.getSize();
    }
    return this.config.size || { cols: 80, rows: 24 };
  }

  getConfig(): TuiConfig {
    return { ...this.config };
  }
}
