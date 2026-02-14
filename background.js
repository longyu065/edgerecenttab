// Default configuration
const DEFAULT_CONFIG = {
  maxHistorySize: 20,
  autoActivateOnTimeout: false
};

// Storage keys
const STORAGE_KEYS = {
  HISTORY: 'recentTabsHistory',
  CONFIG: 'recentTabsConfig'
};

// Track the tab that was switched to via shortcut to prevent cycling
let lastShortcutTabId = null;
let lastShortcutTime = 0;
const SHORTCUT_COOLDOWN = 2000; // 2 seconds

// Get configuration from storage or return defaults
async function getConfig() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CONFIG);
  return result[STORAGE_KEYS.CONFIG] || DEFAULT_CONFIG;
}

// Get recent tabs history from storage
async function getHistory() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return result[STORAGE_KEYS.HISTORY] || [];
}

// Save history to storage
async function saveHistory(history) {
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: history });
}

// Add or update a tab in history
async function addOrUpdateTab(tab) {
  const config = await getConfig();
  let history = await getHistory();

  // Remove existing entry for this tab if it exists
  history = history.filter(entry => entry.id !== tab.id);

  // Create new entry
  const newEntry = {
    id: tab.id,
    title: tab.title || 'Untitled',
    url: tab.url || '',
    favIconUrl: tab.favIconUrl || '',
    timestamp: Date.now()
  };

  // Add to the beginning of history
  history.unshift(newEntry);

  // Trim to max size
  history = history.slice(0, config.maxHistorySize);

  await saveHistory(history);
}

// Remove a tab from history (when tab is closed)
async function removeTabFromHistory(tabId) {
  let history = await getHistory();
  history = history.filter(entry => entry.id !== tabId);
  await saveHistory(history);
}

// Clean up history by removing entries for tabs that no longer exist
async function cleanupHistory() {
  const tabs = await chrome.tabs.query({});
  const validTabIds = new Set(tabs.map(tab => tab.id));

  let history = await getHistory();
  const cleanedHistory = history.filter(entry => validTabIds.has(entry.id));

  if (cleanedHistory.length !== history.length) {
    await saveHistory(cleanedHistory);
  }

  return cleanedHistory;
}

// Switch to the most recent previous tab
async function switchToPreviousTab() {
  const history = await getHistory();

  if (history.length < 2) {
    // Not enough history
    return;
  }

  // Get the current active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) {
    return;
  }

  // Find the most recent tab that is not the current active tab AND not the one we just switched to via shortcut
  let previousTabEntry = null;
  for (let i = 0; i < history.length; i++) {
    if (history[i].id !== activeTab.id && history[i].id !== lastShortcutTabId) {
      previousTabEntry = history[i];
      break;
    }
  }

  // If we didn't find a tab skipping the last shortcut tab, try without skipping
  if (!previousTabEntry) {
    for (let i = 0; i < history.length; i++) {
      if (history[i].id !== activeTab.id) {
        previousTabEntry = history[i];
        break;
      }
    }
  }

  if (!previousTabEntry) {
    return;
  }

  // Try to get the tab by ID
  try {
    const tab = await chrome.tabs.get(previousTabEntry.id);
    if (tab && !tab.discarded) {
      // Mark this tab as the one we're switching to via shortcut
      lastShortcutTabId = tab.id;
      lastShortcutTime = Date.now();

      // Activate the tab
      await chrome.tabs.update(tab.id, { active: true });
    } else {
      // Tab is discarded or doesn't exist, remove from history
      await removeTabFromHistory(previousTabEntry.id);
    }
  } catch (error) {
    // Tab doesn't exist anymore, remove from history
    await removeTabFromHistory(previousTabEntry.id);
  }
}

