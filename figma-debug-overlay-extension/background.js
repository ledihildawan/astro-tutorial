// background.js

// 1. Handle Global Shortcut (Alt+G defined in manifest)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-overlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab && activeTab.id) {
        // Prevent errors on restricted pages (chrome://, etc.)
        if (activeTab.url.startsWith('chrome://') || activeTab.url.startsWith('edge://')) return;

        chrome.tabs.sendMessage(activeTab.id, { action: 'TOGGLE' }).catch((err) => {
          // Silent catch: Content script might not be loaded yet or unsupported page
          console.debug('Overlay not ready on this tab:', err);
        });
      }
    });
  }
});

// 2. Listener untuk request manual dari content script (Opsional, tapi bagus untuk fallback)
chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'TOGGLE_REQUEST' && sender.tab) {
    // Jika content script minta toggle, kita kirim balik perintah toggle
    // (Sebenarnya bisa ditangani langsung di content.js, tapi ini menjaga alur lama)
    chrome.tabs.sendMessage(sender.tab.id, { action: 'TOGGLE' });
  }
});
