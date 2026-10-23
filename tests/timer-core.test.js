'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../timer-core.js');

const FOCUS = 25 * 60 * 1000;
const BREAK = 5 * 60 * 1000;
const localTime = (day = 23, hour = 9, minute = 0, second = 0, ms = 0) =>
  new Date(2026, 9, day, hour, minute, second, ms).getTime();
const NOW = localTime();

// Fixtures are independent of the implementation, including duration constants.
function state(overrides = {}) {
  return {
    date: '2026-10-23', count: 0, countedEndAt: null,
    phase: 'focus', status: 'idle', endAt: null, remainingMs: null, alert: null,
    ...overrides,
  };
}

function record(overrides = {}) {
  return {
    v: 1, date: '2026-10-23', count: 0, countedEndAt: null,
    phase: 'focus', status: 'idle', endAt: null, remainingMs: null,
    ...overrides,
  };
}

test('U1 第一次打开：专注待开始、今天零个、本机日期和完整文案', () => {
  assert.equal(core.FOCUS_MS, 1500000);
  assert.equal(core.BREAK_MS, 300000);
  assert.equal(core.dateKey(new Date(2026, 0, 9, 0, 5, 0).getTime()), '2026-01-09');
  assert.equal(core.dateKey(localTime(23, 0, 5)), '2026-10-23');
  assert.equal(core.dateKey(localTime(23, 23, 55)), '2026-10-23');
  const initial = core.initial(NOW);
  assert.deepEqual(initial, state());
  assert.deepEqual(core.view(initial, NOW), {
    phase: 'focus', phaseLabel: '专注', time: '25:00', status: '',
    primary: '开始', count: 0, title: '番茄钟 · 今天 0 个',
  });
});

test('U2 开始后按结束时刻计算：一秒后 24:59，后台回来也不累减', () => {
  const started = core.press(state({ alert: { phase: 'break', at: NOW - 1000 } }), NOW);
  const running = state({ status: 'running', endAt: NOW + FOCUS });
  assert.deepEqual(started, { state: running, events: [] });
  assert.deepEqual(core.tick(started.state, NOW + 1000), { state: running, events: [] });
  assert.deepEqual(core.view(running, NOW + 1000), {
    phase: 'focus', phaseLabel: '专注', time: '24:59', status: '',
    primary: '暂停', count: 0, title: '24:59 · 专注',
  });
  assert.equal(core.remainingMs(running, NOW + 10 * 60 * 1000), 900000);
  assert.equal(core.view(running, NOW + 10 * 60 * 1000).time, '15:00');
});

test('U3 剩余 12:34 时暂停，五分钟后继续，暂停期间时间不变', () => {
  const paused = core.press(state({ status: 'running', endAt: NOW + 754000 }), NOW);
  const expected = state({ status: 'paused', remainingMs: 754000 });
  assert.deepEqual(paused, { state: expected, events: [] });
  const resumeAt = NOW + 5 * 60 * 1000;
  assert.deepEqual(core.tick(paused.state, resumeAt), { state: expected, events: [] });
  assert.deepEqual(core.view(paused.state, resumeAt), {
    phase: 'focus', phaseLabel: '专注', time: '12:34', status: '已暂停',
    primary: '继续', count: 0, title: '12:34 · 已暂停',
  });
  const resumed = core.press(paused.state, resumeAt);
  assert.deepEqual(resumed, {
    state: state({ status: 'running', endAt: resumeAt + 754000 }), events: [],
  });
  assert.equal(core.remainingMs(resumed.state, resumeAt), 754000);
  assert.equal(core.view(resumed.state, resumeAt + 1000).time, '12:33');
  assert.equal(core.view(resumed.state, resumeAt).status, '');
  assert.equal(core.view(resumed.state, resumeAt).primary, '暂停');
});

test('U4 专注任一状态跳过：休息待开始、不计数、清除提示', () => {
  for (const status of ['idle', 'running', 'paused']) {
    const input = state({
      status, count: 2, countedEndAt: NOW - FOCUS,
      endAt: status === 'running' ? NOW + 60000 : null,
      remainingMs: status === 'paused' ? 60000 : null,
      alert: { phase: 'break', at: NOW - 1000 },
    });
    const result = core.skip(input, NOW);
    assert.deepEqual(result, {
      state: state({ phase: 'break', count: 2, countedEndAt: NOW - FOCUS }), events: [],
    }, status);
    assert.deepEqual(core.view(result.state, NOW), {
      phase: 'break', phaseLabel: '休息', time: '05:00', status: '',
      primary: '开始', count: 2, title: '番茄钟 · 今天 2 个',
    });
  }
});

