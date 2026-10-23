---
status: live
type: design
module: global
last_updated: 2026-10-23
---

# 番茄钟网页 — 设计文档 (DESIGN.md)

**版本:** v1.0
**日期:** 2026-10-23
**状态:** 已确认（待实现）

> 写给实现看的设计约束。人看的版本是 [需求设计文档](modules/番茄钟.md)。页面级与组件级的数值以设计工作台导出的 `pomodoro.tokens.css` 为准，本文 §3.1 的 token 表由它生成，不手改。

---

## 迭代历史摘要

### v1.0 — 2026-10-23

- 建立设计体系：「纸面安静」方向、三层 token（原始值 → 语义 → 组件）、系统字体 — 详见 §一、§二、DESIGN-CHANGELOG v1.0
- 唯一页面的布局、比例、密度在设计工作台上定稿（两轮审查）— 详见 §三
- 组件状态、交互、异常态规范 — 详见 §四 ~ §六
- **变更影响**：全新页面（计时区、控制区、记录区、存储提示、标签页标题）

---

## 一、产品美学定位

### 1.1 设计风格

- 风格关键词：纸面、安静、克制、等宽数字
- 参考产品：Pomofocus（大号倒计时 + 少量按钮的共性结构）；不学它按阶段整页换背景色的做法
- 气质描述：像一张放在桌角的便签纸，上面只写着还剩几分钟——看一眼就知道，不看也不打扰。

### 1.2 设计原则

1. **剩余时间是唯一的主角** — 全页只有它是大字；其余文字都是正文字号或更小。
2. **颜色只用来分阶段** — 只有两个阶段色（专注砖红、休息灰青），只出现在阶段标签和主按钮上；不换整页背景、不用进度环。
3. **不动就是安静** — 全页唯一的过渡是按钮悬停变色；没有循环动画、没有闪烁、没有弹窗。
4. **不只靠颜色** — 阶段同时写着「专注 / 休息」；提醒类信息都有文字。

### 1.3 视觉决策记录

| 图 | 类型 | 决策用途 | 状态 |
|---|---|---|---|
| [桌面气质稿](assets/visuals/pomodoro/mood/2026-10-23-design-desktop-mood.png) | Image 2 气质稿 | 「纸面安静」在桌面浏览器里够不够安静 | confirmed（只判气质，不判比例） |
| [手机气质稿](assets/visuals/pomodoro/mood/2026-10-23-design-mobile-mood.png) | Image 2 气质稿 | 手机竖屏、暂停态、存储提示出现时是否仍安静 | confirmed（手机上下叠按钮的画法未采用，见 §三 J3） |
| [设计工作台骨架](assets/visuals/pomodoro/2026-10-23-skeleton-v1.0.html) | forge-design-lab 骨架 | 布局、比例、密度、状态（真 token、真像素） | confirmed，实现后用真实截图对比 |

---

## 二、设计体系 (Design Tokens)

三层：**原始值**（只有色值，不带用途）→ **语义**（站点级，表达用途，写在站点全局样式 `:root`）→ **组件**（页面级 `--pomo-*`，由工作台导出到 `pomodoro.tokens.css`，见 §3.1）。组件 CSS 只写 `var()`。

### 2.1 颜色

**原始值**

| Token | 值 |
|---|---|
| `--paper-50` | #FAF8F4 |
| `--paper-100` | #F2EFE9 |
| `--paper-200` | #DDD8CF |
| `--ink-900` | #22201C |
| `--ink-600` | #5F5A52 |
| `--brick-600` | #A3412D |
| `--brick-700` | #8A3524 |
| `--slate-600` | #3B6870 |
| `--slate-700` | #30575E |
| `--amber-700` | #85561A |
| `--red-700` | #A12B2B |
| `--green-700` | #3D6A47 |

**语义（站点级）**

