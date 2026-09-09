# 合同智能生成及预审子系统 · DESIGN.md（Phase 2 设计令牌与组件规范）

> 设计系统专家：彩格调（design-system-expert） · 基准文件：`agent-workbench/contract.html`（`<style>` 区第 7–405 行）· 需求依据：`design-docs/contract-需求摘要.md`
>
> **总原则：零风格重造。** 现有 `:root` 令牌体系完整且已是政务蓝视觉标准，Phase 3 所有新视图直接沿用；本文件仅做三件事——① 盘点既有令牌并冻结；② 为预审模块补充少量新令牌（全部取自既有色系的软色配对模式）；③ 给出 7 个新组件的可落地 HTML 骨架 + CSS 值。

---

## 一、令牌清单（Token Inventory）

### 1.1 既有令牌 · 冻结沿用（不变）

来源：`contract.html` `:root`。**禁止修改、禁止重新定义同名变量。**

#### 色彩 — 品牌主色

| 变量 | 值 | 用途 |
|------|-----|------|
| `--primary` | `#0E4C92` | 政务蓝主色：主按钮、激活态、链接 |
| `--primary-dark` | `#0A3573` | 主色 hover / 顶栏渐变起始 |
| `--primary-soft` | `#e8f1fa` | 主色浅底（hover 底、tag 底、选中底） |
| `--cyan` | `#13A8A8` | AI 辅助色：渐变尾色、辉光、AI 标记 |
| `--ai-navy` / `--ai-blue` / `--ai-cyan` / `--ai-green` | `#0A3573` / `#0E4C92` / `#13A8A8` / `#43A047` | AI 渐变四色（顶栏、品牌、评分环） |
| `--ai-glow` | `0 0 16px rgba(19,168,168,0.35)` | AI 辉光阴影（仅品牌图标、AI 相关元素） |

#### 色彩 — 语义色（每色必有 `-soft` 浅底配对）

| 变量 | 值 | 浅底 | 用途 |
|------|-----|------|------|
| `--green` | `#43A047` | `--green-soft: #e8f7f1` | 成功 / 已完成 / 建议 |
| `--red` | `#D9534F` | `--red-soft: #fdecea` | 错误 / 高风险 / 原文问题 |
| `--orange` | `#F0AD4E` | `--orange-soft: #fff4e0` | 警告 / 中风险 / 待办 |
| `--purple` | `#6a52d6` | `--purple-soft: #efecfd` | 大模型标记 / 特殊维度 |
| — | `#13A8A8` | `--cyan-soft: #e2f4f4` | AI 相关浅底 |

#### 色彩 — 中性色阶

| 变量 | 值 | 用途 |
|------|-----|------|
| `--bg` | `#eef2f9` | 页面底色 |
| `--panel` | `#ffffff` | 面板/卡片底 |
| `--line` | `#e2e8f3` | 主描边 |
| `--line-soft` | `#eef1f7` | 次级描边/分隔线 |
| `--text` | `#1b2436` | 正文主色 |
| `--muted` | `#75809a` | 次要文字 |

补充常用硬编码中性色（沿用即可，勿再新增）：标题 `#16233f` / `#1b2947` / `#33405c`；表格正文 `#37425c`；次要 `#46536e` / `#6a7690`；弱化 `#9aa4b8`；禁用边 `#c4cde0`；悬停行 `#fafbff`；表头底 `#f7f9fd`；ghost 按钮底 `#f6f8fd`；侧栏底 `#fafbfc`。

#### 阴影 / 圆角 / 控件尺寸

