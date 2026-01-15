import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set test token before importing the client
process.env.FOX_PILOT_TOKEN = 'test-token';

import { FoxPilotClient } from './index';

// Mock WebSocket
class MockWebSocket {
  static OPEN = 1;
  static CLOSED = 3;

  url: string;
  readyState = MockWebSocket.OPEN;

  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onerror: ((error: Error) => void) | null = null;
  onclose: (() => void) | null = null;

  sentMessages: string[] = [];

  constructor(url: string) {
    this.url = url;
    // Simulate async connection
    setTimeout(() => this.onopen?.(), 0);
  }

  send(data: string) {
    this.sentMessages.push(data);
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.();
  }

  // Test helper to simulate receiving a message
  receiveMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  // Test helper to simulate error
  triggerError(error: Error) {
    this.onerror?.(error);
  }
}

// Store reference to mock instances
let mockWsInstance: MockWebSocket | null = null;

vi.stubGlobal('WebSocket', class extends MockWebSocket {
  constructor(url: string) {
    super(url);
    mockWsInstance = this;
  }
});

describe('FoxPilotClient', () => {
  beforeEach(() => {
    mockWsInstance = null;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use token from environment variable', () => {
      const client = new FoxPilotClient();
      expect(client).toBeDefined();
    });

    it('should accept custom URL and token', () => {
      const client = new FoxPilotClient({
        url: 'ws://custom:1234',
        token: 'custom-token',
      });
      expect(client).toBeDefined();
    });

    it('should throw error when no token is available', () => {
      const originalToken = process.env.FOX_PILOT_TOKEN;
      delete process.env.FOX_PILOT_TOKEN;

      try {
        expect(() => new FoxPilotClient()).toThrow('No authentication token found');
      } finally {
        process.env.FOX_PILOT_TOKEN = originalToken;
      }
    });
  });

  describe('connect', () => {
    it('should connect and authenticate', async () => {
      const client = new FoxPilotClient();
      const connectPromise = client.connect();

      // Wait for WebSocket to be created
      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      // Simulate auth response
      setTimeout(() => {
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]!);
        mockWsInstance!.receiveMessage({
          id: authMessage.id,
          success: true,
          result: { authenticated: true },
        });
      }, 10);

      await connectPromise;

      expect(mockWsInstance!.sentMessages).toHaveLength(1);
      const sentAuth = JSON.parse(mockWsInstance!.sentMessages[0]!);
      expect(sentAuth.method).toBe('auth');
      expect(sentAuth.params.token).toBe('test-token');
    });

    it('should reject on authentication failure', async () => {
      const client = new FoxPilotClient();
      const connectPromise = client.connect();

      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      setTimeout(() => {
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]!);
        mockWsInstance!.receiveMessage({
          id: authMessage.id,
          success: true,
          result: { authenticated: false },
        });
      }, 10);

      await expect(connectPromise).rejects.toThrow('Authentication failed');
    });

    it('should reject on WebSocket error', async () => {
      const client = new FoxPilotClient();
      const connectPromise = client.connect();

      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      setTimeout(() => {
        mockWsInstance!.triggerError(new Error('Connection refused'));
      }, 10);

      await expect(connectPromise).rejects.toThrow();
    });
  });

  describe('disconnect', () => {
    it('should close WebSocket connection', async () => {
      const client = new FoxPilotClient();
      const connectPromise = client.connect();

      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      setTimeout(() => {
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]!);
        mockWsInstance!.receiveMessage({
          id: authMessage.id,
          success: true,
          result: { authenticated: true },
        });
      }, 10);

      await connectPromise;

      client.disconnect();
      expect(mockWsInstance!.readyState).toBe(MockWebSocket.CLOSED);
    });

    it('should handle disconnect when not connected', () => {
      const client = new FoxPilotClient();
      expect(() => client.disconnect()).not.toThrow();
    });
  });

  describe('send', () => {
    let client: FoxPilotClient;

    beforeEach(async () => {
      client = new FoxPilotClient();
      const connectPromise = client.connect();

      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      setTimeout(() => {
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]!);
        mockWsInstance!.receiveMessage({
          id: authMessage.id,
          success: true,
          result: { authenticated: true },
        });
      }, 10);

      await connectPromise;
    });

    it('should send command and receive response', async () => {
      const responsePromise = client.send('navigate', { url: 'https://example.com' });

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[1]!);
      mockWsInstance!.receiveMessage({
        id: sentMessage.id,
        success: true,
        result: { success: true },
      });

      const response = await responsePromise;
      expect(response).toEqual({ success: true });
    });

    it('should reject on error response', async () => {
      const responsePromise = client.send('navigate', { url: 'invalid' });

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sentMessage = JSON.parse(mockWsInstance!.sentMessages[1]!);
      mockWsInstance!.receiveMessage({
        id: sentMessage.id,
        success: false,
        error: { code: 'INVALID_URL', message: 'Invalid URL' },
      });

      await expect(responsePromise).rejects.toThrow('Invalid URL');
    });
  });

  describe('navigation methods', () => {
    let client: FoxPilotClient;

    beforeEach(async () => {
      client = new FoxPilotClient();
      const connectPromise = client.connect();

      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      setTimeout(() => {
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]!);
        mockWsInstance!.receiveMessage({
          id: authMessage.id,
          success: true,
          result: { authenticated: true },
        });
      }, 10);

      await connectPromise;
    });

    it('navigate() should send navigate command', async () => {
      const promise = client.navigate('https://example.com');

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('navigate');
      expect(sent.params.url).toBe('https://example.com');

      mockWsInstance!.receiveMessage({ id: sent.id, success: true, result: { success: true } });
      await promise;
    });

    it('back() should send back command', async () => {
      const promise = client.back();

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('back');

      mockWsInstance!.receiveMessage({ id: sent.id, success: true, result: { success: true } });
      await promise;
    });

    it('forward() should send forward command', async () => {
      const promise = client.forward();

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('forward');

      mockWsInstance!.receiveMessage({ id: sent.id, success: true, result: { success: true } });
      await promise;
    });

    it('reload() should send reload command', async () => {
      const promise = client.reload();

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('reload');

      mockWsInstance!.receiveMessage({ id: sent.id, success: true, result: { success: true } });
      await promise;
    });
  });

  describe('DOM interaction methods', () => {
    let client: FoxPilotClient;

    beforeEach(async () => {
      client = new FoxPilotClient();
      const connectPromise = client.connect();

      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      setTimeout(() => {
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]!);
        mockWsInstance!.receiveMessage({
          id: authMessage.id,
          success: true,
          result: { authenticated: true },
        });
      }, 10);

      await connectPromise;
    });

    it('click() should send click command', async () => {
      const promise = client.click('#button');

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('click');
      expect(sent.params.selector).toBe('#button');

      mockWsInstance!.receiveMessage({ id: sent.id, success: true, result: { success: true } });
      await promise;
    });

    it('type() should send type command', async () => {
      const promise = client.type('#input', 'hello');

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('type');
      expect(sent.params.selector).toBe('#input');
      expect(sent.params.text).toBe('hello');

      mockWsInstance!.receiveMessage({ id: sent.id, success: true, result: { success: true } });
      await promise;
    });

    it('fill() should send fill command', async () => {
      const promise = client.fill('#input', 'hello');

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('fill');
      expect(sent.params.selector).toBe('#input');
      expect(sent.params.text).toBe('hello');

      mockWsInstance!.receiveMessage({ id: sent.id, success: true, result: { success: true } });
      await promise;
    });

    it('hover() should send hover command', async () => {
      const promise = client.hover('#element');

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('hover');
      expect(sent.params.selector).toBe('#element');

      mockWsInstance!.receiveMessage({ id: sent.id, success: true, result: { success: true } });
      await promise;
    });
  });

  describe('data extraction methods', () => {
    let client: FoxPilotClient;

    beforeEach(async () => {
      client = new FoxPilotClient();
      const connectPromise = client.connect();

      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      setTimeout(() => {
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]!);
        mockWsInstance!.receiveMessage({
          id: authMessage.id,
          success: true,
          result: { authenticated: true },
        });
      }, 10);

      await connectPromise;
    });

    it('getText() should return text content', async () => {
      const promise = client.getText('#content');

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('getText');

      mockWsInstance!.receiveMessage({
        id: sent.id,
        success: true,
        result: { text: 'Hello World' },
      });

      const result = await promise;
      expect(result.text).toBe('Hello World');
    });

    it('getUrl() should return current URL', async () => {
      const promise = client.getUrl();

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('getUrl');

      mockWsInstance!.receiveMessage({
        id: sent.id,
        success: true,
        result: { url: 'https://example.com' },
      });

      const result = await promise;
      expect(result.url).toBe('https://example.com');
    });

    it('getTitle() should return page title', async () => {
      const promise = client.getTitle();

      await vi.waitFor(() => expect(mockWsInstance!.sentMessages.length).toBeGreaterThan(1));

      const sent = JSON.parse(mockWsInstance!.sentMessages[1]!);
      expect(sent.method).toBe('getTitle');

      mockWsInstance!.receiveMessage({
        id: sent.id,
        success: true,
        result: { title: 'Example Page' },
      });

      const result = await promise;
      expect(result.title).toBe('Example Page');
    });
  });

  describe('event handling', () => {
    it('on() should register event handlers', async () => {
      const client = new FoxPilotClient();
      const handler = vi.fn();

      client.on('pageLoad', handler);

      const connectPromise = client.connect();
      await vi.waitFor(() => expect(mockWsInstance).not.toBeNull());

      setTimeout(() => {
        const authMessage = JSON.parse(mockWsInstance!.sentMessages[0]!);
        mockWsInstance!.receiveMessage({
          id: authMessage.id,
          success: true,
          result: { authenticated: true },
        });
      }, 10);

      await connectPromise;

      // Simulate event from server
      mockWsInstance!.receiveMessage({
        event: 'pageLoad',
        data: { url: 'https://example.com' },
      });

      expect(handler).toHaveBeenCalledWith({ url: 'https://example.com' });
    });
  });
});
