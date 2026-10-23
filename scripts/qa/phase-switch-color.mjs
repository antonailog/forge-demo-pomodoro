// BF-1023-1 回归：切换阶段时主按钮底色必须直接换掉（DESIGN §5.1），悬停变色仍保留 120ms 过渡（DESIGN §5.2）。
// 用法：APP_URL=http://127.0.0.1:4591/index.html node scripts/qa/phase-switch-color.mjs [--variant=<名字>] [--shots=<目录>]
//
// 不做任何真实时间等待：
// - 计时用 Playwright 假时钟快进（install → goto → pauseAt → runFor）。
// - CSS 过渡跟着页面动画时间线走、不受假时钟影响；这里用浏览器调试接口把动画时间线速度设为 0，
//   过渡一旦出现就停在起点。于是「切换后立刻读到的底色」只有两种结果：直接换掉 = 新颜色；有过渡 = 还是旧颜色。
// - 需要「悬停已经走完」时，直接把正在进行的动画 finish()，不等。
//
// --variant 只用于根因实验（P4），往页面里临时注入改动，不改仓库代码：
//   none（默认，测仓库里的真实代码）
//   no-transition   去掉主按钮的过渡                    → 验证「过渡来自按钮常态上那条 transition」
//   hover-only      过渡只写在悬停 / 按下状态上（纯样式改法）→ 验证「只靠样式能不能分清悬停和切阶段」
//   finish-on-phase 阶段属性一变就让主按钮的过渡立即走完    → 验证拟定修法
//   finish-every-tick 每次走秒都让主按钮的过渡走完（故意的坏修法）→ 证明 G5 能抓到「修过头」
// --only=S1,G5 只跑指定检查。
import fs from 'node:fs';
import path from 'node:path';
import { pw, APP, KEY, record, T } from './lib.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => a.replace(/^--/, '').split('=')));
const VARIANT = args.variant || 'none';
const SHOTS = args.shots || '';
const ONLY = (args.only || '').split(',').filter(Boolean);
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const P = '[data-ui=primary]';
const S = '[data-ui=skip]';
const FOCUS = 25 * 60000;
const BREAK = 5 * 60000;
const T0 = T(2026, 10, 23, 10, 0, 0);
const C = {
  focus: 'rgb(163, 65, 45)', focusStrong: 'rgb(138, 53, 36)',
  brk: 'rgb(59, 104, 112)', brkStrong: 'rgb(48, 87, 94)',
};
const NAME = Object.fromEntries(Object.entries(C).map(([k, v]) => [v, { focus: '砖红', focusStrong: '深砖红', brk: '灰青', brkStrong: '深灰青' }[k]]));

const VARIANTS = {
  none: null,
  'no-transition': { css: '.primary { transition: none !important; }' },
  'hover-only': { css: '.primary { transition: none; } .primary:hover, .primary:active { transition: background-color var(--pomo-btn-ms) ease-out; }' },
  'finish-every-tick': {
    script: `document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(() => {
        for (const a of document.querySelector('[data-ui=primary]').getAnimations()) a.finish();
      }).observe(document.querySelector('[data-ui=time]'), { childList: true, characterData: true, subtree: true });
    });`,
  },
  'finish-on-phase': {
    script: `document.addEventListener('DOMContentLoaded', () => {
      new MutationObserver(() => {
        const b = document.querySelector('[data-ui=primary]');
        for (const a of b.getAnimations()) a.finish();
      }).observe(document.body, { attributes: true, attributeFilter: ['data-phase'] });
    });`,
  },
};
if (!(VARIANT in VARIANTS)) throw new Error(`未知 variant：${VARIANT}`);
const V = VARIANTS[VARIANT];

const browser = await pw.chromium.launch();
const results = [];
const consoleErrors = [];

