// forge-qa · 番茄钟 Mode A 验收脚本（对应 scripts/qa/test-spec.json，Phase 1-4，快进时钟的部分）。
// 用法：node scripts/qa/pomodoro-qa.mjs [用例前缀,逗号分隔]
//   APP_URL 默认 http://127.0.0.1:4577/index.html；结果与截图写到 .gstack/qa-reports/（已被 git 忽略）。
// 造时间用 Playwright page.clock（install 后 goto，再 pauseAt，之后 runFor / setSystemTime）；
// CSS 过渡按真实时间走，颜色断言前先移开鼠标并真实等待。页面里没有测试钩子，全部从外部观察。
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { QA, pw, ROOT, APP, KEY, OUT, PROBE, state, rec, record, T, dk } from './lib.mjs';

const SHOTS = path.join(OUT, 'screenshots');
fs.rmSync(SHOTS, { recursive: true, force: true });
fs.mkdirSync(SHOTS, { recursive: true });
process.env.QA_SCREENSHOT_DIR = SHOTS;

const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
const c = new QA.TestCollector();
const browser = await pw.chromium.launch();
const ORIGIN = new URL(APP).origin;
const FILE_URL = 'file://' + path.join(ROOT, 'index.html');
const FOCUS = 25 * 60000;
const BREAK = 5 * 60000;
const T0 = T(2026, 10, 23, 10, 0, 0);
const P = '[data-ui=primary]';
const S = '[data-ui=skip]';
const requests = [];
const badResponses = [];
const facts = {}; // 给报告用的实测值
let opened = [];
const realWait = (ms) => new Promise((r) => setTimeout(r, ms));

// 页面可见性：无头浏览器里标签页始终可见，这里只覆盖 document.visibilityState / hidden 并派发事件，
// 用来验证「回到前台立即刷新」的代码路径；不会触发浏览器真实的后台限速。
const VIS = `(() => {
  window.__vis = 'visible';
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get() { return window.__vis; } });
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get() { return window.__vis === 'hidden'; } });
  window.__setVis = (v) => { window.__vis = v; document.dispatchEvent(new Event('visibilitychange')); };
})();`;
const BLOCK_STORAGE = `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('The operation is insecure.', 'SecurityError'); } });`;
const QUOTA = `(() => { const o = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) {
  if (window.__quota && k === 'pomodoro.v1') throw new DOMException('quota', 'QuotaExceededError'); return o.call(this, k, v); }; })();`;
const BLOCK_AUDIO = `window.__blockAudio = true;`;

function wire(page) {
  QA.attachMonitors(page, c);
  page.on('request', (r) => requests.push(r.url()));
  page.on('response', (r) => { if (r.status() >= 400) badResponses.push(`${r.status()} ${r.url()}`); });
}

async function open(o = {}) {
  const context = await browser.newContext({
    viewport: o.viewport || { width: 1440, height: 900 }, locale: 'zh-CN',
    reducedMotion: o.reducedMotion || 'no-preference', isMobile: !!o.mobile, hasTouch: !!o.mobile,
    deviceScaleFactor: o.dpr || 1,
  });
  opened.push(context);
  for (const s of o.init || []) await context.addInitScript(s);
  await context.addInitScript(PROBE);
  const time = o.time ?? T0;
  if (o.clock !== false) await context.clock.install({ time });
  const page = await context.newPage();
  wire(page);
  await page.goto(o.url || APP, { waitUntil: 'load' });
  if (o.clock !== false) await page.clock.pauseAt(time + 1000);
  if (o.raw !== undefined) await seed(page, o.raw);
  return { context, page };
}

async function seed(page, raw) {
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, raw]);
  await page.reload({ waitUntil: 'load' });
}

const now = (page) => page.evaluate(() => Date.now());
async function away(page) { await page.mouse.move(3, 3); await realWait(300); }
async function sampleTitles(page, seconds) {
  const out = [];
  for (let i = 0; i < seconds * 4; i++) { await page.clock.runFor(250); out.push(await page.evaluate(() => document.title)); }
  return out;
}
const changes = (arr) => arr.reduce((n, v, i) => n + (i > 0 && v !== arr[i - 1] ? 1 : 0), 0);
function expectState(s, want, ctx = '') {
  const diff = Object.entries(want).filter(([k, v]) => s[k] !== v).map(([k, v]) => `${k}: 期望 ${JSON.stringify(v)} 实际 ${JSON.stringify(s[k])}`);
  if (diff.length) throw new Error(`${ctx}${diff.join('；')}`);
}
const snap = (page, name) => QA.snap(page, c, name);

async function test(id, desc, fn) {
  if (ONLY.length && !ONLY.some((p) => id.startsWith(p))) return;
  const errsBefore = c.consoleErrors.length;
  try {
    const r = (await fn()) || {};
    c.pass(id, desc + (r.note ? ` — ${r.note}` : ''), r.evidence || null);
  } catch (e) {
    c.fail(id, desc, String(e.message || e).slice(0, 900), e.evidence || null);
  }
  c.checkConsoleErrors(id, `${id} `);
  if (c.consoleErrors.length > errsBefore) facts[`${id}.consoleErrors`] = c.consoleErrors.slice(errsBefore).map((e) => e.text);
  for (const ctx of opened) await ctx.close().catch(() => {});
  opened = [];
}