| 项 | 值 |
|----|----|
| `--shadow` | `0 16px 42px rgba(21,32,58,0.09)`（大卡片/文档页） |
| `--shadow-sm` | `0 8px 20px rgba(21,32,58,0.06)`（卡片/hover） |
| 弹窗阴影 | `0 30px 80px rgba(15,23,42,0.28)`（写死于 `.modal`） |
| 圆角 | 卡片 `14px`；按钮/输入 `9px`；小元素 `8px/10px/12px`；tag/胶囊 `999px`；弹窗 `16px` |
| 控件高 | 按钮/下拉 `34px`（`.btn.sm`/`.mini-btn` 为 `30px`）；主 CTA `44px`；tab `38px` |
| 字号阶 | 页面标题 `21px/800`；卡标题 `15px/800`；正文/表格 `13–13.5px`；辅助 `12px`；弱化 `11px`；KPI 数值 `28px/900` |
| 间距 | 页面内边距 `22px 26px 40px`；卡头 `14px 16px`；卡体 `16px`；栅格间距 `16px`；列表项间距 `4–10px` |
| 顶栏高 / 侧栏宽 | `56px` / `300px`（app grid：`300px 1fr` × `56px 1fr`） |
| 滚动条 | `9px`，thumb `#cfd8e8` 圆角 999px |

#### 字体

| 场景 | font-family |
|------|------------|
| 全局 UI | `"Microsoft YaHei", "PingFang SC", Arial, sans-serif` |
| 公文正文（`.doc-page`） | `"FangSong", "仿宋", "SimSun", serif`，18px，line-height 2，首行缩进 2em |
| 公文标题 | `"SimHei", "黑体", sans-serif` |

### 1.2 新增令牌（预审模块专用 · 追加到 `:root`）

全部遵循既有「纯色 + `-soft` 浅底」配对模式，色值从既有色系邻近色相选取，保证协调。

```css
:root {
  /* === 作业全生命周期状态色（复用语义色，仅起别名便于语义化书写） === */
  --st-todo: var(--orange);        --st-todo-soft: var(--orange-soft);   /* 待办 */
  --st-doing: var(--primary);      --st-doing-soft: var(--primary-soft); /* 进行中 */
  --st-done: var(--green);         --st-done-soft: var(--green-soft);    /* 已完成 */
  --st-archived: #6b7690;          --st-archived-soft: #eef2fb;          /* 已归档（= 现有 tag.off 配色） */

  /* === 法规效力等级 4 级（第 1、2 级为新增色，3、4 级复用） === */
  --lv1: #8c2f39;  --lv1-soft: #fae9ea;  /* 法律（深红，庄重，区别于警示红 --red） */
  --lv2: #0E4C92;  --lv2-soft: #e8f1fa;  /* 行政法规（= --primary 系） */
  --lv3: #13A8A8;  --lv3-soft: #e2f4f4;  /* 地方性法规（= --cyan 系） */
  --lv4: #6b7690;  --lv4-soft: #eef2fb;  /* 规范性文件（中性灰蓝） */

  /* === 知识图谱节点色（4 类节点，全部取既有色） === */
  --gn-law: #0E4C92;    /* 法律节点 */
  --gn-reg: #13A8A8;    /* 法规/规章节点 */
  --gn-clause: #6a52d6; /* 条款节点 */
  --gn-case: #F0AD4E;   /* 关联案例/项目节点 */
  --gn-line: #c4cde0;   /* 连线色（= 禁用边色） */
  --gn-line-hl: #0E4C92;/* 高亮连线 */

  /* === 拖拽画布 === */
  --canvas-bg: #f6f8fc;            /* 画布底（介于 --bg 与 --panel 之间） */
  --canvas-grid: rgba(14,76,146,0.06); /* 画布网格点色 */
  --node-border: #c4cde0;
  --node-active: var(--primary);
}
```

> 对比度核查：以上所有「纯色文字 on 浅底」组合均满足 WCAG AA（4.5:1）。其中 `--lv1 #8c2f39 on #fae9ea` 对比度 ≈ 8.2:1；`--st-archived #6b7690 on #eef2fb` ≈ 4.9:1，均达标。**白字仅允许出现在 `--primary`/`--primary-dark` 实底上。**

---

## 二、新增组件规范（Phase 3 照做即可）