| Token | 引用 | 用途 | 对纸底对比度 |
|---|---|---|---|
| `--background` | `--paper-50` | 页面背景（纸底） | — |
| `--surface` | `--paper-100` | 浅一层的面：跳过按钮悬停底 | — |
| `--border` | `--paper-200` | 细线（本版未用，留给将来） | — |
| `--foreground` | `--ink-900` | 主文字、剩余时间、焦点框 | 15.3:1 |
| `--muted-foreground` | `--ink-600` | 次要文字：状态说明、跳过、完成数 | 6.5:1 |
| `--focus` | `--brick-600` | **primary**：专注阶段色 | 5.9:1 |
| `--focus-strong` | `--brick-700` | 专注阶段色·悬停 / 按下 | 7.6:1 |
| `--break` | `--slate-600` | **secondary**：休息阶段色 | 5.8:1 |
| `--break-strong` | `--slate-700` | 休息阶段色·悬停 / 按下 | 7.5:1 |
| `--on-accent` | `--paper-50` | 实心按钮上的字（砖红底上 5.9:1，灰青底上 5.8:1） | — |
| `--warning` | `--amber-700` | 存储提示文字 | 5.9:1 |
| `--destructive` | `--red-700` | 预留（本版无危险操作） | 6.8:1 |
| `--success` | `--green-700` | 预留（本版不用绿色表示完成） | 5.9:1 |

- **accent 不单设**：页面只有两个阶段色，强调色就是当前阶段色。
- 中性色统一偏暖（纸 / 墨），不混冷灰。
- 不用红绿组合区分阶段：休息用灰青，且阶段始终有文字标签。
- 本版只做浅色，见「已知设计问题」。

### 2.2 字体