const fmt = (ms) => { const s = Math.ceil(Math.max(0, ms) / 1000); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const today = dk(T0);

// ───────────────────────── Phase 1 冒烟 ─────────────────────────
await test('S03', 'file:// 本地双击打开：空态、开始走秒、刷新后接着走，与 http 一致', async () => {
  const { page } = await open({ url: FILE_URL });
  expectState(await state(page), { phase: '专注', time: '25:00', primary: '开始', title: '番茄钟 · 今天 0 个', dataStorage: 'ok' }, 'file 空态：');
  await page.click(P);
  await page.clock.runFor(61000);
  await page.reload({ waitUntil: 'load' });
  const s = await state(page);
  expectState(s, { time: '23:59', primary: '暂停', title: '23:59 · 专注' }, 'file 刷新后：');
  return { evidence: await snap(page, 'S03-file-protocol-after-reload') };
});

// ───────────────────────── Phase 2 R1 ─────────────────────────
await test('F01', 'R1 正常：首次打开空态 → 点开始从 25:00 每秒减少、主按钮变暂停、记录 endAt = 点击时刻 + 25 分钟', async () => {
  const { page } = await open();
  expectState(await state(page), { phase: '专注', time: '25:00', status: '', primary: '开始', count: '0', countLine: '今天完成 0 个',
    title: '番茄钟 · 今天 0 个', dataPhase: 'focus', dataStorage: 'ok', noticeVisible: false }, '空态：');
  await snap(page, 'F01-empty-state');
  const tClick = await now(page);
  await page.click(P);
  const s1 = await state(page);
  const seq = [s1.time];
  for (let i = 0; i < 5; i++) { await page.clock.runFor(1000); seq.push((await state(page)).time); }
  assert.deepEqual(seq, ['25:00', '24:59', '24:58', '24:57', '24:56', '24:55'], `逐秒采样 ${seq}`);
  assert.equal(s1.primary, '暂停');
  const r = rec(await state(page));
  assert.equal(r.phase, 'focus'); assert.equal(r.status, 'running'); assert.equal(r.endAt, tClick + FOCUS, `endAt 偏差 ${r.endAt - tClick - FOCUS}`);
  return { note: `逐秒 ${seq.join('→')}`, evidence: await snap(page, 'F01-running') };
});

await test('F02', 'R1 正常：剩 12:34 暂停后数字不动、显示已暂停、主按钮继续；5 分钟后继续从 12:34 接着走', async () => {
  const { page } = await open();
  await page.click(P);
  await page.clock.runFor(FOCUS - 754000);
  assert.equal((await state(page)).time, '12:34');
  await page.click(P);
  let s = await state(page);
  expectState(s, { time: '12:34', status: '已暂停', primary: '继续', title: '12:34 · 已暂停' }, '暂停后：');
  let r = rec(s); assert.equal(r.status, 'paused'); assert.equal(r.endAt, null); assert.equal(r.remainingMs, 754000);
  const ev = await snap(page, 'F02-paused');
  await page.clock.runFor(300000);
  assert.equal((await state(page)).time, '12:34', '暂停 5 分钟后时间变了');
  const tResume = await now(page);
  await page.click(P);
  r = rec(await state(page)); assert.equal(r.endAt, tResume + 754000);
  await page.clock.runFor(1000);
  s = await state(page);
  expectState(s, { time: '12:33', status: '', primary: '暂停', title: '12:33 · 专注' }, '继续后：');
  return { evidence: ev };
});

await test('F03', 'R1 异常：今天 2 个时专注进行中 / 已暂停点跳过 → 休息 05:00 待开始、完成数仍 2、不响铃、标题不交替；再跳过回到专注 25:00', async () => {
  const { page } = await open({ raw: record({ date: today, count: 2 }) });
  await page.click(P);
  await page.clock.runFor(30000);
  await page.click(S);
  let s = await state(page);
  expectState(s, { phase: '休息', time: '05:00', primary: '开始', status: '', count: '2', dataPhase: 'break', title: '番茄钟 · 今天 2 个', osc: 0 }, '进行中跳过：');
  const t = await sampleTitles(page, 3);
  assert.ok(t.every((x) => x === '番茄钟 · 今天 2 个'), `跳过后标题变化：${[...new Set(t)]}`);
  const ev = await snap(page, 'F03-skip-to-break');
  await page.click(S);
  expectState(await state(page), { phase: '专注', time: '25:00', primary: '开始', count: '2' }, '再跳过：');
  await page.click(P); await page.clock.runFor(5000); await page.click(P);
  await page.click(S);
  s = await state(page);
  expectState(s, { phase: '休息', time: '05:00', primary: '开始', count: '2', osc: 0, status: '' }, '已暂停跳过：');
  assert.equal(rec(s).count, 2);
  return { evidence: ev };
});

await test('F04', 'R1 边界：页面隐藏期间时钟跳过 7 分钟（期间无定时器），变为可见立即显示真实剩余；跳过结束时刻后变为可见立即按到点处理', async () => {
  const { page } = await open({ init: [VIS] });
  await page.click(P);
  await page.clock.runFor(60000);
  await page.evaluate(() => window.__setVis('hidden'));
  const t1 = await now(page);
  await page.clock.setSystemTime(t1 + 420000);
  const stale = (await state(page)).time;
  await page.evaluate(() => window.__setVis('visible'));
  let s = await state(page);
  expectState(s, { time: '17:00', title: '17:00 · 专注' }, '回到前台：');
  const endAt = rec(s).endAt;
  await page.evaluate(() => window.__setVis('hidden'));
  await page.clock.setSystemTime(endAt + 120000);
  await page.evaluate(() => window.__setVis('visible'));
  s = await state(page);
  expectState(s, { phase: '休息', time: '05:00', count: '1', status: '专注结束', primary: '开始', osc: 1 }, '过点后回到前台：');
  return { note: `隐藏时停在 ${stale}，可见瞬间 17:00；过点可见瞬间完成结算并响一声`, evidence: await snap(page, 'F04-visible-after-end') };
});

await test('F05', 'R1 边界：快速连点主按钮 11 次（间隔 0~120ms）→ 进行中 / 已暂停按次数交替，时间不跳变、不为负、不超过 25:00', async () => {
  const { page } = await open();
  const gaps = [0, 37, 120, 5, 88, 0, 64, 120, 13, 99, 41];
  const labels = []; const times = [];
  for (const g of gaps) {
    await page.click(P, { delay: 0 });
    const s = await state(page);
    labels.push(s.primary); times.push(s.time);
    await page.clock.runFor(g);
  }
  const want = gaps.map((_, i) => (i % 2 === 0 ? '暂停' : '继续'));
  assert.deepEqual(labels, want, `主按钮序列 ${labels}`);
  assert.ok(times.every((x) => /^(25:00|24:59)$/.test(x)), `时间序列 ${times}`);
  const r = rec(await state(page));
  assert.equal(r.status, 'running');
  assert.ok(r.endAt - (await now(page)) <= FOCUS && r.endAt - (await now(page)) > FOCUS - 2000);
  return { note: `时间序列 ${[...new Set(times)].join('/')}` };
});

await test('F06', 'R1 错误态：系统时间往回调 10 分钟 / 2 小时，剩余时间显示为完整时长 25:00 / 05:00，不报错；时间调回后恢复真实值', async () => {
  const { page } = await open();
  await page.click(P);
  await page.clock.runFor(60000);
  const t = await now(page);
  await page.clock.setSystemTime(t - 600000); await page.clock.runFor(500);
  expectState(await state(page), { time: '25:00', title: '25:00 · 专注' }, '回调 10 分钟：');
  await page.clock.setSystemTime(t - 7200000); await page.clock.runFor(500);
  expectState(await state(page), { time: '25:00' }, '回调 2 小时：');
  const ev = await snap(page, 'F06-clock-back');
  await page.clock.setSystemTime(t + 1000); await page.clock.runFor(250);
  expectState(await state(page), { time: '23:59' }, '调回后：');
  await page.click(S); await page.click(P);
  const t2 = await now(page);
  await page.clock.setSystemTime(t2 - 600000); await page.clock.runFor(500);
  expectState(await state(page), { phase: '休息', time: '05:00', title: '05:00 · 休息' }, '休息回调：');
  return { evidence: ev };
});

// ───────────────────────── R2 ─────────────────────────
await test('F07', 'R2 正常：今天 2 个，专注走到 00:00 → 今天完成 3 个、休息 05:00 待开始、data-phase=break、记录 count=3', async () => {
  const { page } = await open({ raw: record({ date: today, count: 2 }) });
  await page.click(P);
  await page.clock.runFor(FOCUS + 300);
  const s = await state(page);
  expectState(s, { count: '3', countLine: '今天完成 3 个', phase: '休息', time: '05:00', primary: '开始', dataPhase: 'break', status: '专注结束', osc: 1 }, '到点：');
  const r = rec(s); assert.equal(r.count, 3); assert.equal(r.phase, 'break'); assert.equal(r.status, 'idle');
  await away(page);
  return { evidence: await snap(page, 'F07-focus-ended') };
});

await test('F08', 'R2 异常：今天 3 个，休息到点完成数仍 3、回到专注 25:00、状态说明休息结束；专注中跳过完成数也不变', async () => {
  const { page } = await open({ raw: record({ date: today, count: 3, phase: 'break' }) });
  await page.click(P);
  await page.clock.runFor(BREAK + 300);
  let s = await state(page);
  expectState(s, { count: '3', phase: '专注', time: '25:00', status: '休息结束', primary: '开始', dataPhase: 'focus', osc: 1 }, '休息到点：');
  const ev = await snap(page, 'F08-break-ended');
  await page.mouse.click(20, 20);
  await page.click(P); await page.clock.runFor(10000); await page.click(S);
  s = await state(page);
  expectState(s, { count: '3', phase: '休息' }, '跳过专注：');
  assert.equal(rec(s).count, 3);
  return { evidence: ev };
});

await test('F09', 'R2 边界：(a) 昨天 5 个、页面开着走过零点 → 今天完成 0 个；(b) 23:50 开始的专注 00:15 结束 → 计入新的一天 1 个', async () => {
  const D = T(2026, 10, 23, 23, 59, 50);
  let { page } = await open({ time: D, raw: record({ date: '2026-10-23', count: 5 }) });
  assert.equal((await state(page)).count, '5');
  await page.clock.runFor(15000);
  let s = await state(page);
  expectState(s, { count: '0', title: '番茄钟 · 今天 0 个' }, '(a) 过零点：');
  assert.equal(rec(s).date, '2026-10-24'); assert.equal(rec(s).count, 0);
  for (const ctx of opened) await ctx.close(); opened = [];
  ({ page } = await open({ time: T(2026, 10, 23, 23, 50, 0), raw: record({ date: '2026-10-23', count: 5 }) }));
  await page.click(P);
  await page.clock.runFor(10.5 * 60000);
  assert.equal((await state(page)).count, '0', '(b) 零点后进行中应显示 0');
  await page.clock.runFor(FOCUS - 10.5 * 60000 + 300);
  s = await state(page);
  expectState(s, { count: '1', phase: '休息', status: '专注结束' }, '(b) 跨零点结束：');
  assert.equal(rec(s).date, '2026-10-24'); assert.equal(rec(s).count, 1);
  return { evidence: await snap(page, 'F09-cross-midnight-counted') };
});

// 数据驱动：完成数不合法 / 日期陈旧
const realToday = () => dk(Date.now());
const yesterday = () => dk(Date.now() - 86400000);
const F10_VARIANTS = [
  ['count=-1', () => record({ date: realToday(), count: -1 }), 'invalid'],
  ['count=2.5', () => record({ date: realToday(), count: 2.5 }), 'invalid'],
  ['count="3"', () => record({ date: realToday(), count: '3' }), 'invalid'],
  ['count=null', () => record({ date: realToday(), count: null }), 'invalid'],
  ['count=true', () => record({ date: realToday(), count: true }), 'invalid'],
  ['count=1e400', () => record({ date: realToday(), count: 0 }).replace('"count":0', '"count":1e400'), 'invalid'],
  ['date=昨天 count=4', () => record({ date: yesterday(), count: 4 }), 'stale'],
  ['date=去年 count=9', () => record({ date: '2025-10-23', count: 9 }), 'stale'],
  ['date=昨天 已暂停休息', () => record({ date: yesterday(), count: 4, phase: 'break', status: 'paused', remainingMs: 120000 }), 'stale'],
];
await test('F10', `R2 错误态 / 陈旧态（数据驱动 ${F10_VARIANTS.length} 种记录）：完成数不合法或日期陈旧一律显示 0，无错误，存储改写为合法记录`, async () => {
  const { page } = await open({ clock: false });
  const bad = [];
  for (const [name, mk, kind] of F10_VARIANTS) {
    await seed(page, mk());
    const s = await state(page);
    const r = rec(s);
    const ok = s.count === '0' && s.countLine === '今天完成 0 个' && r && r.v === 1 && r.count === 0 && r.date === realToday()
      && (kind === 'stale' || (s.phase === '专注' && s.time === '25:00' && s.primary === '开始'));
    if (ok) c.pass(`F10.${name}`, `记录 ${name} → 显示今天完成 0 个`); else c.fail(`F10.${name}`, `记录 ${name} → 显示今天完成 0 个`, JSON.stringify({ shown: s.countLine, phase: s.phase, time: s.time, stored: s.stored }));
    if (!ok) bad.push(name);
    if (name === 'date=昨天 已暂停休息') expectState(s, { phase: '休息', time: '02:00', primary: '继续' }, '陈旧日期但段落保留：');
  }
  if (bad.length) throw new Error(`不通过：${bad.join('、')}`);
  return { note: `${F10_VARIANTS.length}/${F10_VARIANTS.length} 种`, evidence: await snap(page, 'F10-last-variant') };
});

// ───────────────────────── R3 ─────────────────────────
await test('F12', 'R3 正常：专注到点（前台）响一声、状态说明专注结束、标题每秒在「专注结束！」与「番茄钟 · 今天 1 个」间交替；点击空白处后停止；不循环响铃', async () => {
  const { page } = await open();
  await page.click(P);
  await page.clock.runFor(FOCUS + 300);
  expectState(await state(page), { osc: 1, status: '专注结束', primary: '开始', phase: '休息' }, '到点：');
  const t = await sampleTitles(page, 6);
  const uniq = [...new Set(t)];
  assert.deepEqual(uniq.sort(), ['专注结束！', '番茄钟 · 今天 1 个'].sort(), `标题取值 ${uniq}`);
  assert.ok(changes(t) >= 5, `6 秒内只切换了 ${changes(t)} 次`);
  await page.clock.runFor(60000);
  assert.equal((await state(page)).osc, 1, '提醒期间重复响铃');
  await away(page);
  const ev = await snap(page, 'F12-alert-before-ack');
  await page.mouse.click(20, 20);
  const t2 = await sampleTitles(page, 6);
  assert.ok(t2.every((x) => x === '番茄钟 · 今天 1 个'), `点击后标题仍在变：${[...new Set(t2)]}`);
  expectState(await state(page), { status: '', primary: '开始', osc: 1 }, '点击后：');
  facts.F12_titles = t.slice(0, 12);
  return { note: `6 秒切换 ${changes(t)} 次`, evidence: ev };
});

await test('F12k', 'R3 正常：到点后焦点在页面、按 Shift 键停止交替；按键只确认，不开始计时（快捷键是非目标）', async () => {
  const { page } = await open();
  await page.click(P);
  await page.clock.runFor(FOCUS + 300);
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  await page.keyboard.press('Shift');
  const t = await sampleTitles(page, 4);
  assert.ok(t.every((x) => x === '番茄钟 · 今天 1 个'), `按键后标题 ${[...new Set(t)]}`);
  await page.keyboard.press('a');
  await page.keyboard.press('Space');
  const s = await state(page);
  expectState(s, { status: '', primary: '开始', time: '05:00', phase: '休息' }, '按键后：');
  assert.equal(rec(s).status, 'idle');
});

await test('F13', 'R3 异常：(a) 恢复出进行中、没点过任何东西就到点 → 不出声、无错误、标题照常交替；(b) AudioContext 构造抛 NotAllowedError → 无控制台错误、标题照常交替', async () => {
  let { page } = await open();
  const n = await now(page);
  await seed(page, record({ date: today, status: 'running', endAt: n + 3000 }));
  await page.clock.runFor(3500);
  let s = await state(page);
  expectState(s, { acNew: 0, osc: 0, status: '专注结束', count: '1', phase: '休息' }, '(a) ');
  let t = await sampleTitles(page, 3);
  assert.ok(t.includes('专注结束！') && t.includes('番茄钟 · 今天 1 个'), `(a) 标题 ${[...new Set(t)]}`);
  const ev = await snap(page, 'F13a-no-gesture-alert');
  for (const ctx of opened) await ctx.close(); opened = [];
  ({ page } = await open({ init: [BLOCK_AUDIO] }));
  await page.click(P);
  await page.clock.runFor(FOCUS + 300);
  s = await state(page);
  expectState(s, { acNew: 0, osc: 0, status: '专注结束', count: '1' }, '(b) ');
  t = await sampleTitles(page, 3);
  assert.ok(t.includes('专注结束！'), `(b) 标题 ${[...new Set(t)]}`);
  const hasErrorText = await page.evaluate(() => /错误|error|失败/i.test(document.body.innerText));
  assert.equal(hasErrorText, false, '页面出现了错误提示文字');
  return { evidence: ev };
});

await test('F14', 'R3：完整一轮专注 + 休息全程没有请求通知权限（Notification.requestPermission 调用 0 次），源码也不引用 Notification / permissions', async () => {
  const { page } = await open();
  await page.click(P); await page.clock.runFor(FOCUS + 300);
  await page.mouse.click(20, 20); await page.click(P); await page.clock.runFor(BREAK + 300);
  const s = await state(page);
  assert.equal(s.notif, 0);
  const perm = await page.evaluate(() => (window.Notification ? Notification.permission : 'n/a'));
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'timer-core.js'), 'utf8');
  assert.equal(/Notification|permissions\.|requestPermission/.test(src), false);
  return { note: `Notification.permission=${perm}` };
});