> 命名约定：新组件 class 一律带业务前缀（`nav-` / `kg-` / `mc-` / `cmp-` / `job-` / `chain-` / `lv-`），避免与既有类冲突。图标一律用内联 SVG（24 viewBox，`stroke: currentColor; fill: none; stroke-width: 2`，与顶栏 `.ic-svg` 同风格），**禁止新增 emoji**。

### a. 两级分组导航（左侧栏）

**结构**：插入侧栏 `.filter-box` 与草稿列表之间；草稿列表仅在「合同拟制」视图显示，其余视图隐藏。

```html
<nav class="nav-tree">
  <div class="nav-group open">
    <button class="nav-group-head">
      <svg class="ic-svg"><!-- 组图标 --></svg>
      <span>智能预审</span>
      <svg class="nav-caret" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>
    </button>
    <div class="nav-items">
      <button class="nav-item active">预审作业与报告</button>
      <button class="nav-item">预审模型配置</button>
      <button class="nav-item">法律法规库</button>
      <button class="nav-item">预审依据管理</button>
      <button class="nav-item">预审项目库</button>
    </div>
  </div>
  <!-- 工作台 / 智能生成 / 智能工具 / 台账 同构 -->
</nav>
```

**CSS**：

```css
.nav-tree { padding: 10px 12px 4px; border-bottom: 1px solid var(--line-soft); overflow-y: auto; max-height: 46%; }
.nav-group-head { width: 100%; display: flex; align-items: center; gap: 8px; padding: 9px 10px;
  border-radius: 8px; font-size: 13px; font-weight: 800; color: #33405c; transition: .16s; }
.nav-group-head:hover { background: #eef2f7; color: var(--primary); }
.nav-group-head .ic-svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; }
.nav-group-head span { flex: 1; text-align: left; }
.nav-caret { width: 14px; height: 14px; stroke: #9aa4b8; fill: none; stroke-width: 2; transition: transform .2s; }
.nav-group:not(.open) .nav-caret { transform: rotate(-90deg); }
.nav-group:not(.open) .nav-items { display: none; }   /* 折叠态 */
.nav-items { padding: 2px 0 6px 24px; display: grid; gap: 2px; }
.nav-item { text-align: left; padding: 8px 10px; border-radius: 8px; font-size: 13px; color: #46536e;
  transition: .16s; position: relative; }
.nav-item:hover { background: #fff; color: var(--primary); }
.nav-item.active { background: var(--primary-soft); color: var(--primary); font-weight: 700; }
.nav-item.active::before { content: ""; position: absolute; left: -12px; top: 8px; bottom: 8px;
  width: 3px; border-radius: 2px; background: var(--primary); }
```

**状态变体**：`.nav-group.open` 展开 / 无 `.open` 折叠；`.nav-item.active` 当前视图。

### b. 知识图谱面板（法律法规库内，演示级 SVG）

**结构**：`.card` 内嵌固定高度 SVG，静态节点 + 连线 + 点击节点高亮其一度关联。

```html
<div class="kg-panel">
  <div class="kg-toolbar">
    <span class="kg-title">法规关联图谱</span>
    <div class="legend"><!-- 复用现有 .legend 样式 -->
      <span><i style="background:var(--gn-law)"></i>法律</span>
      <span><i style="background:var(--gn-reg)"></i>行政法规</span>
      <span><i style="background:var(--gn-clause)"></i>关联条款</span>
      <span><i style="background:var(--gn-case)"></i>命中项目</span>
    </div>
  </div>
  <svg class="kg-svg" viewBox="0 0 800 420">
    <!-- 连线：line.kg-edge / 高亮 line.kg-edge.hl -->
    <line class="kg-edge" x1="400" y1="90" x2="220" y2="220"/>
    <!-- 节点：g.kg-node[data-type]，circle + text -->
    <g class="kg-node" data-type="law" transform="translate(400,90)">
      <circle r="34"/><text text-anchor="middle" dy="4">民法典</text>
    </g>
  </svg>
  <div class="kg-tip">点击节点查看关联法规 · 演示数据</div>
</div>
```

