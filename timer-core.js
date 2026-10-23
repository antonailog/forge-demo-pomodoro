(function () {
  'use strict';

  const FOCUS_MS = 25 * 60 * 1000;
  const BREAK_MS = 5 * 60 * 1000;

  function duration(phase) {
    return phase === 'focus' ? FOCUS_MS : BREAK_MS;
  }

  function phaseLabel(phase) {
    return phase === 'focus' ? '专注' : '休息';
  }

  function dateKey(ms) {
    const date = new Date(ms);
    return [
      String(date.getFullYear()).padStart(4, '0'),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-');
  }

  function initial(now) {
    return {
      date: dateKey(now), count: 0, countedEndAt: null,
      phase: 'focus', status: 'idle', endAt: null, remainingMs: null, alert: null,
    };
  }

  function remainingMs(state, now) {
    const full = duration(state.phase);
    let remaining = full;
    if (state.status === 'running') remaining = state.endAt - now;
    if (state.status === 'paused') remaining = state.remainingMs;
    return Math.min(full, Math.max(0, remaining));
  }

  function formatTime(ms) {
    const seconds = Math.ceil(Math.max(0, ms) / 1000);
    const minutes = String(Math.floor(seconds / 60)).padStart(2, '0');
    return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function nextSegment(state) {
    return {
      ...state,
      phase: state.phase === 'focus' ? 'break' : 'focus',
      status: 'idle', endAt: null, remainingMs: null, alert: null,
    };
  }

  // Both live completion and silent restoration use the same counting rule.
  function complete(state) {
    let { date, count, countedEndAt } = state;
    if (state.phase === 'focus' && state.endAt !== countedEndAt) {
      const endedOn = dateKey(state.endAt);
      if (endedOn >= date) {
        count = endedOn === date ? count + 1 : 1;
        date = endedOn;
        countedEndAt = state.endAt;
      }
    }
    return { ...nextSegment(state), date, count, countedEndAt };
  }

  function rollover(state, now) {
    const today = dateKey(now);
    return state.date === today ? { ...state } : { ...state, date: today, count: 0 };
  }

  function tick(state, now) {
    let next = state;
    let events = [];
    if (state.status === 'running' && now >= state.endAt) {
      next = { ...complete(state), alert: { phase: state.phase, at: now } };
      events = [{ type: 'complete', phase: state.phase }];
    }
    // Settle against the end date before resetting the displayed day's counter.
    return { state: rollover(next, now), events };
  }

  function press(state, now) {
    const result = tick(state, now);
    if (result.events.length > 0) return result;
    const current = ack(result.state);
    if (current.status === 'running') {
      return {
        state: { ...current, status: 'paused', remainingMs: remainingMs(current, now), endAt: null },
        events: [],
      };
    }
    const remaining = current.status === 'paused' ? current.remainingMs : duration(current.phase);
    return {
      state: { ...current, status: 'running', endAt: now + remaining, remainingMs: null },
      events: [],
    };
  }

  function skip(state, now) {
    const result = tick(state, now);
    if (result.events.length > 0) return result;
    return { state: nextSegment(result.state), events: [] };
  }

  function ack(state) {
    return { ...state, alert: null };
  }

  function mergeCounter(state, record) {
    if (record === null || record.date < state.date) return { ...state };
    if (record.date > state.date) {
      return { ...state, date: record.date, count: record.count, countedEndAt: record.countedEndAt };
    }
    let countedEndAt = state.countedEndAt;
    if (countedEndAt === null || (record.countedEndAt !== null && record.countedEndAt > countedEndAt)) {
      countedEndAt = record.countedEndAt;
    }
    return { ...state, count: Math.max(state.count, record.count), countedEndAt };
  }

  function parseRecord(text) {
    if (typeof text !== 'string') return null;
    let record;
    try {
      record = JSON.parse(text);
    } catch {
      return null;
    }
    if (record === null || typeof record !== 'object' || Array.isArray(record)) return null;
    if (
      record.v !== 1 ||
      typeof record.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(record.date) ||
      !Number.isInteger(record.count) || record.count < 0 ||
      (record.countedEndAt !== null && !Number.isFinite(record.countedEndAt)) ||
      !['focus', 'break'].includes(record.phase) ||
      !['idle', 'running', 'paused'].includes(record.status)
    ) return null;
    if (record.status === 'running' && !Number.isFinite(record.endAt)) return null;
    if (record.status === 'paused' && (!Number.isFinite(record.remainingMs) || record.remainingMs <= 0)) return null;
    return {
      v: 1, date: record.date, count: record.count, countedEndAt: record.countedEndAt,
      phase: record.phase, status: record.status,
      endAt: record.status === 'running' ? record.endAt : null,
      remainingMs: record.status === 'paused' ? Math.min(record.remainingMs, duration(record.phase)) : null,
    };
  }

  function toRecord(state) {
    return {
      v: 1, date: state.date, count: state.count, countedEndAt: state.countedEndAt,
      phase: state.phase, status: state.status, endAt: state.endAt, remainingMs: state.remainingMs,
    };
  }

  function restore(record, now) {
    if (record === null) return initial(now);
    const { v, ...saved } = record;
    let next = { ...saved, alert: null };
    if (next.status === 'running' && now >= next.endAt) {
      next = complete(next);
      if (dateKey(record.endAt) < dateKey(now)) next = { ...next, phase: 'focus' };
    }
    return rollover(next, now);
  }

  function view(state, now) {
    const time = formatTime(remainingMs(state, now));
    const label = phaseLabel(state.phase);
    const count = state.date === dateKey(now) ? state.count : 0;
    const status = state.alert
      ? `${phaseLabel(state.alert.phase)}结束`
      : (state.status === 'paused' ? '已暂停' : '');
    const primary = { idle: '开始', running: '暂停', paused: '继续' }[state.status];
    let title = `番茄钟 · 今天 ${count} 个`;
    if (state.status === 'running') {
      title = `${time} · ${label}`;
    } else if (state.status === 'paused') {
      title = `${time} · 已暂停`;
    } else if (state.alert && Math.floor(Math.max(0, now - state.alert.at) / 1000) % 2 === 0) {
      title = `${phaseLabel(state.alert.phase)}结束！`;
    }
    return { phase: state.phase, phaseLabel: label, time, status, primary, count, title };
  }

  const api = {
    FOCUS_MS, BREAK_MS, dateKey, initial, remainingMs, formatTime,
    tick, press, skip, ack, mergeCounter, parseRecord, toRecord, restore, view,
  };
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  } else {
    window.PomodoroCore = api;
  }
})();
