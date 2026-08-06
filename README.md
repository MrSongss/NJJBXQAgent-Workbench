# 南京江北新区政务AI智能体大平台 · 原型

> 面向研发的交互原型。用纯前端 HTML 还原政务智能体平台的完整信息架构、交互流程与视觉规范，
> 供产品对齐与研发实现参考。**所有业务数据均为演示假数据，调用逻辑为前端 mock**，落地时由后端接口替换。

- **当前版本**：见页面右下角版本角标（如 `v1.0.0 · 2026-08-06`），或查看 [changelog.md](changelog.md)。
- **推荐浏览器**：Chrome / Edge（分辨率 ≥ 1366×768）。

---

## 一、这是什么

一个政务办公智能体门户原型。顶部 8 个导航组织平台能力，门户下挂 17 个公文/办公智能体，
每个智能体既有「对话式快速处理」，也有「完整工作台」的端到端流程演示。

- 门户入口：[index.html](index.html)（双击打开）。
- 门户本体：原生 JS，通过 iframe 加载各智能体工作台页。
- 工作台页：部分采用 Vue 3 + Naive UI（CDN 引入），其余为原生 JS + CSS 变量。

---

## 二、目录结构

```text
南京江北新区政务AI智能体平台20260724/
├─ index.html                         ← 门户入口（双击打开）
├─ agent-workbench/                   ← 17 个智能体完整工作台（门户内嵌 iframe 加载）
│   ├─ _shared/
│   │   ├─ adapter.js                 ← 嵌入门户 iframe 时隐藏工作台自身外壳
│   │   └─ handoff-context.js         ← 门户与工作台之间的上下文字段定义
│   ├─ review.html                    ← 辅助文本合规审查
│   ├─ polish.html                    ← 文本智能润色
│   ├─ interpret.html                 ← 政务文件解读
│   ├─ speech.html                    ← 发言稿智能生成
│   ├─ meeting.html                   ← 会议纪要智能生成
│   ├─ notice.html                    ← 通知通告智能生成
│   ├─ summary.html                   ← 工作总结智能生成
│   ├─ news.html                      ← 新闻稿智能生成
│   ├─ contract.html                  ← 合同智能生成及预审
│   ├─ decision.html                  ← 决定决议智能生成
│   ├─ communique.html                ← 公报公告智能生成
│   ├─ ppt.html                       ← 智能政务 PPT 助手
│   ├─ report.html                    ← 报告请示智能生成
│   ├─ reply.html                     ← 批复智能生成
│   ├─ motion.html                    ← 议案智能生成
│   ├─ letter.html                    ← 函件智能生成
│   └─ plan.html                      ← 工作计划编制智能生成
├─ assets/                            ← 图片 / logo / 版本角标脚本（proto-version.js）
├─ scripts/                           ← 工程化脚本（版本印记 stamp.mjs / 发版 release.mjs）
├─ package.json                       ← 版本源（version 字段）
├─ CHANGELOG.md                       ← 变更日志（自动维护）
├─ 使用说明.txt                        ← 面向评审者的使用说明
└─ README.md                          ← 本文件
```

---

## 三、17 个智能体清单

| 工作台文件 | 智能体 | 能力说明 |
| --- | --- | --- |
| review.html | 辅助文本合规审查 | 上传文稿→识别文种→按规则做合规审查，输出问题清单、审查报告与整改留痕闭环 |
| polish.html | 文本智能润色 | 对政务文本按语气/风格/精简度润色改写 |
| interpret.html | 政务文件解读 | 解读政策/文件，提取核心要点与适用信息 |
| speech.html | 发言稿智能生成 | 按发言人、场合、受众、篇幅生成发言稿 |
| meeting.html | 会议纪要智能生成 | 由会议记录/转写生成结构化纪要 |
| notice.html | 通知通告智能生成 | 生成通知、通告等文种 |
| summary.html | 工作总结智能生成 | 按周期、业务领域生成工作总结 |
| news.html | 新闻稿智能生成 | 生成政务新闻稿 |
| contract.html | 合同智能生成及预审 | 拟制合同并对条款做合规预审 |
| decision.html | 决定决议智能生成 | 生成决定、决议 |
| communique.html | 公报公告智能生成 | 生成公报、公告 |
| ppt.html | 智能政务 PPT 助手 | 生成政务汇报 PPT |
| report.html | 报告请示智能生成 | 生成报告、请示 |
| reply.html | 批复智能生成 | 生成批复 |
| motion.html | 议案智能生成 | 生成议案 |
| letter.html | 函件智能生成 | 生成函件 |
| plan.html | 工作计划编制智能生成 | 编制工作计划 |