字体族（站点级）：

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif;
```

- 只用系统字体：PRD 技术约束要求不从外部网址加载资源，所以不用 Google Fonts。西文字体放前面，数字取系统西文字体。
- 所有数字（剩余时间、完成数）加 `font-variant-numeric: tabular-nums`，走秒时不左右跳。

| 角色 | 字号 | 字重 | 行高 | Token |
|---|---|---|---|---|
| 剩余时间（桌面） | 128px | 300 | 1 | `--pomo-time-size` / `--pomo-time-weight` / `--pomo-time-lh` |
| 剩余时间（手机 / 矮屏） | 80px | 300 | 1 | `--pomo-time-size-mob` |
| 阶段标签 | 18px | 500 | 1.5 | `--pomo-phase-size` / `--pomo-phase-weight` |
| 状态说明 | 16px | 400 | 1.5 | `--pomo-status-size` |
| 按钮 | 16px | 主按钮 500 / 跳过 400 | — | `--pomo-btn-size` / `--pomo-btn-weight` |
| 今日完成数 | 16px（数字 600） | 400 | 1.5 | `--pomo-rec-size` / `--pomo-rec-num-weight` |
| 存储提示 | 14px | 400 | 1.5 | `--pomo-notice-size` |

字号阶梯：14 / 16 / 18 / 20 / 24（文字）与 72 / 80 / 96 / 112 / 128 / 144（剩余时间专用）。

### 2.3 间距

阶梯（4 / 8 为基数）：0 / 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64 / 96。页面用到的间距全部是 `--pomo-*` 组件 token，见 §3.1。

### 2.4 圆角

| 阶梯 | 用途 |
|---|---|
| 4px | 预留：小标签 |
| 8px | 按钮（`--pomo-btn-radius`） |
| 12px | 预留：将来的面板 |

不用统一大圆角；本页只有按钮有圆角。

### 2.5 阴影

不定义阴影 token：纸面风格不用阴影，本页没有浮层。将来出现浮层时再加，并记进 CHANGELOG。

### 2.6 断点

| 断点 | 值 | 来源 | 变化 |
|---|---|---|---|
| 窄屏（宽度） | 窄于 600px | `--pomo-mob-bp` | 剩余时间换 80px |
| 矮屏（高度） | 矮于 480px | `--pomo-short-bp` | 剩余时间换 80px，取消上移（手机横屏） |

CSS 媒体查询不能读变量：实现时把这两个值写进 `@media (max-width: 599px)`、`@media (max-height: 479px)`，行尾注明来自哪个 token。

---

## 三、页面布局

### 3.1 番茄钟页面（唯一页面）

#### 布局结构

```
┌──────────────────────────────────────────┐
│                                          │
│                  专注          ← A1 阶段标签（阶段色）
│                 24:59          ← A2 剩余时间（全页唯一大字）
│                 已暂停         ← A3 状态说明（始终占一行）
│                                          │
│            [ 暂停 ]   跳过     ← B1 主按钮（阶段色实心）+ B2 跳过（文字按钮）
│                                          │
│              今天完成 3 个      ← C1 今日完成数
│                                          │
│                                          │
│   这个浏览器不能保存记录，刷新后今天的完成数会清零   ← D 存储提示（贴底，只在不能保存时出现）
└──────────────────────────────────────────┘
浏览器标签页标题：24:59 · 专注                ← E（页面外）
```

- 页面不滚动。内容列水平居中、最大宽 `--pomo-col-max`；在去掉底部提示区（`--pomo-foot-h`）后的高度里垂直居中，再上移 `--pomo-lift`（光学居中）。
- 三块之间只靠留白分组，不用卡片、分割线、阴影。
- 状态说明一行始终占位：出现或消失时按钮不上下跳。

#### 响应式行为

| 窗口 | 布局变化 |
|---|---|
| 桌面 / 笔记本 | 如上；剩余时间 128px |
| 窄于 600px（手机竖屏） | 结构不变，剩余时间 80px；两个按钮仍并排（J3 决定，不上下叠） |
| 矮于 480px（手机横屏） | 剩余时间 80px，取消上移（J8 决定；不加这条时横屏会把「专注」顶出屏幕） |

#### 工作台定稿的关键判断

| 编号 | 问题 | 结局 |
|---|---|---|
| J1 | 内容列 480 还是 400 | 保持 480（单列居中时肉眼几乎看不出差别） |
| J2 | 上移 48 还是纯居中 | 保持 48 |
| J3 | 手机上按钮并排还是上下叠 | 并排（更轻；气质稿里的上下叠画法未采用） |
| J4 | 剩余时间 128 / 144 / 112 | 保持 128 |
| J5 → J8 | 手机横屏溢出怎么办 | 第 1 轮「拿不准」→ 出 A/B/C → 选 B：矮于 480 也换手机字号 |
| J6 | 主按钮用阶段色还是墨色 | 阶段色（一眼知道在专注还是休息） |
| J7 | 按钮变色过渡 | 保持 120ms |

<!-- design-lab:tokens:pomodoro start · 由 docs/assets/visuals/pomodoro/pomodoro.tokens.json 生成（render_design_table.py），勿手改；改值请在工作台保存后重跑 -->
**Token 表（v1.0 · 工作台 2026-10-23T07:31:04）** — 决策在 `docs/assets/visuals/pomodoro/pomodoro.tokens.json`，前端 import `pomodoro.tokens.css`；组件只写 `var()`。

| 层 | 模块 | token | CSS 变量 | 值 | 备选 | 结局 | 说明 |
|---|---|---|---|---|---|---|---|
| 1 结构 | 页面框架 | `s.col-max` 内容列最大宽 | `--pomo-col-max` | 480px | 400px / 480px / 560px | 通过 |  |
| 1 结构 | 页面框架 | `s.lift` 计时块上移量（光学居中） | `--pomo-lift` | 48px | 0px / 24px / 48px / 64px | 通过 |  |
| 1 结构 | 页面框架 | `s.foot-h` 底部提示区高度 | `--pomo-foot-h` | 64px | 48px / 64px / 80px | 通过 |  |
| 1 结构 | 页面框架 | `s.gutter` 左右安全边距 | `--pomo-gutter` | 24px | 16px / 24px / 32px | 通过 |  |
| 1 结构 | 页面框架 | `s.mob-bp` 手机布局断点（窗口窄于它切手机字号） | `--pomo-mob-bp` | 600px | 480px / 600px / 768px | 通过 | CSS 媒体查询不能读变量；实现时把这个值写进 @media (max-width) 并在行尾注明来自本 token |
| 1 结构 | 控制区 | `s.btn-stack` 手机上两个按钮怎么排 |  | 并排 | 并排 / 手机上下叠 | 通过 |  |
| 1 结构 | 页面框架 | `s.short-bp` 矮屏阈值（窗口矮于它也换手机字号、取消上移；0 = 不启用） | `--pomo-short-bp` | 480px | 0px / 480px / 560px | 改 | CSS 媒体查询不能读变量；实现时写成 @media (max-height: <值>px)，并在行尾注明来自本 token |
| 2 层级 | 计时区 | `h.first` 先看：剩余时间 |  | — |  | 通过 |  |
| 2 层级 | 计时区 | `h.second` 再看：现在是专注还是休息、主按钮在哪 |  | — |  | 通过 |  |
| 2 层级 | 记录区与存储提示 | `h.third` 最后看：今天完成了几个 |  | — |  | 通过 |  |
| 2 层级 | 控制区 | `h.control` 唯一的实心按钮是主按钮；跳过明显更弱 |  | — |  | 通过 |  |
| 3 排版 | 页面框架 | 🔒 `t.f.sans` 字体族（系统字体，不从外网加载） |  | -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif |  | 通过 | PRD 技术约束：不从外部网址加载资源，所以不用 Google Fonts；数字取系统西文字体的等宽数字 |
| 3 排版 | 计时区 | `t.time-size` 剩余时间字号（桌面） | `--pomo-time-size` | 128px | 112px / 128px / 144px | 通过 |  |
| 3 排版 | 计时区 | `t.time-size-mob` 剩余时间字号（手机 / 矮屏） | `--pomo-time-size-mob` | 80px | 72px / 80px / 96px | 通过 | 矮屏（s.short-bp）也用这个字号 横屏把「专注」顶出屏幕不能接受，给几个办法 |
| 3 排版 | 计时区 | `t.time-weight` 剩余时间字重 | `--pomo-time-weight` | 300 | 300 / 400 | 通过 |  |
| 3 排版 | 计时区 | `t.time-lh` 剩余时间行高 | `--pomo-time-lh` | 1 | 1 / 1.2 | 通过 |  |
| 3 排版 | 计时区 | `t.phase-size` 阶段标签字号 | `--pomo-phase-size` | 18px | 16px / 18px / 20px | 通过 |  |
| 3 排版 | 计时区 | `t.phase-weight` 阶段标签字重 | `--pomo-phase-weight` | 500 | 400 / 500 / 600 | 通过 |  |
| 3 排版 | 计时区 | `t.status-size` 状态说明字号 | `--pomo-status-size` | 16px | 14px / 16px / 18px | 通过 |  |
| 3 排版 | 控制区 | `t.btn-size` 按钮字号 | `--pomo-btn-size` | 16px | 16px / 18px | 通过 |  |
| 3 排版 | 控制区 | `t.btn-weight` 主按钮字重 | `--pomo-btn-weight` | 500 | 400 / 500 / 600 | 通过 |  |
| 3 排版 | 记录区与存储提示 | `t.rec-size` 今日完成数字号 | `--pomo-rec-size` | 16px | 14px / 16px | 通过 |  |
| 3 排版 | 记录区与存储提示 | `t.rec-num-weight` 完成数里数字的字重 | `--pomo-rec-num-weight` | 600 | 400 / 500 / 600 | 通过 |  |
| 3 排版 | 记录区与存储提示 | `t.notice-size` 存储提示字号 | `--pomo-notice-size` | 14px | 14px / 16px | 通过 |  |
| 3 排版 | 页面框架 | `t.label-lh` 小字行高（阶段、状态、完成数、提示） | `--pomo-label-lh` | 1.5 | 1.2 / 1.5 | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.background` 站点色 --background：纸底 |  | #FAF8F4 |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.surface` 站点色 --surface：浅一层的纸（跳过按钮悬停） |  | #F2EFE9 |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.foreground` 站点色 --foreground：墨色主文字 |  | #22201C |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.muted-foreground` 站点色 --muted-foreground：次要文字 |  | #5F5A52 |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.border` 站点色 --border：细线（本页暂未用） |  | #DDD8CF |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.focus` 站点色 --focus：专注阶段色（砖红） |  | #A3412D |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.focus-strong` 站点色 --focus-strong：专注阶段色·深（悬停） |  | #8A3524 |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.break` 站点色 --break：休息阶段色（灰青） |  | #3B6870 |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.break-strong` 站点色 --break-strong：休息阶段色·深（悬停） |  | #30575E |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.on-accent` 站点色 --on-accent：实心按钮上的字 |  | #FAF8F4 |  | 通过 |  |
| 4 色彩 | 页面框架 | 🔒 `c.f.warning` 站点色 --warning：提醒色（存储提示） |  | #85561A |  | 通过 |  |
| 4 色彩 | 计时区 | `c.time` 剩余时间颜色 | `--pomo-time-color` | var(--foreground) | foreground / muted-foreground | 通过 |  |
| 4 色彩 | 计时区 | `c.phase-focus` 阶段标签·专注 | `--pomo-phase-focus` | var(--focus) | focus / foreground / muted-foreground | 通过 |  |
| 4 色彩 | 计时区 | `c.phase-break` 阶段标签·休息 | `--pomo-phase-break` | var(--break) | break / foreground / muted-foreground | 通过 |  |
| 4 色彩 | 计时区 | `c.status` 状态说明颜色 | `--pomo-status-color` | var(--muted-foreground) | muted-foreground / foreground | 通过 |  |
| 4 色彩 | 控制区 | `c.btn-bg-focus` 主按钮底色·专注 | `--pomo-btn-bg-focus` | var(--focus) | focus / foreground | 通过 |  |
| 4 色彩 | 控制区 | `c.btn-bg-focus-hover` 主按钮底色·专注·悬停/按下 | `--pomo-btn-bg-focus-hover` | var(--focus-strong) | focus-strong / foreground | 通过 |  |
| 4 色彩 | 控制区 | `c.btn-bg-break` 主按钮底色·休息 | `--pomo-btn-bg-break` | var(--break) | break / foreground | 通过 |  |
| 4 色彩 | 控制区 | `c.btn-bg-break-hover` 主按钮底色·休息·悬停/按下 | `--pomo-btn-bg-break-hover` | var(--break-strong) | break-strong / foreground | 通过 |  |
| 4 色彩 | 控制区 | `c.btn-fg` 主按钮文字 | `--pomo-btn-fg` | var(--on-accent) | on-accent / background | 通过 |  |
| 4 色彩 | 控制区 | `c.skip` 跳过按钮文字 | `--pomo-skip-color` | var(--muted-foreground) | muted-foreground / foreground | 通过 |  |
| 4 色彩 | 控制区 | `c.skip-hover-bg` 跳过按钮悬停底色 | `--pomo-skip-hover-bg` | var(--surface) | surface / background | 通过 |  |
| 4 色彩 | 记录区与存储提示 | `c.rec` 完成数文字 | `--pomo-rec-color` | var(--muted-foreground) | muted-foreground / foreground | 通过 |  |
| 4 色彩 | 记录区与存储提示 | `c.rec-num` 完成数里的数字 | `--pomo-rec-num-color` | var(--foreground) | foreground / muted-foreground | 通过 |  |
| 4 色彩 | 记录区与存储提示 | `c.notice` 存储提示文字 | `--pomo-notice-color` | var(--warning) | warning / muted-foreground | 通过 |  |
| 4 色彩 | 控制区 | `c.ring` 键盘焦点框颜色 | `--pomo-ring-color` | var(--foreground) | foreground / focus | 通过 |  |
| 4 色彩 | 控制区 | `c.btn-fill` 主按钮用什么色 |  | 阶段色 | 阶段色 / 墨色 | 通过 |  |
| 5 间距与形状 | 计时区 | `sp.phase-gap` 阶段标签 → 剩余时间 | `--pomo-phase-gap` | 8px | 4px / 8px / 12px | 通过 |  |
| 5 间距与形状 | 计时区 | `sp.status-gap` 剩余时间 → 状态说明 | `--pomo-status-gap` | 8px | 4px / 8px / 12px | 通过 |  |
| 5 间距与形状 | 控制区 | `sp.ctl-gap` 计时区 → 按钮 | `--pomo-ctl-gap` | 32px | 24px / 32px / 48px | 通过 |  |
| 5 间距与形状 | 控制区 | `sp.btn-gap` 两个按钮之间 | `--pomo-btn-gap` | 16px | 8px / 16px / 24px | 通过 |  |
| 5 间距与形状 | 控制区 | `sp.btn-h` 按钮高度（手指好点） | `--pomo-btn-h` | 48px | 48px / 56px | 通过 |  |
| 5 间距与形状 | 控制区 | `sp.btn-px` 主按钮左右内距 | `--pomo-btn-px` | 32px | 24px / 32px / 40px | 通过 |  |
| 5 间距与形状 | 控制区 | `sp.skip-px` 跳过按钮左右内距 | `--pomo-skip-px` | 16px | 12px / 16px / 24px | 通过 |  |
| 5 间距与形状 | 控制区 | `sp.btn-radius` 按钮圆角 | `--pomo-btn-radius` | 8px | 4px / 8px / 12px | 通过 |  |
| 5 间距与形状 | 记录区与存储提示 | `sp.rec-gap` 按钮 → 今日完成数 | `--pomo-rec-gap` | 48px | 32px / 48px / 64px | 通过 |  |
| 5 间距与形状 | 控制区 | `sp.ring-w` 键盘焦点框粗细 | `--pomo-ring-w` | 2px | 2px / 4px | 通过 |  |
| 5 间距与形状 | 控制区 | `sp.ring-offset` 焦点框离按钮的距离 | `--pomo-ring-offset` | 2px | 2px / 4px | 通过 |  |
| 6 状态与动效 | 控制区 | `m.btn-ms` 按钮悬停变色时长（全页唯一的过渡） | `--pomo-btn-ms` | 120ms | 0ms / 120ms / 200ms | 通过 |  |
| 6 状态与动效 | 计时区 | `m.st-running` 专注进行中：砖红「专注」、走秒、主按钮「暂停」；标题 24:59 · 专注 |  | — |  | 通过 |  |
| 6 状态与动效 | 计时区 | `m.st-idle` 首次打开：专注 25:00、主按钮「开始」、今天完成 0 个 |  | — |  | 通过 |  |
| 6 状态与动效 | 计时区 | `m.st-paused` 已暂停：数字停住、下面一行「已暂停」、主按钮「继续」 |  | — |  | 通过 |  |
| 6 状态与动效 | 计时区 | `m.st-ended` 专注到点：切到灰青「休息 05:00」、状态说明「专注结束」、完成数 +1 |  | — |  | 通过 |  |
| 6 状态与动效 | 计时区 | `m.st-break` 休息进行中：灰青「休息」、主按钮也换成灰青 |  | — |  | 通过 |  |
| 6 状态与动效 | 记录区与存储提示 | `m.st-nosave` 浏览器不能保存：底部常驻一行提醒色小字，不弹窗、不遮挡 |  | — |  | 通过 |  |
| 6 状态与动效 | 计时区 | `m.tick` 走秒时数字不左右跳（等宽数字） |  | — |  | 通过 |  |
| 6 状态与动效 | 控制区 | `m.reduced` 系统开了「减少动态效果」时，按钮变色也不过渡 |  | — |  | 通过 |  |
| 7 一致性 | 页面框架 | `k.one-accent` 全页只有一个实心按钮，只用两个阶段色 |  | — |  | 通过 |  |
| 7 一致性 | 页面框架 | `k.no-decor` 无阴影、无卡片、无进度环、无图标、无循环动画 |  | — |  | 通过 |  |

