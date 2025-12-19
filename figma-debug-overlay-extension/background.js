// background.js

// Fungsi helper untuk mengganti icon
function updateIcon(isActive) {
  const path = isActive
    ? {
        16: 'icon16.png',
        48: 'icon48.png',
        128: 'icon128.png',
      }
    : {
        16: 'icon16_bw.png',
        48: 'icon48_bw.png',
        128: 'icon128_bw.png',
      };

  chrome.action.setIcon({ path: path });
}

// 1. Cek status saat Chrome pertama kali dibuka / Extension dimuat
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['isOverlayEnabled'], (data) => {
    updateIcon(!!data.isOverlayEnabled);
  });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['isOverlayEnabled'], (data) => {
    updateIcon(!!data.isOverlayEnabled);
  });
});

// 2. Pantau perubahan storage (ini yang menangkap trigger dari Popup atau tombol 'G')
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.isOverlayEnabled) {
    const isEnabled = changes.isOverlayEnabled.newValue;
    updateIcon(isEnabled);
  }
});