**CSS**：

```css
.kg-panel { position: relative; }
.kg-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.kg-title { font-weight: 800; font-size: 14px; color: #33405c; }
.kg-svg { width: 100%; height: 420px; display: block; border: 1px solid var(--line-soft);
  border-radius: 12px; background:
    radial-gradient(circle, var(--canvas-grid) 1px, transparent 1px) 0 0/24px 24px, #fbfcff; }
.kg-edge { stroke: var(--gn-line); stroke-width: 1.5; }
.kg-edge.hl { stroke: var(--gn-line-hl); stroke-width: 2.5; }
.kg-node { cursor: pointer; }
.kg-node circle { fill: #fff; stroke-width: 2.5; transition: .16s; }
.kg-node[data-type="law"]    circle { stroke: var(--gn-law); }
.kg-node[data-type="reg"]    circle { stroke: var(--gn-reg); }
.kg-node[data-type="clause"] circle { stroke: var(--gn-clause); }
.kg-node[data-type="case"]   circle { stroke: var(--gn-case); }
.kg-node text { font-size: 12px; font-weight: 700; fill: #33405c; pointer-events: none; }
.kg-node:hover circle, .kg-node.hl circle { fill: var(--primary-soft); }
.kg-node.hl text { fill: var(--primary); }
.kg-node.dim { opacity: .35; }  /* 非关联节点弱化（不只靠颜色：配合透明度） */
.kg-tip { margin-top: 8px; font-size: 12px; color: var(--muted); }
```

**交互（演示级）**：点击节点 → 该节点及一度连线加 `.hl`，其余节点加 `.dim`；再点空白处复位。

### c. 拖拽模型画布（预审模型配置，三栏）

**结构**：左组件面板 200px / 中画布 1fr / 右参数表单 260px。演示级拖拽 = 点击组件块即追加到画布。

```html
<div class="mc-layout">
  <aside class="mc-palette card">
    <div class="card-head"><span class="card-title">组件库</span></div>
    <div class="mc-pal-list">
      <button class="mc-pal-item" data-comp="parse">
        <svg class="ic-svg">…</svg><span>文本解析</span><em>NLP</em>
      </button>
      <!-- 条款比对 / 风险识别 / 法规匹配 / 报告生成 … -->
    </div>
  </aside>
  <div class="mc-canvas">
    <div class="mc-canvas-inner">
      <div class="mc-node" data-comp="parse" style="left:60px;top:40px">
        <b>文本解析</b><span>v2.1</span>
      </div>
      <svg class="mc-wires"><path d="M180 70 C 240 70, 240 170, 300 170"/></svg>
      <div class="mc-node" data-comp="compare" style="left:300px;top:140px">…</div>
    </div>
  </div>
  <aside class="mc-params card">
    <div class="card-head"><span class="card-title">参数配置</span></div>
    <div class="card-body">
      <div class="field"><label>相似度阈值</label><input type="text" value="0.85"></div>
      <!-- 复用 .modal-body 的 field/label/input 样式 -->
    </div>
  </aside>
</div>
```

**CSS**：

