#!/usr/bin/env bun

/**
 * Fox Pilot - Native Messaging Host
 *
 * This script acts as a bridge between external WebSocket clients (coding agents)
 * and the Firefox extension via Native Messaging.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';

const PORT = 9222;

// =============================================================================
// Token Management
// =============================================================================

interface Config {
  token: string;
}

/**
 * Get the configuration directory path (XDG-compliant on Linux/macOS)
 */
function getConfigDir(): string {
  const os = platform();

  if (os === 'win32') {
    return join(process.env.APPDATA || join(homedir(), 'AppData', 'Roaming'), 'fox-pilot');
  }

  // XDG Base Directory Specification
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(homedir(), '.config');
  return join(xdgConfig, 'fox-pilot');
}

/**
 * Get the config file path
 */
function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

/**
 * Generate a cryptographically secure random token
 */
function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Read or create the authentication token
 * Priority: FOX_PILOT_TOKEN env var > config file > generate new
 */
function getAuthToken(): string {
  // Environment variable takes precedence
  if (process.env.FOX_PILOT_TOKEN) {
    return process.env.FOX_PILOT_TOKEN;
  }

  const configPath = getConfigPath();

  // Try to read existing config
  if (existsSync(configPath)) {
    try {
      const config: Config = JSON.parse(readFileSync(configPath, 'utf-8'));
      if (config.token) {
        return config.token;
      }
    } catch {
      console.error('[Native Host] Failed to read config, generating new token');
    }
  }

  // Generate new token and save
  const configDir = getConfigDir();
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true, mode: 0o700 });
  }

  const token = generateToken();
  const config: Config = { token };

  writeFileSync(configPath, JSON.stringify(config, null, 2), { mode: 0o600 });
  console.error(`[Native Host] Generated new auth token, saved to ${configPath}`);

  return token;
}

const AUTH_TOKEN = getAuthToken();

// =============================================================================
// Types
// =============================================================================

interface PendingRequest {
  resolve: (response: ExtensionResponse) => void;
  reject: (error: Error) => void;
}

interface ClientMessage {
  id: string;
  method: string;
  params?: Record<string, unknown>;
}

interface ExtensionResponse {
  id: string;
  success: boolean;
  result?: unknown;
  error?: { code: string; message: string };
  event?: string;
}

interface WebSocketData {
  isAuthenticated: boolean;
}

// =============================================================================
// State
// =============================================================================

import type { ServerWebSocket } from 'bun';

const pendingRequests = new Map<string, PendingRequest>();
const authenticatedClients = new Set<ServerWebSocket<WebSocketData>>();

// =============================================================================
// Native Messaging (stdin/stdout communication with Firefox extension)
// =============================================================================

/**
 * Read messages from stdin (from Firefox extension)
 */
async function readNativeMessages(): Promise<void> {
  const reader = Bun.stdin.stream().getReader();
  let buffer = new Uint8Array(0);

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      console.error('[Native Host] stdin closed, exiting');
      process.exit(0);
    }

    // Concatenate buffers
    const newBuffer = new Uint8Array(buffer.length + value.length);
    newBuffer.set(buffer);
    newBuffer.set(value, buffer.length);
    buffer = newBuffer;

    // Process complete messages
    while (buffer.length >= 4) {
      const view = new DataView(buffer.buffer, buffer.byteOffset, 4);
      const messageLength = view.getUint32(0, true); // little-endian

      if (buffer.length >= 4 + messageLength) {
        const messageBuffer = buffer.slice(4, 4 + messageLength);
        buffer = buffer.slice(4 + messageLength);

        try {
          const message = JSON.parse(new TextDecoder().decode(messageBuffer));
          handleExtensionMessage(message);
        } catch (error) {
          console.error('[Native Host] Failed to parse message:', error);
        }
      } else {
        break;
      }
    }
  }
}

/**
 * Send a message to Firefox extension via stdout
 */
