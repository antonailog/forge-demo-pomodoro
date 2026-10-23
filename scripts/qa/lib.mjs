// forge-qa 运行时引导：让本项目的 QA 脚本用上 forge-qa 的 qa-runner.mjs 和本机全局 Playwright，
// 不往项目里装任何依赖。运行时目录 .gstack/qa-runtime/ 已被 .gitignore 忽略。
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const RT = path.join(ROOT, '.gstack', 'qa-runtime');
const GLOBAL = execSync('npm root -g', { encoding: 'utf8' }).trim();

fs.mkdirSync(RT, { recursive: true });
const link = path.join(RT, 'node_modules');
if (!fs.existsSync(link)) fs.symlinkSync(GLOBAL, link);
// qa-runner.mjs 用 ESM 静态 import 'playwright'，ESM 不认 NODE_PATH：复制一份到能解析到全局包的目录再加载。
fs.copyFileSync(path.join(os.homedir(), '.claude/skills/forge-qa/scripts/qa-runner.mjs'), path.join(RT, 'qa-runner.mjs'));

export const QA = await import(path.join(RT, 'qa-runner.mjs'));
export const pw = createRequire(path.join(GLOBAL, 'x.js'))('playwright');

export const APP = process.env.APP_URL || 'http://127.0.0.1:4577/index.html';
export const KEY = 'pomodoro.v1';
export const OUT = process.env.QA_OUT || path.join(ROOT, '.gstack', 'qa-reports');

// 页面内探针：数提示音（AudioContext 构造与 createOscillator）、拦截通知权限请求、
// 记录标题与阶段属性的每次变化（带真实时刻）、把未处理的 Promise 拒绝转成 console.error。
export const PROBE = `
(() => {
  window.__osc = 0; window.__acNew = 0; window.__notif = 0; window.__log = [];
  const log = (ev, v) => window.__log.push({ t: Date.now(), ev, v });
  window.addEventListener('unhandledrejection', (e) => console.error('unhandledrejection: ' + (e.reason && e.reason.message || e.reason)));
  const AC = window.AudioContext;
  if (window.__blockAudio) {
    window.AudioContext = function () { throw new DOMException('blocked', 'NotAllowedError'); };
    window.webkitAudioContext = window.AudioContext;
  } else if (AC) {
    const orig = AC.prototype.createOscillator;
    AC.prototype.createOscillator = function () { window.__osc++; log('osc', this.state); return orig.apply(this, arguments); };
    window.AudioContext = class extends AC { constructor(...a) { super(...a); window.__acNew++; log('ac-new'); } };
  }
  if (window.Notification && window.Notification.requestPermission) {
    const rp = window.Notification.requestPermission;
    window.Notification.requestPermission = function () { window.__notif++; return rp.apply(this, arguments); };
  }
  document.addEventListener('DOMContentLoaded', () => {
    const t = document.querySelector('title');
    new MutationObserver(() => log('title', document.title)).observe(t, { childList: true, characterData: true, subtree: true });
    new MutationObserver(() => log('phase', document.body.getAttribute('data-phase'))).observe(document.body, { attributes: true, attributeFilter: ['data-phase'] });
  });
})();`;

export async function state(page) {
  return page.evaluate((KEY) => {
    const q = (k) => document.querySelector(`[data-ui="${k}"]`);
    let stored;
    try { stored = localStorage.getItem(KEY); } catch (e) { stored = 'THROWS'; }
    return {
      phase: q('phase').textContent, time: q('time').textContent, status: q('status').textContent,
      primary: q('primary').textContent, count: q('count-num').textContent, countLine: q('count').textContent.replace(/\s+/g, ' ').trim(),
      title: document.title, dataPhase: document.body.getAttribute('data-phase'), dataStorage: document.body.getAttribute('data-storage'),
      noticeVisible: getComputedStyle(q('notice')).display !== 'none',
      osc: window.__osc, acNew: window.__acNew, notif: window.__notif, stored,
    };
  }, KEY);
}

export function rec(s) { try { return JSON.parse(s.stored); } catch { return null; } }

export const T = (y, mo, d, h = 0, mi = 0, s = 0) => new Date(y, mo - 1, d, h, mi, s).getTime();
export const dk = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
export const record = (o) => JSON.stringify(Object.assign({ v: 1, date: null, count: 0, countedEndAt: null, phase: 'focus', status: 'idle', endAt: null, remainingMs: null }, o));