// ───────────────────────── R4 ─────────────────────────
await test('F15', 'R4：四种标题格式与表格一致（进行中以剩余时间开头）；时钟跳 3 分钟后第一次更新即按结束时刻算出的真实值', async () => {
  const { page } = await open({ raw: record({ date: today, count: 4 }) });
  const got = {};
  got.idle = (await state(page)).title;
  await page.click(P); await page.clock.runFor(1000);
  got.focusRunning = (await state(page)).title;
  await page.clock.runFor(FOCUS - 754000 - 1000); await page.click(P);
  got.paused = (await state(page)).title;
  await page.click(P);
  const endAt = rec(await state(page)).endAt;
  const n = await now(page);
  await page.clock.setSystemTime(n + 180000); await page.clock.runFor(250);
  const after = await now(page);
  got.afterJump = (await state(page)).title;
  const wantJump = `${fmt(endAt - after)} · 专注`;
  await page.click(S); await page.click(P); await page.clock.runFor(1000);
  got.breakRunning = (await state(page)).title;
  assert.equal(got.idle, '番茄钟 · 今天 4 个');
  assert.equal(got.focusRunning, '24:59 · 专注');
  assert.equal(got.paused, '12:34 · 已暂停');
  assert.equal(got.afterJump, wantJump, `跳时后 ${got.afterJump} ≠ ${wantJump}`);
  assert.equal(got.breakRunning, '04:59 · 休息');
  facts.F15 = got;
  return { note: Object.values(got).join(' | ') };
});

// ───────────────────────── R5 ─────────────────────────
await test('F16', 'R5 正常：进行中剩 10:00 刷新后接着走（主按钮暂停）；暂停在 12:34 刷新后保持暂停', async () => {
  const { page } = await open();
  await page.click(P); await page.clock.runFor(FOCUS - 600000);
  await page.reload({ waitUntil: 'load' });
  let s = await state(page);
  expectState(s, { phase: '专注', time: '10:00', primary: '暂停', status: '', title: '10:00 · 专注' }, '进行中刷新：');
  await page.clock.runFor(1000);
  assert.equal((await state(page)).time, '09:59');
  await page.click(S); await page.click(S);
  await page.click(P); await page.clock.runFor(FOCUS - 754000); await page.click(P);
  await page.reload({ waitUntil: 'load' });
  s = await state(page);
  expectState(s, { phase: '专注', time: '12:34', primary: '继续', status: '已暂停', title: '12:34 · 已暂停' }, '暂停刷新：');
  return { evidence: await snap(page, 'F16-paused-after-reload') };
});