async function open({ reducedMotion = 'no-preference', raw } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: 'zh-CN', reducedMotion });
  if (raw !== undefined) await context.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { localStorage.setItem(k, v); sessionStorage.setItem('seeded', '1'); } }, [KEY, raw]);
  if (V && V.script) await context.addInitScript(V.script);
  await context.clock.install({ time: T0 });
  const page = await context.newPage();
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  // 冻结动画时间线：过渡出现后停在起点，不随真实时间推进。
  const cdp = await context.newCDPSession(page);
  await cdp.send('Animation.enable');
  await cdp.send('Animation.setPlaybackRate', { playbackRate: 0 });
  await page.goto(APP, { waitUntil: 'load' });
  if (V && V.css) await page.addStyleTag({ content: V.css });
  await page.clock.pauseAt(T0 + 1000);
  await settle(page);
  return { context, page };
}

const settle = (page) => page.evaluate(() => { for (const a of document.getAnimations()) a.finish(); });
const away = async (page) => { await page.mouse.move(3, 3); await settle(page); };
const probe = (page) => page.evaluate(() => {
  const b = document.querySelector('[data-ui=primary]');
  return {
    phase: document.body.getAttribute('data-phase'),
    label: document.querySelector('[data-ui=phase]').textContent,
    bg: getComputedStyle(b).backgroundColor,
    transition: getComputedStyle(b).transition,
    running: b.getAnimations().filter((a) => a.playState !== 'finished').map((a) => `${a.transitionProperty || a.constructor.name} ${a.effect.getTiming().duration}ms`),
  };
});
const desc = (r) => `阶段=${r.label}，底色=${NAME[r.bg] || r.bg}，进行中的过渡=${r.running.join('、') || '无'}`;

async function scenario(id, title, fn) {
  if (ONLY.length && !ONLY.includes(id)) return;
  const errs = consoleErrors.length;
  let ok = false; let detail = '';
  const ctxs = [];
  try {
    detail = await fn(ctxs);
    ok = true;
  } catch (e) {
    detail = String(e.message || e);
  }
  if (consoleErrors.length > errs) { ok = false; detail += `；console.error：${consoleErrors.slice(errs).join(' | ')}`; }
  for (const c of ctxs) await c.close().catch(() => {});
  results.push({ id, title, ok, detail });
}

function expectDirect(r, wantBg, wantPhase) {
  if (r.phase !== wantPhase) throw new Error(`阶段没切到 ${wantPhase}：${desc(r)}`);
  if (r.bg !== wantBg || r.running.length) throw new Error(`切换后不是直接换色：期望底色 ${NAME[wantBg]}、无过渡；实际 ${desc(r)}`);
  return desc(r);
}

async function shot(page, name) {
  if (!SHOTS) return;
  await page.locator('.content').screenshot({ path: path.join(SHOTS, `${name}.png`) });
}

// ── 切阶段：必须直接换色 ──
await scenario('S1', '专注到点切到休息（鼠标不在按钮上）', async (ctxs) => {
  const { context, page } = await open(); ctxs.push(context);
  await page.click(P); await away(page);
  await page.clock.runFor(FOCUS + 300);
  const r = await probe(page);
  await shot(page, 'S1-focus-ended');
  return expectDirect(r, C.brk, 'break');
});

await scenario('S2', '点「跳过」切到休息', async (ctxs) => {
  const { context, page } = await open(); ctxs.push(context);
  await away(page);
  await page.click(S);
  const r = await probe(page);
  await shot(page, 'S2-skip');
  return expectDirect(r, C.brk, 'break');
});

await scenario('S3', '专注到点切到休息（鼠标一直停在主按钮上）', async (ctxs) => {
  const { context, page } = await open(); ctxs.push(context);
  await page.click(P); await settle(page);
  await page.clock.runFor(FOCUS + 300);
  const r = await probe(page);
  await shot(page, 'S3-focus-ended-hovered');
  return expectDirect(r, C.brkStrong, 'break');
});

await scenario('S4', '休息到点切回专注', async (ctxs) => {
  const { context, page } = await open(); ctxs.push(context);
  await page.click(S); await page.click(P); await away(page);
  await page.clock.runFor(BREAK + 300);
  const r = await probe(page);
  await shot(page, 'S4-break-ended');
  return expectDirect(r, C.focus, 'focus');
});