test('U5 休息任一状态跳过：专注 25:00 待开始', () => {
  for (const status of ['idle', 'running', 'paused']) {
    const result = core.skip(state({
      phase: 'break', status, count: 3, countedEndAt: NOW - BREAK,
      endAt: status === 'running' ? NOW + 60000 : null,
      remainingMs: status === 'paused' ? 60000 : null,
      alert: { phase: 'focus', at: NOW - 1000 },
    }), NOW);
    assert.deepEqual(result, {
      state: state({ count: 3, countedEndAt: NOW - BREAK }), events: [],
    }, status);
    assert.deepEqual(core.view(result.state, NOW), {
      phase: 'focus', phaseLabel: '专注', time: '25:00', status: '',
      primary: '开始', count: 3, title: '番茄钟 · 今天 3 个',
    });
  }
});

test('U6 连续快速点击：状态交替，只扣除实际运行的时间', () => {
  for (const [phase, duration] of [['focus', FOCUS], ['break', BREAK]]) {
    let current = state({ phase });
    const offsets = [0, 100, 200, 300, 300, 300];
    const elapsed = [0, 100, 100, 200, 200, 200];
    for (let i = 0; i < offsets.length; i += 1) {
      const now = NOW + offsets[i];
      const result = core.press(current, now);
      const running = i % 2 === 0;
      const remaining = duration - elapsed[i];
      assert.deepEqual(result, {
        state: state({
          phase, status: running ? 'running' : 'paused',
          endAt: running ? now + remaining : null,
          remainingMs: running ? null : remaining,
        }), events: [],
      });
      assert.equal(core.remainingMs(result.state, now), remaining);
      assert.equal(core.view(result.state, now).time, phase === 'focus' ? '25:00' : '05:00');
      current = result.state;
    }
  }
});

test('U7 系统时间回调及剩余时间边界：两个阶段均夹到完整时长和零', () => {
  for (const [phase, duration, time] of [['focus', FOCUS, '25:00'], ['break', BREAK, '05:00']]) {
    const running = state({ phase, status: 'running', endAt: NOW + duration });
    const earlier = NOW - 600000;
    assert.equal(core.remainingMs(running, earlier), duration);
    assert.equal(core.view(running, earlier).time, time);
    const paused = core.press(running, earlier);
    assert.equal(paused.state.remainingMs, duration + 600000);
    assert.equal(core.remainingMs(paused.state, NOW), duration);
    assert.equal(core.view(paused.state, NOW).time, time);
    assert.equal(core.remainingMs(state({ phase, status: 'paused', remainingMs: -1 }), NOW), 0);
    assert.equal(core.remainingMs(state({ phase, status: 'running', endAt: NOW - 1 }), NOW), 0);
    assert.equal(core.remainingMs(state({ phase, status: 'running', endAt: NOW }), NOW), 0);
    assert.equal(core.remainingMs(state({ phase }), NOW), duration);
  }
});

test('U8 formatTime 边界：负数归零，不足一秒向上取整并补零', () => {
  for (const [ms, expected] of [
    [-1000, '00:00'], [0, '00:00'], [1, '00:01'], [999, '00:01'],
    [1000, '00:01'], [1001, '00:02'], [59999, '01:00'], [60000, '01:00'],
    [60001, '01:01'], [545000, '09:05'], [BREAK, '05:00'],
    [FOCUS - 1, '25:00'], [FOCUS, '25:00'],
  ]) {
    assert.equal(core.formatTime(ms), expected, String(ms));
  }
});