// Event listener: Tab activated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);

    // If this activation happened shortly after a shortcut switch, update history but mark as shortcut
    const timeSinceShortcut = Date.now() - lastShortcutTime;
    if (timeSinceShortcut < SHORTCUT_COOLDOWN && tab.id === lastShortcutTabId) {
      // This was triggered by shortcut, update history normally
      // The lastShortcutTabId will be used by next shortcut press to skip
      await addOrUpdateTab(tab);
    } else {
      // Regular activation, clear the shortcut tracking
      lastShortcutTabId = null;
      await addOrUpdateTab(tab);
    }
  } catch (error) {
    console.error('Error handling tab activation:', error);
  }
});

// Event listener: Tab updated (e.g., URL changed, title changed)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' || changeInfo.title || changeInfo.url) {
    try {
      await addOrUpdateTab(tab);
    } catch (error) {
      console.error('Error handling tab update:', error);
    }
  }
});

// Event listener: Tab removed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  await removeTabFromHistory(tabId);
});

// Check if history tab is already open
async function getHistoryTab() {
  const tabs = await chrome.tabs.query({});
  return tabs.find(tab => tab.url.includes('history.html'));
}

// Open recent tabs in a new tab
async function openHistoryTab() {
  // Check if history tab is already open
  const existingTab = await getHistoryTab();
  if (existingTab) {
    // Focus the existing tab
    await chrome.tabs.update(existingTab.id, { active: true });
    await chrome.windows.update(existingTab.windowId, { focused: true });
    return;
  }

  // Open new tab with history page
  await chrome.tabs.create({
    url: 'history.html',
    active: true
  });
}

// Track cycling state
let cyclingTabId = null;
let cyclingSelectedIndex = 0;
let cyclingTabs = [];
let cyclingTimer = null;
const CYCLE_TIMEOUT = 800; // Activate tab after 0.8 seconds of inactivity

// Start/reset timer to activate selected tab
function startCyclingTimer() {
  if (cyclingTimer) {
    clearTimeout(cyclingTimer);
  }
  cyclingTimer = setTimeout(async () => {
    // Check if auto-activation is enabled
    const config = await getConfig();
    if (!config.autoActivateOnTimeout) {
      console.log('[Background] Auto-activation disabled, keeping popup open');
      cyclingTimer = null;
      return;
    }

    console.log('[Background] Cycle timeout, activating tab at index:', cyclingSelectedIndex);
    if (cyclingTabs[cyclingSelectedIndex]) {
      try {
        const tab = await chrome.tabs.get(cyclingTabs[cyclingSelectedIndex].id);
        if (tab && !tab.discarded) {
          await chrome.tabs.update(tab.id, { active: true });
          if (tab.windowId !== chrome.windows.WINDOW_ID_CURRENT) {
            await chrome.windows.update(tab.windowId, { focused: true });
          }
        }
      } catch (error) {
        console.error('[Background] Error activating tab:', error);
      }
      // Hide the popup by sending message to content script
      if (cyclingTabId) {
        try {
          await chrome.tabs.sendMessage(cyclingTabId, { action: 'hideFloat' });
        } catch (e) {
          // Tab might have been closed, ignore
        }
      }
    }
    // Reset cycling state
    cyclingTabId = null;
    cyclingTabs = [];
    cyclingTimer = null;
  }, CYCLE_TIMEOUT);
}