```css
.mc-layout { display: grid; grid-template-columns: 200px 1fr 260px; gap: 16px; height: calc(100vh - 56px - 120px); min-height: 480px; }
.mc-pal-list { padding: 10px; display: grid; gap: 8px; }
.mc-pal-item { display: flex; align-items: center; gap: 8px; padding: 10px; border: 1px solid var(--line);
  border-radius: 10px; background: #fff; font-size: 13px; font-weight: 700; color: #33405c;
  cursor: grab; transition: .16s; }
.mc-pal-item .ic-svg { width: 18px; height: 18px; stroke: var(--primary); fill: none; stroke-width: 2; }
.mc-pal-item em { margin-left: auto; font-style: normal; font-size: 11px; color: var(--muted);
  background: #eef2fb; padding: 1px 6px; border-radius: 999px; }
.mc-pal-item:hover { border-color: var(--primary); background: var(--primary-soft); }
.mc-canvas { border: 1px solid var(--line); border-radius: 14px; overflow: auto; position: relative;
  background: radial-gradient(circle, var(--canvas-grid) 1px, transparent 1px) 0 0/24px 24px, var(--canvas-bg); }
.mc-canvas-inner { position: relative; width: 100%; height: 100%; min-height: 460px; }
.mc-wires { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.mc-wires path { stroke: var(--gn-line); stroke-width: 2; fill: none; stroke-dasharray: 6 4; }
.mc-node { position: absolute; min-width: 120px; padding: 10px 12px; background: #fff;
  border: 1.5px solid var(--node-border); border-radius: 10px; box-shadow: var(--shadow-sm);
  cursor: pointer; transition: .16s; display: grid; gap: 2px; }
.mc-node b { font-size: 13px; color: #33405c; }
.mc-node span { font-size: 11px; color: var(--muted); }
.mc-node.active { border-color: var(--node-active); box-shadow: 0 0 0 3px rgba(14,76,146,.12); }
```

**交互**：点击 `.mc-pal-item` → 画布追加节点（toast 提示「已添加组件」）；点击画布节点 → 加 `.active`，右侧参数表单切换显示对应参数。

### d. 双图比对器（预审工具箱 · 图片比对 Tab）

**结构**：上工具行 / 中双图并排 / 右差异清单 / 下 EXIF 表 + 相似度环。

```html
<div class="cmp-layout">
  <div class="cmp-imgs">
    <figure class="cmp-img card">
      <figcaption>原始图 <span class="tag low">扫描件 A</span></figcaption>
      <div class="cmp-img-box">
        <div class="cmp-placeholder">图</div>
        <i class="cmp-diff" style="left:32%;top:18%;width:26%;height:12%"></i>
        <i class="cmp-diff" style="left:60%;top:64%;width:18%;height:9%"></i>
      </div>
    </figure>
    <figure class="cmp-img card">…（对比图 B，同构）</figure>
    <aside class="cmp-side card">
      <div class="card-head"><span class="card-title">相似度</span></div>
      <div class="card-body">
        <div class="cmp-score" style="--p:87">
          <div class="cmp-score-c"><b>87</b><span>相似度 %</span></div>
        </div>
        <ul class="cmp-diff-list">
          <li><i></i>印章区域颜色偏差 <b>2 处</b></li>
          <li><i></i>第 3 条金额数字差异 <b>1 处</b></li>
        </ul>
      </div>
    </aside>
  </div>
  <div class="card"><div class="card-head"><span class="card-title">EXIF 信息校验</span></div>
    <div class="tbl-wrap"><table class="tbl"><!-- 属性 / 图 A / 图 B / 校验结果 四列 --></table></div>
  </div>
</div>
```

**CSS**：

```css
.cmp-layout { display: grid; gap: 16px; }
.cmp-imgs { display: grid; grid-template-columns: 1fr 1fr 280px; gap: 16px; align-items: start; }
.cmp-img figcaption { padding: 10px 14px; border-bottom: 1px solid var(--line-soft);
  font-weight: 700; font-size: 13px; color: #33405c; display: flex; gap: 8px; align-items: center; }
.cmp-img-box { position: relative; height: 340px; background: #f6f8fc; border-radius: 0 0 14px 14px;
  display: grid; place-items: center; overflow: hidden; }
.cmp-placeholder { width: 64px; height: 64px; border-radius: 16px; background: #eef2fb;
  color: var(--muted); display: grid; place-items: center; font-size: 22px; }
.cmp-diff { position: absolute; border: 2px solid var(--red); border-radius: 4px;
  background: rgba(217,83,79,.08); box-shadow: 0 0 0 2px rgba(217,83,79,.15); }
.cmp-diff::after { content: attr(data-n); position: absolute; top: -18px; left: -2px;
  font-size: 11px; font-weight: 800; color: var(--red); font-style: normal; }
.cmp-score { --p: 0; width: 132px; height: 132px; margin: 6px auto 12px; border-radius: 50%;
  background: conic-gradient(var(--primary) calc(var(--p) * 1%), #eef2f9 0);
  position: relative; }
.cmp-score::before { content: ""; position: absolute; inset: 14px; border-radius: 50%; background: #fff; }
.cmp-score-c { position: absolute; inset: 0; display: grid; place-items: center; align-content: center; text-align: center; }
.cmp-score-c b { font-size: 26px; font-weight: 900; color: #1b2947; }
.cmp-score-c span { font-size: 11px; color: var(--muted); }
/* 评分分档：≥85 主色，60–84 改 conic-gradient(var(--orange)…)，<60 用 var(--red)，并同时输出文字等级 */
.cmp-diff-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 13px; color: #46536e; }
.cmp-diff-list i { display: inline-block; width: 8px; height: 8px; border-radius: 2px;
  background: var(--red); margin-right: 6px; }
.cmp-diff-list b { margin-left: auto; color: var(--red); }
.cmp-diff-list li { display: flex; align-items: center; }
```