test('U9 专注到点：完成数加一、切到休息待开始，只发一次事件', () => {
  const endAt = NOW + FOCUS;
  const input = state({ count: 2, status: 'running', endAt });
  assert.deepEqual(core.tick(input, endAt - 1), { state: input, events: [] });
  assert.equal(core.view(input, endAt - 1).time, '00:01');
  for (const now of [endAt, endAt + 60000]) {
    const result = core.tick(input, now);
    const expected = state({
      count: 3, countedEndAt: endAt, phase: 'break', alert: { phase: 'focus', at: now },
    });
    assert.deepEqual(result, { state: expected, events: [{ type: 'complete', phase: 'focus' }] });
    assert.deepEqual(core.view(result.state, now), {
      phase: 'break', phaseLabel: '休息', time: '05:00', status: '专注结束',
      primary: '开始', count: 3, title: '专注结束！',
    });
    assert.deepEqual(core.tick(result.state, now + 60000), { state: expected, events: [] });
  }
});

test('U10 休息到点：不增加完成数，切到专注并提示休息结束', () => {
  const endAt = NOW + BREAK;
  const input = state({ phase: 'break', status: 'running', endAt, count: 3, countedEndAt: NOW });
  for (const now of [endAt, endAt + 1000]) {
    const result = core.tick(input, now);
    assert.deepEqual(result, {
      state: state({ count: 3, countedEndAt: NOW, alert: { phase: 'break', at: now } }),
      events: [{ type: 'complete', phase: 'break' }],
    });
    assert.deepEqual(core.view(result.state, now), {
      phase: 'focus', phaseLabel: '专注', time: '25:00', status: '休息结束',
      primary: '开始', count: 3, title: '休息结束！',
    });
  }
});

test('U11 跨零点：三个状态均归零，保留当前段和去重标记', () => {
  const midnight = localTime(24, 0);
  for (const segment of [
    { phase: 'break', alert: { phase: 'focus', at: localTime(23, 23, 59) } },
    { status: 'running', endAt: localTime(24, 0, 15) },
    { phase: 'break', status: 'paused', remainingMs: 123000 },
  ]) {
    const input = state({ count: 5, countedEndAt: localTime(23, 18), ...segment });
    assert.equal(core.view(input, midnight).count, 0);
    assert.deepEqual(core.tick(input, midnight), {
      state: { ...input, date: '2026-10-24', count: 0 }, events: [],
    });
  }
  assert.deepEqual(core.tick(state({ date: '2026-10-25', count: 9, countedEndAt: NOW }), midnight), {
    state: state({ date: '2026-10-24', countedEndAt: NOW }), events: [],
  });
});

test('U12 跨零点专注归结束那天，延迟结算旧段不污染今天', () => {
  const started = core.press(state({ count: 5 }), localTime(23, 23, 50));
  const endAt = localTime(24, 0, 15);
  assert.equal(started.state.endAt, endAt);
  const afterMidnight = core.tick(started.state, localTime(24, 0)).state;
  for (const input of [started.state, afterMidnight]) {
    assert.deepEqual(core.tick(input, endAt), {
      state: state({
        date: '2026-10-24', count: 1, countedEndAt: endAt, phase: 'break',
        alert: { phase: 'focus', at: endAt },
      }), events: [{ type: 'complete', phase: 'focus' }],
    });
  }
  const midnight = localTime(24, 0);
  assert.equal(core.tick(state({ count: 5, status: 'running', endAt: midnight }), midnight).state.count, 1);
  const yesterdayEnd = localTime(23, 23, 55);
  const today = localTime(24, 9);
  const oldSegment = state({ status: 'running', endAt: yesterdayEnd, count: 5 });
  assert.deepEqual(core.tick(oldSegment, today), {
    state: state({
      date: '2026-10-24', countedEndAt: yesterdayEnd, phase: 'break',
      alert: { phase: 'focus', at: today },
    }), events: [{ type: 'complete', phase: 'focus' }],
  });
  const todayCounter = { ...oldSegment, date: '2026-10-24', count: 4, countedEndAt: localTime(24, 8) };
  assert.deepEqual(core.tick(todayCounter, today), {
    state: state({
      date: '2026-10-24', count: 4, countedEndAt: localTime(24, 8), phase: 'break',
      alert: { phase: 'focus', at: today },
    }), events: [{ type: 'complete', phase: 'focus' }],
  });
});

