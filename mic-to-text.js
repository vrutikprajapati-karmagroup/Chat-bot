// mic-to-text.js

let recognition = null;
let isListening = false;
let userManuallyStopped = false;

// Helpers
function el(id) { return document.getElementById(id); }
function setStatus(msg) { const s = el('sr-status'); if (s) s.textContent = msg || ''; }
function setError(msg) { const e = el('sr-error'); if (e) e.textContent = msg || ''; }

// Build recognizer
function createRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.lang = document.documentElement.lang || 'en-US'; // set <html lang="en-IN"> if you prefer
  r.continuous = false;       // <-- stop automatically after a pause
  r.interimResults = true;
  r.maxAlternatives = 1;
  return r;
}

// Start listening
function startListening() {
  const input = el('chat-input');
  const sendButton = el('chat-send-btn'); // Get the send button
  if (!input) { setError('Input element not found.'); return; }

  recognition = createRecognition();
  if (!recognition) { setError('Speech recognition API not available in this browser.'); return; }

  let finalText = '';
  userManuallyStopped = false;

  recognition.onstart = () => {
    isListening = true;
    setStatus('🎙️ Listening…');
    el('mic-btn')?.setAttribute('aria-pressed', 'true');
    input.dataset.origPlaceholder = input.placeholder || '';
    input.placeholder = 'Listening…';

    // Disable the send button while listening
    if (sendButton) sendButton.disabled = true;
  };

  recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const res = event.results[i];
      if (res.isFinal) finalText += res[0].transcript;
      else interim += res[0].transcript;
    }
    input.value = (finalText + ' ' + interim).trim();
  };

  // Extra safety: some engines also fire this on silence
  recognition.onspeechend = () => {
    try { recognition.stop(); } catch { }
  };

  recognition.onerror = (event) => {
    setError('Error: ' + event.error);
    stopListening(true); // true => user intent / error => don't autosend
  };

  recognition.onend = () => {
    isListening = false;
    el('mic-btn')?.setAttribute('aria-pressed', 'false');
    if (input) input.placeholder = input.dataset.origPlaceholder || 'Ask or press the mic';

    // Re-enable the send button after listening ends
    if (sendButton) sendButton.disabled = false;

    // Auto-send if we have text and the user didn't manually stop
    const txt = (input?.value || '').trim();
    if (txt && !userManuallyStopped && typeof window.sendFromInput === 'function') {
      window.sendFromInput();
    }
  };

  try {
    recognition.start();
  } catch {
    setError('Could not start recognition. Please try again.');
  }
}

// Stop listening
function stopListening(manual = false) {
  userManuallyStopped = manual === true;
  if (recognition) {
    try { recognition.stop(); } catch { }
    recognition = null;
  }
  isListening = false;
  setStatus('');
  el('mic-btn')?.setAttribute('aria-pressed', 'false');
  const input = el('chat-input');
  const sendButton = el('chat-send-btn'); // Get the send button

  // Re-enable the send button when stopped
  if (sendButton) sendButton.disabled = false;

  if (input) input.placeholder = input.dataset?.origPlaceholder || 'Ask or press the mic';
}

// Toggle mic (wired to onclick on the button)
function toggleMic() {
  setError('');
  if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
    setError('Speech recognition not supported in this browser. Try Chrome or Edge.');
    return;
  }
  if (isListening) stopListening(true);   // user clicked to stop -> don't autosend
  else startListening();
}
