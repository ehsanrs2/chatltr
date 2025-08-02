// Service worker for ChatGPT RTL Fixer (FA/EN)
// Handles global toggle, storage, and messaging between popup and content scripts.

const DEFAULT_SETTINGS = {
  globalEnabled: true,
  mode: 'auto',
  skipCode: true,
  enabledSites: {},
};

let settings = { ...DEFAULT_SETTINGS };

chrome.storage.sync.get(DEFAULT_SETTINGS, (res) => {
  settings = { ...settings, ...res };
});

function isEnabled(host) {
  return settings.globalEnabled && settings.enabledSites[host] !== false;
}

function updateTab(tab) {
  if (!tab || !tab.url) return;
  const host = new URL(tab.url).hostname;
  if (!['chat.openai.com', 'chatgpt.com'].includes(host)) return;
  const enabled = isEnabled(host);
  chrome.tabs.sendMessage(tab.id, {
    type: 'settings',
    settings: { enabled, mode: settings.mode, skipCode: settings.skipCode },
  });
}

function updateAllTabs() {
  chrome.tabs.query(
    { url: ['https://chat.openai.com/*', 'https://chatgpt.com/*'] },
    (tabs) => tabs.forEach(updateTab)
  );
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'getSettings') {
    const enabled = isEnabled(msg.host);
    sendResponse({
      settings: {
        enabled,
        mode: settings.mode,
        skipCode: settings.skipCode,
        globalEnabled: settings.globalEnabled,
      },
    });
    return true;
  }
  if (msg.type === 'setSettings') {
    if (msg.host && typeof msg.enabled === 'boolean') {
      settings.enabledSites[msg.host] = msg.enabled;
      chrome.storage.sync.set({ enabledSites: settings.enabledSites });
    }
    if (msg.mode) {
      settings.mode = msg.mode;
      chrome.storage.sync.set({ mode: settings.mode });
    }
    if (typeof msg.skipCode === 'boolean') {
      settings.skipCode = msg.skipCode;
      chrome.storage.sync.set({ skipCode: settings.skipCode });
    }
    updateAllTabs();
  }
});

chrome.commands.onCommand.addListener((cmd) => {
  if (cmd === 'toggle-extension') {
    settings.globalEnabled = !settings.globalEnabled;
    chrome.storage.sync.set(
      { globalEnabled: settings.globalEnabled },
      updateAllTabs
    );
  }
});

chrome.tabs.onActivated.addListener((info) => {
  chrome.tabs.get(info.tabId, updateTab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') updateTab(tab);
});