await test('F17', 'R5 异常：今天 2 个、关页面期间到点，同一天重开 → 今天 3 个、休息 05:00 待开始、状态说明空、不补响铃、标题不交替', async () => {
  const { page } = await open();
  const n = await now(page);
  await seed(page, record({ date: today, count: 2, status: 'running', endAt: n - 60000 }));
  const s = await state(page);
  expectState(s, { count: '3', phase: '休息', time: '05:00', primary: '开始', status: '', osc: 0, acNew: 0, title: '番茄钟 · 今天 3 个' }, '重开：');
  const t = await sampleTitles(page, 4);
  assert.ok(t.every((x) => x === '番茄钟 · 今天 3 个'), `标题 ${[...new Set(t)]}`);
  assert.equal(rec(s).count, 3);
  return { evidence: await snap(page, 'F17-reopen-after-end') };
});

await test('F18', 'R5 边界：过点的段昨天就结束了（专注 / 休息两种）→ 今天打开显示 0 个、专注 25:00 待开始', async () => {
  const { page } = await open();
  await seed(page, record({ date: '2026-10-22', count: 4, status: 'running', endAt: T(2026, 10, 22, 23, 0, 0) }));
  expectState(await state(page), { count: '0', phase: '专注', time: '25:00', primary: '开始', status: '' }, '专注昨天结束：');
  await seed(page, record({ date: '2026-10-22', count: 4, phase: 'break', status: 'running', endAt: T(2026, 10, 22, 23, 50, 0) }));
  const s = await state(page);
  expectState(s, { count: '0', phase: '专注', time: '25:00', primary: '开始' }, '休息昨天结束：');
  assert.equal(rec(s).date, today);
  return { evidence: await snap(page, 'F18-yesterday-ended') };
});

await test('F19', 'R5 边界：两个页面 (a) 各自计时不同的段先后到点 → 完成数 2 不被覆盖、两页都显示 2；(b) 两页恢复同一段 → 只计 1（工程补齐口径）', async () => {
  let { context, page: a } = await open({ init: [VIS] });
  let b = await context.newPage(); wire(b); await b.goto(APP, { waitUntil: 'load' });
  await a.click(P);
  await a.clock.runFor(60000);
  await b.click(S); await b.click(S); await b.click(P);
  assert.equal((await state(b)).time, '25:00');
  await a.clock.runFor(FOCUS - 60000 + 300);
  let sa = await state(a); let sb = await state(b);
  assert.equal(sa.count, '1', `A 到点后 ${sa.count}`); assert.equal(sb.count, '1', `B 收到 storage 事件后 ${sb.count}`);
  await a.clock.runFor(60000);
  sa = await state(a); sb = await state(b);
  await a.evaluate(() => { window.__setVis('hidden'); window.__setVis('visible'); });
  sa = await state(a);
  assert.equal(rec(sb).count, 2, `存储里 ${rec(sb).count}`);
  assert.equal(sb.count, '2'); assert.equal(sa.count, '2', `A 回到前台显示 ${sa.count}`);
  for (const ctx of opened) await ctx.close(); opened = [];
  ({ context, page: a } = await open());
  await a.click(P); await a.clock.runFor(5000);
  b = await context.newPage(); wire(b); await b.goto(APP, { waitUntil: 'load' });
  assert.equal((await state(b)).primary, '暂停', 'B 应恢复出同一段进行中');
  await a.clock.runFor(FOCUS);
  sa = await state(a); sb = await state(b);
  assert.equal(rec(sa).count, 1, `同一段被计了 ${rec(sa).count} 次`);
  assert.equal(sa.count, '1'); assert.equal(sb.count, '1');
  return { note: '(a) 2/2，(b) 1/1' };
});

const F20_VARIANTS = [
  ['乱码', 'not json {'], ['空串', ''], ['数组', '[]'], ['null', 'null'], ['数字', '42'],
  ['v=2', () => record({ date: realToday(), count: 3 }).replace('"v":1', '"v":2')],
  ['缺 date', () => { const o = JSON.parse(record({ count: 3 })); delete o.date; return JSON.stringify(o); }],
  ['date 格式错', () => record({ date: '2026/10/23', count: 3 })],
  ['phase 非法', () => record({ date: realToday(), count: 3, phase: 'rest' })],
  ['status 非法', () => record({ date: realToday(), count: 3, status: 'stopped' })],
  ['进行中缺 endAt', () => record({ date: realToday(), count: 3, status: 'running', endAt: null })],
  ['进行中 endAt 是字符串', () => record({ date: realToday(), count: 3, status: 'running', endAt: 'soon' })],
  ['暂停 remainingMs=0', () => record({ date: realToday(), count: 3, status: 'paused', remainingMs: 0 })],
  ['暂停 remainingMs<0', () => record({ date: realToday(), count: 3, status: 'paused', remainingMs: -5 })],
  ['countedEndAt 非数字', () => record({ date: realToday(), count: 3, countedEndAt: 'x' })],
];
await test('F20', `R5 错误态（数据驱动 ${F20_VARIANTS.length} 种损坏记录）：一律按无记录显示（专注 25:00 待开始、今天 0 个），不弹错误，存储改写为合法记录`, async () => {
  const { page } = await open({ clock: false });
  const bad = [];
  for (const [name, raw] of F20_VARIANTS) {
    await seed(page, typeof raw === 'function' ? raw() : raw);
    const s = await state(page);
    const r = rec(s);
    const ok = s.phase === '专注' && s.time === '25:00' && s.primary === '开始' && s.count === '0' && s.status === ''
      && s.title === '番茄钟 · 今天 0 个' && r && r.v === 1 && r.status === 'idle' && r.count === 0 && r.date === realToday();
    if (ok) c.pass(`F20.${name}`, `损坏记录「${name}」→ 按第一次打开显示并改写`); else c.fail(`F20.${name}`, `损坏记录「${name}」→ 按第一次打开显示并改写`, JSON.stringify(s));
    if (!ok) bad.push(name);
  }
  if (bad.length) throw new Error(`不通过：${bad.join('、')}`);
  return { note: `${F20_VARIANTS.length}/${F20_VARIANTS.length} 种` };
});

await test('F21', 'R5 降级态：(a) 访问 localStorage 即抛 SecurityError → 计时可用、底部提示原文出现、其他元素位置不动、完成数本次累计；(b) 中途写入抛 QuotaExceededError → 提示出现、计时照常', async () => {
  const anchors = ['phase', 'time', 'primary', 'skip', 'count'];
  const boxes = (page) => page.evaluate((as) => as.map((a) => { const r = document.querySelector(`[data-ui=${a}]`).getBoundingClientRect(); return [a, Math.round(r.x * 10) / 10, Math.round(r.y * 10) / 10, Math.round(r.width), Math.round(r.height)]; }), anchors);
  const normal = await open();
  const ref = await boxes(normal.page);
  const { page } = await open({ init: [BLOCK_STORAGE] });
  let s = await state(page);
  expectState(s, { dataStorage: 'off', noticeVisible: true, stored: 'THROWS', time: '25:00' }, '(a) ');
  const text = await page.textContent('[data-ui=notice]');
  assert.equal(text, '这个浏览器不能保存记录，刷新后今天的完成数会清零');
  assert.deepEqual(await boxes(page), ref, '提示出现后锚点位置变了');
  const ev = await snap(page, 'F21a-storage-off-desktop');
  await page.click(P); await page.clock.runFor(FOCUS + 300);
  s = await state(page);
  expectState(s, { count: '1', phase: '休息', status: '专注结束', osc: 1 }, '(a) 计时：');
  await page.reload({ waitUntil: 'load' });
  assert.equal((await state(page)).count, '0', '(a) 刷新后应清零（与提示一致）');
  for (const ctx of opened) await ctx.close(); opened = [];
  const q = await open({ init: [QUOTA] });
  await q.page.click(P); await q.page.clock.runFor(3000);
  assert.equal((await state(q.page)).dataStorage, 'ok');
  await q.page.evaluate(() => { window.__quota = true; });
  await q.page.click(P);
  s = await state(q.page);
  expectState(s, { dataStorage: 'off', noticeVisible: true, primary: '继续', status: '已暂停' }, '(b) 写入失败后：');
  await q.page.click(P); await q.page.clock.runFor(2000);
  expectState(await state(q.page), { time: '24:55', primary: '暂停' }, '(b) 计时照常：');
  return { evidence: ev };
});

await test('G01', '工程补齐口径：到点提示不跨刷新保留——提示交替中刷新 → 休息 05:00 待开始、状态说明空、标题不再交替', async () => {
  const { page } = await open();
  await page.click(P); await page.clock.runFor(FOCUS + 300);
  await page.reload({ waitUntil: 'load' });
  const s = await state(page);
  expectState(s, { phase: '休息', time: '05:00', status: '', count: '1' }, '刷新后：');
  const t = await sampleTitles(page, 4);
  assert.ok(t.every((x) => x === '番茄钟 · 今天 1 个'), `标题 ${[...new Set(t)]}`);
});

