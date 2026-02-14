// Storage keys (must match background.js)
const STORAGE_KEYS = {
  HISTORY: 'recentTabsHistory',
  CONFIG: 'recentTabsConfig'
};

// DOM elements
const tabsListEl = document.getElementById('tabs-list');
const emptyStateEl = document.getElementById('empty-state');
const historySizeSelect = document.getElementById('history-size');

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

// Save config to storage
async function saveConfig(config) {
  await chrome.storage.local.set({ [STORAGE_KEYS.CONFIG]: config });
}

// Render a single tab item
function createTabItem(tab) {
  const item = document.createElement('div');
  item.className = 'tab-item';
  item.dataset.tabId = tab.id;

  // Create favicon element
  const favicon = document.createElement('div');
  favicon.className = 'favicon';
  if (tab.favIconUrl) {
    favicon.innerHTML = `<img src="${tab.favIconUrl}" alt="" width="16" height="16">`;
  } else {
    favicon.className = 'favicon missing';
    favicon.textContent = '📄';
  }

  // Create tab info
  const tabInfo = document.createElement('div');
  tabInfo.className = 'tab-info';

  const title = document.createElement('div');
  title.className = 'tab-title';
  title.textContent = tab.title || 'Untitled';

  const url = document.createElement('div');
  url.className = 'tab-url';
  url.textContent = tab.url || '';

  tabInfo.appendChild(title);
  tabInfo.appendChild(url);

  item.appendChild(favicon);
  item.appendChild(tabInfo);

  // Click handler
  item.addEventListener('click', async () => {
    await switchToTab(tab.id);
  });

  return item;
}

// Switch to a specific tab
async function switchToTab(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab && !tab.discarded) {
      // Activate the tab
      await chrome.tabs.update(tab.id, { active: true });

      // Also focus the window if it's in a different window
      if (tab.windowId !== chrome.windows.WINDOW_ID_CURRENT) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
    } else {
      // Tab is discarded or doesn't exist
      console.warn('Tab not found or discarded:', tabId);
    }
  } catch (error) {
    console.error('Error switching to tab:', error);
  }
}

// Render the tabs list
async function renderTabs() {
  const tabs = await getRecentTabs();
  tabsListEl.innerHTML = '';

  if (tabs.length === 0) {
    tabsListEl.style.display = 'none';
    emptyStateEl.style.display = 'block';
    return;
  }

  tabsListEl.style.display = 'block';
  emptyStateEl.style.display = 'none';

  tabs.forEach(tab => {
    const tabItem = createTabItem(tab);
    tabsListEl.appendChild(tabItem);
  });
}

// Initialize the popup
async function init() {
  // Load config and update history size selector
  const config = await getConfig();
  historySizeSelect.value = config.maxHistorySize || 20;

  // Render tabs
  await renderTabs();
}

// Event listener: History size change
historySizeSelect.addEventListener('change', async (e) => {
  const size = parseInt(e.target.value, 10);
  const config = await getConfig();
  config.maxHistorySize = size;
  await saveConfig(config);
});

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);
