// Storage keys
const STORAGE_KEYS = {
  HISTORY: 'recentTabsHistory',
  CONFIG: 'recentTabsConfig'
};

let container = null;
let isInjected = false;

// Track tab selection for cycling
let recentTabs = [];
let selectedIndex = -1;

// Inject the floating UI
function injectUI() {
  if (isInjected) return;

  // Create container
  container = document.createElement('div');
  container.id = 'ert-float-container';

  container.innerHTML = `
    <div id="ert-float-content">
      <div id="ert-float-header">
        <h1>Recent Tabs</h1>
        <div id="ert-settings">
          <label for="ert-history-size">Size:</label>
          <select id="ert-history-size">
            <option value="10">10</option>
            <option value="20" selected>20</option>
            <option value="30">30</option>
            <option value="50">50</option>
          </select>
          <label class="ert-toggle-label">
            <input type="checkbox" id="ert-auto-activate">
            <span>Auto activate</span>
          </label>
        </div>
        <button id="ert-close-btn" title="Close">×</button>
      </div>
      <div id="ert-float-list">
        <div class="ert-loading">Loading...</div>
      </div>
      <div id="ert-float-footer">
        <div class="ert-shortcuts">
          <span class="ert-shortcut">
            <kbd>Alt</kbd>+<kbd>Q</kbd> Cycle tabs
          </span>
          <span class="ert-shortcut">
            <kbd>Esc</kbd> Close
          </span>
          <span class="ert-shortcut">
            <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>←</kbd> Previous
          </span>
        </div>
      </div>
    </div>
  `;

  // Add to DOM and mark as injected
  document.body.appendChild(container);
  isInjected = true;

  // Add event listeners AFTER container is in DOM
  document.getElementById('ert-close-btn').addEventListener('click', hideUI);
  container.addEventListener('click', (e) => {
    if (e.target === container) hideUI();
  });
  document.getElementById('ert-history-size').addEventListener('change', async (e) => {
    const size = parseInt(e.target.value, 10);
    const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
    const config = result[STORAGE_KEYS.CONFIG] || { maxHistorySize: 20 };
    config.maxHistorySize = size;
    await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: config });
  });
  document.getElementById('ert-auto-activate').addEventListener('change', async (e) => {
    const autoActivate = e.target.checked;
    const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
    const config = result[STORAGE_KEYS.CONFIG] || { maxHistorySize: 20 };
    config.autoActivateOnTimeout = autoActivate;
    await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: config });
  });

  // Keyboard events - add AFTER container is in DOM
  document.addEventListener('keydown', handleKeydown);
}

// Remove the floating UI
function removeUI() {
  if (container) {
    container.remove();
    container = null;
  }
  isInjected = false;
  document.removeEventListener('keydown', handleKeydown);
}

// Show the floating UI
async function showUI(initialIndex = 0) {
  console.log('[ERT] showUI called, isInjected:', isInjected, 'container:', !!container, 'initialIndex:', initialIndex);
  if (!isInjected) {
    injectUI();
  }

  console.log('[ERT] Adding show class to container');
  container.classList.add('show');
  recentTabs = await getRecentTabs();
  console.log('[ERT] recentTabs loaded:', recentTabs.length, 'tabs');
  selectedIndex = initialIndex; // Use the provided initial index
  await renderTabs();
  console.log('[ERT] showUI completed, selectedIndex:', selectedIndex);
}

// Hide the floating UI
function hideUI() {
  if (container) {
    container.classList.remove('show');
    // Notify background script that popup is closed
    chrome.runtime.sendMessage({ action: 'popupClosed' });
  }
}

// Toggle the floating UI
async function toggleUI() {
  if (container && container.classList.contains('show')) {
    hideUI();
  } else {
    await showUI();
  }
}

// Handle keydown events
function handleKeydown(e) {
  console.log('[ERT] handleKeydown called:', { key: e.key, code: e.code, ctrlKey: e.ctrlKey, repeat: e.repeat, container: !!container, isShow: container?.classList.contains('show'), selectedIndex });

  if (!container || !container.classList.contains('show')) {
    return;
  }

  // Handle Escape to close
  if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    hideUI();
  }

  // Handle Enter to activate selected tab
  if (e.key === 'Enter' && selectedIndex >= 0) {
    e.preventDefault();
    e.stopPropagation();
    activateSelectedTab();
  }
}