test('U13 到点标题按经过整秒交替，确认后清空提示并停止交替', () => {
  for (const [ended, next, label] of [['focus', 'break', '专注'], ['break', 'focus', '休息']]) {
    const input = state({ phase: next, count: 3, alert: { phase: ended, at: NOW } });
    for (const [offset, title] of [
      [-1, `${label}结束！`], [0, `${label}结束！`], [999, `${label}结束！`],
      [1000, '番茄钟 · 今天 3 个'], [1999, '番茄钟 · 今天 3 个'],
      [2000, `${label}结束！`], [2999, `${label}结束！`], [3000, '番茄钟 · 今天 3 个'],
    ]) {
      const displayed = core.view(input, NOW + offset);
      assert.equal(displayed.title, title);
      assert.equal(displayed.status, `${label}结束`);
    }
    const cleared = core.ack(input);
    assert.deepEqual(cleared, state({ phase: next, count: 3 }));
    for (const offset of [0, 1000, 2000]) {
      assert.equal(core.view(cleared, NOW + offset).title, '番茄钟 · 今天 3 个');
      assert.equal(core.view(cleared, NOW + offset).status, '');
    }
    const started = core.press(input, NOW);
    assert.equal(started.state.alert, null);
    assert.equal(started.state.status, 'running');
    assert.deepEqual(started.events, []);
  }
});

test('U14 标题和页面文字：进行中两阶段、暂停、待开始与过期计数', () => {
  for (const [fields, expected] of [
    [{ status: 'running', endAt: NOW + 1499000 },
      ['focus', '专注', '24:59', '', '暂停', '24:59 · 专注']],
    [{ phase: 'break', status: 'running', endAt: NOW + 299000 },
      ['break', '休息', '04:59', '', '暂停', '04:59 · 休息']],
    [{ status: 'paused', remainingMs: 754000 },
      ['focus', '专注', '12:34', '已暂停', '继续', '12:34 · 已暂停']],
    [{ phase: 'break' },
      ['break', '休息', '05:00', '', '开始', '番茄钟 · 今天 7 个']],
    [{ phase: 'break', status: 'paused', remainingMs: 120000, alert: { phase: 'focus', at: NOW } },
      ['break', '休息', '02:00', '专注结束', '继续', '02:00 · 已暂停']],
  ]) {
    const [phase, phaseLabel, time, status, primary, title] = expected;
    assert.deepEqual(core.view(state({ count: 7, ...fields }), NOW), {
      phase, phaseLabel, time, status, primary, count: 7, title,
    });
  }
  assert.deepEqual(core.view(state({ date: '2026-10-22', count: 7 }), NOW), {
    phase: 'focus', phaseLabel: '专注', time: '25:00', status: '',
    primary: '开始', count: 0, title: '番茄钟 · 今天 0 个',
  });
});

test('U15 不合法记录：解析失败、非对象、缺字段、类型及数值错误均拒绝', () => {
  for (const text of [null, '', '{broken', 'null', '[]', '[{}]', 'true', 'false', '1', '"text"', '{}']) {
    assert.equal(core.parseRecord(text), null, String(text));
  }
  const valid = record({ status: 'running', endAt: NOW + FOCUS });
  for (const key of ['v', 'date', 'count', 'countedEndAt', 'phase', 'status', 'endAt']) {
    const missing = { ...valid };
    delete missing[key];
    assert.equal(core.parseRecord(JSON.stringify(missing)), null, `缺少 ${key}`);
  }
  const invalidFields = [
    { v: 2 }, { v: '1' }, { date: null }, { date: 20261023 },
    { date: '2026-1-23' }, { date: '2026-10-3' }, { date: 'x2026-10-23' }, { date: '2026-10-23x' },
    { count: -1 }, { count: 0.5 }, { count: '2' }, { count: null },
    { countedEndAt: '123' }, { countedEndAt: true }, { countedEndAt: {} }, { countedEndAt: [] },
    { phase: 'rest' }, { phase: null }, { status: 'stopped' }, { status: null },
    { endAt: null }, { endAt: '123' }, { endAt: true }, { endAt: {} }, { endAt: [] },
  ];
  for (const fields of invalidFields) {
    assert.equal(core.parseRecord(JSON.stringify({ ...valid, ...fields })), null, JSON.stringify(fields));
  }
  for (const remainingMs of [undefined, null, 0, -1, '1000', true, [], {}]) {
    assert.equal(core.parseRecord(JSON.stringify(record({ status: 'paused', remainingMs }))), null);
  }
  for (const field of ['count', 'countedEndAt', 'endAt', 'remainingMs']) {
    const input = record({ status: field === 'remainingMs' ? 'paused' : 'running', endAt: NOW, [field]: null });
    for (const infinite of ['1e400', '-1e400']) {
      const text = JSON.stringify(input).replace(`"${field}":null`, `"${field}":${infinite}`);
      assert.equal(core.parseRecord(text), null, `${field}=${infinite}`);
    }
  }
});

