const $ = (id) => document.getElementById(id);
const state = { context: null, screen: null, mic: null, camera: null, recorder: null, chunks: [], timer: null, startedAt: 0, windowId: null };

function formatTime(ms) {
  const s = Math.floor(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function stopTracks() {
  for (const stream of [state.screen, state.mic, state.camera]) {
    stream?.getTracks().forEach((track) => track.stop());
  }
  state.screen = state.mic = state.camera = null;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("supportable", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("attachments", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putAttachment(db, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("attachments", "readwrite");
    tx.objectStore("attachments").put(value);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function saveRecording() {
  stopTracks();
  const blob = new Blob(state.chunks, { type: state.recorder.mimeType || "video/webm" });
  const id = crypto.randomUUID();
  const record = {
    id,
    name: `supportable-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`,
    type: blob.type,
    size: blob.size,
    createdAt: new Date().toISOString()
  };
  await putAttachment(await openDb(), { ...record, blob });
  await chrome.storage.local.set({
    latestCapture: record,
    captureReady: { ...record, tabId: state.context?.tabId || null, type: "video" }
  });
  $("status").textContent = "Saved";
  $("message").textContent = `Saved ${record.name}`;
  $("start").disabled = false;
  if (state.windowId) setTimeout(() => chrome.windows.remove(state.windowId).catch(() => {}), 700);
}

async function startRecording() {
  $("start").disabled = true;
  $("message").textContent = "Choose the webpage tab to capture…";
  try {
    state.screen = await navigator.mediaDevices.getDisplayMedia({
      video: { displaySurface: "browser" },
      audio: false,
      selfBrowserSurface: "exclude",
      surfaceSwitching: "include",
      monitorTypeSurfaces: "include"
    });

    const warnings = [];
    if (state.context?.wantMic) {
      try { state.mic = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { warnings.push("Microphone unavailable — recording without microphone."); }
    }
    if (state.context?.wantCamera) {
      try { state.camera = await navigator.mediaDevices.getUserMedia({ video: true }); }
      catch { warnings.push("Camera unavailable — recording without camera."); }
    }

    const screenVideo = document.createElement("video");
    screenVideo.srcObject = state.screen;
    screenVideo.muted = true;
    await screenVideo.play();
    const cameraVideo = document.createElement("video");
    if (state.camera) {
      cameraVideo.srcObject = state.camera;
      cameraVideo.muted = true;
      await cameraVideo.play();
    }

    const canvas = document.createElement("canvas");
    const draw = () => {
      if (screenVideo.videoWidth) {
        canvas.width = screenVideo.videoWidth;
        canvas.height = screenVideo.videoHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height);
        if (state.camera && cameraVideo.videoWidth) {
          const w = Math.min(canvas.width * 0.25, 360);
          const h = w * cameraVideo.videoHeight / cameraVideo.videoWidth;
          const x = canvas.width - w - 24;
          const y = canvas.height - h - 24;
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 12);
          ctx.clip();
          ctx.drawImage(cameraVideo, x, y, w, h);
          ctx.restore();
        }
      }
      state.animationFrame = requestAnimationFrame(draw);
    };
    draw();

    const output = new MediaStream(canvas.captureStream(30).getVideoTracks());
    if (state.mic) {
      state.audioContext = new AudioContext();
      const destination = state.audioContext.createMediaStreamDestination();
      state.audioContext.createMediaStreamSource(state.mic).connect(destination);
      destination.stream.getAudioTracks().forEach((track) => output.addTrack(track));
    }

    $("preview").srcObject = output;
    const mimeType = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"].find((type) => MediaRecorder.isTypeSupported(type));
    state.recorder = new MediaRecorder(output, mimeType ? { mimeType } : undefined);
    state.chunks = [];
    state.recorder.ondataavailable = (event) => { if (event.data.size) state.chunks.push(event.data); };
    state.recorder.onerror = (event) => { $("message").textContent = `Recording error: ${event.error?.message || "unknown error"}`; };
    state.recorder.onstop = saveRecording;
    state.screen.getVideoTracks()[0].addEventListener("ended", stopRecording, { once: true });
    state.recorder.start(1000);
    state.startedAt = Date.now();
    state.timer = setInterval(() => { $("timer").textContent = formatTime(Date.now() - state.startedAt); }, 250);
    $("stop").disabled = false;
    $("status").textContent = "Recording";
    $("message").textContent = warnings.length ? warnings.join(" ") : "Recording selected webpage";
  } catch (error) {
    stopTracks();
    $("start").disabled = false;
    $("message").textContent = error?.message || "Capture could not be started.";
  }
}

function stopRecording() {
  if (state.recorder && state.recorder.state !== "inactive") state.recorder.stop();
  clearInterval(state.timer);
  state.timer = null;
  cancelAnimationFrame(state.animationFrame);
  state.animationFrame = null;
  $("stop").disabled = true;
}

$("start").addEventListener("click", startRecording);
$("stop").addEventListener("click", stopRecording);

(async () => {
  const data = await chrome.storage.local.get(["firefoxCaptureContext"]);
  state.context = data.firefoxCaptureContext || {};
  const win = await chrome.windows.getCurrent();
  state.windowId = win.id;
})();