---

## 四、8 大导航

| 导航 | 说明 |
| --- | --- |
| 主页 | 平台首页，中间对话框输入需求（如「帮我生成一份决定决议」）→ 自动跳转对话页处理 |
| 对话 | 与智能体进行对话式处理 |
| 智能体 | 17 个智能体卡片，点「完整工作台 →」加载该智能体端到端流程演示 |
| 任务流 | 多步骤任务编排与跟踪 |
| 知识库 | 知识库管理 |
| 生成记录 | 历史生成内容记录 |
| 统计报表 | 使用统计与报表 |
| 通用配置 | 平台通用配置 |

工作台顶部：「返回」回门户；「切换」下拉切换其他智能体；「新窗口打开」可单独全屏使用。

---

## 五、如何运行

1. 推荐 Chrome 或 Edge。
2. 双击 [index.html](index.html) 打开。
3. 收到压缩包请先「解压到当前文件夹」再双击，不要在压缩包内直接打开。
   门户会通过相对路径加载 `agent-workbench/` 与 `assets/`，**必须整包分发，不能只发单个 html**。

---

## 六、研发对接说明

### 6.1 门户（index.html）

- 原生 JS 实现，无构建依赖。
- 通过 `openWorkbench(id)` 以 iframe 加载 `agent-workbench/{id}.html`。
- 嵌入时工作台页引入 `_shared/adapter.js`，自动隐藏自身外壳（顶栏/侧栏），避免与门户外壳三层叠加。
- `_shared/handoff-context.js` 定义门户与工作台之间传递的上下文字段（主题、发文单位、日期、文种等）。

### 6.2 工作台页（Vue 3 + Naive UI 类，如 review / speech）

各页顶部注释块含详细对接说明，要点：

1. **CDN → npm 包**：将 `vue@3`、`naive-ui` 的 CDN 引入替换为 npm 包，接入 Vite 脚手架。
2. **template → 单文件组件**：将页面内 template 字符串迁入 `.vue` 的 `<template>`，`setup()` 逻辑迁入 `<script setup>`。
3. **主题与样式原样保留**：`themeOverrides`、`:root` CSS 变量、动效（`keyframes`、`prefers-reduced-motion`）可直接复用。
4. **演示逻辑 → 后端接口**：文件解析、文种识别、合规审查、规则依据、报告生成、审查记录等前端 mock 逻辑，由后端接口替换。

### 6.3 工作台页（原生 JS 类，如 meeting / notice / summary 等）

- 原生 JS + CSS 变量，无框架依赖。
- 交互流程、数据结构、视觉规范同样作为实现参考，逻辑层由后端接口替换。

### 6.4 视觉规范

- 主色：政务深海军蓝体系（`--gov-900: #18245f` 起，见各页 `:root`）。
- 各工作台保持一致的字体、颜色、按钮尺寸、间距，便于复用同一套组件库。
- 部分页面有独立变量命名（如 `--ai-navy`、`--primary`），语义与政务蓝体系一致，可统一收敛。

---

## 七、版本管理

- 唯一版本源：[package.json](package.json) 的 `version`。
- 变更日志：[CHANGELOG.md](CHANGELOG.md)，由 `npm run release` 按 Conventional Commits 自动归类生成。
- 版本角标：每个 HTML 右下角的 `vX.Y.Z · 日期` 由 `assets/proto-version.js` 读取 `<meta name="prototype-version">` 渲染；点击可隐藏。
- 发版包：`releases/` 下为带版本号的离线交付包（含 CHANGELOG），整包交研发即可。`releases/` 不纳入版本库。

---

## 八、工程化脚本（可选，供原型维护者使用）

| 命令 | 作用 |
| --- | --- |
| `npm run stamp:init` | 给新增 HTML 注入版本印记占位（meta + 角标脚本，幂等） |
| `npm run release -- patch` | 发版：bump 版本 → 生成 CHANGELOG → 打 tag → 产出 releases/ 发版包 |
| `npm run release -- 1.2.0` | 指定显式版本号发版 |

提交规范（便于自动生成可读变更日志）：`feat:` 新增 / `fix:` 修复 / `style:` 样式 / `refactor:` 重构 / `docs:` 文档 / `chore:` 杂项。