test('U16 记录往返：仅八个字段、去掉提示、归一无关时间并夹住暂停时长', () => {
  for (const [phase, duration] of [['focus', FOCUS], ['break', BREAK]]) {
    for (const status of ['idle', 'running', 'paused']) {
      const fields = {
        phase, status, count: 2, countedEndAt: NOW - FOCUS,
        endAt: status === 'running' ? NOW + duration : null,
        remainingMs: status === 'paused' ? duration - 1 : null,
      };
      const saved = core.toRecord(state({ ...fields, alert: { phase: 'focus', at: NOW }, extra: 'discard' }));
      assert.deepEqual(saved, record(fields));
      assert.deepEqual(core.parseRecord(JSON.stringify(saved)), record(fields));
    }
    const oversized = record({ phase, status: 'paused', remainingMs: duration + 5000, endAt: 'ignored' });
    assert.deepEqual(core.parseRecord(JSON.stringify(oversized)), record({
      phase, status: 'paused', remainingMs: duration,
    }));
  }
  assert.deepEqual(core.parseRecord(JSON.stringify(record({
    endAt: { ignored: true }, remainingMs: 'ignored', alert: { phase: 'focus', at: NOW }, extra: 1,
  }))), record());
  assert.deepEqual(core.parseRecord(JSON.stringify(record({
    status: 'running', endAt: NOW, remainingMs: -1,
  }))), record({ status: 'running', endAt: NOW }));
  const negativeTimestamp = new Date(1960, 9, 23, 9, 0, 0).getTime();
  const finiteRecord = record({ status: 'running', endAt: negativeTimestamp, countedEndAt: negativeTimestamp });
  assert.deepEqual(core.parseRecord(JSON.stringify(finiteRecord)), finiteRecord);
  assert.deepEqual(core.parseRecord(JSON.stringify(record({ status: 'paused', remainingMs: 1 }))),
    record({ status: 'paused', remainingMs: 1 }));
  // The contract validates date shape, not whether that date exists in a calendar.
  assert.deepEqual(core.parseRecord(JSON.stringify(record({ date: '2026-02-31' }))), record({ date: '2026-02-31' }));
});

test('U17 恢复未到点、暂停和待开始：保持当前段，无记录则初始化', () => {
  assert.deepEqual(core.restore(null, NOW), state());
  for (const [phase, remaining, time] of [['focus', 600000, '10:00'], ['break', 120000, '02:00']]) {
    for (const status of ['idle', 'running', 'paused']) {
      const fields = {
        phase, status, count: 2, countedEndAt: NOW - FOCUS,
        endAt: status === 'running' ? NOW + remaining : null,
        remainingMs: status === 'paused' ? remaining : null,
      };
      const restored = core.restore(record(fields), NOW);
      assert.deepEqual(restored, state(fields));
      const displayed = core.view(restored, NOW);
      assert.equal(displayed.time, status === 'idle' ? (phase === 'focus' ? '25:00' : '05:00') : time);
      assert.equal(displayed.primary, { idle: '开始', running: '暂停', paused: '继续' }[status]);
      assert.equal(displayed.status, status === 'paused' ? '已暂停' : '');
      if (status === 'paused') assert.equal(core.remainingMs(restored, NOW + FOCUS), remaining);
      if (status === 'running') assert.equal(core.remainingMs(restored, NOW + 1000), remaining - 1000);
    }
  }
  for (const fields of [
    { phase: 'break' },
    { phase: 'break', status: 'paused', remainingMs: 123000 },
    { status: 'running', endAt: NOW + 600000 },
  ]) {
    const saved = record({ date: '2026-10-22', count: 5, countedEndAt: localTime(22, 18), ...fields });
    assert.deepEqual(core.restore(saved, NOW), state({ countedEndAt: localTime(22, 18), ...fields }));
  }
});

