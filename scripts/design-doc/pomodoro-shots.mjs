// 番茄钟需求设计文档的页面图：截真实页面（index.html），标签页标题条沿用设计骨架的示意。
// 运行：NODE_PATH="$(npm root -g)" node scripts/design-doc/pomodoro-shots.mjs
// 页面用 file:// 打开，不需要任何服务；纯静态页面没有接口可写，guardWrites 仍放在第一行。
// 状态由真实操作造出：点按钮 + Playwright 时钟快进；「今天已完成 3 个」用本机记录预置，「不能保存」让 localStorage 访问即抛错。
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { guardWrites, annotate, rect, shotTo } from './annotate.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const OUT = join(ROOT, 'docs/assets/visuals/pomodoro/overview')
const APP = pathToFileURL(join(ROOT, 'index.html')).href
const LAB = pathToFileURL(join(ROOT, 'docs/assets/visuals/pomodoro/2026-10-23-skeleton-v1.0.html')).href
const KEY = 'pomodoro.v1'
const START = new Date(2026, 9, 23, 9, 0, 0).getTime()
const MIN = 60000
const shot = shotTo(OUT)
const browser = await chromium.launch()

/** 打开真实页面：时钟停在 START，可预置今天的完成数、可禁用存储。 */
async function openApp (w, h, dsf, { count = 0, noStorage = false } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: dsf })
  const page = await context.newPage()
  await guardWrites(page)
  if (noStorage) {
    await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get () { throw new DOMException('denied', 'SecurityError') } }))
  } else {
    await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(k, v) } },
      [KEY, JSON.stringify({ v: 1, date: '2026-10-23', count, countedEndAt: null, phase: 'focus', status: 'idle', endAt: null, remainingMs: null })])
  }
  await page.clock.install({ time: START })
  await page.goto(APP)
  await page.clock.pauseAt(START + 1000)
  return { page, context }
}
const click = (page, ui) => page.click(`[data-ui=${ui}]`)
/** 截图前把鼠标移开、等按钮的悬停过渡走完（过渡按真实时间走，不受假时钟影响）。 */
async function settle (page) { await page.mouse.move(2, 2); await page.waitForTimeout(400) }
const title = page => page.evaluate(() => document.title)

// ---------- 4 页面布局：专注进行中 + 浏览器不能保存（让存储提示区有字），四处标注 ----------
{
  const { page, context } = await openApp(1440, 900, 1.5, { noStorage: true })
  await click(page, 'primary'); await page.clock.runFor(1000); await settle(page)
  const tm = await rect(page, '.timer'), ctl = await rect(page, '.controls'), rec = await rect(page, '.count'), ft = await rect(page, '.footer')
  const b1 = await rect(page, '[data-ui=primary]'), b2 = await rect(page, '[data-ui=skip]')
  const size = await page.evaluate(() => Math.round(parseFloat(getComputedStyle(document.querySelector('[data-ui=time]')).fontSize)))
  await annotate(page, [
    { box: 1, rect: tm, pad: 8, label: `② 阶段 + 剩余时间（${size}，全页唯一大字）+ ③ 状态说明（始终占一行）`, labelRight: false },
    { box: 1, rect: { x: b1.x, y: b1.y, w: b2.right - b1.x, h: b1.h }, pad: 6, label: '④ 主按钮（阶段色实心）+ 跳过（只有文字）', below: true },
    { box: 1, rect: rec, pad: 6, label: '⑤ 今日完成数（0 个也显示）', below: true },
    { box: 1, rect: { x: ft.x + 24, y: ft.y + 8, w: ft.w - 48, h: ft.h - 16 }, label: '⑥ 存储提示区：贴底，只在浏览器不能保存时有字' },
  ])
  void ctl
  await shot(page, 'layout.png')
  await context.close()
}