**非变量决策（effects）**：`s.btn-stack` = 手机上下叠 → `.stackmob`

**待回反馈**：3 条（见 json.feedback）
<!-- design-lab:tokens:pomodoro end -->

---

## 四、组件规范

### 4.1 剩余时间（A2）

**用途**：显示本段还剩多久，格式 `分:秒`，不足十分钟补零（`09:05`）。

| 状态 | 视觉表现 |
|---|---|
| 进行中 | 墨色、每秒更新，数字等宽不跳 |
| 已暂停 / 待开始 / 到点后 | 同上，只是不走 |

全页字号最大的元素；不做颜色变化、不闪烁、不加进度环。

### 4.2 阶段标签（A1）

| 阶段 | 视觉表现 |
|---|---|
| 专注 | 「专注」，`--focus` 砖红 |
| 休息（含专注到点后的「休息待开始」） | 「休息」，`--break` 灰青 |

### 4.3 状态说明（A3）

| 状态 | 文字 |
|---|---|
| 已暂停 | 已暂停 |
| 专注到点、用户还没操作 | 专注结束 |
| 休息到点、用户还没操作 | 休息结束 |
| 其余 | 空，但保留一行高度 |

颜色 `--muted-foreground`。

### 4.4 主按钮（B1）

**用途**：开始 / 暂停 / 继续，全页唯一的实心按钮。

