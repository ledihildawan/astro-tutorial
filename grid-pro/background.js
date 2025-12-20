async function updateTabUI(tabId, isEnabled) {
  if (!tabId) return;
  const path = isEnabled 
    ? { "16": "icon16_on.png", "48": "icon48_on.png", "128": "icon128_on.png" }
    : { "16": "icon16_off.png", "48": "icon48_off.png", "128": "icon128_off.png" };
  try { await chrome.action.setIcon({ path, tabId }); } catch (e) {}
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-overlay') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || tab.url.startsWith('chrome://')) return;
    chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_LOCAL' }, (res) => {
      if (chrome.runtime.lastError) { chrome.tabs.reload(tab.id); return; }
      if (res) updateTabUI(tab.id, res.enabled);
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'SYNC_UI') {
    const targetId = msg.tabId === 'self' ? sender.tab.id : msg.tabId;
    updateTabUI(targetId, msg.enabled);
  }
});