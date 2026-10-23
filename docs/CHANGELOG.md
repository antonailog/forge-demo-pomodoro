---
status: live
type: changelog
module: global
last_updated: 2026-10-23
---

# 版本记录

> 历史总账：每个版本一条，写用户能感受到的变化。产品、设计、工程的细节分别在 [PRD-CHANGELOG](PRD-CHANGELOG.md)、[DESIGN-CHANGELOG](DESIGN-CHANGELOG.md)、[ENGINEERING-CHANGELOG](ENGINEERING-CHANGELOG.md)。

## v1.0 — 2026-10-23

第一个版本：一个打开就能用的番茄钟网页（合并请求 [#1](https://github.com/antonailog/forge-demo-pomodoro/pull/1)）。

### 你现在可以

- 开始一段 25 分钟的专注，随时暂停、继续或跳过；专注结束后切到 5 分钟休息。
- 到点时听到一声短促的提示音，看到标签页标题交替提示「专注结束！」；点一下页面或按任意键就停。
- 随时看到今天完成了几个专注：刷新页面不会丢，过了零点重新计数，同时开两个页面也不会算重。
- 在手机上用：竖屏、横屏、窄屏都能看清。
- 不注册、不联网：页面不请求任何外部地址，记录只存在你自己的浏览器里。

### 已知限制

- 标签页放在后台时，提示音可能比到点晚一点响；电脑睡眠、手机锁屏、Safari 和 Firefox 还需要人工验证（步骤见 [QA.md](QA.md) 第五节）。
- 到点切换阶段时，主按钮颜色有一下极短的过渡（设计写的是直接切换），已单独登记修复。
- 还没有部署到网上，下载后在本地打开 `index.html` 使用。

### 贡献者相关

- 计时规则单独放在 `timer-core.js`，有单元测试，不装任何依赖：`node --test tests/timer-core.test.js`。
- 上线前审查修好一处边角问题：系统时间被往回调之后暂停再继续，数字会停着不动；同时补上了对应的测试。