// Show floating popup in the active tab
async function showFloatPopup() {
  // Get the active tab in the current window
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) {
    return;
  }

  // If we're currently cycling (popup already open), just cycle to next
  if (cyclingTabId === activeTab.id) {
    console.log('[Background] Cycling in progress, moving to next tab');
    cyclingSelectedIndex = (cyclingSelectedIndex + 1) % cyclingTabs.length;
    await chrome.tabs.sendMessage(activeTab.id, {
      action: 'cycleSelection',
      selectedIndex: cyclingSelectedIndex
    });
    // Reset timer to give user more time
    startCyclingTimer();
    return;
  }

  // Can't inject into restricted pages
  if (activeTab.url.startsWith('chrome://') ||
      activeTab.url.startsWith('chrome-extension://') ||
      activeTab.url.startsWith('edge://') ||
      activeTab.url.startsWith('about:') ||
      activeTab.url.startsWith('file://') ||
      activeTab.url.startsWith('devtools://')) {
    // Fall back to opening a new tab
    await openHistoryTab();
    return;
  }

  // Inject the content script and CSS
  try {
    // Check if content script is already injected
    const results = await chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      func: () => {
        return typeof window.ertInjected !== 'undefined';
      }
    });

    const isInjected = results && results[0]?.result;

    if (!isInjected) {
      // Inject CSS
      await chrome.scripting.insertCSS({
        target: { tabId: activeTab.id },
        files: ['float.css']
      });

      // Inject JS
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        files: ['float.js']
      });

      // Mark as injected
      await chrome.scripting.executeScript({
        target: { tabId: activeTab.id },
        func: () => {
          window.ertInjected = true;
        }
      });
    }

    // Get recent tabs and set up cycling state
    const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
    const history = result[STORAGE_KEYS.HISTORY] || [];
    cyclingTabs = history;
    cyclingSelectedIndex = 0;
    cyclingTabId = activeTab.id;

    console.log('[Background] Sending showFloat message to tab:', activeTab.id, 'with', cyclingTabs.length, 'tabs');
    // Send message to show the float UI with initial state
    await chrome.tabs.sendMessage(activeTab.id, {
      action: 'showFloat',
      initialIndex: 0
    });

    // Start timer to auto-activate tab
    startCyclingTimer();
  } catch (error) {
    console.error('Error showing float popup:', error, 'tab URL:', activeTab.url);
    // Fall back to opening a new tab
    await openHistoryTab();
    // Reset cycling state
    cyclingTabId = null;
    cyclingTabs = [];
  }
}

// Event listener: Commands (keyboard shortcuts)
chrome.commands.onCommand.addListener(async (command) => {
  switch (command) {
    case 'previous-tab':
      await switchToPreviousTab();
      break;
    case 'open-popup':
      await showFloatPopup();
      break;
  }
});

// Listen for messages from content script (e.g., popup closed)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'popupClosed') {
    console.log('[Background] Popup closed, resetting cycling state');
    cyclingTabId = null;
    cyclingTabs = [];
    if (cyclingTimer) {
      clearTimeout(cyclingTimer);
      cyclingTimer = null;
    }
    sendResponse({ success: true });
  } else if (message.action === 'switchToTab') {
    console.log('[Background] Switching to tab:', message.tabId);
    chrome.tabs.get(message.tabId).then(tab => {
      if (tab && !tab.discarded) {
        chrome.tabs.update(tab.id, { active: true }).then(() => {
          if (tab.windowId !== chrome.windows.WINDOW_ID_CURRENT) {
            chrome.windows.update(tab.windowId, { focused: true });
          }
        });
      }
    }).catch(error => {
      console.error('[Background] Error switching to tab:', error);
    });
    sendResponse({ success: true });
  } else if (message.action === 'activateTab') {
    console.log('[Background] Activating tab at index:', message.index);
    if (cyclingTabs[message.index]) {
      chrome.tabs.update(cyclingTabs[message.index].id, { active: true }).then(() => {
        // Reset cycling state after activation
        cyclingTabId = null;
        cyclingTabs = [];
        if (cyclingTimer) {
          clearTimeout(cyclingTimer);
          cyclingTimer = null;
        }
      });
    }
    sendResponse({ success: true });
  }
  return true; // Keep message channel open for async response
});

// Initialize: Load existing tabs on startup
chrome.runtime.onStartup.addListener(async () => {
  // Clean up history first (remove entries for closed tabs)
  await cleanupHistory();

  // Add current tabs to history
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    await addOrUpdateTab(tab);
  }
});

// Initialize: Load existing tabs when extension is installed
chrome.runtime.onInstalled.addListener(async () => {
  // Clean up history first (remove entries for closed tabs)
  await cleanupHistory();

  // Add current tabs to history
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    await addOrUpdateTab(tab);
  }
});
