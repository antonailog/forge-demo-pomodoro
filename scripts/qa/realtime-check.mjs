// forge-qa · 真实时间验收（不快进时钟），对应 ENGINEERING §七 M1 / M2 与 Feature Spec「R3 后台到点会响一声，记录晚了多久」。
// 用法：node scripts/qa/realtime-check.mjs <focus|sleep|throttle>
//   focus    点「开始」后真实等满 25 分钟专注 + 5 分钟休息，量提示音和到点处理比结束时刻晚多少（约 32 分钟）
//   sleep    近似电脑睡眠：进行中把页面的渲染进程挂起（SIGSTOP，定时器全停、真实时钟照走）跨过结束时刻，再恢复（约 3 分钟）
//   throttle 模拟 Chrome 后台长时间隐藏后「定时器约每分钟唤醒一次」：渲染进程只在每个整分钟恢复 1 秒（约 5 分钟）
// 限制：无头浏览器里标签页始终是「可见」状态（已实测最小化窗口、同窗口开新标签并激活都无效；
// CDP 的 Page.setWebLifecycleState frozen 返回成功但定时器照跑，不可用），
// 所以 sleep / throttle 是按机制做的近似，不是浏览器真实的后台限速；脚本自带工具自检：挂起期间页面定时器必须一次都没跑。
import fs from 'node:fs';
import path from 'node:path';
import { QA, pw, APP, KEY, OUT, PROBE, state, rec, record, dk } from './lib.mjs';

const MODE = process.argv[2] || 'focus';
const dir = path.join(OUT, 'realtime');
fs.mkdirSync(dir, { recursive: true });
process.env.QA_SCREENSHOT_DIR = dir;
const c = new QA.TestCollector();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { mode: MODE, startedAt: new Date().toISOString(), browser: null, notes: [] };
const say = (m) => console.log(`[${new Date().toLocaleTimeString('zh-CN', { hour12: false })}] ${m}`);

