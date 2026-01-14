/**
 * FoxPilot - Content Script
 *
 * Runs in the context of web pages and handles DOM interactions.
 */

(() => {
  // Prevent multiple injections
  if (window.__firefoxCommandLoaded) return;
  window.__firefoxCommandLoaded = true;

  /**
   * Handle messages from background script
   */
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const { action, params } = message;

    handleAction(action, params)
      .then(sendResponse)
      .catch((error) => {
        sendResponse({
          error: {
            code: error.code || 'CONTENT_SCRIPT_ERROR',
            message: error.message,
          },
        });
      });

    // Return true to indicate async response
    return true;
  });

  /**
   * Route action to appropriate handler
   * @param {string} action
   * @param {object} params
   * @returns {Promise<any>}
   */
  async function handleAction(action, params) {
    const handlers = {
      query,
      click,
      type,
      scroll,
      hover,
      getAttribute,
      getProperty,
      getHTML,
      getText,
      screenshot,
      evaluate,
      waitForSelector,
    };

    const handler = handlers[action];
    if (!handler) {
      const error = new Error(`Unknown action: ${action}`);
      error.code = 'UNKNOWN_ACTION';
      throw error;
    }

    return handler(params);
  }

  // ==========================================================================
  // DOM Interaction
  // ==========================================================================

  /**
   * Query elements and return their info
   */
  async function query({ selector }) {
    const elements = document.querySelectorAll(selector);

    return {
      count: elements.length,
      elements: Array.from(elements).map((el, index) => ({
        index,
        tagName: el.tagName.toLowerCase(),
        id: el.id || null,
        className: el.className || null,
        textContent: el.textContent?.slice(0, 100) || null,
        isVisible: isElementVisible(el),
        rect: el.getBoundingClientRect().toJSON(),
      })),
    };
  }

  /**
   * Click an element
   */
  async function click({ selector }) {
    const element = await findElement(selector);

    // Scroll into view if needed
    element.scrollIntoView({ behavior: 'instant', block: 'center' });

    // Dispatch click event
    element.click();

    return { success: true };
  }

  /**
   * Type text into an input element
   */
  async function type({ selector, text }) {
    const element = await findElement(selector);

    // Focus the element
    element.focus();

    // Clear existing value
    if ('value' in element) {
      element.value = '';
    }

    // Simulate typing
    for (const char of text) {
      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: char, bubbles: true })
      );
      element.dispatchEvent(
        new KeyboardEvent('keypress', { key: char, bubbles: true })
      );

      if ('value' in element) {
        element.value += char;
      }

      element.dispatchEvent(new InputEvent('input', { bubbles: true }));
      element.dispatchEvent(
        new KeyboardEvent('keyup', { key: char, bubbles: true })
      );

      // Small delay between keystrokes
      await sleep(10);
    }

    // Trigger change event
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return { success: true };
  }

  /**
   * Scroll the page or to an element
   */
  async function scroll({ x, y, selector }) {
    if (selector) {
      const element = await findElement(selector);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      window.scrollTo({
        left: x ?? window.scrollX,
        top: y ?? window.scrollY,
        behavior: 'smooth',
      });
    }

    return { success: true };
  }

  /**
   * Hover over an element
   */
  async function hover({ selector }) {
    const element = await findElement(selector);

    element.dispatchEvent(
      new MouseEvent('mouseenter', { bubbles: true, cancelable: true })
    );
    element.dispatchEvent(
      new MouseEvent('mouseover', { bubbles: true, cancelable: true })
    );

    return { success: true };
  }

  /**
   * Get an attribute value
   */
  async function getAttribute({ selector, attribute }) {
    const element = await findElement(selector);
    return { value: element.getAttribute(attribute) };
  }

  /**
   * Get a JavaScript property value
   */
  async function getProperty({ selector, property }) {
    const element = await findElement(selector);
    const value = element[property];

    // Handle non-serializable values
    if (typeof value === 'function') {
      return { value: '[Function]' };
    }

    try {
      JSON.stringify(value);
      return { value };
    } catch {
      return { value: String(value) };
    }
  }

  // ==========================================================================
  // Data Extraction
  // ==========================================================================

  /**
   * Get HTML content
   */
  async function getHTML({ selector }) {
    if (selector) {
      const element = await findElement(selector);
      return { html: element.outerHTML };
    }
    return { html: document.documentElement.outerHTML };
  }

  /**
   * Get text content
   */
  async function getText({ selector }) {
    if (selector) {
      const element = await findElement(selector);
      return { text: element.textContent };
    }
    return { text: document.body.innerText };
  }

  /**
   * Take a full-page screenshot using canvas
   */
  async function screenshot({ fullPage }) {
    if (!fullPage) {
      // Visible area screenshot is handled by background script
      return { error: 'Use background script for visible screenshot' };
    }

    // Full page screenshot implementation
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    const width = document.documentElement.scrollWidth;
    const height = document.documentElement.scrollHeight;

    canvas.width = width;
    canvas.height = height;

    // This is a simplified version - full implementation would need
    // to scroll and stitch multiple captures
    return {
      error: 'Full page screenshot not yet implemented in content script',
      dimensions: { width, height },
    };
  }

  // ==========================================================================
  // JavaScript Execution
  // ==========================================================================

  /**
   * Evaluate JavaScript code
   */
  async function evaluate({ code }) {
    try {
      // Use Function constructor to evaluate in page context
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (async () => { ${code} })()`);
      const result = await fn();

      // Handle non-serializable results
      try {
        JSON.stringify(result);
        return { result };
      } catch {
        return { result: String(result) };
      }
    } catch (error) {
      return {
        error: {
          code: 'EVAL_ERROR',
          message: error.message,
        },
      };
    }
  }

  // ==========================================================================
  // Waiting
  // ==========================================================================

  /**
   * Wait for an element to appear
   */
  async function waitForSelector({ selector, timeout = 30000 }) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const element = document.querySelector(selector);
      if (element) {
        return {
          success: true,
          element: {
            tagName: element.tagName.toLowerCase(),
            id: element.id || null,
            className: element.className || null,
          },
        };
      }
      await sleep(100);
    }

    const error = new Error(`Timeout waiting for selector: ${selector}`);
    error.code = 'TIMEOUT';
    throw error;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Find a single element by selector
   * @param {string} selector
   * @returns {Element}
   */
  async function findElement(selector) {
    const element = document.querySelector(selector);
    if (!element) {
      const error = new Error(`Element not found: ${selector}`);
      error.code = 'ELEMENT_NOT_FOUND';
      throw error;
    }
    return element;
  }

  /**
   * Check if an element is visible
   * @param {Element} element
   * @returns {boolean}
   */
  function isElementVisible(element) {
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      rect.width > 0 &&
      rect.height > 0
    );
  }

  /**
   * Sleep for a given duration
   * @param {number} ms
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  console.log('[FoxPilot] Content script loaded');
})();
