// Firefox compatibility layer for the shared Supportable panel.
// Firefox does not expose Chrome's tabCapture API, so use the browser's
// standard display-media picker as the video-capture fallback.
if (!chrome.tabCapture) {
  chrome.tabCapture = {
    capture(options, callback) {
      navigator.mediaDevices.getDisplayMedia({
        video: options?.video !== false,
        audio: options?.audio === true
      }).then(stream => callback(stream)).catch(error => {
        chrome.runtime.lastError = { message: error?.message || "Display capture was cancelled." };
        callback(null);
      });
    }
  };
}
