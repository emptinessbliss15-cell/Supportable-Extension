// Firefox compatibility layer for the shared Supportable panel.
// Firefox exposes tabs.captureTab(), which is the direct equivalent needed
// for screenshot capture from the sidebar. Keep the shared panel code intact.
if (chrome.tabs?.captureTab) {
  chrome.tabs.captureVisibleTab = async (_windowId, options = {}) =>
    chrome.tabs.captureTab(undefined, options);
}

// Firefox does not expose Chrome's tabCapture API, so use the browser's
// standard display-media picker as the video-capture fallback.
if (!chrome.tabCapture) {
  chrome.tabCapture = {
    capture(options, callback) {
      navigator.mediaDevices.getDisplayMedia({
        video: options?.video !== false,
        audio: options?.audio === true
      }).then(stream => callback(stream)).catch(error => {
        callback(null);
      });
    }
  };
}
