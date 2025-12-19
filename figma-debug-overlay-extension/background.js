// 1. Handle Shortcut dari Manifest (Alt+G)
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-overlay') {
    // Kirim pesan HANYA ke tab yang sedang aktif
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'TOGGLE' }).catch(() => {
          // Ignore error jika content script belum load (misal halaman kosong/chrome://)
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
