#!/usr/bin/env node

/**
 * FoxPilot - Native Messaging Host
 *
 * This script acts as a bridge between external WebSocket clients (coding agents)
 * and the Firefox extension via Native Messaging.
 */

import { WebSocketServer } from 'ws';
import { createServer } from 'http';

const PORT = 9222;
const AUTH_TOKEN = process.env.FOXPILOT_TOKEN || 'default-dev-token';

// Redirect console.log to stderr (stdout is reserved for native messaging)
const originalLog = console.log;
console.log = (...args) => console.error(...args);

// Message queues for communication with extension
let extensionPort = null;
const pendingRequests = new Map();
const authenticatedClients = new Set();

// =============================================================================
// Native Messaging (stdin/stdout communication with Firefox extension)
// =============================================================================

/**
 * Read a message from stdin (from Firefox extension)
 */
function readNativeMessage() {
  // Native messaging uses length-prefixed messages
  // First 4 bytes = message length (little-endian)

  let buffer = Buffer.alloc(0);

  // Keep stdin open
  process.stdin.resume();

  process.stdin.on('data', (chunk) => {
    buffer = Buffer.concat([buffer, chunk]);

    while (buffer.length >= 4) {
      const messageLength = buffer.readUInt32LE(0);

      if (buffer.length >= 4 + messageLength) {
        const messageBuffer = buffer.slice(4, 4 + messageLength);
        buffer = buffer.slice(4 + messageLength);

        try {
          const message = JSON.parse(messageBuffer.toString('utf8'));
          handleExtensionMessage(message);
        } catch (error) {
          console.error('[Native Host] Failed to parse message:', error);
        }
      } else {
        break;
      }
    }
  });

  process.stdin.on('end', () => {
    console.error('[Native Host] stdin closed, exiting');
    process.exit(0);
  });

  process.stdin.on('error', (error) => {
    console.error('[Native Host] stdin error:', error);
  });
}

/**
 * Send a message to Firefox extension via stdout
 * @param {object} message
 */
function sendToExtension(message) {
  const messageString = JSON.stringify(message);
  const messageBuffer = Buffer.from(messageString, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(messageBuffer.length, 0);

  process.stdout.write(lengthBuffer);
  process.stdout.write(messageBuffer);
}

/**
 * Handle message received from Firefox extension
 * @param {object} message
 */
function handleExtensionMessage(message) {
  const { id, success, result, error } = message;

  // Find the pending request and resolve it
  const pending = pendingRequests.get(id);
  if (pending) {
    pending.resolve({ id, success, result, error });
    pendingRequests.delete(id);
  }

  // Also broadcast to all authenticated WebSocket clients if it's an event
  if (message.event) {
    broadcastToClients(message);
  }
}

// =============================================================================
// WebSocket Server (communication with coding agents)
// =============================================================================

const httpServer = createServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws, req) => {
  console.log(`[WebSocket] New connection from ${req.socket.remoteAddress}`);

  ws.isAuthenticated = false;

  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      await handleClientMessage(ws, message);
    } catch (error) {
      ws.send(
        JSON.stringify({
          id: null,
          success: false,
          error: {
            code: 'PARSE_ERROR',
            message: 'Invalid JSON message',
          },
        })
      );
    }
  });

  ws.on('close', () => {
    console.log('[WebSocket] Client disconnected');
    authenticatedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('[WebSocket] Client error:', error);
    authenticatedClients.delete(ws);
  });
});

/**
 * Handle message from WebSocket client
 * @param {WebSocket} ws
 * @param {object} message
 */
async function handleClientMessage(ws, message) {
  const { id, method, params = {} } = message;

  // Authentication required for all commands except 'auth'
  if (method === 'auth') {
    if (params.token === AUTH_TOKEN) {
      ws.isAuthenticated = true;
      authenticatedClients.add(ws);
      ws.send(JSON.stringify({ id, success: true, result: { authenticated: true } }));
      console.log('[WebSocket] Client authenticated');
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

  if (!ws.isAuthenticated) {
    ws.send(
      JSON.stringify({
        id,
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' },
      })
    );
    return;
  }

  // Forward command to extension and wait for response
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
          message: error.message,
        },
      })
    );
  }
}

/**
 * Forward a command to the Firefox extension
 * @param {object} message
 * @returns {Promise<object>}
 */
function forwardToExtension(message) {
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

    sendToExtension(message);
  });
}

/**
 * Broadcast a message to all authenticated clients
 * @param {object} message
 */
function broadcastToClients(message) {
  const data = JSON.stringify(message);
  for (const client of authenticatedClients) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(data);
    }
  }
}

// =============================================================================
// Initialization
// =============================================================================

// Start reading from stdin (Firefox extension)
readNativeMessage();

// Start WebSocket server
httpServer.listen(PORT, '127.0.0.1', () => {
  console.log(`[Native Host] WebSocket server listening on ws://127.0.0.1:${PORT}`);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('[Native Host] Shutting down...');
  wss.close();
  httpServer.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Native Host] Shutting down...');
  wss.close();
  httpServer.close();
  process.exit(0);
});

console.log('[Native Host] Started');
