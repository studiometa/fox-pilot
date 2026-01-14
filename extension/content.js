/**
 * FoxPilot - Content Script
 *
 * Runs in the context of web pages and handles DOM interactions.
 */

(() => {
  // Prevent multiple injections
  if (window.__firefoxCommandLoaded) return;
  window.__firefoxCommandLoaded = true;

  // ==========================================================================
  // Ref System for Element Selection
  // ==========================================================================

  // Map of ref IDs to elements (refreshed on each snapshot)
  const refToElement = new Map();
  let refCounter = 0;

  /**
   * Clear all refs (called before new snapshot)
   */
  function clearRefs() {
    refToElement.clear();
    refCounter = 0;
  }

  /**
   * Generate a new ref ID
   * @returns {string}
   */
  function generateRef() {
    return `@e${++refCounter}`;
  }

  /**
   * Get element by ref or CSS selector
   * @param {string} selector - Ref (@e1) or CSS selector
   * @returns {Element|null}
   */
  function getElement(selector) {
    if (selector.startsWith('@')) {
      return refToElement.get(selector) || null;
    }
    return document.querySelector(selector);
  }

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
      // Snapshot
      snapshot,
      // Query
      query,
      // DOM Interaction
      click,
      type,
      fill,
      press,
      select,
      check,
      uncheck,
      scroll,
      hover,
      upload,
      // Attributes & Properties
      getAttribute,
      getProperty,
      // Data Extraction
      getHTML,
      getText,
      getValue,
      screenshot,
      // State Checks
      isVisible,
      isEnabled,
      isChecked,
      // JavaScript
      evaluate,
      // Waiting
      waitForSelector,
      waitForText,
      // Semantic Locators
      findByRole,
      findByLabel,
      findByText,
      findByPlaceholder,
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
  // Accessibility Snapshot
  // ==========================================================================

  /**
   * ARIA role mapping for HTML elements
   */
  const IMPLICIT_ROLES = {
    a: (el) => (el.hasAttribute('href') ? 'link' : null),
    article: () => 'article',
    aside: () => 'complementary',
    button: () => 'button',
    datalist: () => 'listbox',
    details: () => 'group',
    dialog: () => 'dialog',
    footer: () => 'contentinfo',
    form: () => 'form',
    h1: () => 'heading',
    h2: () => 'heading',
    h3: () => 'heading',
    h4: () => 'heading',
    h5: () => 'heading',
    h6: () => 'heading',
    header: () => 'banner',
    hr: () => 'separator',
    img: (el) => (el.getAttribute('alt') ? 'img' : 'presentation'),
    input: (el) => {
      const type = el.getAttribute('type') || 'text';
      const typeRoles = {
        button: 'button',
        checkbox: 'checkbox',
        email: 'textbox',
        image: 'button',
        number: 'spinbutton',
        radio: 'radio',
        range: 'slider',
        reset: 'button',
        search: 'searchbox',
        submit: 'button',
        tel: 'textbox',
        text: 'textbox',
        url: 'textbox',
      };
      return typeRoles[type] || 'textbox';
    },
    li: () => 'listitem',
    main: () => 'main',
    menu: () => 'menu',
    nav: () => 'navigation',
    ol: () => 'list',
    option: () => 'option',
    progress: () => 'progressbar',
    section: (el) =>
      el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby')
        ? 'region'
        : null,
    select: (el) => (el.multiple ? 'listbox' : 'combobox'),
    summary: () => 'button',
    table: () => 'table',
    tbody: () => 'rowgroup',
    td: () => 'cell',
    textarea: () => 'textbox',
    tfoot: () => 'rowgroup',
    th: () => 'columnheader',
    thead: () => 'rowgroup',
    tr: () => 'row',
    ul: () => 'list',
  };

  /**
   * Interactive roles for filtering
   */
  const INTERACTIVE_ROLES = new Set([
    'button',
    'checkbox',
    'combobox',
    'link',
    'listbox',
    'menu',
    'menuitem',
    'menuitemcheckbox',
    'menuitemradio',
    'option',
    'radio',
    'searchbox',
    'slider',
    'spinbutton',
    'switch',
    'tab',
    'textbox',
    'treeitem',
  ]);

  /**
   * Get the accessible role of an element
   * @param {Element} element
   * @returns {string|null}
   */
  function getRole(element) {
    // Explicit role takes precedence
    const explicitRole = element.getAttribute('role');
    if (explicitRole) return explicitRole;

    // Check implicit role
    const tagName = element.tagName.toLowerCase();
    const roleGetter = IMPLICIT_ROLES[tagName];
    if (roleGetter) return roleGetter(element);

    return null;
  }

  /**
   * Get the accessible name of an element
   * @param {Element} element
   * @returns {string}
   */
  function getAccessibleName(element) {
    // aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel.trim();

    // aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labels = labelledBy
        .split(' ')
        .map((id) => document.getElementById(id)?.textContent?.trim())
        .filter(Boolean);
      if (labels.length) return labels.join(' ');
    }

    // Label element (for form controls)
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent.trim();
    }

    // Wrapped in label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      const labelText = parentLabel.textContent.trim();
      const elementText = element.textContent?.trim() || '';
      return labelText.replace(elementText, '').trim() || labelText;
    }

    // Title attribute
    const title = element.getAttribute('title');
    if (title) return title.trim();

    // Placeholder (for inputs)
    const placeholder = element.getAttribute('placeholder');
    if (placeholder) return placeholder.trim();

    // Alt text (for images)
    const alt = element.getAttribute('alt');
    if (alt) return alt.trim();

    // Text content (for buttons, links, etc.)
    const textContent = element.textContent?.trim();
    if (textContent && textContent.length <= 100) return textContent;

    // Value (for inputs)
    if ('value' in element && element.value) {
      return element.value.slice(0, 50);
    }

    return '';
  }

  /**
   * Check if element is interactive
   * @param {Element} element
   * @returns {boolean}
   */
  function isInteractive(element) {
    const role = getRole(element);
    if (role && INTERACTIVE_ROLES.has(role)) return true;

    // Check for click handlers or tabindex
    if (element.onclick || element.getAttribute('tabindex') === '0')
      return true;

    // Contenteditable
    if (element.isContentEditable) return true;

    return false;
  }

  /**
   * Build accessibility tree for an element
   * @param {Element} element
   * @param {object} options
   * @param {number} currentDepth
   * @returns {object|null}
   */
  function buildAccessibilityNode(element, options, currentDepth = 0) {
    const { interactive, compact, depth, scope } = options;

    // Skip hidden elements
    if (!isElementVisible(element)) return null;

    // Check depth limit
    if (depth !== null && currentDepth > depth) return null;

    const role = getRole(element);
    const name = getAccessibleName(element);
    const isElementInteractive = isInteractive(element);

    // Build children first
    const children = [];
    for (const child of element.children) {
      const childNode = buildAccessibilityNode(child, options, currentDepth + 1);
      if (childNode) {
        if (Array.isArray(childNode)) {
          children.push(...childNode);
        } else {
          children.push(childNode);
        }
      }
    }

    // Skip non-interactive elements in interactive mode (but keep their children)
    if (interactive && !isElementInteractive && !role) {
      return children.length ? children : null;
    }

    // Skip empty structural elements in compact mode
    if (compact && !role && !name && !isElementInteractive) {
      return children.length ? children : null;
    }

    // Create node if it has semantic meaning
    if (role || name || isElementInteractive || children.length) {
      const ref = generateRef();
      refToElement.set(ref, element);

      const node = { ref };

      if (role) node.role = role;
      if (name) node.name = name;

      // Add extra attributes based on role
      if (role === 'heading') {
        const level = element.getAttribute('aria-level') ||
          element.tagName.match(/h(\d)/i)?.[1];
        if (level) node.level = parseInt(level);
      }

      if (role === 'checkbox' || role === 'radio' || role === 'switch') {
        node.checked = element.checked || element.getAttribute('aria-checked') === 'true';
      }

      if (role === 'textbox' || role === 'searchbox' || role === 'combobox') {
        if (element.value) node.value = element.value.slice(0, 50);
        if (element.placeholder) node.placeholder = element.placeholder;
      }

      if (element.disabled || element.getAttribute('aria-disabled') === 'true') {
        node.disabled = true;
      }

      if (element.required || element.getAttribute('aria-required') === 'true') {
        node.required = true;
      }

      if (children.length) node.children = children;

      return node;
    }

    return children.length ? children : null;
  }

  /**
   * Generate accessibility snapshot
   * @param {object} params
   * @returns {object}
   */
  async function snapshot({
    interactive = false,
    compact = false,
    depth = null,
    scope = null,
  } = {}) {
    // Clear previous refs
    clearRefs();

    // Determine root element
    let root = document.body;
    if (scope) {
      root = document.querySelector(scope);
      if (!root) {
        const error = new Error(`Scope selector not found: ${scope}`);
        error.code = 'ELEMENT_NOT_FOUND';
        throw error;
      }
    }

    // Build tree
    const tree = buildAccessibilityNode(root, { interactive, compact, depth, scope });

    // Format as text for easy reading
    const lines = [];
    function formatNode(node, indent = 0) {
      if (Array.isArray(node)) {
        node.forEach((n) => formatNode(n, indent));
        return;
      }

      const parts = [];

      if (node.role) parts.push(node.role);
      if (node.name) parts.push(`"${node.name}"`);

      const attrs = [];
      attrs.push(`ref=${node.ref}`);
      if (node.level) attrs.push(`level=${node.level}`);
      if (node.checked !== undefined) attrs.push(node.checked ? 'checked' : 'unchecked');
      if (node.disabled) attrs.push('disabled');
      if (node.required) attrs.push('required');
      if (node.value) attrs.push(`value="${node.value}"`);
      if (node.placeholder) attrs.push(`placeholder="${node.placeholder}"`);

      const line = `${'  '.repeat(indent)}- ${parts.join(' ')} [${attrs.join('] [')}]`;
      lines.push(line);

      if (node.children) {
        node.children.forEach((child) => formatNode(child, indent + 1));
      }
    }

    if (tree) {
      if (Array.isArray(tree)) {
        tree.forEach((n) => formatNode(n));
      } else {
        formatNode(tree);
      }
    }

    return {
      tree,
      text: lines.join('\n'),
      refCount: refCounter,
    };
  }

  // ==========================================================================
  // DOM Query
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

  // ==========================================================================
  // DOM Interaction
  // ==========================================================================

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
   * Type text into an input element (appends to existing value)
   */
  async function type({ selector, text }) {
    const element = await findElement(selector);

    // Focus the element
    element.focus();

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
   * Fill an input element (clears existing value first)
   */
  async function fill({ selector, text }) {
    const element = await findElement(selector);

    // Focus the element
    element.focus();

    // Clear existing value
    if ('value' in element) {
      element.value = '';
      element.dispatchEvent(new InputEvent('input', { bubbles: true }));
    } else if (element.isContentEditable) {
      element.textContent = '';
    }

    // Type the new text
    return type({ selector, text });
  }

  /**
   * Press a key or key combination
   */
  async function press({ selector, key }) {
    const element = selector ? await findElement(selector) : document.activeElement || document.body;

    // Parse key combination (e.g., "Control+a", "Shift+Enter")
    const parts = key.split('+');
    const mainKey = parts.pop();
    const modifiers = {
      ctrlKey: parts.includes('Control') || parts.includes('Ctrl'),
      shiftKey: parts.includes('Shift'),
      altKey: parts.includes('Alt'),
      metaKey: parts.includes('Meta') || parts.includes('Cmd'),
    };

    const keyboardEventInit = {
      key: mainKey,
      code: getKeyCode(mainKey),
      bubbles: true,
      cancelable: true,
      ...modifiers,
    };

    element.dispatchEvent(new KeyboardEvent('keydown', keyboardEventInit));
    element.dispatchEvent(new KeyboardEvent('keypress', keyboardEventInit));

    // Handle special keys
    if (mainKey === 'Enter' && element.form) {
      element.form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    }

    element.dispatchEvent(new KeyboardEvent('keyup', keyboardEventInit));

    return { success: true };
  }

  /**
   * Select an option in a dropdown
   */
  async function select({ selector, value, label }) {
    const element = await findElement(selector);

    if (element.tagName.toLowerCase() !== 'select') {
      const error = new Error('Element is not a select');
      error.code = 'INVALID_ELEMENT';
      throw error;
    }

    // Find option by value or label
    let option;
    if (value !== undefined) {
      option = element.querySelector(`option[value="${value}"]`);
    }
    if (!option && label !== undefined) {
      option = Array.from(element.options).find(
        (opt) => opt.textContent.trim() === label
      );
    }

    if (!option) {
      const error = new Error(`Option not found: ${value || label}`);
      error.code = 'ELEMENT_NOT_FOUND';
      throw error;
    }

    element.value = option.value;
    element.dispatchEvent(new Event('change', { bubbles: true }));

    return { success: true, selectedValue: option.value, selectedText: option.textContent };
  }

  /**
   * Check a checkbox or radio button
   */
  async function check({ selector }) {
    const element = await findElement(selector);

    if (!['checkbox', 'radio'].includes(element.type)) {
      const error = new Error('Element is not a checkbox or radio');
      error.code = 'INVALID_ELEMENT';
      throw error;
    }

    if (!element.checked) {
      element.click();
    }

    return { success: true, checked: element.checked };
  }

  /**
   * Uncheck a checkbox
   */
  async function uncheck({ selector }) {
    const element = await findElement(selector);

    if (element.type !== 'checkbox') {
      const error = new Error('Element is not a checkbox');
      error.code = 'INVALID_ELEMENT';
      throw error;
    }

    if (element.checked) {
      element.click();
    }

    return { success: true, checked: element.checked };
  }

  /**
   * Scroll the page or to an element
   */
  async function scroll({ x, y, selector, direction, amount = 100 }) {
    if (selector) {
      const element = await findElement(selector);
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (direction) {
      const scrollOptions = { behavior: 'smooth' };
      switch (direction) {
        case 'up':
          window.scrollBy({ top: -amount, ...scrollOptions });
          break;
        case 'down':
          window.scrollBy({ top: amount, ...scrollOptions });
          break;
        case 'left':
          window.scrollBy({ left: -amount, ...scrollOptions });
          break;
        case 'right':
          window.scrollBy({ left: amount, ...scrollOptions });
          break;
      }
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
   * Upload files to a file input
   */
  async function upload({ selector, files }) {
    const element = await findElement(selector);

    if (element.type !== 'file') {
      const error = new Error('Element is not a file input');
      error.code = 'INVALID_ELEMENT';
      throw error;
    }

    // Note: For security reasons, we can't actually set files from content script
    // This would need to be handled via extension API or user interaction
    return {
      success: false,
      error: 'File upload requires user interaction for security reasons',
    };
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

  /**
   * Get the value of an input element
   */
  async function getValue({ selector }) {
    const element = await findElement(selector);
    return { value: element.value ?? element.textContent };
  }

  // ==========================================================================
  // State Checks
  // ==========================================================================

  /**
   * Check if element is visible
   */
  async function isVisible({ selector }) {
    const element = getElement(selector);
    return { visible: element ? isElementVisible(element) : false };
  }

  /**
   * Check if element is enabled
   */
  async function isEnabled({ selector }) {
    const element = await findElement(selector);
    return { enabled: !element.disabled };
  }

  /**
   * Check if checkbox/radio is checked
   */
  async function isChecked({ selector }) {
    const element = await findElement(selector);
    return { checked: element.checked ?? false };
  }

  // ==========================================================================
  // Semantic Locators
  // ==========================================================================

  /**
   * Find element by ARIA role and optional name
   */
  async function findByRole({ role, name, index = 0 }) {
    const elements = [];

    // Find by explicit role
    document.querySelectorAll(`[role="${role}"]`).forEach((el) => {
      if (isElementVisible(el)) elements.push(el);
    });

    // Find by implicit role
    document.querySelectorAll('*').forEach((el) => {
      if (getRole(el) === role && !el.hasAttribute('role') && isElementVisible(el)) {
        elements.push(el);
      }
    });

    // Filter by name if provided
    let matches = elements;
    if (name) {
      matches = elements.filter((el) => {
        const accessibleName = getAccessibleName(el);
        return accessibleName.toLowerCase().includes(name.toLowerCase());
      });
    }

    if (matches.length === 0) {
      const error = new Error(`No element found with role "${role}"${name ? ` and name "${name}"` : ''}`);
      error.code = 'ELEMENT_NOT_FOUND';
      throw error;
    }

    const element = matches[index];
    if (!element) {
      const error = new Error(`Index ${index} out of range, found ${matches.length} elements`);
      error.code = 'INDEX_OUT_OF_RANGE';
      throw error;
    }

    // Store in refs
    const ref = generateRef();
    refToElement.set(ref, element);

    return {
      ref,
      role: getRole(element),
      name: getAccessibleName(element),
      count: matches.length,
    };
  }

  /**
   * Find element by associated label
   */
  async function findByLabel({ label, index = 0 }) {
    const matches = [];

    // Find by label[for]
    document.querySelectorAll('label').forEach((labelEl) => {
      if (labelEl.textContent.toLowerCase().includes(label.toLowerCase())) {
        let target;
        if (labelEl.htmlFor) {
          target = document.getElementById(labelEl.htmlFor);
        } else {
          target = labelEl.querySelector('input, select, textarea');
        }
        if (target && isElementVisible(target)) {
          matches.push(target);
        }
      }
    });

    // Find by aria-label
    document.querySelectorAll(`[aria-label*="${label}" i]`).forEach((el) => {
      if (isElementVisible(el) && !matches.includes(el)) {
        matches.push(el);
      }
    });

    // Find by placeholder
    document.querySelectorAll(`[placeholder*="${label}" i]`).forEach((el) => {
      if (isElementVisible(el) && !matches.includes(el)) {
        matches.push(el);
      }
    });

    if (matches.length === 0) {
      const error = new Error(`No element found with label "${label}"`);
      error.code = 'ELEMENT_NOT_FOUND';
      throw error;
    }

    const element = matches[index];
    if (!element) {
      const error = new Error(`Index ${index} out of range, found ${matches.length} elements`);
      error.code = 'INDEX_OUT_OF_RANGE';
      throw error;
    }

    const ref = generateRef();
    refToElement.set(ref, element);

    return {
      ref,
      tagName: element.tagName.toLowerCase(),
      type: element.type || null,
      count: matches.length,
    };
  }

  /**
   * Find element by text content
   */
  async function findByText({ text, exact = false, index = 0 }) {
    const matches = [];
    const searchText = text.toLowerCase();

    // Walk through all elements
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          if (!isElementVisible(node)) return NodeFilter.FILTER_REJECT;
          const nodeText = node.textContent?.toLowerCase() || '';
          if (exact ? nodeText === searchText : nodeText.includes(searchText)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_SKIP;
        },
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      // Prefer leaf nodes (most specific match)
      const hasMatchingChild = Array.from(node.children).some((child) => {
        const childText = child.textContent?.toLowerCase() || '';
        return exact ? childText === searchText : childText.includes(searchText);
      });

      if (!hasMatchingChild) {
        matches.push(node);
      }
    }

    if (matches.length === 0) {
      const error = new Error(`No element found with text "${text}"`);
      error.code = 'ELEMENT_NOT_FOUND';
      throw error;
    }

    const element = matches[index];
    if (!element) {
      const error = new Error(`Index ${index} out of range, found ${matches.length} elements`);
      error.code = 'INDEX_OUT_OF_RANGE';
      throw error;
    }

    const ref = generateRef();
    refToElement.set(ref, element);

    return {
      ref,
      tagName: element.tagName.toLowerCase(),
      text: element.textContent.slice(0, 100),
      count: matches.length,
    };
  }

  /**
   * Find element by placeholder text
   */
  async function findByPlaceholder({ placeholder, index = 0 }) {
    const matches = Array.from(
      document.querySelectorAll(`[placeholder*="${placeholder}" i]`)
    ).filter(isElementVisible);

    if (matches.length === 0) {
      const error = new Error(`No element found with placeholder "${placeholder}"`);
      error.code = 'ELEMENT_NOT_FOUND';
      throw error;
    }

    const element = matches[index];
    if (!element) {
      const error = new Error(`Index ${index} out of range, found ${matches.length} elements`);
      error.code = 'INDEX_OUT_OF_RANGE';
      throw error;
    }

    const ref = generateRef();
    refToElement.set(ref, element);

    return {
      ref,
      tagName: element.tagName.toLowerCase(),
      type: element.type || null,
      placeholder: element.placeholder,
      count: matches.length,
    };
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
      const element = getElement(selector);
      if (element && isElementVisible(element)) {
        const ref = generateRef();
        refToElement.set(ref, element);

        return {
          success: true,
          ref,
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

  /**
   * Wait for text to appear on the page
   */
  async function waitForText({ text, timeout = 30000 }) {
    const startTime = Date.now();
    const searchText = text.toLowerCase();

    while (Date.now() - startTime < timeout) {
      if (document.body.textContent.toLowerCase().includes(searchText)) {
        return { success: true, found: true };
      }
      await sleep(100);
    }

    const error = new Error(`Timeout waiting for text: ${text}`);
    error.code = 'TIMEOUT';
    throw error;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Find a single element by ref or selector
   * @param {string} selector - Ref (@e1) or CSS selector
   * @returns {Element}
   */
  async function findElement(selector) {
    const element = getElement(selector);
    if (!element) {
      const error = new Error(`Element not found: ${selector}`);
      error.code = 'ELEMENT_NOT_FOUND';
      throw error;
    }
    return element;
  }

  /**
   * Get key code for a key name
   * @param {string} key
   * @returns {string}
   */
  function getKeyCode(key) {
    const keyCodes = {
      Enter: 'Enter',
      Tab: 'Tab',
      Escape: 'Escape',
      Backspace: 'Backspace',
      Delete: 'Delete',
      ArrowUp: 'ArrowUp',
      ArrowDown: 'ArrowDown',
      ArrowLeft: 'ArrowLeft',
      ArrowRight: 'ArrowRight',
      Home: 'Home',
      End: 'End',
      PageUp: 'PageUp',
      PageDown: 'PageDown',
      Space: 'Space',
      ' ': 'Space',
    };
    return keyCodes[key] || `Key${key.toUpperCase()}`;
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
