browser.browserAction?.onClicked.addListener(() => browser.sidebarAction.open());
browser.action?.onClicked.addListener(() => browser.sidebarAction.open());

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  try {
    const tab = await browser.tabs.get(tabId);
    if (tab?.id && tab?.windowId) {
      await browser.storage.local.set({
        currentPage: {
          tabId: tab.id,
          windowId: tab.windowId,
          title: tab.title || "Current page",
          url: tab.url || ""
        }
      });
    }
  } catch (_) {}
});
