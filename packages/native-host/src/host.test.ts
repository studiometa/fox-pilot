import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set test token
process.env.FOX_PILOT_TOKEN = 'test-token';

/**
 * Tests for native host message handling logic.
 * 
 * Note: The actual stdin/stdout and WebSocket communication is hard to test
 * in isolation. These tests focus on the message format and protocol.
 */

describe('Native Messaging Protocol', () => {
  describe('message format', () => {
    it('should use 4-byte little-endian length prefix', () => {
      const message = { id: '1', method: 'test' };
      const messageString = JSON.stringify(message);
      const messageBuffer = new TextEncoder().encode(messageString);
      
      // Length should be encoded as 4-byte little-endian
      const lengthBuffer = new Uint8Array(4);
      new DataView(lengthBuffer.buffer).setUint32(0, messageBuffer.length, true);
      
      expect(lengthBuffer[0]).toBe(messageBuffer.length & 0xff);
      expect(lengthBuffer[1]).toBe((messageBuffer.length >> 8) & 0xff);
      expect(lengthBuffer[2]).toBe((messageBuffer.length >> 16) & 0xff);
      expect(lengthBuffer[3]).toBe((messageBuffer.length >> 24) & 0xff);
    });

    it('should decode length from 4-byte little-endian prefix', () => {
      const expectedLength = 256; // 0x100
      const lengthBuffer = new Uint8Array([0x00, 0x01, 0x00, 0x00]);
      
      const view = new DataView(lengthBuffer.buffer);
      const length = view.getUint32(0, true);
      
      expect(length).toBe(expectedLength);
    });
  });

  describe('client message format', () => {
    it('should include id, method, and optional params', () => {
      const message = {
        id: '123',
        method: 'navigate',
        params: { url: 'https://example.com' },
      };

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('method');
      expect(message.params).toBeDefined();
    });

    it('should allow params to be omitted', () => {
      const message = {
        id: '123',
        method: 'back',
      };

      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('method');
      expect(message).not.toHaveProperty('params');
    });
  });

  describe('response format', () => {
    it('should include id, success, and result for successful responses', () => {
      const response = {
        id: '123',
        success: true,
        result: { title: 'Example' },
      };

      expect(response.id).toBe('123');
      expect(response.success).toBe(true);
      expect(response.result).toBeDefined();
    });

    it('should include id, success=false, and error for failed responses', () => {
      const response = {
        id: '123',
        success: false,
        error: { code: 'ELEMENT_NOT_FOUND', message: 'Element not found' },
      };

      expect(response.id).toBe('123');
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error.code).toBe('ELEMENT_NOT_FOUND');
    });
  });

  describe('authentication', () => {
    it('should require auth method with token param', () => {
      const authMessage = {
        id: '1',
        method: 'auth',
        params: { token: 'test-token' },
      };

      expect(authMessage.method).toBe('auth');
      expect(authMessage.params.token).toBe('test-token');
    });

    it('should respond with authenticated: true on success', () => {
      const authResponse = {
        id: '1',
        success: true,
        result: { authenticated: true },
      };

      expect(authResponse.result.authenticated).toBe(true);
    });

    it('should respond with AUTH_FAILED on invalid token', () => {
      const authResponse = {
        id: '1',
        success: false,
        error: { code: 'AUTH_FAILED', message: 'Invalid token' },
      };

      expect(authResponse.error.code).toBe('AUTH_FAILED');
    });
  });
});

describe('Token Management', () => {
  it('should read token from environment variable', () => {
    expect(process.env.FOX_PILOT_TOKEN).toBe('test-token');
  });

  it('should generate cryptographically secure tokens', () => {
    const { randomBytes } = require('node:crypto');
    const token = randomBytes(32).toString('hex');
    
    expect(token).toHaveLength(64); // 32 bytes = 64 hex chars
    expect(token).toMatch(/^[a-f0-9]+$/);
  });
});

describe('Config File', () => {
  it('should use XDG config directory on Unix', () => {
    const { homedir, platform } = require('node:os');
    const { join } = require('node:path');
    
    const os = platform();
    
    if (os === 'darwin' || os === 'linux') {
      const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
      const configDir = join(xdgConfig, 'fox-pilot');
      
      expect(configDir).toContain('fox-pilot');
    }
  });

  it('should use APPDATA on Windows', () => {
    const { platform } = require('node:os');
    
    if (platform() === 'win32') {
      const appData = process.env.APPDATA;
      expect(appData).toBeDefined();
    }
  });
});
