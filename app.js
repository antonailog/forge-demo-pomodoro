(function () {
  'use strict';

  const core = window.PomodoroCore;
  const STORAGE_KEY = 'pomodoro.v1';
  let storage = null;
  let audioContext = null;
  let body;
  let ui;

  try {
    body = document.body;
    ui = {
      phase: document.querySelector('[data-ui=phase]'),
      time: document.querySelector('[data-ui=time]'),
      status: document.querySelector('[data-ui=status]'),
      primary: document.querySelector('[data-ui=primary]'),
      skip: document.querySelector('[data-ui=skip]'),
      count: document.querySelector('[data-ui=count-num]'),
    };
  } catch {
    return;
  }

  try {
    const candidate = window.localStorage;
    const probeKey = `${STORAGE_KEY}.probe`;
    candidate.setItem(probeKey, '1');
    candidate.removeItem(probeKey);
    storage = candidate;
  } catch {
    storage = null;
  }

  const now = Date.now();
  let state = core.restore(readRecord(), now);

  function readRecord() {
    if (storage === null) return null;
    try {
      return core.parseRecord(storage.getItem(STORAGE_KEY));
    } catch {
      return null;
    }
  }

  function syncCounter() {
    state = core.mergeCounter(state, readRecord());
  }

  function saveRecord() {
    if (storage === null) return;
    syncCounter();
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(core.toRecord(state)));
    } catch {
      storage = null;
    }
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function render(now) {
    const v = core.view(state, now);
    const storageStatus = storage === null ? 'off' : 'ok';
    try {
      if (body.getAttribute('data-phase') !== v.phase) {
        body.setAttribute('data-phase', v.phase);
      }
      if (body.getAttribute('data-storage') !== storageStatus) {
        body.setAttribute('data-storage', storageStatus);
      }
      setText(ui.phase, v.phaseLabel);
      setText(ui.time, v.time);
      setText(ui.status, v.status);
      setText(ui.primary, v.primary);
      setText(ui.count, String(v.count));
      if (document.title !== v.title) document.title = v.title;
    } catch {}
  }

  function unlockAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      if (audioContext === null) audioContext = new AudioContext();
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    } catch {
      audioContext = null;
    }
  }

  function handleEvents(events) {
    for (const event of events) {
      if (event.type !== 'complete') continue;
      try {
        if (audioContext === null) continue;
        if (audioContext.state === 'suspended') {
          audioContext.resume().catch(() => {});
          continue;
        }
        if (audioContext.state !== 'running') continue;

        const now = audioContext.currentTime;
        const endAt = now + 0.82;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, endAt);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(now);
        oscillator.stop(endAt);
      } catch {}
    }
  }

  function acknowledgeAlert() {
    if (!state.alert) return;
    state = core.ack(state);
    render(Date.now());
  }

  function applyResult(result, now) {
    const previous = JSON.stringify(core.toRecord(state));
    state = result.state;
    if (JSON.stringify(core.toRecord(state)) !== previous) saveRecord();
    handleEvents(result.events);
    render(now);
  }

  function step() {
    const now = Date.now();
    if (state.status === 'running' && now >= state.endAt) syncCounter();
    applyResult(core.tick(state, now), now);
  }

  function listen(target, type, handler) {
    try {
      target.addEventListener(type, handler);
    } catch {}
  }

  saveRecord();
  render(now);
  try {
    window.setInterval(step, 250);
  } catch {}

  listen(ui.primary, 'click', function () {
    unlockAudio();
    syncCounter();
    const now = Date.now();
    applyResult(core.press(state, now), now);
  });

  listen(ui.skip, 'click', function () {
    syncCounter();
    const now = Date.now();
    applyResult(core.skip(state, now), now);
  });

  try {
    document.addEventListener('pointerdown', acknowledgeAlert, true);
    document.addEventListener('keydown', acknowledgeAlert, true);
  } catch {}

  listen(document, 'visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      syncCounter();
      step();
    }
  });

  listen(window, 'pageshow', step);

  listen(window, 'storage', function (event) {
    if (event.key === STORAGE_KEY || event.key === null) {
      syncCounter();
      render(Date.now());
    }
  });
})();
