/**
 * FoxPilot Client
 *
 * A simple client library for coding agents to control Firefox.
 *
 * @example
 * ```javascript
 * import { FoxPilotClient } from './foxpilot-client.js';
 *
 * const client = new FoxPilotClient();
 * await client.connect();
 *
 * await client.navigate('https://example.com');
 * await client.click('#button');
 * const text = await client.getText('.content');
 * ```
 */

export class FoxPilotClient {
  constructor(options = {}) {
    this.url = options.url || 'ws://localhost:9222';
    this.token = options.token || process.env.FOXPILOT_TOKEN || 'default-dev-token';
    this.ws = null;
    this.requestId = 0;
    this.pendingRequests = new Map();
    this.eventHandlers = new Map();
  }

  /**
   * Connect to FoxPilot server
   * @returns {Promise<void>}
   */
  async connect() {
    return new Promise((resolve, reject) => {
      // Dynamic import for WebSocket (works in Node.js and browser)
      const WebSocketImpl = typeof WebSocket !== 'undefined' ? WebSocket : (async () => {
        const { default: WS } = await import('ws');
        return WS;
      })();

      Promise.resolve(WebSocketImpl).then((WS) => {
        this.ws = new WS(this.url);

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
          // Reject all pending requests
          for (const [, { reject }] of this.pendingRequests) {
            reject(new Error('Connection closed'));
          }
          this.pendingRequests.clear();
        };
      });
    });
  }

  /**
   * Disconnect from server
   */
  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Authenticate with the server
   * @returns {Promise<void>}
   */
  async authenticate() {
    const result = await this.send('auth', { token: this.token });
    if (!result.authenticated) {
      throw new Error('Authentication failed');
    }
  }

  /**
   * Send a command and wait for response
   * @param {string} method
   * @param {object} params
   * @returns {Promise<any>}
   */
  async send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = String(++this.requestId);

      this.pendingRequests.set(id, { resolve, reject });

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
   * @param {object} message
   */
  handleMessage(message) {
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
    const pending = this.pendingRequests.get(id);

    if (pending) {
      this.pendingRequests.delete(id);

      if (success) {
        pending.resolve(result);
      } else {
        const err = new Error(error?.message || 'Unknown error');
        err.code = error?.code;
        pending.reject(err);
      }
    }
  }

  /**
   * Register an event handler
   * @param {string} event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  // ===========================================================================
  // Navigation
  // ===========================================================================

  async navigate(url) {
    return this.send('navigate', { url });
  }

  async back() {
    return this.send('back');
  }

  async forward() {
    return this.send('forward');
  }

  async reload() {
    return this.send('reload');
  }

  async getTabs() {
    return this.send('getTabs');
  }

  async switchTab(tabId) {
    return this.send('switchTab', { tabId });
  }

  async newTab(url) {
    return this.send('newTab', { url });
  }

  async closeTab(tabId) {
    return this.send('closeTab', { tabId });
  }

  // ===========================================================================
  // DOM Interaction
  // ===========================================================================

  async query(selector) {
    return this.send('query', { selector });
  }

  async click(selector) {
    return this.send('click', { selector });
  }

  async type(selector, text) {
    return this.send('type', { selector, text });
  }

  async scroll(options = {}) {
    return this.send('scroll', options);
  }

  async scrollTo(selector) {
    return this.send('scroll', { selector });
  }

  async hover(selector) {
    return this.send('hover', { selector });
  }

  async fill(selector, text) {
    return this.send('fill', { selector, text });
  }

  async press(key, selector = null) {
    return this.send('press', { key, selector });
  }

  async select(selector, value) {
    return this.send('select', { selector, value });
  }

  async check(selector) {
    return this.send('check', { selector });
  }

  async uncheck(selector) {
    return this.send('uncheck', { selector });
  }

  async getAttribute(selector, attribute) {
    return this.send('getAttribute', { selector, attribute });
  }

  async getProperty(selector, property) {
    return this.send('getProperty', { selector, property });
  }

  async getValue(selector) {
    return this.send('getValue', { selector });
  }

  // ===========================================================================
  // Snapshot
  // ===========================================================================

  async snapshot(options = {}) {
    return this.send('snapshot', options);
  }

  // ===========================================================================
  // State Checks
  // ===========================================================================

  async isVisible(selector) {
    return this.send('isVisible', { selector });
  }

  async isEnabled(selector) {
    return this.send('isEnabled', { selector });
  }

  async isChecked(selector) {
    return this.send('isChecked', { selector });
  }

  // ===========================================================================
  // Semantic Locators
  // ===========================================================================

  async findByRole(role, options = {}) {
    return this.send('findByRole', { role, ...options });
  }

  async findByLabel(label, options = {}) {
    return this.send('findByLabel', { label, ...options });
  }

  async findByText(text, options = {}) {
    return this.send('findByText', { text, ...options });
  }

  async findByPlaceholder(placeholder, options = {}) {
    return this.send('findByPlaceholder', { placeholder, ...options });
  }

  // ===========================================================================
  // Data Extraction
  // ===========================================================================

  async getHTML(selector) {
    return this.send('getHTML', { selector });
  }

  async getText(selector) {
    return this.send('getText', { selector });
  }

  async getUrl() {
    return this.send('getUrl');
  }

  async getTitle() {
    return this.send('getTitle');
  }

  async screenshot(options = {}) {
    return this.send('screenshot', options);
  }

  // ===========================================================================
  // JavaScript Execution
  // ===========================================================================

  async evaluate(code) {
    return this.send('evaluate', { code });
  }

  // ===========================================================================
  // Waiting
  // ===========================================================================

  async waitForSelector(selector, timeout = 30000) {
    return this.send('waitForSelector', { selector, timeout });
  }

  async waitForText(text, timeout = 30000) {
    return this.send('waitForText', { text, timeout });
  }

  async wait(ms) {
    return this.send('wait', { ms });
  }
}

export default FoxPilotClient;
