/**
 * Firefox Command - Background Script
 *
 * Handles communication between native messaging host and content scripts.
 * Acts as the central hub for all browser control operations.
 */

const NATIVE_HOST_NAME = 'firefox_command';

let nativePort = null;
let isConnected = false;

/**
 * Connect to native messaging host
 */
function connectToNativeHost() {
  try {
    nativePort = browser.runtime.connectNative(NATIVE_HOST_NAME);

    nativePort.onMessage.addListener(handleNativeMessage);

    nativePort.onDisconnect.addListener(() => {
      console.log('[Firefox Command] Disconnected from native host');
      isConnected = false;
      nativePort = null;

      // Attempt reconnection after delay
      setTimeout(connectToNativeHost, 5000);
    });

    isConnected = true;
    console.log('[Firefox Command] Connected to native host');
  } catch (error) {
    console.error('[Firefox Command] Failed to connect to native host:', error);
    setTimeout(connectToNativeHost, 5000);
  }
}

/**
 * Handle messages from native host
 * @param {object} message
 */
async function handleNativeMessage(message) {
  const { id, method, params = {} } = message;

  try {
    const result = await executeCommand(method, params);
    sendToNativeHost({ id, success: true, result });
  } catch (error) {
    sendToNativeHost({
      id,
      success: false,
      error: {
        code: error.code || 'UNKNOWN_ERROR',
        message: error.message,
      },
    });
  }
}

/**
 * Send message to native host
 * @param {object} message
 */
function sendToNativeHost(message) {
  if (nativePort && isConnected) {
    nativePort.postMessage(message);
  }
}

/**
 * Execute a browser command
 * @param {string} method
 * @param {object} params
 * @returns {Promise<any>}
 */
async function executeCommand(method, params) {
  const commands = {
    // Navigation
    navigate,
    back,
    forward,
    reload,
    getTabs,
    switchTab,
    newTab,
    closeTab,

    // DOM Interaction
    query,
    click,
    type,
    scroll,
    hover,
    getAttribute,
    getProperty,

    // Data Extraction
    getHTML,
    getText,
    getUrl,
    getTitle,
    screenshot,

    // JavaScript
    evaluate,

    // Waiting
    waitForSelector,
    wait,
  };

  const handler = commands[method];
  if (!handler) {
    const error = new Error(`Unknown method: ${method}`);
    error.code = 'UNKNOWN_METHOD';
    throw error;
  }

  return handler(params);
}

// ============================================================================
// Navigation Commands
// ============================================================================

async function navigate({ url }) {
  const tab = await getActiveTab();
  await browser.tabs.update(tab.id, { url });
  return { success: true };
}

async function back() {
  await browser.tabs.goBack();
  return { success: true };
}

async function forward() {
  await browser.tabs.goForward();
  return { success: true };
}

async function reload() {
  const tab = await getActiveTab();
  await browser.tabs.reload(tab.id);
  return { success: true };
}

async function getTabs() {
  const tabs = await browser.tabs.query({});
  return tabs.map((tab) => ({
    id: tab.id,
    url: tab.url,
    title: tab.title,
    active: tab.active,
    windowId: tab.windowId,
  }));
}

async function switchTab({ tabId }) {
  await browser.tabs.update(tabId, { active: true });
  return { success: true };
}

async function newTab({ url } = {}) {
  const tab = await browser.tabs.create({ url: url || 'about:blank' });
  return { tabId: tab.id };
}

async function closeTab({ tabId } = {}) {
  const id = tabId || (await getActiveTab()).id;
  await browser.tabs.remove(id);
  return { success: true };
}

// ============================================================================
// DOM Interaction Commands
// ============================================================================

async function query({ selector }) {
  return executeInContentScript('query', { selector });
}

async function click({ selector }) {
  return executeInContentScript('click', { selector });
}

async function type({ selector, text }) {
  return executeInContentScript('type', { selector, text });
}

async function scroll({ x, y, selector }) {
  return executeInContentScript('scroll', { x, y, selector });
}

async function hover({ selector }) {
  return executeInContentScript('hover', { selector });
}

async function getAttribute({ selector, attribute }) {
  return executeInContentScript('getAttribute', { selector, attribute });
}

async function getProperty({ selector, property }) {
  return executeInContentScript('getProperty', { selector, property });
}

// ============================================================================
// Data Extraction Commands
// ============================================================================

async function getHTML({ selector } = {}) {
  return executeInContentScript('getHTML', { selector });
}

async function getText({ selector } = {}) {
  return executeInContentScript('getText', { selector });
}

async function getUrl() {
  const tab = await getActiveTab();
  return { url: tab.url };
}

async function getTitle() {
  const tab = await getActiveTab();
  return { title: tab.title };
}

async function screenshot({ fullPage = false } = {}) {
  const tab = await getActiveTab();

  if (fullPage) {
    // Full page screenshot requires content script
    return executeInContentScript('screenshot', { fullPage: true });
  }

  const dataUrl = await browser.tabs.captureVisibleTab(tab.windowId, {
    format: 'png',
  });

  return { dataUrl };
}

// ============================================================================
// JavaScript Execution
// ============================================================================

async function evaluate({ code }) {
  return executeInContentScript('evaluate', { code });
}

// ============================================================================
// Waiting Commands
// ============================================================================

async function waitForSelector({ selector, timeout = 30000 }) {
  return executeInContentScript('waitForSelector', { selector, timeout });
}

async function wait({ ms }) {
  await new Promise((resolve) => setTimeout(resolve, ms));
  return { success: true };
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get the currently active tab
 * @returns {Promise<browser.tabs.Tab>}
 */
async function getActiveTab() {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) {
    const error = new Error('No active tab found');
    error.code = 'NO_ACTIVE_TAB';
    throw error;
  }
  return tabs[0];
}

/**
 * Execute a command in the content script
 * @param {string} action
 * @param {object} params
 * @returns {Promise<any>}
 */
async function executeInContentScript(action, params) {
  const tab = await getActiveTab();

  try {
    const response = await browser.tabs.sendMessage(tab.id, { action, params });
    return response;
  } catch (error) {
    // Content script might not be loaded, try injecting it
    await browser.tabs.executeScript(tab.id, { file: 'content.js' });
    return browser.tabs.sendMessage(tab.id, { action, params });
  }
}

// ============================================================================
// Initialization
// ============================================================================

// Connect to native host on startup
connectToNativeHost();

// Listen for messages from popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'getStatus') {
    sendResponse({ connected: isConnected });
  }
});

console.log('[Firefox Command] Extension loaded');