// Update the visual selection
function updateSelection() {
  const items = document.querySelectorAll('.ert-tab-item');
  items.forEach((item, index) => {
    if (index === selectedIndex) {
      item.classList.add('selected');
      // Scroll into view if needed
      item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } else {
      item.classList.remove('selected');
    }
  });
}

// Activate the currently selected tab
async function activateSelectedTab() {
  if (selectedIndex < 0 || selectedIndex >= recentTabs.length) {
    hideUI();
    return;
  }

  const tab = recentTabs[selectedIndex];
  try {
    // Send message to background script to switch tab
    const response = await chrome.runtime.sendMessage({
      action: 'switchToTab',
      tabId: tab.id
    });
    if (response && response.success) {
      hideUI();
    }
  } catch (error) {
    console.error('Error switching to tab:', error);
    hideUI();
  }
}

// Get recent tabs from storage
async function getRecentTabs() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return result[STORAGE_KEYS.HISTORY] || [];
}

// Get config from storage
async function getConfig() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
  return result[STORAGE_KEYS.CONFIG] || { maxHistorySize: 20 };
}

// Create a tab item element
function createTabItem(tab, _index) {
  const item = document.createElement('div');
  item.className = 'ert-tab-item';

  // Favicon
  const favicon = document.createElement('div');
  favicon.className = 'ert-favicon';
  if (tab.favIconUrl) {
    favicon.innerHTML = `<img src="${tab.favIconUrl}" alt="" width="20" height="20">`;
  } else {
    favicon.className = 'ert-favicon missing';
    favicon.textContent = '📄';
  }

  // Tab info
  const tabInfo = document.createElement('div');
  tabInfo.className = 'ert-tab-info';

  const title = document.createElement('div');
  title.className = 'ert-tab-title';
  title.textContent = tab.title || 'Untitled';

  const url = document.createElement('div');
  url.className = 'ert-tab-url';
  url.textContent = tab.url || '';

  tabInfo.appendChild(title);
  tabInfo.appendChild(url);

  item.appendChild(favicon);
  item.appendChild(tabInfo);

  // Click handler - switch to tab
  item.addEventListener('click', async () => {
    try {
      // Send message to background script to switch tab
      const response = await chrome.runtime.sendMessage({
        action: 'switchToTab',
        tabId: tab.id
      });
      if (response && response.success) {
        hideUI();
      }
    } catch (error) {
      console.error('Error switching to tab:', error);
    }
  });

  return item;
}

// Render the tabs list
async function renderTabs() {
  const list = document.getElementById('ert-float-list');
  list.innerHTML = '';

  if (recentTabs.length === 0) {
    list.innerHTML = `
      <div class="ert-empty">
        <p>No recent tabs</p>
        <p class="ert-hint">Start browsing to build your history</p>
      </div>
    `;
    return;
  }

  recentTabs.forEach((tab, index) => {
    const tabItem = createTabItem(tab, index);
    list.appendChild(tabItem);
  });

  // Update selection
  updateSelection();

  // Update config selector
  const config = await getConfig();
  const selector = document.getElementById('ert-history-size');
  if (selector) {
    selector.value = config.maxHistorySize || 20;
  }
  const autoActivateCheckbox = document.getElementById('ert-auto-activate');
  if (autoActivateCheckbox) {
    autoActivateCheckbox.checked = config.autoActivateOnTimeout || false;
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[ERT] Received message:', message);
  if (message.action === 'showFloat') {
    showUI(message.initialIndex || 0);
    sendResponse({ success: true });
  } else if (message.action === 'cycleSelection') {
    console.log('[ERT] Cycling selection to index:', message.selectedIndex);
    selectedIndex = message.selectedIndex;
    updateSelection();
    sendResponse({ success: true });
  } else if (message.action === 'hideFloat') {
    hideUI();
    sendResponse({ success: true });
  } else if (message.action === 'toggleFloat') {
    toggleUI();
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});