test('U18 同一天离开期间到点：静默结算、无提示无事件、不重复计数', () => {
  const saved = record({ count: 2, status: 'running', endAt: NOW, countedEndAt: NOW - FOCUS });
  for (const now of [NOW, NOW + 60000]) {
    const restored = core.restore(saved, now);
    assert.deepEqual(restored, state({ count: 3, countedEndAt: NOW, phase: 'break' }));
    assert.deepEqual(core.view(restored, now), {
      phase: 'break', phaseLabel: '休息', time: '05:00', status: '',
      primary: '开始', count: 3, title: '番茄钟 · 今天 3 个',
    });
    assert.deepEqual(core.tick(restored, now + 1000), { state: restored, events: [] });
    assert.deepEqual(core.restore({ ...saved, count: 3, countedEndAt: NOW }, now), restored);
    assert.deepEqual(core.restore({ ...saved, phase: 'break' }, now),
      state({ count: 2, countedEndAt: NOW - FOCUS }));
  }
  const endAt = localTime(23, 0, 15);
  assert.deepEqual(core.restore(record({ date: '2026-10-22', count: 5, status: 'running', endAt }), NOW),
    state({ count: 1, countedEndAt: endAt, phase: 'break' }));
});

test('U19 昨天已经到点的记录：今天零个、专注待开始且静默', () => {
  const endAt = localTime(22, 18);
  for (const phase of ['focus', 'break']) {
    const saved = record({
      date: '2026-10-22', count: 5, phase, status: 'running', endAt,
      countedEndAt: localTime(22, 17),
    });
    const restored = core.restore(saved, NOW);
    assert.deepEqual(restored, state({ countedEndAt: phase === 'focus' ? endAt : localTime(22, 17) }));
    assert.deepEqual(core.view(restored, NOW), {
      phase: 'focus', phaseLabel: '专注', time: '25:00', status: '',
      primary: '开始', count: 0, title: '番茄钟 · 今天 0 个',
    });
  }
  assert.deepEqual(core.restore(record({
    count: 3, countedEndAt: NOW - FOCUS, status: 'running', endAt,
  }), NOW), state({ count: 3, countedEndAt: NOW - FOCUS }));
});

test('U20 多页面合并只取计数字段，同一专注结束时刻只计一次', () => {
  const endAt = NOW + FOCUS;
  const page = state({ count: 3, countedEndAt: NOW - FOCUS, status: 'running', endAt });
  const latest = record({ count: 4, countedEndAt: NOW - 1000, phase: 'break' });
  const merged = core.mergeCounter(page, latest);
  assert.deepEqual(merged, { ...page, count: 4, countedEndAt: NOW - 1000 });
  const first = core.tick(merged, endAt);
  assert.equal(first.state.count, 5);
  assert.equal(first.state.countedEndAt, endAt);
  const secondPage = core.mergeCounter(page, core.toRecord(first.state));
  assert.deepEqual(secondPage, { ...page, count: 5, countedEndAt: endAt });
  assert.deepEqual(core.tick(secondPage, endAt), first);

  const current = state({
    count: 5, countedEndAt: NOW, phase: 'break', status: 'paused', remainingMs: 123000,
    alert: { phase: 'focus', at: NOW },
  });
  for (const [incoming, expected] of [
    [null, current],
    [record({ date: '2026-10-22', count: 99, countedEndAt: NOW + 1000 }), current],
    [record({ date: '2026-10-24', count: 1, countedEndAt: null }),
      { ...current, date: '2026-10-24', count: 1, countedEndAt: null }],
    [record({ count: 4, countedEndAt: NOW + 1000 }), { ...current, countedEndAt: NOW + 1000 }],
    [record({ count: 6, countedEndAt: NOW - 1000 }), { ...current, count: 6 }],
    [record({ count: 5, countedEndAt: null }), current],
  ]) {
    assert.deepEqual(core.mergeCounter(current, incoming), expected);
  }
  const negativeTimestamp = new Date(1960, 9, 23, 9, 0, 0).getTime();
  for (const [left, right, expected] of [
    [null, null, null], [null, negativeTimestamp, negativeTimestamp],
    [negativeTimestamp, null, negativeTimestamp],
  ]) {
    assert.equal(core.mergeCounter(state({ countedEndAt: left }), record({ countedEndAt: right })).countedEndAt, expected);
  }
});

