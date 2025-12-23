async function updateTabUI(tabId, isEnabled) {
  if (!tabId) return;
  const state = isEnabled ? "on" : "off";
  try {
    await chrome.action.setIcon({
      path: {
        "16": `icon16_${state}.png`,
        "48": `icon48_${state}.png`,
        "128": `icon128_${state}.png`
      },
      tabId
    });
  } catch (e) {
    // Suppress error jika tab sudah tertutup
  }
}

chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-overlay') {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) return;
      
      chrome.tabs.sendMessage(tab.id, { action: 'TOGGLE_LOCAL' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res) updateTabUI(tab.id, res.enabled);
      });
    } catch (e) {}
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'SYNC_UI') {
    const targetTabId = msg.tabId === 'self' ? sender.tab?.id : msg.tabId;
    if (targetTabId) updateTabUI(targetTabId, msg.enabled);
  }
});