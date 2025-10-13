/**
 * TUI Port Interface
 *
 * Defines the contract for terminal user interface testing operations.
 * Aligned with UiPort patterns for consistency across testing approaches.
 */

/** Keyboard modifier keys for key combinations */
export type TuiKeyModifiers = {
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
};

/** Options for wait operations */
export type TuiWaitOptions = {
  /** Maximum time to wait in milliseconds */
  timeout?: number;
  /** Polling interval in milliseconds */
  interval?: number;
};

/** Captured screen state */
export type TuiScreenCapture = {
  /** Full screen text content */
  text: string;
  /** Screen content split by lines */
  lines: string[];
  /** Timestamp when capture was taken */
  timestamp: number;
  /** Terminal dimensions */
  size: { cols: number; rows: number };
};

/** Result of snapshot comparison */
export type TuiSnapshotResult = {
  /** Whether the snapshot matched */
  pass: boolean;
  /** Diff output if snapshot didn't match */
  diff?: string;
  /** Path to the snapshot file */
  snapshotPath?: string;
};

/** Mouse button types */
export type TuiMouseButton = 'left' | 'right' | 'middle';

/** Mouse event types */
export type TuiMouseEventType = 'click' | 'down' | 'up' | 'drag' | 'scroll';

/** Mouse event configuration */
export type TuiMouseEvent = {
  type: TuiMouseEventType;
  position: { x: number; y: number };
  button?: TuiMouseButton;
};

/** Configuration for TUI adapter initialization */
export type TuiConfig = {
  /** Command to start the TUI application (e.g., ['node', 'cli.js']) */
  command: string[];
  /** Terminal size (defaults to 80x24) */
  size?: { cols: number; rows: number };
  /** Working directory for the command */
  cwd?: string;
  /** Environment variables */
  env?: Record<string, string>;
  /** Enable debug output */
  debug?: boolean;
  /** Directory for snapshot storage */
  snapshotDir?: string;
  /** Shell to use (defaults to system shell) */
  shell?: string;
};

/**
 * Port interface for terminal user interface testing.
 *
 * This interface follows the same patterns as UiPort to enable:
 * - Consistent step definitions across UI and TUI tests
 * - Easy mental model for test authors
 * - Potential for shared/hybrid testing scenarios
 */
export interface TuiPort {
  // ═══════════════════════════════════════════════════════════════════════════
  // Lifecycle Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Start the TUI application.
   * Creates a new terminal session and launches the configured command.
   */
  start(): Promise<void>;

  /**
   * Stop the TUI application.
   * Terminates the terminal session and cleans up resources.
   */
  stop(): Promise<void>;

  /**
   * Restart the TUI application.
   * Equivalent to stop() followed by start().
   */
  restart(): Promise<void>;

  /**
   * Check if the TUI application is currently running.
   */
  isRunning(): boolean;

  // ═══════════════════════════════════════════════════════════════════════════
  // Input Methods (aligned with UiPort patterns)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Type text into the terminal.
   * Similar to UiPort.typeText - sends characters one by one.
   * @param text - The text to type
   * @param options - Optional typing options
   */
  typeText(text: string, options?: { delay?: number }): Promise<void>;

  /**
   * Press a keyboard key, optionally with modifiers.
   * Similar to UiPort.pressKey.
   * @param key - Key name (e.g., 'enter', 'tab', 'up', 'down', 'f1')
   * @param modifiers - Optional modifier keys
   */
  pressKey(key: string, modifiers?: TuiKeyModifiers): Promise<void>;

  /**
   * Send raw text without any interpretation.
   * Useful for pasting content or sending special sequences.
   * @param text - Raw text to send
   */
  sendText(text: string): Promise<void>;

  /**
   * Fill a labeled field in the TUI.
   * Navigates to the field and enters the value.
   * Similar to UiPort.fillLabel.
   * @param fieldLabel - The label or identifier of the field
   * @param value - The value to enter
   */
  fillField(fieldLabel: string, value: string): Promise<void>;

