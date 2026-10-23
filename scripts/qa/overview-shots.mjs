// forge-qa · 验收总览截图：真实页面、真实点击 + 快进时钟造出的状态，卡头写的是那一刻浏览器标签页的真实标题。
// 用法：node scripts/qa/overview-shots.mjs  →  docs/qa-screenshots/ 下的单张图与 overview.png
import fs from 'node:fs';
import path from 'node:path';
import { pw, ROOT, APP, KEY, PROBE, record, T } from './lib.mjs';

const OUT = path.join(ROOT, 'docs', 'qa-screenshots');
fs.mkdirSync(OUT, { recursive: true });
const T0 = T(2026, 10, 23, 10, 0, 0);
const FOCUS = 25 * 60000;
const BLOCK_STORAGE = `Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new DOMException('insecure', 'SecurityError'); } });`;
const browser = await pw.chromium.launch();

async function shot(name, { viewport, mobile, init = [], prepare }) {
  const context = await browser.newContext({ viewport, isMobile: !!mobile, hasTouch: !!mobile, deviceScaleFactor: 2, locale: 'zh-CN' });
  for (const s of init) await context.addInitScript(s);
  await context.addInitScript(PROBE);
  await context.clock.install({ time: T0 });
  const page = await context.newPage();
  await page.goto(APP, { waitUntil: 'load' });
  await page.clock.pauseAt(T0 + 1000);
  await prepare(page);
  await page.mouse.move(2, 2);
  await new Promise((r) => setTimeout(r, 300));
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file });
  const title = await page.evaluate(() => document.title);
  await context.close();
  return { name, file, title, w: viewport.width, h: viewport.height };
}

const seed = async (page, raw) => { await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, raw]); await page.reload({ waitUntil: 'load' }); };
const items = [];
items.push(['桌面 · 专注进行中', await shot('desktop-focus-running', { viewport: { width: 1440, height: 900 }, prepare: async (p) => {
  await seed(p, record({ date: '2026-10-23', count: 3 })); await p.click('[data-ui=primary]'); await p.clock.runFor(6 * 60000 + 18000); } })]);
items.push(['桌面 · 专注到点，等你点一下', await shot('desktop-focus-ended', { viewport: { width: 1440, height: 900 }, prepare: async (p) => {
  await seed(p, record({ date: '2026-10-23', count: 3 })); await p.click('[data-ui=primary]'); await p.clock.runFor(FOCUS + 300); } })]);
items.push(['手机竖屏 · 专注进行中', await shot('phone-focus-running', { viewport: { width: 390, height: 844 }, mobile: true, prepare: async (p) => {
  await seed(p, record({ date: '2026-10-23', count: 3 })); await p.click('[data-ui=primary]'); await p.clock.runFor(6 * 60000 + 18000); } })]);
items.push(['手机竖屏 · 已暂停，浏览器不让保存', await shot('phone-paused-storage-off', { viewport: { width: 390, height: 844 }, mobile: true, init: [BLOCK_STORAGE], prepare: async (p) => {
  await p.click('[data-ui=primary]'); await p.clock.runFor(FOCUS - 754000); await p.click('[data-ui=primary]'); } })]);

const card = ([label, it]) => {
  const b64 = fs.readFileSync(it.file).toString('base64');
  const width = it.w > 600 ? 640 : 230;
  return `<figure style="margin:0;width:${width}px"><div class="tab"><span class="dot"></span>${it.title}</div>
    <img src="data:image/png;base64,${b64}" style="width:${width}px;display:block;border:1px solid #DDD8CF;border-top:0">
    <figcaption>${label}</figcaption></figure>`;
};
const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;padding:32px;background:#EDEAE4;font-family:-apple-system,'PingFang SC',sans-serif">
<style>.tab{background:#fff;border:1px solid #DDD8CF;border-radius:8px 8px 0 0;padding:6px 12px;font-size:13px;color:#22201C;display:flex;align-items:center;gap:8px}
.dot{width:10px;height:10px;border-radius:50%;background:#A3412D}figcaption{font-size:14px;color:#5F5A52;margin-top:8px;text-align:center}</style>
<div style="display:flex;gap:28px;align-items:flex-start">
  <div style="display:flex;flex-direction:column;gap:24px">${card(items[0])}${card(items[1])}</div>
  ${card(items[2])}${card(items[3])}
</div>
<p style="font-size:13px;color:#5F5A52;margin:20px 0 0">真实页面截图；状态由真实点击和快进时钟造出，卡头是那一刻浏览器标签页的真实标题（forge-qa 验收，2026-10-23）</p></body>`;
const page = await browser.newPage({ viewport: { width: 1250, height: 900 }, deviceScaleFactor: 2 });
await page.setContent(html);
const box = await page.evaluate(() => ({ w: document.body.scrollWidth, h: document.body.scrollHeight }));
await page.setViewportSize({ width: box.w, height: box.h });
await page.screenshot({ path: path.join(OUT, 'overview.png') });
await browser.close();
console.log(JSON.stringify(items.map(([l, it]) => ({ label: l, file: path.relative(ROOT, it.file), title: it.title })), null, 1));
