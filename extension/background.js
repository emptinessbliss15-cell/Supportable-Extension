chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (tab?.id) {
      await chrome.sidePanel.open({ tabId: tab.id });
      await chrome.storage.local.set({ currentPage: { tabId: tab.id, windowId: tab.windowId, title: tab.title || "Current page", url: tab.url || "" } });
    }
  } catch (_) {}
});

chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab?.id && tab?.windowId) await chrome.storage.local.set({ currentPage: { tabId: tab.id, windowId: tab.windowId, title: tab.title || "Current page", url: tab.url || "" } });
  } catch (_) {}
});