// ---------- 5 状态一览：六种情况的真实页面缩略图，卡头写情况和当时的标签页标题 ----------
{
  const cases = [
    ['第一次打开（记录读不出来时也这样）', {}, async () => {}],
    ['专注进行中', {}, async p => { await click(p, 'primary'); await p.clock.runFor(1000) }],
    ['已暂停', {}, async p => { await click(p, 'primary'); await p.clock.runFor((12 * 60 + 26) * 1000); await click(p, 'primary') }],
    ['专注到点，等你点开始', { count: 3 }, async p => { await click(p, 'primary'); await p.clock.runFor(25 * MIN) }],
    ['休息进行中', { count: 4 }, async p => { await click(p, 'skip'); await click(p, 'primary'); await p.clock.runFor(1000) }],
    ['浏览器不能保存记录', { noStorage: true }, async p => { await click(p, 'primary'); await p.clock.runFor(1000) }],
  ]
  const imgs = []
  for (const [label, opts, act] of cases) {
    const { page, context } = await openApp(1440, 900, 1, opts)
    await act(page); await settle(page)
    let t = await title(page)
    const alt = await page.evaluate(() => document.querySelector('[data-ui=status]').textContent.endsWith('结束'))
    if (alt) { await page.clock.runFor(1000); t = `${t} ⇄ ${await title(page)}` }
    // 只截中间一列（左右空白裁掉，顶部留一点），底部保留，存储提示贴底的位置才看得出来
    const buf = await page.screenshot({ clip: { x: 360, y: 150, width: 720, height: 750 } })
    imgs.push({ src: 'data:image/png;base64,' + buf.toString('base64'), label, title: t })
    await context.close()
  }
  const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 })
  await guardWrites(page)
  const css = readFileSync(join(OUT, 'src/diagram.css'), 'utf8')
  await page.setContent(`<html><head><style>${css}
    body{margin:0;padding:24px;background:#fff;font-family:"PingFang SC","Noto Sans SC",sans-serif}
    .g{display:grid;grid-template-columns:1fr 1fr;gap:20px;width:1152px}
    .c{border:1px solid #DDD8CF;border-radius:8px;overflow:hidden}
    .h{display:flex;justify-content:space-between;gap:12px;padding:10px 14px;background:#F2EFE9;font-size:15px}
    .h b{font-weight:600}.h code{font:13px ui-monospace,Menlo,monospace;color:#5F5A52}
    .c img{display:block;width:100%}
    .t{font-size:13px;color:#5F5A52;margin:0 0 12px}</style></head><body>
    <p class="t">真实页面截图（1440×900 窗口的中间一列），状态由点按钮和快进时钟造出。每张右上角是这时浏览器标签页实际显示的标题。</p>
    <div class="g">${imgs.map(i => `<div class="c"><div class="h"><b>${i.label}</b><code>${i.title}</code></div><img src="${i.src}"></div>`).join('')}</div></body></html>`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(OUT, 'states.png'), fullPage: true })
  await page.close()
}

// ---------- 6 交互与细节：按钮状态（真实页面，倍率 2） ----------
{
  const variants = [
    ['专注 · 默认', async () => {}],
    ['主按钮 · 悬停', async p => { await p.hover('[data-ui=primary]'); await p.waitForTimeout(400) }],
    ['键盘焦点（Tab）', async p => { await p.keyboard.press('Tab'); await p.waitForTimeout(400) }],
    ['跳过 · 悬停', async p => { await p.hover('[data-ui=skip]'); await p.waitForTimeout(400) }],
    ['休息 · 默认', async p => { await click(p, 'skip'); await settle(p) }],
  ]
  const imgs = []
  for (const [label, act] of variants) {
    const { page, context } = await openApp(1440, 900, 2)
    await settle(page); await act(page)
    const row = await rect(page, '.controls')
    const b1 = await rect(page, '[data-ui=primary]'), b2 = await rect(page, '[data-ui=skip]')
    const buf = await page.screenshot({ clip: { x: b1.x - 16, y: row.y - 12, width: b2.right - b1.x + 32, height: row.h + 24 } })
    imgs.push({ src: 'data:image/png;base64,' + buf.toString('base64'), label })
    await context.close()
  }
  const page = await browser.newPage({ viewport: { width: 900, height: 400 }, deviceScaleFactor: 2 })
  await guardWrites(page)
  await page.setContent(`<html><body style="margin:0;padding:16px;background:#FAF8F4;font:13px 'PingFang SC','Noto Sans SC',sans-serif;color:#5F5A52">
    <div style="display:flex;flex-wrap:wrap;gap:16px">${imgs.map(i => `<figure style="margin:0;text-align:center"><img src="${i.src}" style="width:${'auto'};height:80px;display:block;border:1px solid #DDD8CF;border-radius:6px"><figcaption style="margin-top:6px">${i.label}</figcaption></figure>`).join('')}</div></body></html>`)
  await page.waitForTimeout(300)
  const box = await page.evaluate(() => { const r = document.body.firstElementChild.getBoundingClientRect(); return { x: 0, y: 0, width: Math.ceil(r.right + 16), height: Math.ceil(r.bottom + 16) } })
  await page.screenshot({ path: join(OUT, 'detail-buttons.png'), clip: box })
  await page.close()
}

// ---------- 6 交互与细节：标签页标题条（浏览器外框截不到，沿用设计骨架「模块放大」层的示意，倍率 2） ----------
{
  const page = await browser.newPage({ viewport: { width: 1180, height: 760 }, deviceScaleFactor: 2 })
  await guardWrites(page)
  await page.goto(LAB)
  await page.waitForFunction(() => window.WB && window.WB.spec)
  await page.addStyleTag({ content: '#wb-panel-tab{display:none!important}#frame{box-shadow:none!important}' })
  await page.evaluate(() => WB.set({ panel: false, vp: 'follow', ids: false, dims: false, inspect: false, level: 'module', state: 'running' }))
  await page.waitForTimeout(300)
  const tabs = await rect(page, '.mtabs'), titles = await rect(page, '.mtitles')
  await annotate(page, [{ box: 1, rect: { x: tabs.x + 2 * 106 + 8, y: tabs.y + 8, w: 104, h: 32 }, label: '被挤窄也先露出剩余时间', below: true }])
  await shot(page, 'detail-title.png', { x: tabs.x - 16, y: tabs.y - 16, width: tabs.w + 32, height: titles.bottom - tabs.y + 32 })
  await page.close()
}

await browser.close()
console.log('已写 layout.png、states.png、detail-buttons.png、detail-title.png →', OUT)
