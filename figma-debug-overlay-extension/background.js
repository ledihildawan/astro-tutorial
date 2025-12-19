// background.js

function updateIcon(isActive) {
  // Logic: Jika aktif gunakan icon warna, jika mati gunakan icon BW.
  // Fallback: Jika icon BW tidak ada, gunakan icon biasa agar tidak error.
  const path = isActive
    ? {
        16: 'icon16.png',
        48: 'icon48.png',
        128: 'icon128.png',
      }
    : {
        // Ganti nama file ini jika kamu sudah punya icon hitam putih
        16: 'icon16.png',
        48: 'icon48.png',
        128: 'icon128.png',
      };

  try {
    chrome.action.setIcon({ path: path });
  } catch (e) {
    console.warn('Gagal mengubah icon (mungkin file tidak ditemukan):', e);
  }
}

// Broadcast toggle ke semua tab aktif
async function broadcastToggle(state) {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      // Filter tab http/https/file
      if (tab.url && (tab.url.startsWith('http') || tab.url.startsWith('file'))) {
        try {
          await chrome.tabs.sendMessage(tab.id, { action: 'toggle', forceState: state });
        } catch (err) {
          // Tab mungkin tidak memiliki content script, abaikan
        }
      }
    }
  } catch (err) {
    console.error('Broadcast error:', err);
  }
}

// Init saat browser start
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['isOverlayEnabled'], (data) => {
    updateIcon(!!data.isOverlayEnabled);
  });
});

// Init saat install/update
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['isOverlayEnabled'], (data) => {
    updateIcon(!!data.isOverlayEnabled);
  });
});

// Listen perubahan storage -> update icon & broadcast
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.isOverlayEnabled !== undefined) {
    const isEnabled = changes.isOverlayEnabled.newValue ?? false;
    updateIcon(isEnabled);
    broadcastToggle(isEnabled);
  }
});