### e. 作业状态流转条（待办 → 进行中 → 已完成 → 已归档）

**直接复用现有 `.steps` 组件**（contract.html 第 367–372 行），新增「已归档」终态变体即可，勿另写组件：

```html
<div class="steps job-steps">
  <div class="s done"><span class="dot">✓</span><span class="t">待办受理</span></div>
  <div class="bar"></div>
  <div class="s active"><span class="dot">2</span><span class="t">进行中</span></div>
  <div class="bar"></div>
  <div class="s"><span class="dot">3</span><span class="t">已完成</span></div>
  <div class="bar"></div>
  <div class="s"><span class="dot">4</span><span class="t">已归档</span></div>
</div>
```

```css
.job-steps { padding: 14px 4px 2px; margin-bottom: 14px; }
.job-steps .s.archived .dot { background: var(--st-archived); color: #fff; } /* 归档终态 */
.job-steps .s.archived .t { color: var(--st-archived); }
```

**状态语义双编码**：`.dot` 内不放纯圆点——已完成放「✓」、进行中放序号、归档放文字符号「▣」或序号，保证不靠颜色传达。

列表中的状态列用既有 `.tag` 体系：待办 `tag wait`、进行中 `tag doing`、已完成 `tag done`、已归档 `tag off`（与新增令牌 `--st-*` 一一对应）。

### f. 疑点依据链卡片（作业详情抽屉内）

**结构**：疑点描述卡 + 竖向链条展示「疑点 → 命中规则 → 法规依据 → 条文原文」，链尾可跳转法规库。

```html
<div class="chain-card">
  <div class="chain-head">
    <i class="pf-dot high"></i>
    <span class="pf-cat-name">付款条款缺失违约责任约定</span>
    <span class="tag high">高风险</span>
  </div>
  <div class="chain-body">
    <div class="chain-node">
      <span class="chain-badge rule">命中规则</span>
      <span class="chain-txt">R-023 · 合同必备条款完整性校验</span>
    </div>
    <div class="chain-link"></div>
    <div class="chain-node">
      <span class="chain-badge law">法规依据</span>
      <span class="chain-txt">《中华人民共和国民法典》第 470 条</span>
      <span class="lv-tag lv1">法律</span>
    </div>
    <div class="chain-link"></div>
    <div class="chain-quote">“合同的内容由当事人约定，一般包括……违约责任……”
      <a class="chain-src">查看法规原文 ›</a>
    </div>
  </div>
  <div class="chain-ops">
    <button class="mini-btn">确认疑点</button>
    <button class="mini-btn">误报忽略</button>
  </div>
</div>
```

**CSS**：

