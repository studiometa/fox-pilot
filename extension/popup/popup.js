/**
 * Firefox Command - Popup Script
 */

const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const reconnectBtn = document.getElementById('reconnectBtn');

/**
 * Update the connection status display
 * @param {boolean} connected
 */
function updateStatus(connected) {
  if (connected) {
    statusIndicator.classList.add('connected');
    statusText.textContent = 'Connected';
  } else {
    statusIndicator.classList.remove('connected');
    statusText.textContent = 'Disconnected';
  }
}

/**
 * Check connection status from background script
 */
async function checkStatus() {
  try {
    const response = await browser.runtime.sendMessage({ type: 'getStatus' });
    updateStatus(response.connected);
  } catch (error) {
    updateStatus(false);
  }
}

/**
 * Request reconnection
 */
async function reconnect() {
  try {
    await browser.runtime.sendMessage({ type: 'reconnect' });
    statusText.textContent = 'Reconnecting...';
    setTimeout(checkStatus, 1000);
  } catch (error) {
    console.error('Reconnect failed:', error);
  }
}

// Event listeners
reconnectBtn.addEventListener('click', reconnect);

// Initial status check
checkStatus();

// Periodic status check
setInterval(checkStatus, 2000);