| 状态 | 视觉表现 |
|---|---|
| 默认 | 阶段色实心底（专注 `--focus`、休息 `--break`），`--on-accent` 字，圆角 8，高 48 |
| 悬停 / 按下 | 底色换成同阶段的深一档（`--focus-strong` / `--break-strong`），120ms 过渡 |
| 键盘焦点 | 2px `--foreground` 外框，离按钮 2px（`:focus-visible`，不能去掉 outline） |
| 禁用 / 加载中 | 不存在：任何状态都能点 |

### 4.5 跳过按钮（B2）

| 状态 | 视觉表现 |
|---|---|
| 默认 | 无底无边，`--muted-foreground` 字，高度与主按钮相同，左右内距 16 |
| 悬停 / 按下 | `--surface` 底，字变 `--foreground` |
| 键盘焦点 | 同主按钮 |

视觉上明显弱于主按钮；不弹确认框。

### 4.6 今日完成数（C1）

「今天完成 **N** 个」：整句 `--muted-foreground`，数字 `--foreground`、字重 600。0 个也照常显示。

### 4.7 存储提示（D）

只在浏览器不能保存记录时出现：贴底一行，`--warning` 色、14px，居中；窄屏会折成两行，仍在底部提示区内。不能关、不弹窗、不遮挡计时区。