await test('G02', '工程补齐口径：走到结束时刻的同一毫秒点主按钮 → 只结算（休息 05:00 待开始、+1、响一声），不误开始休息', async () => {
  const { page } = await open();
  await page.click(P);
  const endAt = rec(await state(page)).endAt;
  await page.clock.runFor(FOCUS - 2000);
  await page.clock.setSystemTime(endAt);
  await page.click(P);
  const s = await state(page);
  expectState(s, { phase: '休息', time: '05:00', primary: '开始', count: '1', osc: 1, status: '专注结束' }, '同刻点击：');
  assert.equal(rec(s).status, 'idle');
});

// ───────────────────────── 流程 ─────────────────────────
await test('P01', '流程：打开 → 开始 → 专注到点 → 确认 → 开始休息 → 休息到点 → 确认 → 专注 25:00 待开始，每一步文字、标题、阶段属性都对', async () => {
  const { page } = await open();
  const steps = [];
  const at = async (name) => { const s = await state(page); steps.push([name, s.phase, s.time, s.primary, s.status, s.count, s.title, s.dataPhase]); return s; };
  await at('打开');
  await page.click(P); await page.clock.runFor(1000); await at('专注进行中');
  await page.clock.runFor(FOCUS); await at('专注到点');
  await page.mouse.click(20, 20); await at('确认');
  await page.click(P); await page.clock.runFor(1000); await at('休息进行中');
  await page.clock.runFor(BREAK); await at('休息到点');
  await page.mouse.click(20, 20); await at('确认');
  const want = [
    ['打开', '专注', '25:00', '开始', '', '0', '番茄钟 · 今天 0 个', 'focus'],
    ['专注进行中', '专注', '24:59', '暂停', '', '0', '24:59 · 专注', 'focus'],
    ['专注到点', '休息', '05:00', '开始', '专注结束', '1', null, 'break'],
    ['确认', '休息', '05:00', '开始', '', '1', '番茄钟 · 今天 1 个', 'break'],
    ['休息进行中', '休息', '04:59', '暂停', '', '1', '04:59 · 休息', 'break'],
    ['休息到点', '专注', '25:00', '开始', '休息结束', '1', null, 'focus'],
    ['确认', '专注', '25:00', '开始', '', '1', '番茄钟 · 今天 1 个', 'focus'],
  ];
  steps.forEach((s, i) => { const w = want[i]; const s2 = [...s]; if (w[6] === null) { assert.ok(/^(专注结束！|休息结束！|番茄钟 · 今天 1 个)$/.test(s2[6]), `第 ${i + 1} 步标题 ${s2[6]}`); s2[6] = null; } assert.deepEqual(s2, w, `第 ${i + 1} 步`); });
  assert.equal((await state(page)).osc, 2);
  facts.P01 = steps;
  return { note: '7 步全对，共响 2 次' };
});

await test('P02', '流程：6 个状态（专注 / 休息 × 待开始 / 进行中 / 已暂停）点跳过都切到另一阶段待开始、完成数不变、不响铃', async () => {
  const { page } = await open({ raw: record({ date: today, count: 1 }) });
  const results = [];
  for (const startPhase of ['专注', '休息']) {
    for (const st of ['待开始', '进行中', '已暂停']) {
      let s = await state(page);
      if (s.phase !== startPhase) { await page.click(S); s = await state(page); }
      if (st !== '待开始') { await page.click(P); await page.clock.runFor(4000); }
      if (st === '已暂停') await page.click(P);
      s = await state(page);
      const before = { phase: s.phase, primary: s.primary };
      await page.click(S);
      s = await state(page);
      const target = startPhase === '专注' ? ['休息', '05:00'] : ['专注', '25:00'];
      const ok = s.phase === target[0] && s.time === target[1] && s.primary === '开始' && s.count === '1' && s.osc === 0 && s.status === '';
      results.push(`${startPhase}${st}(${before.primary})→${s.phase} ${s.time}${ok ? ' ✓' : ' ✗'}`);
      if (!ok) throw new Error(`${startPhase}${st} 跳过后 ${JSON.stringify(s)}`);
      if (s.phase !== startPhase) await page.click(S);
    }
  }
  return { note: results.join('；') };
});

// ───────────────────────── Phase 3 视觉 ─────────────────────────
const C = {
  bg: 'rgb(250, 248, 244)', fg: 'rgb(34, 32, 28)', muted: 'rgb(95, 90, 82)', focus: 'rgb(163, 65, 45)', focusStrong: 'rgb(138, 53, 36)',
  brk: 'rgb(59, 104, 112)', brkStrong: 'rgb(48, 87, 94)', onAccent: 'rgb(250, 248, 244)', surface: 'rgb(242, 239, 233)', warning: 'rgb(133, 86, 26)',
};
const css = (page, sel, props) => page.evaluate(([sel, props]) => { const cs = getComputedStyle(document.querySelector(sel)); return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])); }, [sel, props]);
function expectCss(got, want, ctx) {
  const diff = Object.entries(want).filter(([k, v]) => (v instanceof RegExp ? !v.test(got[k]) : got[k] !== v)).map(([k, v]) => `${k} 期望 ${v} 实际 ${got[k]}`);
  facts[`css.${ctx}`] = got;
  if (diff.length) throw new Error(`${ctx}：${diff.join('；')}`);
}
const visualRows = [];
async function cssRow(id, page, sel, name, want) {
  const got = await css(page, sel, Object.keys(want));
  for (const [k, v] of Object.entries(want)) visualRows.push({ id, name, prop: k, want: String(v), got: got[k], ok: v instanceof RegExp ? v.test(got[k]) : got[k] === v });
  expectCss(got, want, `${id} ${name}`);
}

await test('V01', '视觉：所有状态、四种视口下剩余时间都是页面上字号最大的文字', async () => {
  const notes = [];
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 320, height: 568 }]) {
    const { page } = await open({ viewport: vp, init: [BLOCK_STORAGE] });
    for (const step of ['idle', 'running', 'paused', 'alert']) {
      if (step === 'running') { await page.click(P); await page.clock.runFor(1000); }
      if (step === 'paused') await page.click(P);
      if (step === 'alert') { await page.click(P); await page.clock.runFor(FOCUS); }
      const r = await page.evaluate(() => {
        const time = parseFloat(getComputedStyle(document.querySelector('[data-ui=time]')).fontSize);
        let other = 0; let who = '';
        for (const el of document.body.querySelectorAll('*')) {
          if (el.matches('[data-ui=time]') || el.closest('[data-ui=time]')) continue;
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (!own || !el.getClientRects().length || getComputedStyle(el).display === 'none') continue;
          const fs = parseFloat(getComputedStyle(el).fontSize); if (fs > other) { other = fs; who = el.textContent.trim().slice(0, 12); }
        }
        return { time, other, who };
      });
      if (!(r.time > r.other)) throw new Error(`${vp.width}×${vp.height} ${step}：时间 ${r.time}px 不大于「${r.who}」${r.other}px`);
      notes.push(`${vp.width}×${vp.height}:${r.time}/${r.other}`);
    }
    for (const ctx of opened) await ctx.close(); opened = [];
  }
  return { note: [...new Set(notes)].join(' ') };
});

await test('V02', '视觉：剩余时间用等宽数字（tabular-nums），不同数字串宽度与冒号位置完全一致，走秒不左右跳', async () => {
  const { page } = await open();
  await cssRow('V02', page, '[data-ui=time]', '剩余时间', { 'font-variant-numeric': 'tabular-nums' });
  const r = await page.evaluate(() => {
    const el = document.querySelector('[data-ui=time]');
    const out = {};
    for (const s of ['25:00', '11:11', '00:00', '19:48', '08:08', '24:59']) {
      el.textContent = s;
      const range = document.createRange(); range.setStart(el.firstChild, 2); range.setEnd(el.firstChild, 3);
      out[s] = [Math.round(el.getBoundingClientRect().width * 100) / 100, Math.round(range.getBoundingClientRect().x * 100) / 100];
    }
    el.textContent = '25:00';
    return out;
  });
  const widths = new Set(Object.values(r).map((v) => v[0])); const colons = new Set(Object.values(r).map((v) => v[1]));
  if (widths.size !== 1 || colons.size !== 1) throw new Error(`宽度 / 冒号位置不一致 ${JSON.stringify(r)}`);
  return { note: `宽 ${[...widths][0]}px，冒号 x=${[...colons][0]}` };
});