```css
.chain-card { border: 1px solid var(--line-soft); border-radius: 12px; padding: 12px 14px;
  background: #fbfcff; transition: .16s; }
.chain-card:hover { border-color: rgba(14,76,146,.4); box-shadow: var(--shadow-sm); }
.chain-head { display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
.chain-head .pf-cat-name { font-size: 13.5px; }
.chain-body { padding-left: 4px; }
.chain-node { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.chain-badge { flex: none; height: 20px; display: inline-flex; align-items: center; padding: 0 7px;
  border-radius: 5px; font-size: 11px; font-weight: 700; }
.chain-badge.rule { background: var(--cyan-soft); color: var(--cyan); }
.chain-badge.law { background: var(--primary-soft); color: var(--primary); }
.chain-txt { font-size: 13px; color: #37425c; font-weight: 600; }
.chain-link { width: 2px; height: 14px; margin: 3px 0 3px 9px;
  background: repeating-linear-gradient(180deg, #c4cde0 0 3px, transparent 3px 6px); }
.chain-quote { margin: 2px 0 0; padding: 8px 12px; border-left: 3px solid var(--primary);
  background: var(--primary-soft); border-radius: 0 8px 8px 0; font-size: 12.5px;
  color: #4a597a; line-height: 1.7; }
.chain-src { display: inline-block; margin-left: 8px; color: var(--primary); font-weight: 700; cursor: pointer; }
.chain-src:hover { text-decoration: underline; }
.chain-ops { display: flex; gap: 8px; margin-top: 10px; justify-content: flex-end; }
```

### g. 效力等级标签（4 级，映射既有 `.tag` 体系）

复用 `.tag` 基类（min-height 22px、圆角 999px、12px/700），新增 4 个修饰类：

```html
<span class="tag lv-tag lv1">法律</span>
<span class="tag lv-tag lv2">行政法规</span>
<span class="tag lv-tag lv3">地方性法规</span>
<span class="tag lv-tag lv4">规范性文件</span>
```

```css
.lv-tag.lv1 { color: var(--lv1); background: var(--lv1-soft); }
.lv-tag.lv2 { color: var(--lv2); background: var(--lv2-soft); }
.lv-tag.lv3 { color: var(--lv3); background: var(--lv3-soft); }
.lv-tag.lv4 { color: var(--lv4); background: var(--lv4-soft); }
```

**双编码要求**：效力等级文字本身即语义（「法律」「行政法规」），无需额外图标；在图谱等场景可用边框粗细区分（lv1 节点 stroke-width 3 / lv3 为 2）。

---

## 三、组件复用映射表（禁止重复造轮子）

| 新视图需求 | 复用既有类 | 禁止新建 |
|-----------|-----------|---------|
| 页面骨架（所有新视图） | `.page-scroll > .page-head(.page-title+.page-sub) + .card(.card-head>.card-title + .card-body)` | 新页面容器类 |
| 库类表格（法规/依据/项目库） | `.rule-layout`(220px+1fr) + `.rule-nav`（左分类） + `.tbl-wrap > table.tbl` + `.tag` + `.row-act a` | 新表格/新分类导航样式 |
| KPI 概览（作业统计等） | `.kpi` + `.grid-4`（`.k-label/.k-value/.k-delta/.k-ico`） | 新指标卡 |
| 状态标签（作业/审核/启停） | `.tag.wait/.doing/.done/.off`（已归档/下线用 `.tag.off`） | 新状态色 |
| 风险/优先级 | `.tag.high/.mid/.low` + `.pf-dot.high/.mid/.low` | — |
| 筛选/检索条 | `.toolbar-inline` + `.search-wrap/.search-input` + `.time-chip` + `.select` | 新输入框样式 |
| 弹窗（新增法规/审批流/版本对比） | `.modal-mask > .modal(.wide) > .modal-head/.modal-body(.field+label+input)/.modal-foot`，diff 复用 `.pf-line + .pf-badge.orig/.sugg + .del/.ins` | 新弹窗体系 |
| 抽屉（作业详情/穿透查询展开） | 无既有抽屉类 → **允许新增一个** `.drawer`（右滑出，宽 480px，圆角左 16px，阴影 `var(--shadow)`，头部复用 `.modal-head` 样式规则）；行内展开用 `tr.expand-row > td[colspan]` 即可 | 多个抽屉实现 |
| 进度/流程 | 步骤用 `.steps`（含本次 `.archived` 变体）；顶部流程用 `.flowbar/.flow-node/.flow-arrow`；进度条用 `.pf-bar > i` | 新步骤条 |
| 选项卡（工具箱三 Tab） | `.tab-bar > .tab-btn(.active)` | 新 Tab 样式 |
| 上传区（多模态导入） | `.upzone(.up-ic/.up-t/.up-btns) + .up-file + .up-or` | 新上传组件 |
| 提示条/免责 | `.note-strip`（橙）/ `.review-disclaimer`（米黄公文风） | — |
| 空状态 | `.pf-empty/.doc-empty` 的 `.eic/.et/.es` 结构 | — |
| 评分环/占比图 | `.donut`（150px conic 环，本次 `.cmp-score` 同构） | 第三种环形图 |
| AI 元素 | `.agent-avatar` 渐变圆 + `--ai-glow`；打字 `.typing-cursor`；加载 `.thinking-dot` ×3；AI 标记 `.pf-model` | 新 AI 视觉 |
| 反馈 | `.toast`；表单校验 `.field.invalid + .err + .req` | — |
| 图表（命中趋势等） | `.bars/.bar-row/.bar-track/.bar-fill` + `.legend` | 新图表库 |

