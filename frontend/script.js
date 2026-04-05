const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");

const resultEl = document.getElementById("result");
const resultBox = document.getElementById("resultBox");

const ring = document.getElementById("ring");
const waveform = document.getElementById("waveform");

const fileInput = document.getElementById("songFile");
const fileNameEl = document.getElementById("fileName");
const dropZone = document.getElementById("dropZone");

const statusDot = document.getElementById("statusDot");
const statusPill = document.getElementById("statusPill");
const statusLabel = document.getElementById("statusLabel");

const logsEmpty = document.getElementById("logsEmpty");
const logsStream = document.getElementById("logsStream");

let ws, recorder, stream;

// Backend health
function setConnected(on) {
    const s = on ? "connected" : "disconnected";
    statusDot.className = "status-dot " + s;
    statusPill.className = "status-pill " + s;
    statusLabel.textContent = on ? "Connected" : "Disconnected";
}

async function checkHealth() {
    try {
        const res = await fetch("http://localhost:8080/health");
        setConnected(res.ok);
    } catch {
        setConnected(false);
    }
}

checkHealth();
setInterval(checkHealth, 5000);

// File pick
fileInput.addEventListener("change", () => {
    fileNameEl.textContent = fileInput.files[0]?.name ?? "";
});
dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
});
["dragleave", "drop"].forEach((ev) =>
    dropZone.addEventListener(ev, () => dropZone.classList.remove("drag-over")),
);

// Listen state
function setListening(on) {
    ring.classList.toggle("active", on);
    waveform.classList.toggle("active", on);
    startBtn.disabled = on;
    stopBtn.disabled = !on;
}

function setResult(msg, state = "") {
    resultEl.textContent = msg;
    resultBox.className = "result-panel" + (state ? " " + state : "");
}

function clearLogs() {
    if (logsStream) logsStream.textContent = "";
    if (logsEmpty) logsEmpty.style.display = "block";
}

function appendLogLine(text) {
    if (!logsStream) return;

    if (logsEmpty) logsEmpty.style.display = "none";

    const line = document.createElement("div");
    line.className = "log-line";
    line.textContent = text;
    logsStream.appendChild(line);

    const maxLines = 200;
    while (logsStream.childNodes.length > maxLines) {
        logsStream.removeChild(logsStream.firstChild);
    }

    logsStream.scrollTop = logsStream.scrollHeight;
}

// WebSocket
startBtn.onclick = async () => {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
        alert("Microphone permission denied");
        return;
    }

    clearLogs();

    ws = new WebSocket("ws://localhost:8080/ws/audio");
    ws.onopen = () => {
        setConnected(true);
        recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
            if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(e.data);
        };
        recorder.start(1000);
        setListening(true);
        setResult("Listening…");
    };
    ws.onmessage = (e) => {
        const d = JSON.parse(e.data);

        if (d.type === "log" && d.message) {
            appendLogLine(d.message);
            return;
        }

        // Final response
        if (d.type === "result") {
            if (d.error) setResult("Error: " + d.error, "err");
            else if (d.found) {
                setResult(`${d.title} - ${d.artist}  ·  score ${d.score}`, "ok");
                appendLogLine(`[client] recognized: ${d.title} - ${d.artist}`);
            }
            else setResult("No match found.");
            ws.close();
            return;
        }

        // Unknown message
        if (d.error) {
            setResult("Error: " + d.error, "err");
            ws.close();
        }
    };
    ws.onclose = () => {
        setListening(false);
        checkHealth();
    };
    ws.onerror = () => {
        setResult("Connection error", "err");
        appendLogLine("[client] websocket connection error");
        setListening(false);
        setConnected(false);
    };
};

stopBtn.onclick = () => {
    recorder?.stop();
    stream?.getTracks().forEach((t) => t.stop());
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "end" }));
        setResult("Recognizing…");
        appendLogLine("[client] sent end signal, awaiting recognition...");
    }
};

// Upload
async function uploadSong() {
    const title = document.getElementById("songTitle").value.trim();
    const st = document.getElementById("uploadStatus");
    st.textContent = "";
    st.className = "";

    if (!fileInput.files.length) {
        st.textContent = "Please select an audio file.";
        st.className = "err";
        return;
    }
    if (!title) {
        st.textContent = "Song title is required.";
        st.className = "err";
        return;
    }

    st.textContent = "Uploading…";
    const fd = new FormData();
    fd.append("song", fileInput.files[0]);
    fd.append("title", title);
    fd.append("artist", document.getElementById("songArtist").value);

    try {
        clearLogs();
        appendLogLine("[client] upload started, waiting for ingestion logs...");

        const res = await fetch("http://localhost:8080/songs/upload/stream", {
            method: "POST",
            body: fd,
        });

        if (!res.ok) {
            const text = await res.text();
            st.textContent = text || "Upload failed. Please try again.";
            st.className = "err";
            return;
        }

        if (!res.body) {
            st.textContent = "Upload failed: streaming not supported by browser.";
            st.className = "err";
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handleEvent = (evt) => {
            if (!evt || typeof evt !== "object") return;

            if (evt.type === "log" && evt.message) {
                appendLogLine(evt.message);
                return;
            }

            if (evt.type === "error") {
                appendLogLine("[upload] error: " + (evt.error || "unknown"));
                st.textContent = evt.error || "Upload failed.";
                st.className = "err";
                return;
            }

            if (evt.type === "done") {
                appendLogLine(`[client] ingestion done - song_id=${evt.song_id}`);
                st.textContent = `Uploaded - ID: ${evt.song_id}`;
                st.className = "ok";
            }
        };

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                    handleEvent(JSON.parse(trimmed));
                } catch {
                    // invalid lines
                }
            }
        }

        const tail = buffer.trim();
        if (tail) {
            try {
                handleEvent(JSON.parse(tail));
            } catch {
                // ignore
            }
        }
    } catch {
        st.textContent = "Network error.";
        st.className = "err";
    }
}

// uploadSong available for the inline onclick handler
window.uploadSong = uploadSong;
