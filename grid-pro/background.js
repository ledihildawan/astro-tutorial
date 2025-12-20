async function updateTabUI(tabId, isEnabled) {
  if (!tabId) return;
  const state = isEnabled ? "on" : "off";
  // Catatan: Pastikan file icon16_on.png dll tersedia di folder root
  try {
    await chrome.action.setIcon({
      path: {
        "16": `icon16_${state}.png`,
        "48": `icon48_${state}.png`,
        "128": `icon128_${state}.png`
      },
      tabId: tabId
    });
  } catch (e) {
    // Fail silent jika icon tidak ditemukan
  }
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