底部提示区在有「刘海 / 底部横条」的手机上要让出安全区：`padding-bottom: env(safe-area-inset-bottom)`，页面 `viewport` 加 `viewport-fit=cover`。

### 4.8 浏览器标签页标题（E，页面外）

格式按 PRD §3.4：进行中 `24:59 · 专注`；已暂停 `12:34 · 已暂停`；待开始 `番茄钟 · 今天 N 个`；到点后「专注结束！」与待开始标题交替。剩余时间放最前面：标签被挤窄时也看得到（工作台「模块放大」层有示意）。

---

## 五、交互方案

### 5.1 到点

**触发条件**：本段剩余时间走到 0。
**状态流转**：

```
专注进行中 ──到点──→ 休息待开始（阶段标签和主按钮切到灰青，状态说明「专注结束」，完成数 +1）
                         ↓ 用户在页面上点击或按键
                    状态说明消失，标题停止交替
```

**动效参数**：颜色和文字直接切换，无过渡、无闪烁、无弹出。标题交替每 1 秒切换一次（页面外）。

### 5.2 按钮悬停

- 持续时间：120ms（`--pomo-btn-ms`）
- 缓动函数：ease-out
- 只过渡 `background-color`（不写 `transition: all`）
- 系统开了「减少动态效果」：取消过渡