await test('V03', '视觉：跳过弱于主按钮——主按钮阶段色实心底、跳过透明底无边框、跳过次要文字色、字重 400 < 500', async () => {
  const { page } = await open();
  await cssRow('V03', page, P, '主按钮', { 'background-color': C.focus, 'font-weight': '500', color: C.onAccent });
  await cssRow('V03', page, S, '跳过', { 'background-color': 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', 'font-weight': '400', color: C.muted });
  return { evidence: await QA.snapElement(page, c, 'V03-buttons', '.controls') };
});

await test('V04', '视觉：六种状态下没有任何 CSS 动画、没有无限循环动画，样式表里没有 @keyframes', async () => {
  const { page } = await open({ init: [VIS] });
  const check = async (label) => {
    const r = await page.evaluate(() => {
      const anims = document.getAnimations().map((a) => ({ type: a.constructor.name, it: a.effect && a.effect.getTiming().iterations }));
      let keyframes = 0;
      for (const sh of document.styleSheets) { try { for (const rule of sh.cssRules) if (rule.type === CSSRule.KEYFRAMES_RULE) keyframes++; } catch {} }
      return { anims, keyframes };
    });
    if (r.keyframes || r.anims.some((a) => a.type === 'CSSAnimation' || a.it === Infinity)) throw new Error(`${label}：${JSON.stringify(r)}`);
  };
  await away(page); await check('专注待开始');
  await page.click(P); await page.clock.runFor(1000); await away(page); await check('专注进行中');
  await page.click(P); await away(page); await check('已暂停');
  await page.click(P); await page.clock.runFor(FOCUS); await realWait(300); await check('专注到点');
  await page.mouse.click(20, 20); await page.click(P); await page.clock.runFor(1000); await away(page); await check('休息进行中');
});

await test('V05', '视觉：布局符合结构图——自上而下 阶段 / 时间 / 状态 / 按钮行（主按钮左、跳过右并排）/ 完成数 / 底部提示区，水平居中，无卡片阴影分割线', async () => {
  const { page } = await open({ init: [BLOCK_STORAGE] });
  await page.click(P); await page.clock.runFor(FOCUS - 754000); await page.click(P);
  const r = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    const order = ['[data-ui=phase]', '[data-ui=time]', '[data-ui=status]', '[data-ui=primary]', '[data-ui=count]', '[data-ui=notice]'].map((s) => [s, b(s).top, b(s).bottom]);
    const cx = (s) => { const r = b(s); return r.left + r.width / 2; };
    const center = innerWidth / 2;
    const centers = ['[data-ui=phase]', '[data-ui=time]', '.controls', '[data-ui=count]', '[data-ui=notice]'].map((s) => [s, Math.round((cx(s) - center) * 10) / 10]);
    const deco = [...document.querySelectorAll('*')].filter((e) => { const cs = getComputedStyle(e); return cs.boxShadow !== 'none' || cs.backgroundImage !== 'none' || (parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none'); }).map((e) => e.tagName);
    return { order, centers, sameRow: Math.abs(b('[data-ui=primary]').top - b('[data-ui=skip]').top) < 1, primaryLeft: b('[data-ui=primary]').right <= b('[data-ui=skip]').left, deco };
  });
  for (let i = 1; i < r.order.length; i++) if (!(r.order[i][1] >= r.order[i - 1][2] - 0.5)) throw new Error(`顺序错：${r.order[i][0]}`);
  if (r.centers.some(([, d]) => Math.abs(d) > 1)) throw new Error(`未居中 ${JSON.stringify(r.centers)}`);
  if (!r.sameRow || !r.primaryLeft) throw new Error('按钮未并排或顺序反了');
  if (r.deco.length) throw new Error(`出现阴影 / 渐变 / 边框：${r.deco}`);
  await away(page);
  return { note: `中心偏差 ${r.centers.map((x) => x[1]).join('/')}`, evidence: await snap(page, 'V05-layout-paused-storage-off') };
});

await test('V06', '视觉 token：阶段标签 18px / 500 / 行高 27px，专注 #A3412D、休息 #3B6870', async () => {
  const { page } = await open();
  await cssRow('V06', page, '[data-ui=phase]', '阶段·专注', { 'font-size': '18px', 'font-weight': '500', 'line-height': '27px', color: C.focus });
  await page.click(S);
  await cssRow('V06', page, '[data-ui=phase]', '阶段·休息', { color: C.brk });
});

await test('V07', '视觉 token：剩余时间桌面 128px / 300 / 行高 128px / #22201C；窄于 600 与矮于 480 时 80px', async () => {
  let { page } = await open();
  await cssRow('V07', page, '[data-ui=time]', '剩余时间·桌面', { 'font-size': '128px', 'font-weight': '300', 'line-height': '128px', color: C.fg, 'white-space': 'nowrap' });
  for (const [vp, name] of [[{ width: 599, height: 900 }, '宽 599'], [{ width: 600, height: 900 }, '宽 600'], [{ width: 1024, height: 479 }, '高 479'], [{ width: 1024, height: 480 }, '高 480']]) {
    for (const ctx of opened) await ctx.close(); opened = [];
    ({ page } = await open({ viewport: vp }));
    const want = name === '宽 600' || name === '高 480' ? '128px' : '80px';
    await cssRow('V07', page, '[data-ui=time]', `剩余时间·${name}`, { 'font-size': want });
  }
});

await test('V08', '视觉 token：状态说明 16px、#5F5A52、无字时仍占 24px 高、aria-live=polite；有无文字时按钮位置不变', async () => {
  const { page } = await open();
  await cssRow('V08', page, '[data-ui=status]', '状态说明', { 'font-size': '16px', color: C.muted, 'min-height': '24px' });
  const y0 = await page.evaluate(() => [document.querySelector('[data-ui=status]').getBoundingClientRect().height, document.querySelector('[data-ui=primary]').getBoundingClientRect().top, document.querySelector('[data-ui=status]').getAttribute('aria-live')]);
  await page.click(P); await page.clock.runFor(2000); await page.click(P);
  const y1 = await page.evaluate(() => [document.querySelector('[data-ui=status]').getBoundingClientRect().height, document.querySelector('[data-ui=primary]').getBoundingClientRect().top]);
  assert.equal(y0[0], 24); assert.equal(y0[2], 'polite');
  assert.equal(y1[1], y0[1], `按钮 y 从 ${y0[1]} 变成 ${y1[1]}`);
});

await test('V09', '视觉 token：主按钮 高 48 / 左右内距 32 / 圆角 8 / 16px 500 / 字 #FAF8F4 / 底 专注 #A3412D 休息 #3B6870；悬停 #8A3524 / #30575E；过渡只含 background-color 120ms ease-out', async () => {
  const { page } = await open();
  await away(page);
  await cssRow('V09', page, P, '主按钮·专注', { height: '48px', 'padding-left': '32px', 'padding-right': '32px', 'border-top-left-radius': '8px', 'font-size': '16px', 'font-weight': '500', color: C.onAccent, 'background-color': C.focus,
    'transition-property': 'background-color', 'transition-duration': '0.12s', 'transition-timing-function': 'ease-out' });
  await page.hover(P); await realWait(300);
  await cssRow('V09', page, P, '主按钮·专注悬停', { 'background-color': C.focusStrong });
  await page.click(S); await page.mouse.move(3, 3); await realWait(300);
  await cssRow('V09', page, P, '主按钮·休息', { 'background-color': C.brk });
  await page.hover(P); await realWait(300);
  await cssRow('V09', page, P, '主按钮·休息悬停', { 'background-color': C.brkStrong });
});

await test('V10', '视觉 token：跳过 高 48 / 左右内距 16 / 圆角 8 / 16px 400 / #5F5A52 / 无底无边；悬停底 #F2EFE9、字 #22201C', async () => {
  const { page } = await open();
  await away(page);
  await cssRow('V10', page, S, '跳过', { height: '48px', 'padding-left': '16px', 'padding-right': '16px', 'border-top-left-radius': '8px', 'font-size': '16px', 'font-weight': '400', color: C.muted, 'background-color': 'rgba(0, 0, 0, 0)' });
  await page.hover(S); await realWait(300);
  await cssRow('V10', page, S, '跳过·悬停', { 'background-color': C.surface, color: C.fg });
});

await test('V11', '视觉：键盘 Tab 聚焦时 2px 实线 #22201C 焦点框、离按钮 2px；鼠标点击不出现焦点框', async () => {
  const { page } = await open();
  await page.keyboard.press('Tab');
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute('data-ui')), 'primary');
  await cssRow('V11', page, P, '主按钮·键盘焦点', { 'outline-style': 'solid', 'outline-width': '2px', 'outline-color': C.fg, 'outline-offset': '2px' });
  const ev = await QA.snapElement(page, c, 'V11-focus-ring', '.controls');
  await page.keyboard.press('Tab');
  await cssRow('V11', page, S, '跳过·键盘焦点', { 'outline-style': 'solid', 'outline-width': '2px', 'outline-color': C.fg });
  // 鼠标部分换一个新页面：对已经被键盘聚焦的按钮再点鼠标，浏览器会保留 :focus-visible（这是浏览器规则，不是页面问题）
  const m = await open();
  await m.page.click(S);
  const fv = await m.page.evaluate(() => [document.activeElement.getAttribute('data-ui'), document.activeElement.matches(':focus-visible'), getComputedStyle(document.activeElement).outlineStyle]);
  assert.equal(fv[0], 'skip');
  assert.equal(fv[1], false, `鼠标点击后出现了焦点框 ${fv}`);
  return { note: `鼠标点击后 :focus-visible=${fv[1]}、outline-style=${fv[2]}`, evidence: ev };
});

await test('V12', '视觉 token：完成数整句 16px #5F5A52、数字 #22201C 600 等宽；存储提示 14px #85561A 居中，320 宽时折两行仍在底部提示区内', async () => {
  let { page } = await open();
  await cssRow('V12', page, '[data-ui=count]', '完成数整句', { 'font-size': '16px', color: C.muted, 'line-height': '24px' });
  await cssRow('V12', page, '[data-ui=count-num]', '完成数数字', { color: C.fg, 'font-weight': '600', 'font-variant-numeric': 'tabular-nums' });
  for (const ctx of opened) await ctx.close(); opened = [];
  ({ page } = await open({ viewport: { width: 320, height: 568 }, mobile: true, dpr: 2, init: [BLOCK_STORAGE] }));
  await cssRow('V12', page, '[data-ui=notice]', '存储提示', { 'font-size': '14px', color: C.warning, 'text-align': 'center', 'line-height': '21px' });
  const r = await page.evaluate(() => { const n = document.querySelector('[data-ui=notice]').getBoundingClientRect(); const f = document.querySelector('.footer').getBoundingClientRect(); return { lines: Math.round(n.height / 21), inside: n.top >= f.top - 0.5 && n.bottom <= f.bottom + 0.5, footH: f.height, bottom: f.bottom, vh: innerHeight }; });
  if (r.lines !== 2 || !r.inside || r.footH !== 64) throw new Error(`提示 ${JSON.stringify(r)}`);
  return { note: `320 宽折 ${r.lines} 行，提示区高 ${r.footH}`, evidence: await snap(page, 'V12-notice-320') };
});

await test('V13', '视觉 token：间距 阶段→时间 8 / 时间→状态 8 / 状态→按钮 32 / 两按钮 16 / 按钮→完成数 48；内容列 ≤ 480；提示区 64；页面背景 #FAF8F4；字体族首项 -apple-system', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => {
    const b = (s) => document.querySelector(s).getBoundingClientRect();
    return {
      phaseTime: b('[data-ui=time]').top - b('[data-ui=phase]').bottom,
      timeStatus: b('[data-ui=status]').top - b('[data-ui=time]').bottom,
      statusBtn: b('.controls').top - b('[data-ui=status]').bottom,
      btnGap: b('[data-ui=skip]').left - b('[data-ui=primary]').right,
      btnCount: b('[data-ui=count]').top - b('.controls').bottom,
      col: b('.content').width, foot: b('.footer').height,
      bg: getComputedStyle(document.body).backgroundColor, font: getComputedStyle(document.body).fontFamily.split(',')[0].trim(),
      gutter: getComputedStyle(document.querySelector('.main')).paddingLeft, lift: getComputedStyle(document.querySelector('.main')).paddingBottom,
    };
  });
  const want = { phaseTime: 8, timeStatus: 8, statusBtn: 32, btnGap: 16, btnCount: 48, col: 480, foot: 64 };
  for (const [k, v] of Object.entries(want)) { visualRows.push({ id: 'V13', name: '间距', prop: k, want: `${v}px`, got: `${Math.round(r[k] * 100) / 100}px`, ok: Math.abs(r[k] - v) <= 0.5 }); if (Math.abs(r[k] - v) > 0.5) throw new Error(`${k} 期望 ${v} 实际 ${r[k]}`); }
  for (const [k, v] of Object.entries({ bg: C.bg, font: '-apple-system', gutter: '24px', lift: '48px' })) { visualRows.push({ id: 'V13', name: '页面', prop: k, want: v, got: r[k], ok: r[k] === v }); if (r[k] !== v) throw new Error(`${k} 期望 ${v} 实际 ${r[k]}`); }
  facts.V13 = r;
});

