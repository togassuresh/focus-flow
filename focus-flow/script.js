(() => {
  const MODES = {
    focus: { label: 'Focus', minutes: 25, color: '--focus' },
    short: { label: 'Short Break', minutes: 5, color: '--short' },
    long: { label: 'Long Break', minutes: 15, color: '--long' },
  };

  const RING_CIRCUMFERENCE = 2 * Math.PI * 120;

  const state = load('focusFlowState', {
    mode: 'focus',
    secondsLeft: MODES.focus.minutes * 60,
    running: false,
    sessionCount: 1,
    tasks: [], // { id, text, done, pomodoros }
    activeTaskId: null,
    dailyDate: todayKey(),
    dailyCount: 0,
    muted: false,
    streak: 0,
    lastStreakDate: null,
  });

  function todayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function yesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
  }

  function recordDailyCompletion() {
    if (state.dailyDate !== todayKey()) {
      state.dailyDate = todayKey();
      state.dailyCount = 0;
    }
    state.dailyCount += 1;

    if (state.lastStreakDate !== todayKey()) {
      state.streak = state.lastStreakDate === yesterdayKey() ? state.streak + 1 : 1;
      state.lastStreakDate = todayKey();
    }
  }

  let tickHandle = null;

  const els = {
    modeBtns: document.querySelectorAll('.mode-btn'),
    ring: document.querySelector('.ring-progress'),
    timeDisplay: document.getElementById('timeDisplay'),
    sessionLabel: document.getElementById('sessionLabel'),
    startPauseBtn: document.getElementById('startPauseBtn'),
    resetBtn: document.getElementById('resetBtn'),
    skipBtn: document.getElementById('skipBtn'),
    taskForm: document.getElementById('taskForm'),
    taskInput: document.getElementById('taskInput'),
    taskList: document.getElementById('taskList'),
    taskCount: document.getElementById('taskCount'),
    emptyState: document.getElementById('emptyState'),
    dailyStat: document.getElementById('dailyStat'),
    clearDoneBtn: document.getElementById('clearDoneBtn'),
    muteBtn: document.getElementById('muteBtn'),
    charCounter: document.getElementById('charCounter'),
    announcer: document.getElementById('announcer'),
    resetAllBtn: document.getElementById('resetAllBtn'),
  };

  els.ring.style.strokeDasharray = String(RING_CIRCUMFERENCE);

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      return { ...fallback, ...parsed };
    } catch {
      return fallback;
    }
  }

  function save() {
    try {
      localStorage.setItem('focusFlowState', JSON.stringify(state));
    } catch {
      // storage unavailable (private browsing, sandboxed context); continue without persistence
    }
  }

  function totalSecondsForMode(mode) {
    return MODES[mode].minutes * 60;
  }

  function formatTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = Math.floor(sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function setMode(mode, resetTime = true) {
    state.mode = mode;
    if (resetTime) state.secondsLeft = totalSecondsForMode(mode);
    els.modeBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.mode === mode));
    const colorVar = MODES[mode].color;
    els.ring.style.stroke = getComputedStyle(document.documentElement).getPropertyValue(colorVar).trim();
    document.title = `${formatTime(state.secondsLeft)} · ${MODES[mode].label} · Focus Flow`;
    render();
    save();
  }

  function render() {
    els.timeDisplay.textContent = formatTime(state.secondsLeft);
    els.sessionLabel.textContent = state.mode === 'focus' ? `Session ${state.sessionCount}` : MODES[state.mode].label;
    const total = totalSecondsForMode(state.mode);
    const progress = 1 - state.secondsLeft / total;
    els.ring.style.strokeDashoffset = String(RING_CIRCUMFERENCE * (1 - progress));
    els.startPauseBtn.textContent = state.running ? 'Pause' : 'Start';
    document.title = `${formatTime(state.secondsLeft)} · ${MODES[state.mode].label} · Focus Flow`;
    if (state.dailyDate !== todayKey()) {
      state.dailyDate = todayKey();
      state.dailyCount = 0;
    }
    const minutes = state.dailyCount * MODES.focus.minutes;
    const streakText = state.streak > 1 ? ` · 🔥 ${state.streak} day streak` : '';
    els.dailyStat.textContent = `${state.dailyCount} session${state.dailyCount === 1 ? '' : 's'} today · ${minutes} min${streakText}`;
    renderTasks();
  }

  function tick() {
    if (state.secondsLeft > 0) {
      state.secondsLeft -= 1;
      render();
      save();
    } else {
      completeSession();
    }
  }

  function toggleMute() {
    state.muted = !state.muted;
    els.muteBtn.textContent = state.muted ? '🔇' : '🔊';
    els.muteBtn.title = state.muted ? 'Unmute chime' : 'Mute chime';
    save();
  }

  function playChime() {
    if (state.muted) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now + i * 0.12);
        gain.gain.linearRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.5);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.5);
      });
    } catch {
      // audio not available; ignore
    }
  }

  function completeSession() {
    pause();
    playChime();
    els.announcer.textContent = `${MODES[state.mode].label} session complete.`;
    if (state.mode === 'focus') {
      recordDailyCompletion();
      if (state.activeTaskId) {
        const t = state.tasks.find(t => t.id === state.activeTaskId);
        if (t) t.pomodoros = (t.pomodoros || 0) + 1;
      }
      const next = state.sessionCount % 4 === 0 ? 'long' : 'short';
      state.sessionCount += 1;
      setMode(next);
    } else {
      setMode('focus');
    }
    save();
  }

  function start() {
    if (state.running) return;
    state.running = true;
    tickHandle = setInterval(tick, 1000);
    render();
    save();
  }

  function pause() {
    state.running = false;
    clearInterval(tickHandle);
    tickHandle = null;
    render();
    save();
  }

  function toggleStartPause() {
    if (state.running) pause();
    else start();
  }

  function reset() {
    pause();
    state.secondsLeft = totalSecondsForMode(state.mode);
    render();
    save();
  }

  function skip() {
    pause();
    completeSession();
  }

  // --- Tasks ---
  function addTask(text) {
    const trimmed = text.trim();
    if (!trimmed) {
      els.taskInput.classList.remove('shake');
      void els.taskInput.offsetWidth;
      els.taskInput.classList.add('shake');
      return;
    }
    state.tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: trimmed, done: false, pomodoros: 0 });
    if (!state.activeTaskId) {
      const t = state.tasks[state.tasks.length - 1];
      state.activeTaskId = t.id;
    }
    save();
    renderTasks();
  }

  function toggleTask(id) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    t.done = !t.done;
    save();
    renderTasks();
  }

  function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    if (state.activeTaskId === id) state.activeTaskId = null;
    save();
    renderTasks();
  }

  function renameTask(id, newText) {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    t.text = trimmed;
    save();
  }

  function startRename(id, textEl) {
    const t = state.tasks.find(t => t.id === id);
    if (!t) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'task-edit-input';
    input.value = t.text;
    input.maxLength = 120;
    textEl.replaceWith(input);
    input.focus();
    input.select();

    let cancelled = false;
    const commit = () => {
      if (!cancelled) renameTask(id, input.value);
      renderTasks();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
      if (e.key === 'Escape') { e.preventDefault(); cancelled = true; input.blur(); }
    });
  }

  function clearCompleted() {
    if (state.activeTaskId && state.tasks.find(t => t.id === state.activeTaskId)?.done) {
      state.activeTaskId = null;
    }
    state.tasks = state.tasks.filter(t => !t.done);
    save();
    renderTasks();
  }

  function setActiveTask(id) {
    state.activeTaskId = state.activeTaskId === id ? null : id;
    save();
    renderTasks();
  }

  function renderTasks() {
    els.taskList.innerHTML = '';
    const doneCount = state.tasks.filter(t => t.done).length;
    els.taskCount.textContent = `${doneCount}/${state.tasks.length} done`;
    els.emptyState.classList.toggle('hidden', state.tasks.length > 0);

    state.tasks.forEach(t => {
      const li = document.createElement('li');
      li.className = 'task-item' + (t.done ? ' done' : '') + (t.id === state.activeTaskId ? ' active-task' : '');

      const checkbox = document.createElement('button');
      checkbox.className = 'task-checkbox' + (t.done ? ' checked' : '');
      checkbox.type = 'button';
      checkbox.setAttribute('aria-label', 'Toggle task done');
      checkbox.addEventListener('click', () => toggleTask(t.id));

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = t.text;
      text.title = 'Click to set as active task · double-click to rename';
      text.addEventListener('click', () => setActiveTask(t.id));
      text.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        startRename(t.id, text);
      });

      const pomoCount = document.createElement('span');
      pomoCount.className = 'task-pomo-count';
      pomoCount.textContent = `🍅 ${t.pomodoros || 0}`;

      const del = document.createElement('button');
      del.className = 'task-delete';
      del.type = 'button';
      del.innerHTML = '&times;';
      del.setAttribute('aria-label', 'Delete task');
      del.addEventListener('click', () => deleteTask(t.id));

      li.append(checkbox, text, pomoCount, del);

      if (t.id === state.activeTaskId) {
        const badge = document.createElement('span');
        badge.className = 'active-badge';
        badge.textContent = 'Active';
        text.insertAdjacentElement('afterend', badge);
      }
      els.taskList.appendChild(li);
    });
  }

  // --- Event listeners ---
  els.modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      pause();
      setMode(btn.dataset.mode);
    });
  });

  els.clearDoneBtn.addEventListener('click', clearCompleted);
  els.muteBtn.addEventListener('click', toggleMute);
  els.resetAllBtn.addEventListener('click', () => {
    if (confirm('Reset all data? This clears tasks, stats, and timer settings.')) {
      localStorage.removeItem('focusFlowState');
      location.reload();
    }
  });
  els.startPauseBtn.addEventListener('click', toggleStartPause);
  els.resetBtn.addEventListener('click', reset);
  els.skipBtn.addEventListener('click', skip);

  els.taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addTask(els.taskInput.value);
    els.taskInput.value = '';
    els.charCounter.textContent = '0/120';
  });

  els.taskInput.addEventListener('input', () => {
    els.charCounter.textContent = `${els.taskInput.value.length}/120`;
  });

  document.addEventListener('keydown', (e) => {
    if (document.activeElement === els.taskInput) {
      if (e.key === 'Escape') els.taskInput.blur();
      if (e.key === 'Enter') {
        e.preventDefault();
        addTask(els.taskInput.value);
        els.taskInput.value = '';
        els.charCounter.textContent = '0/120';
      }
      return;
    }
    switch (e.key) {
      case ' ':
        e.preventDefault();
        toggleStartPause();
        break;
      case 'r':
      case 'R':
        reset();
        break;
      case 's':
      case 'S':
        skip();
        break;
      case 'n':
      case 'N':
        e.preventDefault();
        els.taskInput.focus();
        break;
    }
  });

  // --- Init ---
  els.muteBtn.textContent = state.muted ? '🔇' : '🔊';
  els.muteBtn.title = state.muted ? 'Unmute chime' : 'Mute chime';
  setMode(state.mode, false);
  render();
  if (state.running) start();
})();
