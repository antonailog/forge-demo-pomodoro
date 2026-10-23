// 番茄钟需求设计文档的页面图：截 forge-design-lab 设计骨架（设计阶段），实现后换成真实页面。
// 运行：NODE_PATH="$(npm root -g)" node scripts/design-doc/pomodoro-shots.mjs
// 骨架用 file:// 打开，不需要任何服务；页面是纯静态的，没有接口可写，guardWrites 仍放在第一行。
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { guardWrites, annotate, rect, shotTo } from './annotate.mjs'

const require = createRequire(import.meta.url)
const { chromium } = require('playwright')
const ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)))
const OUT = join(ROOT, 'docs/assets/visuals/pomodoro/overview')
const LAB = pathToFileURL(join(ROOT, 'docs/assets/visuals/pomodoro/2026-10-23-skeleton-v1.0.html')).href
const shot = shotTo(OUT)
const browser = await chromium.launch()

/** 打开骨架：关掉审查面板、1:1 跟随窗口，只留页面本身 */
async function open (w, h, dsf, set) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: dsf })
  await guardWrites(page)
  await page.goto(LAB)
  await page.waitForFunction(() => window.WB && window.WB.spec)
  await page.addStyleTag({ content: '#wb-panel-tab{display:none!important}#frame{box-shadow:none!important}' })
  await page.evaluate(s => WB.set({ panel: false, vp: 'follow', ids: false, dims: false, inspect: false, ...s }), set)
  await page.waitForTimeout(300)
  return page
}
const frameRect = page => rect(page, '#frame')

// ---------- 4 页面布局：专注进行中 + 浏览器不能保存（让存储提示区有字），四处标注 ----------
{
  const page = await open(1440, 900, 1.5, { level: 'page', state: 'running', toggles: { nosave: true } })
  const f = await frameRect(page)
  const tm = await rect(page, '.ptimer'), ctl = await rect(page, '.pctl'), rec = await rect(page, '.prec'), ft = await rect(page, '.pfoot')
  const b1 = await rect(page, '.lvl.page .pbtn'), b2 = await rect(page, '.lvl.page .pskip')
  const btns = { x: b1.x, y: b1.y, w: b2.right - b1.x, h: b1.h }
  await annotate(page, [
    { box: 1, rect: tm, pad: 8, label: '② 阶段 + 剩余时间（128，全页唯一大字）+ ③ 状态说明（始终占一行）', labelRight: false },
    { box: 1, rect: btns, pad: 6, label: '④ 主按钮（阶段色实心）+ 跳过（只有文字）', below: true },
    { box: 1, rect: { x: rec.x, y: rec.y, w: rec.w, h: rec.h }, pad: 6, label: '⑤ 今日完成数（0 个也显示）', below: true },
    { box: 1, rect: { x: ft.x + 24, y: ft.y + 8, w: ft.w - 48, h: ft.h - 16 }, label: '⑥ 存储提示区：贴底，只在浏览器不能保存时有字' },
  ])
  await shot(page, 'layout.png', { x: f.x, y: f.y, width: f.w, height: f.h })
  await page.close()
}

// ---------- 5 状态一览：六种情况的骨架缩略图，卡头写情况和标签页标题 ----------
{
  const cases = [
    ['idle', {}, '第一次打开（记录读不出来时也这样）', '番茄钟 · 今天 0 个'],
    ['running', {}, '专注进行中', '24:59 · 专注'],
    ['paused', {}, '已暂停', '12:34 · 已暂停'],
    ['ended', {}, '专注到点，等你点开始', '专注结束！ ⇄ 番茄钟 · 今天 4 个'],
    ['break', {}, '休息进行中', '04:59 · 休息'],
    ['running', { nosave: true }, '浏览器不能保存记录', '24:59 · 专注'],
  ]
  const imgs = []
  for (const [state, toggles, label, title] of cases) {
    const page = await open(1440, 900, 1, { level: 'page', state, toggles })
    const f = await frameRect(page)
    // 只截中间一列（左右空白裁掉，顶部留一点），底部保留，存储提示贴底的位置才看得出来
    const buf = await page.screenshot({ clip: { x: f.x + 360, y: f.y + 150, width: 720, height: f.h - 150 } })
    imgs.push({ src: 'data:image/png;base64,' + buf.toString('base64'), label, title })
    await page.close()
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
    <p class="t">设计骨架截图（真实 token、真实尺寸，1440×900 窗口的中间一列），不是上线后的页面。每张右上角是这时浏览器标签页显示的标题。</p>
    <div class="g">${imgs.map(i => `<div class="c"><div class="h"><b>${i.label}</b><code>${i.title}</code></div><img src="${i.src}"></div>`).join('')}</div></body></html>`)
  await page.waitForTimeout(300)
  await page.screenshot({ path: join(OUT, 'states.png'), fullPage: true })
  await page.close()
}

// ---------- 6 交互与细节：标签页标题条、按钮状态（模块放大层，倍率 2） ----------
{
  const page = await open(1180, 760, 2, { level: 'module', state: 'running' })
  const tabs = await rect(page, '.mtabs'), titles = await rect(page, '.mtitles')
  await annotate(page, [{ box: 1, rect: { x: tabs.x + 2 * 106 + 8, y: tabs.y + 8, w: 104, h: 32 }, label: '被挤窄也先露出剩余时间', below: true }])
  await shot(page, 'detail-title.png', { x: tabs.x - 16, y: tabs.y - 16, width: tabs.w + 32, height: titles.bottom - tabs.y + 32 })
  const row = await rect(page, '.mrow')
  await shot(page, 'detail-buttons.png', { x: row.x - 16, y: row.y - 16, width: row.w + 32, height: row.h + 32 })
  await page.close()
}

await browser.close()
console.log('已写 layout.png、states.png、detail-title.png、detail-buttons.png →', OUT)
