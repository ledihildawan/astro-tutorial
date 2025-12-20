function toggleTab(tabId) {
  if (tabId) {
    chrome.tabs.sendMessage(tabId, { action: 'TOGGLE_LOCAL' }).catch(() => {});
  }
}

chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-overlay') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) toggleTab(tabs[0].id);
    });
  }
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === 'TOGGLE_REQUEST' && sender.tab) {
    toggleTab(sender.tab.id);
  }
});
