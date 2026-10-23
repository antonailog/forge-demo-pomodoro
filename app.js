(function () {
  'use strict';

  const core = window.PomodoroCore;
  const STORAGE_KEY = 'pomodoro.v1';
  // 走秒检查间隔（毫秒）：短于一秒，数字翻动不拖拍（ENGINEERING §三.3）。
  const TICK_MS = 250;
  // 提示音（ENGINEERING §三.3）：正弦波频率、峰值音量、淡入秒数、总时长秒数。
  const BEEP = { hz: 660, peak: 0.1, fadeIn: 0.02, length: 0.82 };

  // 只有存储和声音会因浏览器设置失败，try/catch 只包这两处；
  // 页面结构出错要在控制台暴露，不静默吞掉。
  const body = document.body;
  const ui = {
    phase: document.querySelector('[data-ui=phase]'),
    time: document.querySelector('[data-ui=time]'),
    status: document.querySelector('[data-ui=status]'),
    primary: document.querySelector('[data-ui=primary]'),
    skip: document.querySelector('[data-ui=skip]'),
    count: document.querySelector('[data-ui=count-num]'),
  };
  let storage = null;
  let audioContext = null;

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
    if (node.textContent !== value) node.textContent = value;
  }

  function setAttr(name, value) {
    if (body.getAttribute(name) === value) return false;
    body.setAttribute(name, value);
    return true;
  }

  function render(now) {
    const v = core.view(state, now);
    if (setAttr('data-phase', v.phase) && typeof ui.primary.getAnimations === 'function') {
      // 切阶段时让主按钮底色立即到位，普通悬停仍保留过渡（DESIGN §5.1）。
      for (const animation of ui.primary.getAnimations()) {
        if (animation.transitionProperty === 'background-color') animation.finish();
      }
    }
    setAttr('data-storage', storage === null ? 'off' : 'ok');
    setText(ui.phase, v.phaseLabel);
    setText(ui.time, v.time);
    setText(ui.status, v.status);
    setText(ui.primary, v.primary);
    setText(ui.count, String(v.count));
    if (document.title !== v.title) document.title = v.title;
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
        const endAt = now + BEEP.length;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(BEEP.hz, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(BEEP.peak, now + BEEP.fadeIn);
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

  saveRecord();
  render(now);
  window.setInterval(step, TICK_MS);

  ui.primary.addEventListener('click', function () {
    unlockAudio();
    syncCounter();
    const now = Date.now();
    applyResult(core.press(state, now), now);
  });

  ui.skip.addEventListener('click', function () {
    syncCounter();
    const now = Date.now();
    applyResult(core.skip(state, now), now);
  });

  document.addEventListener('pointerdown', acknowledgeAlert, true);
  document.addEventListener('keydown', acknowledgeAlert, true);

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      syncCounter();
      step();
    }
  });

  window.addEventListener('pageshow', step);

  window.addEventListener('storage', function (event) {
    if (event.key === STORAGE_KEY || event.key === null) {
      syncCounter();
      render(Date.now());
    }
  });
})();