await test('V14', '视觉：到点切阶段时主按钮底色直接切换、不经过渡（DESIGN §5.1「颜色和文字直接切换，无过渡」；§1.2「全页唯一的过渡是按钮悬停变色」）', async () => {
  const { page } = await open();
  await page.click(P);
  await away(page);
  const before = (await css(page, P, ['background-color']))['background-color'];
  await page.clock.runFor(FOCUS + 300);
  const probe = () => page.evaluate(() => ({
    t: Math.round(document.timeline.currentTime), bg: getComputedStyle(document.querySelector('[data-ui=primary]')).backgroundColor,
    anims: document.getAnimations().filter((a) => a.constructor.name === 'CSSTransition').map((a) => `${a.transitionProperty}@${a.effect.target.getAttribute('data-ui')} ${a.effect.getTiming().duration}ms`),
  }));
  const samples = [await probe()];
  for (const d of [15, 15, 20, 20, 30, 50, 100]) { await realWait(d); samples.push(await probe()); }
  const colors = [...new Set(samples.map((s) => s.bg))];
  const trans = [...new Set(samples.flatMap((s) => s.anims))];
  facts.V14 = { before, samples };
  // 再看「点跳过」引起的阶段切换
  await page.mouse.click(20, 20);
  await realWait(200);
  await page.click(S);
  const skipSamples = [await probe()];
  for (const d of [20, 30, 50]) { await realWait(d); skipSamples.push(await probe()); }
  facts.V14.skip = skipSamples;
  const skipColors = [...new Set(skipSamples.map((s) => s.bg))];
  const mid = colors.filter((x) => x !== C.focus && x !== C.brk);
  const midSkip = skipColors.filter((x) => x !== C.focus && x !== C.brk);
  if (trans.length || mid.length || midSkip.length) {
    const e = new Error(`切阶段时出现背景色过渡：${trans.join('、') || '（未捕获到动画对象）'}；到点后采样到中间色 ${mid.join(' → ') || '无'}；跳过后采样到中间色 ${midSkip.join(' → ') || '无'}`);
    throw e;
  }
});

await test('V15', '视觉：系统开了「减少动态效果」时主按钮、跳过都不过渡', async () => {
  const { page } = await open({ reducedMotion: 'reduce' });
  await cssRow('V15', page, P, '主按钮·减少动效', { 'transition-property': /^(none|all)$/, 'transition-duration': '0s' });
  await cssRow('V15', page, S, '跳过·减少动效', { 'transition-duration': '0s' });
});