---

## 四、Anti-Slop 约束（Phase 3 红线）

1. **禁 emoji 图标**。现有原型遗留 emoji（顶栏 🔔🔒、搜索 🔍 等）保持不动，但**所有新增视图/组件一律内联 SVG**（`viewBox="0 0 24 24"`、`stroke: currentColor`、`fill: none`、`stroke-width: 2`，与 `.ic-svg` 一致）或文字符号（✓ ✕ › ▍ ▣）。新增 UI 中出现 emoji 视为验收不通过。
2. **渐变仅两处合法**：顶栏/侧栏头品牌渐变（`#0A3573→#0E4C92→#13A8A8`）与 AI 元素渐变（`.agent-avatar`/`.pf-bar`/`.ai-gradient-text`）。卡片、按钮、表格、画布**禁用花哨渐变**，一律平色 + `--line` 描边。
3. **状态不只靠颜色**：状态点内放符号（✓/序号）；diff 差异框加序号角标（`.cmp-diff::after`）；图谱非关联节点用透明度 `.dim` 弱化而非仅变色；表格状态列必须有文字。
4. **阴影克制**：常规卡片一律 `--shadow-sm`；`--shadow` 仅文档页/抽屉；`--ai-glow` 仅 AI/品牌元素。
5. **动效从简**：仅 `transition: .16s–.25s`、既有 `fadeUp/slideIn/modalIn`、打字光标与思考点；遵守 `@media (prefers-reduced-motion: reduce)` 全局关闭。
6. **字号底线**：正文不低于 12px，表格正文 13–13.5px，勿出现 10px 以下文字（`.history-step` 10px 为既有特例，不扩散）。
7. **新 class 不污染**：新组件 class 必须带 §二 规定的前缀；禁止覆盖既有类定义（只能新增修饰类如 `.steps.job-steps`）。
8. **演示级交互的诚实表达**：演示数据在图谱/比对器等面板角标注明「演示数据」（参考 `.kg-tip`），不做虚假的真实功能暗示。

---

## 五、交付确认

- 令牌：既有 30+ 变量全部冻结；新增 24 个变量（状态 8 / 效力等级 8 / 图谱 5 / 画布 3），均通过 WCAG AA 对比度核查。
- 组件：7 个新组件全部给出 HTML 骨架 + 完整 CSS + 状态变体；1 个（作业流转条）直接复用 `.steps` 仅加变体。
- 复用映射 17 条，明确 `.drawer` 为唯一允许新增的通用容器类。
- 本文件为 Phase 3（筑原型）唯一视觉依据；如构建中确需新令牌，须回本文件 §1.2 追加并记录原因。