await scenario('S5', '刷新后恢复到「休息待开始」（边界：页面一打开就是休息阶段）', async (ctxs) => {
  const raw = record({ date: '2026-10-23', count: 1, countedEndAt: T0 - 60000, phase: 'break', status: 'idle' });
  const { context, page } = await open({ raw }); ctxs.push(context);
  const r = await probe(page);
  await shot(page, 'S5-restore-break');
  return expectDirect(r, C.brk, 'break');
});

// ── 守护项：悬停变色的过渡不能被一起去掉 ──
await scenario('G1', '鼠标移上主按钮：仍有 120ms 底色过渡，走完是深一档', async (ctxs) => {
  const { context, page } = await open(); ctxs.push(context);
  await away(page);
  await page.hover(P);
  const r = await probe(page);
  if (!r.running.some((x) => x.startsWith('background-color 120'))) throw new Error(`悬停时没有过渡：${desc(r)}`);
  await settle(page);
  const r2 = await probe(page);
  if (r2.bg !== C.focusStrong) throw new Error(`悬停走完后底色不对：${desc(r2)}`);
  return `移上时 ${r.running.join('、')}；走完 ${NAME[r2.bg]}`;
});

await scenario('G2', '鼠标从主按钮移开：仍有 120ms 底色过渡，走完回到阶段色', async (ctxs) => {
  const { context, page } = await open(); ctxs.push(context);
  await page.hover(P); await settle(page);
  await page.mouse.move(3, 3);
  const r = await probe(page);
  if (!r.running.some((x) => x.startsWith('background-color 120'))) throw new Error(`移开时没有过渡：${desc(r)}`);
  await settle(page);
  const r2 = await probe(page);
  if (r2.bg !== C.focus) throw new Error(`移开走完后底色不对：${desc(r2)}`);
  return `移开时 ${r.running.join('、')}；走完 ${NAME[r2.bg]}`;
});

await scenario('G3', '主按钮的过渡声明不变：只过渡 background-color 120ms ease-out', async (ctxs) => {
  const { context, page } = await open(); ctxs.push(context);
  await away(page);
  const r = await probe(page);
  if (r.transition !== 'background-color 0.12s ease-out') throw new Error(`过渡声明是「${r.transition}」`);
  return r.transition;
});

await scenario('G5', '计时进行中鼠标移上主按钮：走秒刷新页面时不打断悬停过渡（只有换阶段才立即换色）', async (ctxs) => {
  const { context, page } = await open(); ctxs.push(context);
  await page.click(P); await away(page);
  await page.hover(P);
  await page.clock.runFor(1000);
  const r = await probe(page);
  if (r.phase !== 'focus') throw new Error(`阶段不应变化：${desc(r)}`);
  if (!r.running.some((x) => x.startsWith('background-color 120'))) throw new Error(`走秒后悬停过渡被提前结束：${desc(r)}`);
  return `走秒 4 次后仍在过渡：${r.running.join('、')}`;
});

await scenario('G4', '系统开了「减少动态效果」：悬停和到点都没有过渡', async (ctxs) => {
  const { context, page } = await open({ reducedMotion: 'reduce' }); ctxs.push(context);
  await page.click(P); await settle(page);
  await page.mouse.move(3, 3);
  const r0 = await probe(page);
  if (r0.running.length) throw new Error(`减少动效时移开鼠标仍有过渡：${desc(r0)}`);
  await page.clock.runFor(FOCUS + 300);
  const r = await probe(page);
  return expectDirect(r, C.brk, 'break');
});

await browser.close();

console.log(`\nBF-1023-1 切阶段换色回归  variant=${VARIANT}  app=${APP}`);
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.id}  ${r.title}\n      ${r.detail}`);
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${failed ? 'RED' : 'GREEN'}：${results.length - failed}/${results.length} 通过；console.error ${consoleErrors.length} 条`);
process.exit(failed ? 1 : 0);
