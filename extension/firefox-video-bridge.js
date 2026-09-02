const startButton = document.getElementById("startRecording");
if (startButton) {
  document.addEventListener("click", async (event) => {
    if (event.target !== startButton) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      await chrome.storage.local.set({ firefoxCaptureContext: {
        tabId: tab?.id || null,
        url: tab?.url || null,
        title: tab?.title || null,
        wantMic: document.getElementById("microphone")?.checked || false,
        wantCamera: document.getElementById("camera")?.checked || false
      }});
      document.getElementById("captureMessage").textContent = "Opening Firefox capture window…";
      await chrome.windows.create({ url: chrome.runtime.getURL("firefox-capture.html"), type: "popup", width: 520, height: 620, focused: true });
    } catch (error) {
      document.getElementById("captureMessage").textContent = error?.message || "Could not open Firefox capture window.";
    }
  }, true);
}
setInterval(async () => {
  const data = await chrome.storage.local.get("captureReady");
  const capture = data.captureReady;
  if (capture?.type === "video") {
    const message = document.getElementById("captureMessage");
    if (message) message.textContent = `Video ready: ${capture.name}`;
    const submit = document.getElementById("submit");
    if (submit) submit.disabled = false;
    await chrome.storage.local.remove("firefoxCaptureContext");
  }
}, 500);