const browser = await pw.chromium.launch();
out.browser = `chromium ${browser.version()}（Playwright 默认无头）`;
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'zh-CN' });
  await context.addInitScript(PROBE);
  await context.addInitScript(() => { window.__ticks = []; setInterval(() => { window.__ticks.push(Date.now()); if (window.__ticks.length > 4000) window.__ticks.splice(0, 2000); }, 250); });
  const page = await context.newPage();
  QA.attachMonitors(page, c);
  await page.goto(APP, { waitUntil: 'load' });
  const bc = await browser.newBrowserCDPSession();
  const renderers = async () => (await bc.send('SystemInfo.getProcessInfo')).processInfo.filter((x) => x.type === 'renderer').map((x) => x.id);
  const suspend = async (on) => { for (const pid of await renderers()) process.kill(pid, on ? 'SIGSTOP' : 'SIGCONT'); };
  const stops = [];
  const toolCheck = async () => {
    const ticks = await page.evaluate(() => window.__ticks);
    const leaked = stops.map(([a, b]) => ticks.filter((t) => t > a + 300 && t < b - 50).length);
    out.toolCheck = { windows: stops.length, ticksDuringSuspend: leaked };
    return leaked.every((n) => n === 0);
  };
  const logOf = () => page.evaluate(() => window.__log);

  async function waitUntil(t, label) {
    let last = 0;
    while (Date.now() < t) {
      await sleep(Math.min(5000, Math.max(50, t - Date.now())));
      if (Date.now() - last > 60000) { last = Date.now(); say(`${label}：还剩 ${Math.round((t - Date.now()) / 1000)} 秒`); }
    }
  }

  // 返回结束时刻之后第一次提示音、第一次切阶段的真实时刻
  async function measure(endAt, phaseTo) {
    const log = await logOf();
    const osc = log.filter((e) => e.ev === 'osc' && e.t >= endAt - 1000);
    const sw = log.find((e) => e.ev === 'phase' && e.v === phaseTo && e.t >= endAt - 1000);
    const titles = log.filter((e) => e.ev === 'title' && e.t >= endAt - 1000).map((e) => e.v);
    return { oscCount: osc.length, oscLateMs: osc.length ? osc[0].t - endAt : null, oscState: osc.length ? osc[0].v : null,
      switchLateMs: sw ? sw.t - endAt : null, switchAt: sw ? sw.t : null, titles: [...new Set(titles)] };
  }

  if (MODE === 'focus') {
    await page.click('[data-ui=primary]');
    const s0 = await state(page);
    const endAt = rec(s0).endAt;
    out.focusEndAt = endAt;
    say(`专注开始，结束时刻 ${new Date(endAt).toLocaleTimeString('zh-CN', { hour12: false })}；不快进，真实等待`);
    await waitUntil(endAt - 12.5 * 60000, '专注进行中');
    await page.mouse.move(5, 5);
    await QA.snap(page, c, 'rt-focus-running-mid');
    await waitUntil(endAt + 8000, '专注进行中');
    const m = await measure(endAt, 'break');
    const s1 = await state(page);
    out.focus = { ...m, after: s1 };
    await QA.snap(page, c, 'rt-focus-ended-alert');
    say(`专注到点：提示音 ${m.oscCount} 次，比结束时刻晚 ${m.oscLateMs} 毫秒；切阶段晚 ${m.switchLateMs} 毫秒`);
    (m.oscCount === 1 && s1.count === '1' && s1.phase === '休息' && s1.time === '05:00' && s1.status === '专注结束'
      && m.titles.includes('专注结束！') && m.titles.includes('番茄钟 · 今天 1 个'))
      ? c.pass('F11-realtime-focus', `真实 25 分钟专注到点：响一声、今天 1 个、休息 05:00、标题交替；提示音晚 ${m.oscLateMs}ms`)
      : c.fail('F11-realtime-focus', '真实 25 分钟专注到点', JSON.stringify({ m, s1 }));
    c.checkConsoleErrors('F11-realtime-focus', '真实专注到点');
    // 点击页面确认提醒，然后真实跑一段休息
    await page.mouse.click(20, 20);
    await sleep(2500);
    const s2 = await state(page);
    s2.title === '番茄钟 · 今天 1 个' && s2.status === ''
      ? c.pass('F12-realtime-ack', '真实环境点击页面后标题停止交替、状态说明消失')
      : c.fail('F12-realtime-ack', '真实环境点击确认', JSON.stringify(s2));
    await page.click('[data-ui=primary]');
    const endAt2 = rec(await state(page)).endAt;
    out.breakEndAt = endAt2;
    await waitUntil(endAt2 + 8000, '休息进行中');
    const m2 = await measure(endAt2, 'focus');
    const s3 = await state(page);
    out.break = { ...m2, after: s3 };
    say(`休息到点：提示音 ${m2.oscCount} 次，晚 ${m2.oscLateMs} 毫秒`);
    (m2.oscCount === 1 && s3.count === '1' && s3.phase === '专注' && s3.time === '25:00' && s3.status === '休息结束')
      ? c.pass('F11-realtime-break', `真实 5 分钟休息到点：响一声、完成数仍 1、回到专注 25:00；提示音晚 ${m2.oscLateMs}ms`)
      : c.fail('F11-realtime-break', '真实 5 分钟休息到点', JSON.stringify({ m2, s3 }));
  } else {
    // 先放一段「已暂停、还剩 N 秒」的记录，再点「继续」——既解锁提示音（真实点击），又不用等 25 分钟。
    const leftMs = MODE === 'sleep' ? 60000 : 150000;
    await page.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, record({ date: dk(Date.now()), count: 2, status: 'paused', remainingMs: leftMs })]);
    await page.reload({ waitUntil: 'load' });
    await page.click('[data-ui=primary]');
    const endAt = rec(await state(page)).endAt;
    out.endAt = endAt;
    say(`继续计时，还剩 ${leftMs / 1000} 秒，结束时刻 ${new Date(endAt).toLocaleTimeString('zh-CN', { hour12: false })}`);
    if (MODE === 'sleep') {
      await sleep(15000);
      await suspend(true);
      const frozenAt = Date.now();
      say('渲染进程已挂起（近似合盖睡眠）');
      await waitUntil(endAt + 60000, '挂起中');
      const tWake = Date.now();
      await suspend(false);
      stops.push([frozenAt, tWake]);
      say('渲染进程已恢复（近似唤醒）');
      await sleep(3000);
      const m = await measure(endAt, 'break');
      const s1 = await state(page);
      out.sleep = { frozenAt, wakeAt: tWake, ...m, settleAfterWakeMs: m.switchAt ? m.switchAt - tWake : null, oscAfterWakeMs: m.oscLateMs !== null ? endAt + m.oscLateMs - tWake : null, after: s1 };
      await QA.snap(page, c, 'rt-sleep-after-wake');
      if (!(await toolCheck())) { c.skip('M2-sleep-approx', '挂起近似睡眠', `工具自检失败：挂起期间页面定时器仍在跑 ${JSON.stringify(out.toolCheck)}`); }
      else {
        say(`恢复后 ${out.sleep.settleAfterWakeMs} 毫秒完成到点处理；提示音 ${m.oscCount} 次（恢复后 ${out.sleep.oscAfterWakeMs} 毫秒）`);
        (m.switchAt !== null && out.sleep.settleAfterWakeMs >= 0 && out.sleep.settleAfterWakeMs <= 1000 && s1.count === '3' && s1.phase === '休息' && m.oscCount === 1)
          ? c.pass('M2-sleep-approx', `挂起跨过到点、恢复后 ${out.sleep.settleAfterWakeMs}ms 内完成到点处理：今天 3 个、休息 05:00、响一声（比结束时刻晚约 ${Math.round(m.oscLateMs / 1000)} 秒，等于「睡着」的时长）`)
          : c.fail('M2-sleep-approx', '挂起跨过到点后恢复', JSON.stringify(out.sleep));
      }
    } else {
      // 每个整分钟边界恢复 1 秒，其余时间挂起：近似「隐藏超过 5 分钟后定时器按整分钟对齐唤醒」。
      const cycles = [];
      const stopAt = endAt + 75000;
      while (Date.now() < stopAt) {
        await suspend(true);
        const a = Date.now();
        const nextMinute = Math.ceil((Date.now() + 1) / 60000) * 60000;
        await waitUntil(Math.min(nextMinute, stopAt), '每分钟唤醒一次');
        await suspend(false);
        stops.push([a, Date.now()]);
        cycles.push(Date.now());
        await sleep(1000);
      }
      const m = await measure(endAt, 'break');
      const s1 = await state(page);
      out.throttle = { wakeups: cycles.map((t) => new Date(t).toISOString()), ...m, after: s1 };
      await QA.snap(page, c, 'rt-throttle-after');
      if (!(await toolCheck())) { c.skip('M1-throttle-model', '每分钟唤醒模型', `工具自检失败 ${JSON.stringify(out.toolCheck)}`); }
      else {
        say(`每分钟唤醒一次：提示音 ${m.oscCount} 次，比结束时刻晚 ${m.oscLateMs} 毫秒`);
        (m.oscCount === 1 && m.oscLateMs !== null && m.oscLateMs > 0 && m.oscLateMs <= 61000 && s1.count === '3')
          ? c.pass('M1-throttle-model', `按整分钟唤醒时，提示音在结束后的第一次唤醒响起（晚 ${Math.round(m.oscLateMs / 1000)} 秒），只响一次、只计一次`)
          : c.fail('M1-throttle-model', '按整分钟唤醒的模型', JSON.stringify(out.throttle));
      }
    }
    c.checkConsoleErrors(MODE, MODE);
  }
} catch (e) {
  c.fail(`${MODE}-crash`, '真实时间脚本异常', e.stack || String(e));
} finally {
  try { const bc2 = await browser.newBrowserCDPSession(); for (const x of (await bc2.send('SystemInfo.getProcessInfo')).processInfo) if (x.type === 'renderer') process.kill(x.id, 'SIGCONT'); } catch {}
  out.finishedAt = new Date().toISOString();
  out.summary = c.summary();
  fs.writeFileSync(path.join(dir, `${MODE}.json`), JSON.stringify(out, null, 2));
  c.printSummary();
  await browser.close();
}
process.exit(c.summary().failed > 0 ? 1 : 0);