test('U21 按钮与到点同时发生：press 和 skip 都只结算，不再次切段或开始', () => {
  for (const action of [core.press, core.skip]) {
    for (const phase of ['focus', 'break']) {
      const input = state({ phase, count: 2, countedEndAt: NOW - FOCUS, status: 'running', endAt: NOW });
      for (const now of [NOW, NOW + 1000]) {
        assert.deepEqual(action(input, now), {
          state: state({
            phase: phase === 'focus' ? 'break' : 'focus',
            count: phase === 'focus' ? 3 : 2,
            countedEndAt: phase === 'focus' ? NOW : NOW - FOCUS,
            alert: { phase, at: now },
          }), events: [{ type: 'complete', phase }],
        });
      }
      assert.deepEqual(core.press(input, NOW - 1), {
        state: { ...input, status: 'paused', endAt: null, remainingMs: 1 }, events: [],
      });
      assert.deepEqual(core.skip(input, NOW - 1), {
        state: state({ phase: phase === 'focus' ? 'break' : 'focus', count: 2, countedEndAt: NOW - FOCUS }),
        events: [],
      });
    }
  }
});

test('U22 纯函数：深拷贝比较输入，变化和不变路径均返回新对象', () => {
  const copy = value => JSON.parse(JSON.stringify(value));
  function check(input, action, expected) {
    const before = copy(input);
    const result = action(input);
    assert.deepEqual(input, before);
    assert.deepEqual(result, expected);
    assert.notStrictEqual(result.state ?? result, input);
  }
  const due = state({ status: 'running', endAt: NOW });
  const completed = state({ count: 1, countedEndAt: NOW, phase: 'break', alert: { phase: 'focus', at: NOW } });
  check(due, input => core.tick(input, NOW), { state: completed, events: [{ type: 'complete', phase: 'focus' }] });
  check(completed, input => core.tick(input, NOW + 1000), { state: completed, events: [] });
  check(state({ date: '2026-10-22', count: 5 }), input => core.tick(input, NOW), { state: state(), events: [] });
  check(completed, input => core.press(input, NOW), {
    state: { ...completed, alert: null, status: 'running', endAt: NOW + BREAK }, events: [],
  });
  check(state({ status: 'running', endAt: NOW + 60000 }), input => core.press(input, NOW), {
    state: state({ status: 'paused', remainingMs: 60000 }), events: [],
  });
  check(state({ status: 'paused', remainingMs: 60000 }), input => core.press(input, NOW), {
    state: state({ status: 'running', endAt: NOW + 60000 }), events: [],
  });
  check(completed, input => core.skip(input, NOW), {
    state: state({ count: 1, countedEndAt: NOW }), events: [],
  });
  check(record({ status: 'running', endAt: NOW }), input => core.restore(input, NOW), {
    ...completed, alert: null,
  });
  check(record({ status: 'paused', remainingMs: 123000 }), input => core.restore(input, NOW),
    state({ status: 'paused', remainingMs: 123000 }));
  const incoming = record({ count: 9, countedEndAt: NOW + 1000 });
  const beforeIncoming = copy(incoming);
  check(completed, input => core.mergeCounter(input, incoming), { ...completed, count: 9, countedEndAt: NOW + 1000 });
  assert.deepEqual(incoming, beforeIncoming);
  check(completed, input => core.mergeCounter(input, null), completed);
  check(completed, input => core.mergeCounter(input, record({ date: '2026-10-22' })), completed);
  check(completed, core.ack, { ...completed, alert: null });
  check(state(), core.ack, state());
  check(completed, core.toRecord, record({ count: 1, countedEndAt: NOW, phase: 'break' }));
  const beforeView = copy(completed);
  assert.equal(core.remainingMs(completed, NOW), 300000);
  assert.deepEqual(core.view(completed, NOW), {
    phase: 'break', phaseLabel: '休息', time: '05:00', status: '专注结束',
    primary: '开始', count: 1, title: '专注结束！',
  });
  assert.deepEqual(completed, beforeView);
});