### 5.3 无障碍

- 主按钮、跳过都是原生 `<button>`，可用键盘操作，焦点框见 §4.4。
- 剩余时间**不要**设 `aria-live`（每秒播报会很吵）；状态说明设 `aria-live="polite"`，暂停、到点时读出来。
- 页面 `lang="zh-CN"`；`viewport` 不禁止缩放。

---

## 六、空状态与异常状态

### 6.1 空状态

| 场景 | 展示内容 | 操作引导 |
|---|---|---|
| 第一次打开、没有任何记录 | 专注、25:00、今天完成 0 个 | 主按钮「开始」 |

### 6.2 加载状态

纯静态页面，没有加载态：打开即显示。

### 6.3 错误与降级

| 场景 | 展示方式 | 恢复操作 |
|---|---|---|
| 浏览器不能保存 | 底部存储提示（§4.7） | 无需操作，计时照常 |
| 提示音被浏览器拦截 | 不显示任何错误 | 靠标题交替和状态说明 |
| 记录读不出来 | 不显示任何错误，按第一次打开显示 | 无 |

---

## 七、实现交接

1. **引入 token**：页面引入根目录的 `pomodoro.tokens.css`（工作台导出，勿手改）；另在站点样式 `:root` 里写 §2.1 语义色与 §2.2 `--font-sans`（值以本文为准）。组件 CSS 只写 `var()`，不出现字面颜色和字号。
2. **媒体查询**：§2.6 的两个断点写成字面值并在行尾注明 token 名。
3. **非 token 决策**：页面不滚动；状态说明占位；阶段只换两处颜色（阶段标签、主按钮）；标题交替每 1 秒。
4. **比对锚点**：给阶段标签、剩余时间、主按钮、跳过、今日完成数五个元素分别加 `data-ui="phase|time|primary|skip|count"`。实现后用 forge-design-lab 的 `compare_impl.mjs` 在桌面视口下与骨架逐个比位置和尺寸（配置在 `pomodoro.tokens.json` 的 `implCheck`）。
5. **边界样例**：存储提示在窄屏折两行；完成数两位数（如 12）时宽度变化不影响居中。
6. **安全区**：底部提示区加 `env(safe-area-inset-bottom)` 内距（§4.7）。

---

## 已知设计问题

### 待优化

- [ ] 暗色模式：本版只做浅色；用户系统是深色时整页仍是纸色 — 优先级 低
- [ ] 提示音的音色只定了「短促、安静」，没在设计阶段试听，实现时挑选后回填 — 优先级 中
- [ ] 「休息到点」没在工作台单独画一个状态（与「专注到点」对称） — 优先级 低

### 设计决策记录

| 议题 | 决定 | 原因 |
|---|---|---|
| 配色库推荐的番茄钟配色（深色底 + 红色专注 + 绿色休息） | 放弃，改纸底 + 砖红 / 灰青 | 深底饱和红不安静；红绿对色弱用户难分 |
| 字体库推荐的网络字体 | 放弃，用系统字体 | PRD 要求不从外部网址加载资源 |
| 阶段怎么区分 | 只换阶段标签和主按钮颜色 + 文字 | 整页换背景色太吵 |
| 手机横屏 | 加矮屏规则 | 工作台实测横屏会溢出 |
| 阴影、卡片、进度环 | 都不用 | 「不要花哨」；减法 |