  /**
   * Select an option/menu item.
   * Similar to UiPort.clickButton conceptually.
   * @param option - The option text to select
   */
  selectOption(option: string): Promise<void>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Mouse Methods (TUI-specific, for apps with mouse support)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Send a mouse event to the terminal.
   * Only works if the TUI application supports mouse input.
   * @param event - Mouse event configuration
   */
  sendMouse(event: TuiMouseEvent): Promise<void>;

  /**
   * Click at a specific position.
   * @param x - Column position (0-based)
   * @param y - Row position (0-based)
   * @param button - Mouse button (defaults to 'left')
   */
  click(x: number, y: number, button?: TuiMouseButton): Promise<void>;

  /**
   * Click on text content in the terminal.
   * Finds the text and clicks on its position.
   * @param text - The text to find and click
   */
  clickOnText(text: string): Promise<void>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Assertion Methods (aligned with UiPort patterns)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Assert that text is visible on the screen.
   * Waits for the text to appear within timeout.
   * Similar to UiPort.expectText.
   * @param text - The expected text
   * @param options - Wait options
   */
  expectText(text: string, options?: TuiWaitOptions): Promise<void>;

  /**
   * Assert that text matching a pattern is visible.
   * @param pattern - Regular expression to match
   * @param options - Wait options
   */
  expectPattern(pattern: RegExp, options?: TuiWaitOptions): Promise<void>;

  /**
   * Assert that text is NOT visible on the screen.
   * @param text - The text that should not be present
   */
  expectNotText(text: string): Promise<void>;

  /**
   * Assert the screen contains specific text (immediate check, no wait).
   * @param text - The expected text
   */
  assertScreenContains(text: string): Promise<void>;

  /**
   * Assert the screen matches a regular expression.
   * @param pattern - Regular expression to match against screen content
   */
  assertScreenMatches(pattern: RegExp): Promise<void>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Wait Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Wait for text to appear on screen.
   * @param text - Text to wait for
   * @param options - Wait options
   */
  waitForText(text: string, options?: TuiWaitOptions): Promise<void>;

  /**
   * Wait for text matching pattern to appear.
   * @param pattern - Regular expression to match
   * @param options - Wait options
   */
  waitForPattern(pattern: RegExp, options?: TuiWaitOptions): Promise<void>;

  /**
   * Wait for the application to be ready.
   * Implementation-specific (e.g., wait for prompt, initial screen).
   */
  waitForReady(): Promise<void>;

  /**
   * Wait for a specific duration.
   * Similar to UiPort.waitSeconds.
   * @param seconds - Duration to wait in seconds
   */
  waitSeconds(seconds: number): Promise<void>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Screen Capture Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Capture the current screen state.
   * @returns Screen capture with text content and metadata
   */
  captureScreen(): Promise<TuiScreenCapture>;

  /**
   * Get the current screen text content.
   * @returns Plain text representation of the screen
   */
  getScreenText(): Promise<string>;

  /**
   * Get screen content as lines.
   * @returns Array of screen lines
   */
  getScreenLines(): Promise<string[]>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Snapshot Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Take a snapshot of the current screen state.
   * Saves to the configured snapshot directory.
   * @param name - Snapshot identifier
   */
  takeSnapshot(name: string): Promise<void>;

  /**
   * Compare current screen against a saved snapshot.
   * @param name - Snapshot identifier to compare against
   * @returns Comparison result with pass/fail and diff
   */
  matchSnapshot(name: string): Promise<TuiSnapshotResult>;

  // ═══════════════════════════════════════════════════════════════════════════
  // Utility Methods
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Clear the terminal screen.
   */
  clear(): Promise<void>;

  /**
   * Resize the terminal.
   * @param size - New dimensions
   */
  resize(size: { cols: number; rows: number }): Promise<void>;

  /**
   * Get the current terminal size.
   */
  getSize(): { cols: number; rows: number };

  /**
   * Get the current configuration.
   */
  getConfig(): TuiConfig;
}
