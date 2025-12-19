// Fungsi utama untuk toggle
function runToggle() {
  chrome.storage.sync.get(['store'], (data) => {
    const store = data.store || {};
    if (store.enabled === undefined) store.enabled = false;

    const newState = !store.enabled;
    store.enabled = newState;

    // Simpan & Broadcast ke semua tab
    chrome.storage.sync.set({ store: store }, () => {
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          // Kirim hanya ke halaman web yang valid
          if (tab.url && (tab.url.startsWith('http') || tab.url.startsWith('file'))) {
            chrome.tabs
              .sendMessage(tab.id, {
                action: 'TOGGLE',
                enabled: newState,
              })
              .catch(() => {});
          }
        }
      });
    });
  });
}

// 1. Listener untuk Shortcut Manifest (Alt+G)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-overlay') {
    runToggle();
  }
});

// 2. Listener untuk Shortcut Manual dari Content Script (Ctrl+')
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === 'TOGGLE_REQUEST') {
    runToggle();
  }
});
