/**
 * Fox Pilot Client
 *
 * A simple client library for coding agents to control Firefox.
 *
 * @example
 * ```typescript
 * import { FoxPilotClient } from '@fox-pilot/client';
 *
 * const client = new FoxPilotClient();
 * await client.connect();
 *
 * await client.navigate('https://example.com');
 * await client.click('#button');
 * const { text } = await client.getText('.content');
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export interface ClientOptions {
  url?: string;
  token?: string;
}

export interface SnapshotOptions {
  interactive?: boolean;
  compact?: boolean;
  depth?: number | null;
  scope?: string | null;
}

export interface ScreenshotOptions {
  fullPage?: boolean;
}

export interface ScrollOptions {
  x?: number;
  y?: number;
  selector?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  amount?: number;
}

export interface FindByRoleOptions {
  name?: string;
  index?: number;
}

export interface FindByTextOptions {
  exact?: boolean;
  index?: number;
}

export interface FindByLabelOptions {
  index?: number;
}

export interface FindByPlaceholderOptions {
  index?: number;
}

export interface Tab {
  id: number;
  url: string;
  title: string;
  active: boolean;
  windowId: number;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
}

interface ResponseMessage {
  id?: string;
  event?: string;
  data?: unknown;
  success?: boolean;
  result?: unknown;
  error?: { code?: string; message?: string };
}

interface FoxPilotError extends Error {
  code?: string;
}

// =============================================================================
// Client
// =============================================================================

export class FoxPilotClient {
  private url: string;
  private token: string;
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<string, PendingRequest>();
  private eventHandlers = new Map<string, Array<(data: unknown) => void>>();

  constructor(options: ClientOptions = {}) {
    this.url = options.url || 'ws://localhost:9222';
    this.token = options.token || process.env.FOX_PILOT_TOKEN || 'default-dev-token';
  }

  /**
   * Connect to Fox Pilot server
   */
  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = async () => {
        try {
          await this.authenticate();
          resolve();
        } catch (error) {
          reject(error);
        }
      };

      this.ws.onmessage = (event) => {
        const data = typeof event.data === 'string' ? event.data : event.data.toString();
        this.handleMessage(JSON.parse(data));
      };

      this.ws.onerror = (error) => {
        reject(error);
      };

      this.ws.onclose = () => {
        for (const [, { reject }] of this.pendingRequests) {
          reject(new Error('Connection closed'));
        }
        this.pendingRequests.clear();
      };
    });
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Authenticate with the server
   */
  private async authenticate(): Promise<void> {
    const result = await this.send<{ authenticated: boolean }>('auth', { token: this.token });
    if (!result.authenticated) {
      throw new Error('Authentication failed');
    }
  }

  /**
   * Send a command and wait for response
   */
  async send<T = unknown>(method: string, params: object = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.ws) {
        reject(new Error('Not connected'));
        return;
      }

      const id = String(++this.requestId);

      this.pendingRequests.set(id, {
        resolve: resolve as (value: unknown) => void,
        reject,
      });

      this.ws.send(JSON.stringify({ id, method, params }));

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`Request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: ResponseMessage): void {
    // Handle events
    if (message.event) {
      const handlers = this.eventHandlers.get(message.event) || [];
      for (const handler of handlers) {
        handler(message.data);
      }
      return;
    }

    // Handle responses
    const { id, success, result, error } = message;
    if (!id) return;

    const pending = this.pendingRequests.get(id);

    if (pending) {
      this.pendingRequests.delete(id);

      if (success) {
        pending.resolve(result);
      } else {
        const err: FoxPilotError = new Error(error?.message || 'Unknown error');
        err.code = error?.code;
        pending.reject(err);
      }
    }
  }

  /**
   * Register an event handler
   */
  on(event: string, handler: (data: unknown) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  // ===========================================================================
  // Navigation
  // ===========================================================================

  async navigate(url: string): Promise<{ success: boolean }> {
    return this.send('navigate', { url });
  }

  async back(): Promise<{ success: boolean }> {
    return this.send('back');
  }

  async forward(): Promise<{ success: boolean }> {
    return this.send('forward');
  }

  async reload(): Promise<{ success: boolean }> {
    return this.send('reload');
  }

  async getTabs(): Promise<Tab[]> {
    return this.send('getTabs');
  }

  async switchTab(tabId: number): Promise<{ success: boolean }> {
    return this.send('switchTab', { tabId });
  }

  async newTab(url?: string): Promise<{ tabId: number }> {
    return this.send('newTab', { url });
  }

  async closeTab(tabId?: number): Promise<{ success: boolean }> {
    return this.send('closeTab', { tabId });
  }

  // ===========================================================================
  // DOM Interaction
  // ===========================================================================

  async query(selector: string): Promise<{ count: number; elements: unknown[] }> {
    return this.send('query', { selector });
  }

  async click(selector: string): Promise<{ success: boolean }> {
    return this.send('click', { selector });
  }

  async type(selector: string, text: string): Promise<{ success: boolean }> {
    return this.send('type', { selector, text });
  }

  async scroll(options: ScrollOptions = {}): Promise<{ success: boolean }> {
    return this.send('scroll', options);
  }

  async scrollTo(selector: string): Promise<{ success: boolean }> {
    return this.send('scroll', { selector });
  }

  async hover(selector: string): Promise<{ success: boolean }> {
    return this.send('hover', { selector });
  }

  async fill(selector: string, text: string): Promise<{ success: boolean }> {
    return this.send('fill', { selector, text });
  }

  async press(key: string, selector: string | null = null): Promise<{ success: boolean }> {
    return this.send('press', { key, selector });
  }

  async select(selector: string, value: string): Promise<{ success: boolean; selectedValue: string; selectedText: string }> {
    return this.send('select', { selector, value });
  }

  async check(selector: string): Promise<{ success: boolean; checked: boolean }> {
    return this.send('check', { selector });
  }

  async uncheck(selector: string): Promise<{ success: boolean; checked: boolean }> {
    return this.send('uncheck', { selector });
  }

  async getAttribute(selector: string, attribute: string): Promise<{ value: string | null }> {
    return this.send('getAttribute', { selector, attribute });
  }

  async getProperty(selector: string, property: string): Promise<{ value: unknown }> {
    return this.send('getProperty', { selector, property });
  }

  async getValue(selector: string): Promise<{ value: string }> {
    return this.send('getValue', { selector });
  }

  // ===========================================================================
  // Snapshot
  // ===========================================================================

  async snapshot(options: SnapshotOptions = {}): Promise<{ tree: unknown; text: string; refCount: number }> {
    return this.send('snapshot', options);
  }

  // ===========================================================================
  // State Checks
  // ===========================================================================

  async isVisible(selector: string): Promise<{ visible: boolean }> {
    return this.send('isVisible', { selector });
  }

  async isEnabled(selector: string): Promise<{ enabled: boolean }> {
    return this.send('isEnabled', { selector });
  }

  async isChecked(selector: string): Promise<{ checked: boolean }> {
    return this.send('isChecked', { selector });
  }

  // ===========================================================================
  // Semantic Locators
  // ===========================================================================

  async findByRole(role: string, options: FindByRoleOptions = {}): Promise<{ ref: string; role: string; name: string; count: number }> {
    return this.send('findByRole', { role, ...options });
  }

  async findByLabel(label: string, options: FindByLabelOptions = {}): Promise<{ ref: string; tagName: string; type: string | null; count: number }> {
    return this.send('findByLabel', { label, ...options });
  }

  async findByText(text: string, options: FindByTextOptions = {}): Promise<{ ref: string; tagName: string; text: string; count: number }> {
    return this.send('findByText', { text, ...options });
  }

  async findByPlaceholder(placeholder: string, options: FindByPlaceholderOptions = {}): Promise<{ ref: string; tagName: string; type: string | null; placeholder: string; count: number }> {
    return this.send('findByPlaceholder', { placeholder, ...options });
  }

  // ===========================================================================
  // Data Extraction
  // ===========================================================================

  async getHTML(selector?: string): Promise<{ html: string }> {
    return this.send('getHTML', { selector });
  }

  async getText(selector?: string): Promise<{ text: string }> {
    return this.send('getText', { selector });
  }

  async getUrl(): Promise<{ url: string }> {
    return this.send('getUrl');
  }

  async getTitle(): Promise<{ title: string }> {
    return this.send('getTitle');
  }

  async screenshot(options: ScreenshotOptions = {}): Promise<{ dataUrl: string }> {
    return this.send('screenshot', options);
  }

  // ===========================================================================
  // JavaScript Execution
  // ===========================================================================

  async evaluate<T = unknown>(code: string): Promise<{ result: T } | { error: { code: string; message: string } }> {
    return this.send('evaluate', { code });
  }

  // ===========================================================================
  // Waiting
  // ===========================================================================

  async waitForSelector(selector: string, timeout = 30000): Promise<{ success: boolean; ref: string; element: unknown }> {
    return this.send('waitForSelector', { selector, timeout });
  }

  async waitForText(text: string, timeout = 30000): Promise<{ success: boolean; found: boolean }> {
    return this.send('waitForText', { text, timeout });
  }

  async wait(ms: number): Promise<{ success: boolean }> {
    return this.send('wait', { ms });
  }
}

export default FoxPilotClient;