function sendToExtension(message: Record<string, unknown>): void {
  const messageString = JSON.stringify(message);
  const messageBuffer = new TextEncoder().encode(messageString);
  const lengthBuffer = new Uint8Array(4);
  new DataView(lengthBuffer.buffer).setUint32(0, messageBuffer.length, true);

  Bun.write(Bun.stdout, lengthBuffer);
  Bun.write(Bun.stdout, messageBuffer);
}

/**
 * Handle message received from Firefox extension
 */
function handleExtensionMessage(message: ExtensionResponse): void {
  const { id, event } = message;

  // Find the pending request and resolve it
  const pending = pendingRequests.get(id);
  if (pending) {
    pending.resolve(message);
    pendingRequests.delete(id);
  }

  // Broadcast events to all authenticated WebSocket clients
  if (event) {
    broadcastToClients(message);
  }
}

// =============================================================================
// WebSocket Server (communication with coding agents)
// =============================================================================

const server = Bun.serve<WebSocketData>({
  port: PORT,
  hostname: '127.0.0.1',

  fetch(req, server) {
    // Upgrade HTTP to WebSocket
    if (server.upgrade(req, { data: { isAuthenticated: false } })) {
      return;
    }
    return new Response('WebSocket upgrade required', { status: 426 });
  },

  websocket: {
    open(_ws) {
      console.error('[WebSocket] New connection');
    },

    async message(ws, message) {
      try {
        const data: ClientMessage = JSON.parse(
          typeof message === 'string' ? message : message.toString()
        );
        await handleClientMessage(ws, data);
      } catch {
        ws.send(
          JSON.stringify({
            id: null,
            success: false,
            error: { code: 'PARSE_ERROR', message: 'Invalid JSON message' },
          })
        );
      }
    },

    close(ws) {
      console.error('[WebSocket] Client disconnected');
      authenticatedClients.delete(ws);
    },
  },
});

/**
 * Handle message from WebSocket client
 */
async function handleClientMessage(ws: ServerWebSocket<WebSocketData>, message: ClientMessage): Promise<void> {
  const { id, method, params = {} } = message;

  // Authentication
  if (method === 'auth') {
    if ((params as { token?: string }).token === AUTH_TOKEN) {
      ws.data.isAuthenticated = true;
      authenticatedClients.add(ws);
      ws.send(JSON.stringify({ id, success: true, result: { authenticated: true } }));
      console.error('[WebSocket] Client authenticated');
    } else {
      ws.send(
        JSON.stringify({
          id,
          success: false,
          error: { code: 'AUTH_FAILED', message: 'Invalid token' },
        })
      );
    }
    return;
  }

  if (!ws.data.isAuthenticated) {
    ws.send(
      JSON.stringify({
        id,
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' },
      })
    );
    return;
  }

  // Forward command to extension
  try {
    const response = await forwardToExtension({ id, method, params });
    ws.send(JSON.stringify(response));
  } catch (error) {
    ws.send(
      JSON.stringify({
        id,
        success: false,
        error: {
          code: 'EXTENSION_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      })
    );
  }
}

/**
 * Forward a command to the Firefox extension
 */
function forwardToExtension(message: ClientMessage): Promise<ExtensionResponse> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pendingRequests.delete(message.id);
      reject(new Error('Extension response timeout'));
    }, 30000);

    pendingRequests.set(message.id, {
      resolve: (response) => {
        clearTimeout(timeout);
        resolve(response);
      },
      reject,
    });

    sendToExtension(message as unknown as Record<string, unknown>);
  });
}

/**
 * Broadcast a message to all authenticated clients
 */
function broadcastToClients(message: ExtensionResponse): void {
  const data = JSON.stringify(message);
  for (const client of authenticatedClients) {
    client.send(data);
  }
}

// =============================================================================
// Initialization
// =============================================================================

// Start reading from stdin
readNativeMessages();

console.error(`[Native Host] WebSocket server listening on ws://127.0.0.1:${PORT}`);
console.error('[Native Host] Started');

// Handle termination
process.on('SIGINT', () => {
  console.error('[Native Host] Shutting down...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.error('[Native Host] Shutting down...');
  server.stop();
  process.exit(0);
});
