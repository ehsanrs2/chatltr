// Popup script for ChatGPT RTL Fixer (FA/EN)
// Reads and updates settings in chrome.storage via the service worker.

let currentHost;
const enabledEl = document.getElementById('enabled');
const modeEl = document.getElementById('mode');
const skipEl = document.getElementById('skipCode');

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  currentHost = new URL(tab.url).hostname;
  chrome.runtime.sendMessage({ type: 'getSettings', host: currentHost }, (res) => {
    const s = res.settings;
    enabledEl.checked = s.enabled;
    modeEl.value = s.mode;
    skipEl.checked = s.skipCode;
    if (!s.globalEnabled) {
      enabledEl.disabled = true;
      modeEl.disabled = true;
      skipEl.disabled = true;
    }
  });
});

enabledEl.addEventListener('change', () => {
  chrome.runtime.sendMessage({
    type: 'setSettings',
    host: currentHost,
    enabled: enabledEl.checked,
  });
});

modeEl.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'setSettings', mode: modeEl.value });
});

skipEl.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'setSettings', skipCode: skipEl.checked });
});