// ───────────────────────── Phase 3 响应式 ─────────────────────────
const VIEWPORTS = [
  ['F22', '手机竖屏 375×812', { width: 375, height: 812 }, true, true],
  ['F22', '手机竖屏 390×844', { width: 390, height: 844 }, true, true],
  ['F22', '平板竖屏 768×1024', { width: 768, height: 1024 }, true, true],
  ['F23', '小屏手机 320×568', { width: 320, height: 568 }, true, true],
  ['F23', '手机横屏 844×390', { width: 844, height: 390 }, true, true],
  ['F23', '手机横屏 667×375', { width: 667, height: 375 }, true, true],
  ['F23', '笔记本 1280×720', { width: 1280, height: 720 }, false, true],
  ['F23', '桌面 1440×900', { width: 1440, height: 900 }, false, true],
  ['F23', '极小横屏 568×320（只记录）', { width: 568, height: 320 }, true, false],
];
const respRows = [];
for (const id of ['F22', 'F23']) {
  await test(id, id === 'F22' ? 'R6 正常：手机竖屏一屏内可见全部元素、无横向滚动、按钮并排且 ≥ 44px、剩余时间 80px' : 'R6 边界：窄屏、横屏、笔记本下元素不重叠、不截断，剩余时间仍最大；提示出现、完成数两位数时仍居中不重叠', async () => {
    const fails = [];
    for (const [gid, name, vp, mobile, strict] of VIEWPORTS.filter((v) => v[0] === id)) {
      for (const variant of ['normal', 'notice+12']) {
        const { page } = await open({ viewport: vp, mobile, dpr: mobile ? 2 : 1, init: variant === 'normal' ? [] : [BLOCK_STORAGE] });
        if (variant === 'normal') { await page.click(P); await page.clock.runFor(6 * 60000 + 18000); }
        else { await page.evaluate(() => { document.querySelector('[data-ui=count-num]').textContent = '12'; }); }
        await away(page);
        const r = await page.evaluate(() => {
          const sels = ['[data-ui=phase]', '[data-ui=time]', '[data-ui=status]', '[data-ui=primary]', '[data-ui=skip]', '[data-ui=count]', '[data-ui=notice]'];
          const rects = sels.map((s) => { const e = document.querySelector(s); const r = e.getBoundingClientRect(); return { s, r: { l: r.left, t: r.top, ri: r.right, b: r.bottom, w: r.width, h: r.height }, vis: getComputedStyle(e).display !== 'none' && r.height > 0, clipped: e.scrollWidth > e.clientWidth + 1 }; }).filter((x) => x.vis);
          const overlaps = [];
          for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) { const a = rects[i].r; const b = rects[j].r; if (a.l < b.ri - 0.5 && b.l < a.ri - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5) overlaps.push(`${rects[i].s}×${rects[j].s}`); }
          const de = document.documentElement;
          const p = document.querySelector('[data-ui=primary]').getBoundingClientRect(); const k = document.querySelector('[data-ui=skip]').getBoundingClientRect();
          const cnt = document.querySelector('[data-ui=count]').getBoundingClientRect();
          return { hScroll: de.scrollWidth > de.clientWidth, vScroll: de.scrollHeight > de.clientHeight, outOfView: rects.filter((x) => x.r.b > innerHeight + 0.5 || x.r.l < -0.5 || x.r.ri > innerWidth + 0.5).map((x) => x.s), overlaps, clipped: rects.filter((x) => x.clipped).map((x) => x.s), sameRow: Math.abs(p.top - k.top) < 1, btn: [Math.round(p.width), Math.round(p.height), Math.round(k.width), Math.round(k.height)], timeFs: getComputedStyle(document.querySelector('[data-ui=time]')).fontSize, countCenter: Math.round((cnt.left + cnt.width / 2 - innerWidth / 2) * 10) / 10 };
        });
        const problems = [];
        if (r.hScroll) problems.push('横向滚动');
        if (r.overlaps.length) problems.push(`重叠 ${r.overlaps}`);
        if (r.clipped.length) problems.push(`截断 ${r.clipped}`);
        if (strict && r.vScroll) problems.push('需要纵向滚动');
        if (strict && r.outOfView.length) problems.push(`超出一屏 ${r.outOfView}`);
        if (!r.sameRow) problems.push('按钮未并排');
        if (mobile && Math.min(r.btn[1], r.btn[3]) < 44) problems.push(`按钮太矮 ${r.btn}`);
        if (Math.abs(r.countCenter) > 1) problems.push(`完成数偏离中心 ${r.countCenter}`);
        if (vp.width < 600 || vp.height < 480) { if (r.timeFs !== '80px') problems.push(`时间字号 ${r.timeFs}`); }
        respRows.push({ id, name, variant, ...r, problems });
        const shot = await snap(page, `${id}-${vp.width}x${vp.height}-${variant === 'normal' ? 'running' : 'notice-12'}`);
        if (problems.length) (strict ? fails : (facts.extremeNotes = facts.extremeNotes || [])).push(`${name}/${variant}：${problems.join('，')}（${shot}）`);
        for (const ctx of opened) await ctx.close(); opened = [];
      }
    }
    if (fails.length) throw new Error(fails.join('；'));
    return { note: `${VIEWPORTS.filter((v) => v[0] === id).length} 种视口 × 2 变体${facts.extremeNotes && id === 'F23' ? `；只记录：${facts.extremeNotes.join('；')}` : ''}` };
  });
}

// ───────────────────────── Phase 4 可访问性 ─────────────────────────
const AXE = path.join(ROOT, '.gstack', 'qa-runtime', 'axe.min.js');
await test('A01', '可访问性：axe-core WCAG 2 A/AA 扫描四种状态（待开始、已暂停、专注结束提示、存储不可用），无 critical / serious 违规', async () => {
  if (!fs.existsSync(AXE)) throw new Error('本机 axe.min.js 不存在');
  const all = [];
  for (const st of ['idle', 'paused', 'alert', 'storage-off']) {
    const { page } = await open({ clock: false, init: st === 'storage-off' ? [BLOCK_STORAGE] : [] });
    if (st === 'paused') await seed(page, record({ date: dk(Date.now()), status: 'paused', remainingMs: 754000 }));
    if (st === 'alert') { await seed(page, record({ date: dk(Date.now()), status: 'running', endAt: Date.now() + 1200 })); await realWait(1800); }
    await page.addScriptTag({ path: AXE });
    const res = await page.evaluate(async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } }); return { v: r.violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length })), passes: r.passes.length, incomplete: r.incomplete.map((v) => v.id) }; });
    all.push({ st, ...res });
    for (const ctx of opened) await ctx.close(); opened = [];
  }
  facts.A01 = all;
  const bad = all.flatMap((x) => x.v.filter((v) => v.impact === 'critical' || v.impact === 'serious').map((v) => `${x.st}:${v.id}`));
  if (bad.length) throw new Error(`违规 ${bad}`);
  return { note: all.map((x) => `${x.st} 违规 ${x.v.length}（${x.v.map((v) => v.id + '/' + v.impact).join(',') || '无'}）`).join('；') };
});

await test('A02', '可访问性：Tab 依次聚焦主按钮、跳过；Enter / 空格激活主按钮开始与暂停；焦点在页面空白处按键不开始计时', async () => {
  const { page } = await open();
  const order = [];
  for (let i = 0; i < 3; i++) { await page.keyboard.press('Tab'); order.push(await page.evaluate(() => document.activeElement.getAttribute('data-ui') || document.activeElement.tagName)); }
  assert.deepEqual(order.slice(0, 2), ['primary', 'skip'], `Tab 顺序 ${order}`);
  await page.focus(P);
  await page.keyboard.press('Enter');
  assert.equal((await state(page)).primary, '暂停', 'Enter 未开始');
  await page.keyboard.press('Space');
  assert.equal((await state(page)).primary, '继续', '空格未暂停');
  await page.click(S); await page.click(S);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Enter'); await page.keyboard.press('Space'); await page.keyboard.press('s');
  assert.equal((await state(page)).primary, '开始', '页面空白处按键开始了计时');
  return { note: `Tab 顺序 ${order.join(' → ')}` };
});

await test('A03', '可访问性：lang=zh-CN；viewport 不禁止缩放且含 viewport-fit=cover；剩余时间无 aria-live、状态说明 aria-live=polite；按钮都有可访问名称', async () => {
  const { page } = await open();
  const r = await page.evaluate(() => ({
    lang: document.documentElement.lang, vp: document.querySelector('meta[name=viewport]').content,
    timeLive: document.querySelector('[data-ui=time]').getAttribute('aria-live'), statusLive: document.querySelector('[data-ui=status]').getAttribute('aria-live'),
    names: [...document.querySelectorAll('button')].map((b) => b.textContent.trim()), types: [...document.querySelectorAll('button')].map((b) => b.type),
  }));
  assert.equal(r.lang, 'zh-CN');
  assert.ok(!/user-scalable\s*=\s*no|maximum-scale/.test(r.vp) && /viewport-fit=cover/.test(r.vp), r.vp);
  assert.equal(r.timeLive, null); assert.equal(r.statusLive, 'polite');
  assert.ok(r.names.every(Boolean)); assert.deepEqual(r.types, ['button', 'button']);
  return { note: JSON.stringify(r) };
});

// ───────────────────────── 汇总项 ─────────────────────────
const resultOf = (id) => c.results.find((r) => r.id === id);
if (!ONLY.length) {
  const ext = requests.filter((u) => !u.startsWith(ORIGIN) && !u.startsWith('data:') && !u.startsWith('file:'));
  ext.length || badResponses.length
    ? c.fail('S02', '网络：所有请求同源或 data:/file:，状态码 < 400，无外部网址', `外部 ${ext.slice(0, 5)}；失败 ${badResponses.slice(0, 5)}`)
    : c.pass('S02', `网络：全程 ${requests.length} 个请求全部同源或本地文件，0 个外部网址，0 个失败响应`);
  c.consoleErrors.length
    ? c.fail('S01', '控制台零容忍：全程零 console.error / pageerror / 未处理拒绝', `${c.consoleErrors.length} 个：${c.consoleErrors.map((e) => e.text).slice(0, 3)}`)
    : c.pass('S01', '控制台零容忍：全部用例全程零 console.error、零 pageerror、零未处理的 Promise 拒绝');
  const agg = (id, desc, ids) => { const bad = ids.filter((x) => !resultOf(x) || resultOf(x).status !== 'pass'); bad.length ? c.fail(id, desc, `未通过：${bad}`) : c.pass(id, `${desc}（${ids.join('、')} 全部通过）`); };
  agg('P03', '流程：异常路径（声音被拦截、存储不可用、记录损坏、离开期间到点）都有明确页面表现', ['F13', 'F21', 'F20', 'F17']);
  agg('P04', '流程：边界条件（时间回调、跨零点、多页面、窄屏横屏）都有合理处理', ['F06', 'F09', 'F19', 'F23']);
}

c.printSummary();
QA.writeResults(c, path.join(OUT, 'test-results.json'));
fs.writeFileSync(path.join(OUT, 'facts.json'), JSON.stringify({ facts, visualRows, respRows, requests: [...new Set(requests)], badResponses }, null, 2));
await browser.close();
process.exit(c.summary().failed > 0 ? 1 : 0);
