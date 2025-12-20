// background.js - Per-Tab Icon & State Manager
function updateTabIcon(tabId, isEnabled) {
  if (!tabId) return;
  const path = isEnabled
    ? { 16: 'icon16.png', 48: 'icon48.png', 128: 'icon128.png' }
    : { 16: 'icon16_bw.png', 48: 'icon48_bw.png', 128: 'icon128_bw.png' };
  chrome.action.setIcon({ path: path, tabId: tabId }).catch(() => {});
}

function toggleTab(tabId) {
  chrome.tabs.sendMessage(tabId, { action: 'GET_STATUS' }, (res) => {
    const newState = res ? !res.enabled : true;
    chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_LOCAL' });
    updateTabIcon(tabId, newState);
  });
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-overlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) toggleTab(tabs[0].id);
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'TOGGLE_REQUEST' && sender.tab) toggleTab(sender.tab.id);
  if (msg.action === 'SYNC_UI' && msg.tabId) {
    const targetId = msg.tabId === 'self' ? sender.tab.id : msg.tabId;
    updateTabIcon(targetId, msg.enabled);
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') updateTabIcon(tabId, false);
});
