// 由 pomodoro.tokens.json 生成，勿手改
window.WB_SPEC={
 "schemaVersion": 1,
 "version": "v1.0",
 "page": "pomodoro",
 "title": "番茄钟 · 设计工作台",
 "prefix": "--pomo",
 "repoName": "forge-demo-pomodoro",
 "updated": "2026-10-23",
 "files": {
  "json": "docs/assets/visuals/pomodoro/pomodoro.tokens.json",
  "js": "docs/assets/visuals/pomodoro/pomodoro.tokens.js",
  "css": "pomodoro.tokens.css"
 },
 "levels": [
  {
   "key": "wire",
   "label": "线框"
  },
  {
   "key": "page",
   "label": "番茄钟页面",
   "states": true
  },
  {
   "key": "module",
   "label": "模块放大：标签页标题与按钮状态",
   "w": 1180,
   "h": 760
  }
 ],
 "states": [
  {
   "key": "running",
   "label": "专注进行中"
  },
  {
   "key": "idle",
   "label": "专注待开始（首次打开）"
  },
  {
   "key": "paused",
   "label": "已暂停"
  },
  {
   "key": "ended",
   "label": "专注到点（等你点开始）"
  },
  {
   "key": "break",
   "label": "休息进行中"
  }
 ],
 "viewports": [
  {
   "key": "follow",
   "label": "跟随窗口"
  },
  {
   "key": "1440x900",
   "label": "1440×900",
   "w": 1440,
   "h": 900
  },
  {
   "key": "1280x720",
   "label": "1280×720 笔记本",
   "w": 1280,
   "h": 720
  },
  {
   "key": "390x844",
   "label": "390 手机",
   "w": 390,
   "h": 844
  },
  {
   "key": "360x640",
   "label": "360 小屏手机",
   "w": 360,
   "h": 640
  },
  {
   "key": "844x390",
   "label": "手机横屏",
   "w": 844,
   "h": 390
  }
 ],
 "toggles": [
  {
   "key": "nosave",
   "label": "浏览器不能保存",
   "cls": "nosave"
  }
 ],
 "effects": [
  {
   "node": "s.btn-stack",
   "eq": "手机上下叠",
   "cls": "stackmob"
  }
 ],
 "mobileBelow": "s.mob-bp",
 "elementIds": {
  "A": "计时区",
  "A1": "阶段标签（专注 / 休息）",
  "A2": "剩余时间",
  "A3": "状态说明（已暂停 / 专注结束）",
  "B": "控制区",
  "B1": "主按钮（开始 / 暂停 / 继续）",
  "B2": "跳过按钮",
  "C": "记录区",
  "C1": "今日完成数",
  "D": "存储提示（只在浏览器不能保存时出现）",
  "E": "浏览器标签页标题（页面外）",
  "F1…F4": "按钮状态特写：主按钮默认 / 悬停按下 / 键盘焦点；跳过按钮三态"
 },
 "layout": [
  {
   "id": "col",
   "el": null,
   "label": "内容列：水平居中、垂直居中再上移一点",
   "style": {
    "left": "0",
    "right": "0",
    "top": "0",
    "bottom": "var(--pomo-foot-h)",
    "display": "flex",
    "flexDirection": "column",
    "alignItems": "center",
    "justifyContent": "center",
    "paddingLeft": "var(--pomo-gutter)",
    "paddingRight": "var(--pomo-gutter)",
    "paddingBottom": "var(--pomo-lift)"
   }
  },
  {
   "id": "timer",
   "el": "A",
   "parent": "col",
   "label": "A 计时区：阶段标签 + 剩余时间 + 状态说明",
   "style": {
    "width": "100%",
    "maxWidth": "var(--pomo-col-max)",
    "height": "calc(var(--pomo-time-size, 128px) * 1.7)"
   }
  },
  {
   "id": "ctl",
   "el": "B",
   "parent": "col",
   "label": "B 控制区：主按钮 + 跳过",
   "style": {
    "width": "100%",
    "maxWidth": "var(--pomo-col-max)",
    "marginTop": "var(--pomo-ctl-gap, 32px)",
    "height": "var(--pomo-btn-h, 48px)"
   }
  },
  {
   "id": "rec",
   "el": "C",
   "parent": "col",
   "label": "C 记录区：今天完成 N 个",
   "style": {
    "width": "100%",
    "maxWidth": "var(--pomo-col-max)",
    "marginTop": "var(--pomo-rec-gap, 48px)",
    "height": "24px"
   }
  },
  {
   "id": "foot",
   "el": "D",
   "label": "D 存储提示区（贴底，只在不能保存时有字）",
   "style": {
    "left": "0",
    "right": "0",
    "bottom": "0",
    "height": "var(--pomo-foot-h)"
   }
  }
 ],
 "groups": [
  {
   "key": "structure",
   "label": "1 结构",
   "ask": "放对地方了吗、比例对吗",
   "how": "先看区域划分和尺寸，再看谁滚动、断点在哪。"
  },
  {
   "key": "hierarchy",
   "label": "2 层级",
   "ask": "重点对吗",
   "how": "不看具体值，只回答三问：先看什么、再看什么、最后看什么。答不出即层级失败。"
  },
  {
   "key": "type",
   "label": "3 排版",
   "ask": "读起来对吗",
   "how": "按文字角色走：正文、标题、meta、标签、来源行。每个角色查字体族、字号、字重、行高。"
  },
  {
   "key": "color",
   "label": "4 色彩",
   "ask": "颜色用对了吗、对比够吗",
   "how": "只看语义色用在哪，不改站点色值。基础色只读，可标提议。"
  },
  {
   "key": "space",
   "label": "5 间距与形状",
   "ask": "密度对吗",
   "how": "padding、gap、圆角、边框。值必须落在站点阶梯上，不在阶梯的标红。"
  },
  {
   "key": "motion",
   "label": "6 状态与动效",
   "ask": "每个状态都有交代吗",
   "how": "切视图块的状态逐个看；动效只动 transform/opacity；reduced-motion 下的表现。"
  },
  {
   "key": "consistency",
   "label": "7 一致性",
   "ask": "有没有另起炉灶",
   "how": "自动统计：引用了哪些站点 token、新造了哪些页面 token、哪些值不在阶梯上。"
  }
 ],
 "modules": [
  {
   "key": "frame",
   "label": "页面框架",
   "impl": [],
   "implNote": "尚未实现；按 PRD 建议为根目录 index.html + 同级样式"
  },
  {
   "key": "timer",
   "label": "计时区",
   "impl": [],
   "implNote": "尚未实现"
  },
  {
   "key": "ctl",
   "label": "控制区",
   "impl": [],
   "implNote": "尚未实现"
  },
  {
   "key": "rec",
   "label": "记录区与存储提示",
   "impl": [],
   "implNote": "尚未实现"
  },
  {
   "key": "tab",
   "label": "标签页标题",
   "impl": [],
   "implNote": "页面外，由脚本写 document.title"
  }
 ],
 "scale": {
  "px": [
   14,
   16,
   18,
   20,
   24,
   64,
   72,
   80,
   96,
   112,
   128,
   144
  ],
  "space": [
   0,
   4,
   8,
   12,
   16,
   24,
   32,
   48,
   64,
   96
  ],
  "radius": [
   4,
   8,
   12
  ],
  "lh": [
   1,
   1.2,
   1.5
  ],
  "weight": [
   300,
   400,
   500,
   600
  ]
 },
 "foundation": {
  "light": {
   "background": "#FAF8F4",
   "surface": "#F2EFE9",
   "foreground": "#22201C",
   "muted-foreground": "#5F5A52",
   "border": "#DDD8CF",
   "focus": "#A3412D",
   "focus-strong": "#8A3524",
   "break": "#3B6870",
   "break-strong": "#30575E",
   "on-accent": "#FAF8F4",
   "warning": "#85561A",
   "destructive": "#A12B2B",
   "success": "#3D6A47"
  },
  "dark": {}
 },
 "nodes": [
  {
   "id": "s.col-max",
   "g": "structure",
   "mod": "frame",
   "label": "内容列最大宽",
   "type": "px",
   "value": 480,
   "css": "--pomo-col-max",
   "options": [
    400,
    480,
    560
   ],
   "maps": [
    ".pcol"
   ],
   "q": "J1 1440×900 下剩余时间数字宽 334px，占内容列（480）的 70%。单列居中时，列宽只决定按钮和完成数在多宽的范围里对齐，肉眼几乎看不出差别。保持 480，还是收到 400？"
  },
  {
   "id": "s.lift",
   "g": "structure",
   "mod": "frame",
   "label": "计时块上移量（光学居中）",
   "type": "px",
   "value": 48,
   "css": "--pomo-lift",
   "options": [
    0,
    24,
    48,
    64
   ],
   "maps": [
    ".pcol"
   ],
   "q": "J2 上移 48 后，计时块中心落在 1440×900 视口 35% 处，整组内容中心约 44%（数学居中是 50%，人眼会觉得偏下）。保持 48，还是改 0 看纯居中？"
  },
  {
   "id": "s.foot-h",
   "g": "structure",
   "mod": "frame",
   "label": "底部提示区高度",
   "type": "px",
   "value": 64,
   "css": "--pomo-foot-h",
   "options": [
    48,
    64,
    80
   ],
   "maps": [
    ".pfoot"
   ]
  },
  {
   "id": "s.gutter",
   "g": "structure",
   "mod": "frame",
   "label": "左右安全边距",
   "type": "px",
   "value": 24,
   "css": "--pomo-gutter",
   "options": [
    16,
    24,
    32
   ],
   "maps": [
    ".pcol",
    ".pfoot"
   ]
  },
  {
   "id": "s.mob-bp",
   "g": "structure",
   "mod": "frame",
   "label": "手机布局断点（窗口窄于它切手机字号）",
   "type": "px",
   "value": 600,
   "css": "--pomo-mob-bp",
   "options": [
    480,
    600,
    768
   ],
   "maps": [
    ".pcol"
   ],
   "note": "CSS 媒体查询不能读变量；实现时把这个值写进 @media (max-width) 并在行尾注明来自本 token"
  },
  {
   "id": "s.btn-stack",
   "g": "structure",
   "mod": "ctl",
   "label": "手机上两个按钮怎么排",
   "type": "enum",
   "value": "并排",
   "options": [
    "并排",
    "手机上下叠"
   ],
   "maps": [
    ".pctl"
   ],
   "q": "J3 390 手机上并排时：主按钮宽 96、跳过宽 64，高都是 48，手指好点；上下叠时主按钮占满一行（约 342 宽），更像手机 App，但画面更重。保持并排，还是手机上下叠？"
  },
  {
   "id": "s.short-bp",
   "g": "structure",
   "mod": "frame",
   "label": "矮屏阈值（窗口矮于它也换手机字号、取消上移；0 = 不启用）",
   "type": "px",
   "value": 480,
   "css": "--pomo-short-bp",
   "options": [
    0,
    480,
    560
   ],
   "maps": [
    ".pcol"
   ],
   "q": "J8（回应 A1 与 J5 的「拿不准」）A 0：不启用，844×390 横屏溢出 69px，「专注」被顶出屏幕。B 480：高度低于 480 时换 80px 字号、上移归零，横屏要 299 / 可用 326，放得下；只有手机横屏会触发。C 560：同 B，另外把浏览器窗口拉得很矮的笔记本也算进来，桌面大字号出现得更少。推荐 B：只修出问题的那一种窗口。",
   "note": "CSS 媒体查询不能读变量；实现时写成 @media (max-height: <值>px)，并在行尾注明来自本 token"
  },
  {
   "id": "h.first",
   "g": "hierarchy",
   "mod": "timer",
   "label": "先看：剩余时间",
   "type": "check",
   "value": null,
   "maps": [
    ".ptime"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "h.second",
   "g": "hierarchy",
   "mod": "timer",
   "label": "再看：现在是专注还是休息、主按钮在哪",
   "type": "check",
   "value": null,
   "maps": [
    ".pphase",
    ".pbtn"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "h.third",
   "g": "hierarchy",
   "mod": "rec",
   "label": "最后看：今天完成了几个",
   "type": "check",
   "value": null,
   "maps": [
    ".prec"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "h.control",
   "g": "hierarchy",
   "mod": "ctl",
   "label": "唯一的实心按钮是主按钮；跳过明显更弱",
   "type": "check",
   "value": null,
   "maps": [
    ".pbtn",
    ".pskip"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.f.sans",
   "g": "type",
   "mod": "frame",
   "label": "字体族（系统字体，不从外网加载）",
   "type": "family",
   "readonly": true,
   "foundation": true,
   "value": "-apple-system, BlinkMacSystemFont, \"Segoe UI\", \"PingFang SC\", \"Hiragino Sans GB\", \"Microsoft YaHei\", \"Noto Sans CJK SC\", sans-serif",
   "maps": [
    ".pcol"
   ],
   "note": "PRD 技术约束：不从外部网址加载资源，所以不用 Google Fonts；数字取系统西文字体的等宽数字"
  },
  {
   "id": "t.time-size",
   "g": "type",
   "mod": "timer",
   "label": "剩余时间字号（桌面）",
   "type": "px",
   "value": 128,
   "css": "--pomo-time-size",
   "options": [
    112,
    128,
    144
   ],
   "maps": [
    ".ptime"
   ],
   "view": {
    "state": "running"
   },
   "q": "J4 桌面 128px 时数字宽 334，是第二大文字（阶段标签 18px）的 7 倍多；1280×720 笔记本上整组内容要 347 高、可用 608，还很宽裕。128 保持，还是 144 更醒目 / 112 更安静？"
  },
  {
   "id": "t.time-size-mob",
   "g": "type",
   "mod": "timer",
   "label": "剩余时间字号（手机 / 矮屏）",
   "type": "px",
   "value": 80,
   "css": "--pomo-time-size-mob",
   "options": [
    72,
    80,
    96
   ],
   "maps": [
    ".ptime"
   ],
   "view": {
    "state": "running"
   },
   "q": "J5 390 手机 80px 时数字宽 209、占列 61%；360×640 小屏也放得下（要 299 / 可用 528）。但手机横屏 844×390 宽度不触发手机字号：内容要 347 高、可用只有 278，溢出 69px，「专注」被顶出屏幕（切「手机横屏」视口看）。接受（横屏少见），还是加一条「窗口太矮也换手机字号」？",
   "note": "矮屏（s.short-bp）也用这个字号"
  },
  {
   "id": "t.time-weight",
   "g": "type",
   "mod": "timer",
   "label": "剩余时间字重",
   "type": "num",
   "value": 300,
   "css": "--pomo-time-weight",
   "options": [
    300,
    400
   ],
   "maps": [
    ".ptime"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.time-lh",
   "g": "type",
   "mod": "timer",
   "label": "剩余时间行高",
   "type": "num",
   "value": 1,
   "css": "--pomo-time-lh",
   "options": [
    1,
    1.2
   ],
   "maps": [
    ".ptime"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.phase-size",
   "g": "type",
   "mod": "timer",
   "label": "阶段标签字号",
   "type": "px",
   "value": 18,
   "css": "--pomo-phase-size",
   "options": [
    16,
    18,
    20
   ],
   "maps": [
    ".pphase"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.phase-weight",
   "g": "type",
   "mod": "timer",
   "label": "阶段标签字重",
   "type": "num",
   "value": 500,
   "css": "--pomo-phase-weight",
   "options": [
    400,
    500,
    600
   ],
   "maps": [
    ".pphase"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.status-size",
   "g": "type",
   "mod": "timer",
   "label": "状态说明字号",
   "type": "px",
   "value": 16,
   "css": "--pomo-status-size",
   "options": [
    14,
    16,
    18
   ],
   "maps": [
    ".pstatus"
   ],
   "view": {
    "state": "paused"
   }
  },
  {
   "id": "t.btn-size",
   "g": "type",
   "mod": "ctl",
   "label": "按钮字号",
   "type": "px",
   "value": 16,
   "css": "--pomo-btn-size",
   "options": [
    16,
    18
   ],
   "maps": [
    ".pbtn",
    ".pskip"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.btn-weight",
   "g": "type",
   "mod": "ctl",
   "label": "主按钮字重",
   "type": "num",
   "value": 500,
   "css": "--pomo-btn-weight",
   "options": [
    400,
    500,
    600
   ],
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.rec-size",
   "g": "type",
   "mod": "rec",
   "label": "今日完成数字号",
   "type": "px",
   "value": 16,
   "css": "--pomo-rec-size",
   "options": [
    14,
    16
   ],
   "maps": [
    ".prec"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.rec-num-weight",
   "g": "type",
   "mod": "rec",
   "label": "完成数里数字的字重",
   "type": "num",
   "value": 600,
   "css": "--pomo-rec-num-weight",
   "options": [
    400,
    500,
    600
   ],
   "maps": [
    ".prec b"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "t.notice-size",
   "g": "type",
   "mod": "rec",
   "label": "存储提示字号",
   "type": "px",
   "value": 14,
   "css": "--pomo-notice-size",
   "options": [
    14,
    16
   ],
   "maps": [
    ".pnotice"
   ],
   "view": {
    "state": "running",
    "toggle": "nosave"
   }
  },
  {
   "id": "t.label-lh",
   "g": "type",
   "mod": "frame",
   "label": "小字行高（阶段、状态、完成数、提示）",
   "type": "num",
   "value": 1.5,
   "css": "--pomo-label-lh",
   "options": [
    1.2,
    1.5
   ],
   "maps": [
    ".pphase",
    ".pstatus",
    ".prec",
    ".pnotice"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "c.f.background",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --background：纸底",
   "type": "color",
   "value": "#FAF8F4",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.surface",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --surface：浅一层的纸（跳过按钮悬停）",
   "type": "color",
   "value": "#F2EFE9",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.foreground",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --foreground：墨色主文字",
   "type": "color",
   "value": "#22201C",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.muted-foreground",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --muted-foreground：次要文字",
   "type": "color",
   "value": "#5F5A52",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.border",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --border：细线（本页暂未用）",
   "type": "color",
   "value": "#DDD8CF",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.focus",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --focus：专注阶段色（砖红）",
   "type": "color",
   "value": "#A3412D",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.focus-strong",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --focus-strong：专注阶段色·深（悬停）",
   "type": "color",
   "value": "#8A3524",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.break",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --break：休息阶段色（灰青）",
   "type": "color",
   "value": "#3B6870",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.break-strong",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --break-strong：休息阶段色·深（悬停）",
   "type": "color",
   "value": "#30575E",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.on-accent",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --on-accent：实心按钮上的字",
   "type": "color",
   "value": "#FAF8F4",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.f.warning",
   "g": "color",
   "mod": "frame",
   "label": "站点色 --warning：提醒色（存储提示）",
   "type": "color",
   "value": "#85561A",
   "readonly": true,
   "foundation": true,
   "maps": [
    ".pcol"
   ]
  },
  {
   "id": "c.time",
   "g": "color",
   "mod": "timer",
   "label": "剩余时间颜色",
   "type": "colorref",
   "value": "foreground",
   "css": "--pomo-time-color",
   "options": [
    "foreground",
    "muted-foreground"
   ],
   "maps": [
    ".ptime"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "c.phase-focus",
   "g": "color",
   "mod": "timer",
   "label": "阶段标签·专注",
   "type": "colorref",
   "value": "focus",
   "css": "--pomo-phase-focus",
   "options": [
    "focus",
    "foreground",
    "muted-foreground"
   ],
   "maps": [
    ".pphase"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "c.phase-break",
   "g": "color",
   "mod": "timer",
   "label": "阶段标签·休息",
   "type": "colorref",
   "value": "break",
   "css": "--pomo-phase-break",
   "options": [
    "break",
    "foreground",
    "muted-foreground"
   ],
   "maps": [
    ".pphase"
   ],
   "view": {
    "state": "break"
   }
  },
  {
   "id": "c.status",
   "g": "color",
   "mod": "timer",
   "label": "状态说明颜色",
   "type": "colorref",
   "value": "muted-foreground",
   "css": "--pomo-status-color",
   "options": [
    "muted-foreground",
    "foreground"
   ],
   "maps": [
    ".pstatus"
   ],
   "view": {
    "state": "paused"
   }
  },
  {
   "id": "c.btn-bg-focus",
   "g": "color",
   "mod": "ctl",
   "label": "主按钮底色·专注",
   "type": "colorref",
   "value": "focus",
   "css": "--pomo-btn-bg-focus",
   "options": [
    "focus",
    "foreground"
   ],
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "c.btn-bg-focus-hover",
   "g": "color",
   "mod": "ctl",
   "label": "主按钮底色·专注·悬停/按下",
   "type": "colorref",
   "value": "focus-strong",
   "css": "--pomo-btn-bg-focus-hover",
   "options": [
    "focus-strong",
    "foreground"
   ],
   "maps": [
    ".pbtn.is-hover"
   ],
   "view": {
    "level": "module"
   }
  },
  {
   "id": "c.btn-bg-break",
   "g": "color",
   "mod": "ctl",
   "label": "主按钮底色·休息",
   "type": "colorref",
   "value": "break",
   "css": "--pomo-btn-bg-break",
   "options": [
    "break",
    "foreground"
   ],
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "break"
   }
  },
  {
   "id": "c.btn-bg-break-hover",
   "g": "color",
   "mod": "ctl",
   "label": "主按钮底色·休息·悬停/按下",
   "type": "colorref",
   "value": "break-strong",
   "css": "--pomo-btn-bg-break-hover",
   "options": [
    "break-strong",
    "foreground"
   ],
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "break"
   }
  },
  {
   "id": "c.btn-fg",
   "g": "color",
   "mod": "ctl",
   "label": "主按钮文字",
   "type": "colorref",
   "value": "on-accent",
   "css": "--pomo-btn-fg",
   "options": [
    "on-accent",
    "background"
   ],
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "c.skip",
   "g": "color",
   "mod": "ctl",
   "label": "跳过按钮文字",
   "type": "colorref",
   "value": "muted-foreground",
   "css": "--pomo-skip-color",
   "options": [
    "muted-foreground",
    "foreground"
   ],
   "maps": [
    ".pskip"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "c.skip-hover-bg",
   "g": "color",
   "mod": "ctl",
   "label": "跳过按钮悬停底色",
   "type": "colorref",
   "value": "surface",
   "css": "--pomo-skip-hover-bg",
   "options": [
    "surface",
    "background"
   ],
   "maps": [
    ".pskip.is-hover"
   ],
   "view": {
    "level": "module"
   }
  },
  {
   "id": "c.rec",
   "g": "color",
   "mod": "rec",
   "label": "完成数文字",
   "type": "colorref",
   "value": "muted-foreground",
   "css": "--pomo-rec-color",
   "options": [
    "muted-foreground",
    "foreground"
   ],
   "maps": [
    ".prec"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "c.rec-num",
   "g": "color",
   "mod": "rec",
   "label": "完成数里的数字",
   "type": "colorref",
   "value": "foreground",
   "css": "--pomo-rec-num-color",
   "options": [
    "foreground",
    "muted-foreground"
   ],
   "maps": [
    ".prec b"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "c.notice",
   "g": "color",
   "mod": "rec",
   "label": "存储提示文字",
   "type": "colorref",
   "value": "warning",
   "css": "--pomo-notice-color",
   "options": [
    "warning",
    "muted-foreground"
   ],
   "maps": [
    ".pnotice"
   ],
   "view": {
    "state": "running",
    "toggle": "nosave"
   }
  },
  {
   "id": "c.ring",
   "g": "color",
   "mod": "ctl",
   "label": "键盘焦点框颜色",
   "type": "colorref",
   "value": "foreground",
   "css": "--pomo-ring-color",
   "options": [
    "foreground",
    "focus"
   ],
   "maps": [
    ".is-focus"
   ],
   "view": {
    "level": "module"
   }
  },
  {
   "id": "c.btn-fill",
   "g": "color",
   "mod": "ctl",
   "label": "主按钮用什么色",
   "type": "enum",
   "value": "阶段色",
   "options": [
    "阶段色",
    "墨色"
   ],
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "running"
   },
   "q": "J6 主按钮用阶段色：专注砖红、休息灰青，阶段一眼可辨，全页唯一的彩色块就是这个按钮；用墨色：更安静，阶段只靠 18px 的标签颜色区分。保持阶段色，还是墨色？"
  },
  {
   "id": "sp.phase-gap",
   "g": "space",
   "mod": "timer",
   "label": "阶段标签 → 剩余时间",
   "type": "px",
   "value": 8,
   "css": "--pomo-phase-gap",
   "options": [
    4,
    8,
    12
   ],
   "maps": [
    ".pphase"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "sp.status-gap",
   "g": "space",
   "mod": "timer",
   "label": "剩余时间 → 状态说明",
   "type": "px",
   "value": 8,
   "css": "--pomo-status-gap",
   "options": [
    4,
    8,
    12
   ],
   "maps": [
    ".pstatus"
   ],
   "view": {
    "state": "paused"
   }
  },
  {
   "id": "sp.ctl-gap",
   "g": "space",
   "mod": "ctl",
   "label": "计时区 → 按钮",
   "type": "px",
   "value": 32,
   "css": "--pomo-ctl-gap",
   "options": [
    24,
    32,
    48
   ],
   "maps": [
    ".pctl"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "sp.btn-gap",
   "g": "space",
   "mod": "ctl",
   "label": "两个按钮之间",
   "type": "px",
   "value": 16,
   "css": "--pomo-btn-gap",
   "options": [
    8,
    16,
    24
   ],
   "maps": [
    ".pctl"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "sp.btn-h",
   "g": "space",
   "mod": "ctl",
   "label": "按钮高度（手指好点）",
   "type": "px",
   "value": 48,
   "css": "--pomo-btn-h",
   "options": [
    48,
    56
   ],
   "maps": [
    ".pbtn",
    ".pskip"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "sp.btn-px",
   "g": "space",
   "mod": "ctl",
   "label": "主按钮左右内距",
   "type": "px",
   "value": 32,
   "css": "--pomo-btn-px",
   "options": [
    24,
    32,
    40
   ],
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "sp.skip-px",
   "g": "space",
   "mod": "ctl",
   "label": "跳过按钮左右内距",
   "type": "px",
   "value": 16,
   "css": "--pomo-skip-px",
   "options": [
    12,
    16,
    24
   ],
   "maps": [
    ".pskip"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "sp.btn-radius",
   "g": "space",
   "mod": "ctl",
   "label": "按钮圆角",
   "type": "px",
   "value": 8,
   "css": "--pomo-btn-radius",
   "options": [
    4,
    8,
    12
   ],
   "maps": [
    ".pbtn",
    ".pskip"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "sp.rec-gap",
   "g": "space",
   "mod": "rec",
   "label": "按钮 → 今日完成数",
   "type": "px",
   "value": 48,
   "css": "--pomo-rec-gap",
   "options": [
    32,
    48,
    64
   ],
   "maps": [
    ".prec"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "sp.ring-w",
   "g": "space",
   "mod": "ctl",
   "label": "键盘焦点框粗细",
   "type": "px",
   "value": 2,
   "css": "--pomo-ring-w",
   "options": [
    2,
    4
   ],
   "maps": [
    ".is-focus"
   ],
   "view": {
    "level": "module"
   }
  },
  {
   "id": "sp.ring-offset",
   "g": "space",
   "mod": "ctl",
   "label": "焦点框离按钮的距离",
   "type": "px",
   "value": 2,
   "css": "--pomo-ring-offset",
   "options": [
    2,
    4
   ],
   "maps": [
    ".is-focus"
   ],
   "view": {
    "level": "module"
   }
  },
  {
   "id": "m.btn-ms",
   "g": "motion",
   "mod": "ctl",
   "label": "按钮悬停变色时长（全页唯一的过渡）",
   "type": "ms",
   "value": 120,
   "css": "--pomo-btn-ms",
   "options": [
    0,
    120,
    200
   ],
   "maps": [
    ".pbtn",
    ".pskip"
   ],
   "view": {
    "state": "running"
   },
   "q": "J7 全页唯一的过渡是按钮悬停变色 120ms；0 是瞬间变色，200 略拖。保持 120？"
  },
  {
   "id": "m.st-running",
   "g": "motion",
   "mod": "timer",
   "label": "专注进行中：砖红「专注」、走秒、主按钮「暂停」；标题 24:59 · 专注",
   "type": "check",
   "value": null,
   "maps": [
    ".ptimer"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "m.st-idle",
   "g": "motion",
   "mod": "timer",
   "label": "首次打开：专注 25:00、主按钮「开始」、今天完成 0 个",
   "type": "check",
   "value": null,
   "maps": [
    ".ptimer"
   ],
   "view": {
    "state": "idle"
   }
  },
  {
   "id": "m.st-paused",
   "g": "motion",
   "mod": "timer",
   "label": "已暂停：数字停住、下面一行「已暂停」、主按钮「继续」",
   "type": "check",
   "value": null,
   "maps": [
    ".pstatus"
   ],
   "view": {
    "state": "paused"
   }
  },
  {
   "id": "m.st-ended",
   "g": "motion",
   "mod": "timer",
   "label": "专注到点：切到灰青「休息 05:00」、状态说明「专注结束」、完成数 +1",
   "type": "check",
   "value": null,
   "maps": [
    ".pstatus"
   ],
   "view": {
    "state": "ended"
   }
  },
  {
   "id": "m.st-break",
   "g": "motion",
   "mod": "timer",
   "label": "休息进行中：灰青「休息」、主按钮也换成灰青",
   "type": "check",
   "value": null,
   "maps": [
    ".ptimer"
   ],
   "view": {
    "state": "break"
   }
  },
  {
   "id": "m.st-nosave",
   "g": "motion",
   "mod": "rec",
   "label": "浏览器不能保存：底部常驻一行提醒色小字，不弹窗、不遮挡",
   "type": "check",
   "value": null,
   "maps": [
    ".pnotice"
   ],
   "view": {
    "state": "running",
    "toggle": "nosave"
   }
  },
  {
   "id": "m.tick",
   "g": "motion",
   "mod": "timer",
   "label": "走秒时数字不左右跳（等宽数字）",
   "type": "check",
   "value": null,
   "maps": [
    ".ptime"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "m.reduced",
   "g": "motion",
   "mod": "ctl",
   "label": "系统开了「减少动态效果」时，按钮变色也不过渡",
   "type": "check",
   "value": null,
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "k.one-accent",
   "g": "consistency",
   "mod": "frame",
   "label": "全页只有一个实心按钮，只用两个阶段色",
   "type": "check",
   "value": null,
   "maps": [
    ".pbtn"
   ],
   "view": {
    "state": "running"
   }
  },
  {
   "id": "k.no-decor",
   "g": "consistency",
   "mod": "frame",
   "label": "无阴影、无卡片、无进度环、无图标、无循环动画",
   "type": "check",
   "value": null,
   "maps": [
    ".pcol"
   ],
   "view": {
    "state": "running"
   }
  }
 ],
 "decisions": {
  "s.col-max": {
   "r": "pass"
  },
  "s.lift": {
   "r": "pass"
  },
  "s.btn-stack": {
   "r": "pass"
  },
  "t.time-size-mob": {
   "r": "pass",
   "note": "横屏把「专注」顶出屏幕不能接受，给几个办法"
  },
  "s.foot-h": {
   "r": "pass"
  },
  "s.gutter": {
   "r": "pass"
  },
  "s.mob-bp": {
   "r": "pass"
  },
  "h.first": {
   "r": "pass"
  },
  "h.second": {
   "r": "pass"
  },
  "h.third": {
   "r": "pass"
  },
  "h.control": {
   "r": "pass"
  },
  "t.f.sans": {
   "r": "pass"
  },
  "t.time-size": {
   "r": "pass"
  },
  "t.time-weight": {
   "r": "pass"
  },
  "t.time-lh": {
   "r": "pass"
  },
  "t.phase-size": {
   "r": "pass"
  },
  "t.phase-weight": {
   "r": "pass"
  },
  "t.status-size": {
   "r": "pass"
  },
  "t.btn-size": {
   "r": "pass"
  },
  "t.btn-weight": {
   "r": "pass"
  },
  "t.rec-size": {
   "r": "pass"
  },
  "t.rec-num-weight": {
   "r": "pass"
  },
  "t.notice-size": {
   "r": "pass"
  },
  "t.label-lh": {
   "r": "pass"
  },
  "c.f.background": {
   "r": "pass"
  },
  "c.f.surface": {
   "r": "pass"
  },
  "c.f.foreground": {
   "r": "pass"
  },
  "c.f.muted-foreground": {
   "r": "pass"
  },
  "c.f.border": {
   "r": "pass"
  },
  "c.f.focus": {
   "r": "pass"
  },
  "c.f.focus-strong": {
   "r": "pass"
  },
  "c.f.break": {
   "r": "pass"
  },
  "c.f.break-strong": {
   "r": "pass"
  },
  "c.f.on-accent": {
   "r": "pass"
  },
  "c.f.warning": {
   "r": "pass"
  },
  "c.time": {
   "r": "pass"
  },
  "c.phase-focus": {
   "r": "pass"
  },
  "c.phase-break": {
   "r": "pass"
  },
  "c.status": {
   "r": "pass"
  },
  "c.btn-bg-focus": {
   "r": "pass"
  },
  "c.btn-bg-focus-hover": {
   "r": "pass"
  },
  "c.btn-bg-break": {
   "r": "pass"
  },
  "c.btn-bg-break-hover": {
   "r": "pass"
  },
  "c.btn-fg": {
   "r": "pass"
  },
  "c.skip": {
   "r": "pass"
  },
  "c.skip-hover-bg": {
   "r": "pass"
  },
  "c.rec": {
   "r": "pass"
  },
  "c.rec-num": {
   "r": "pass"
  },
  "c.notice": {
   "r": "pass"
  },
  "c.ring": {
   "r": "pass"
  },
  "c.btn-fill": {
   "r": "pass"
  },
  "sp.phase-gap": {
   "r": "pass"
  },
  "sp.status-gap": {
   "r": "pass"
  },
  "sp.ctl-gap": {
   "r": "pass"
  },
  "sp.btn-gap": {
   "r": "pass"
  },
  "sp.btn-h": {
   "r": "pass"
  },
  "sp.btn-px": {
   "r": "pass"
  },
  "sp.skip-px": {
   "r": "pass"
  },
  "sp.btn-radius": {
   "r": "pass"
  },
  "sp.rec-gap": {
   "r": "pass"
  },
  "sp.ring-w": {
   "r": "pass"
  },
  "sp.ring-offset": {
   "r": "pass"
  },
  "m.btn-ms": {
   "r": "pass"
  },
  "m.st-running": {
   "r": "pass"
  },
  "m.st-idle": {
   "r": "pass"
  },
  "m.st-paused": {
   "r": "pass"
  },
  "m.st-ended": {
   "r": "pass"
  },
  "m.st-break": {
   "r": "pass"
  },
  "m.st-nosave": {
   "r": "pass"
  },
  "m.tick": {
   "r": "pass"
  },
  "m.reduced": {
   "r": "pass"
  },
  "k.one-accent": {
   "r": "pass"
  },
  "k.no-decor": {
   "r": "pass"
  },
  "s.short-bp": {
   "r": "change"
  }
 },
 "feedback": [
  {
   "t": "A1 手机横屏时「专注」被顶出屏幕，窗口矮的时候也得放得下",
   "ref": "A1",
   "kind": "el",
   "at": "2026-10-23T07:30"
  },
  {
   "t": "B1 主按钮跟着阶段换颜色，一眼知道在专注还是休息，保留",
   "ref": "B1",
   "kind": "el",
   "at": "2026-10-23T07:30"
  },
  {
   "t": "s.short-bp 选 B，横屏能放下了",
   "ref": "s.short-bp",
   "kind": "node",
   "at": "2026-10-23T07:30"
  }
 ],
 "exported": "2026-10-23T07:31:04",
 "baseline": {
  "note": "两轮审查：第 1 轮全部通过、J5 拿不准（横屏溢出）；第 2 轮按 A/B/C 选 B，s.short-bp 0→480。之后按调整后的来。",
  "rounds": 2,
  "changed": 1
 },
 "implCheck": {
  "app": "http://127.0.0.1:4577/index.html",
  "viewport": {
   "w": 1440,
   "h": 900
  },
  "lab": {
   "level": "page",
   "state": "idle"
  },
  "tolerance": 2,
  "waitFor": "[data-ui=time]",
  "pairs": [
   {
    "name": "阶段标签",
    "lab": ".pphase",
    "app": "[data-ui=phase]",
    "props": [
     "y",
     "h"
    ]
   },
   {
    "name": "剩余时间",
    "lab": ".ptime",
    "app": "[data-ui=time]",
    "props": [
     "y",
     "h"
    ]
   },
   {
    "name": "主按钮",
    "lab": ".lvl.page .pbtn",
    "app": "[data-ui=primary]",
    "props": [
     "x",
     "y",
     "w",
     "h"
    ]
   },
   {
    "name": "跳过按钮",
    "lab": ".lvl.page .pskip",
    "app": "[data-ui=skip]",
    "props": [
     "x",
     "y",
     "w",
     "h"
    ]
   },
   {
    "name": "今日完成数",
    "lab": ".prec",
    "app": "[data-ui=count]",
    "props": [
     "y",
     "h"
    ]
   }
  ]
 }
};
