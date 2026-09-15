(function () {
  "use strict";

  const RULES = [
    { from:"月底前前", to:"月底前", type:"文字校正", reason:"删除重复文字，修正明显录入错误。" },
    { from:"工作有关事项通知如下", to:"工作的有关事项通知如下", type:"语句校正", reason:"补充结构助词，使句子成分衔接完整。" },
    { from:"限时办结企业诉求", to:"按时限办结企业诉求", type:"表述规范", reason:"明确按照既定时限办理，避免“限时”口语化。" },
    { from:"周通报进展", to:"每周通报工作进展", type:"信息明确", reason:"补全频次和通报对象，表达更加完整。" },
    { from:"为了", to:"为", type:"精简表达", reason:"删除口语化虚词，使句子更加简洁。" },
    { from:"进一步加强", to:"加强", type:"精简表达", reason:"避免程度副词叠加，突出具体行动。" },
    { from:"进一步推进", to:"加快推进", type:"政务表达", reason:"使用行动导向更明确的政务表述。" },
    { from:"进行全面排查", to:"全面排查", type:"消除冗余", reason:"删除无实际语义的动词，使表达更直接。" },
    { from:"及时进行反馈", to:"及时反馈", type:"消除冗余", reason:"压缩重复动词结构，不改变原意。" },
    { from:"各相关单位", to:"各有关单位", type:"术语统一", reason:"统一为政务通知中常用的责任主体表述。" },
    { from:"认真做好", to:"扎实做好", type:"政务表达", reason:"增强执行导向，保持正式、客观的行文风格。" },
    { from:"切实提高政治站位", to:"提高政治站位", type:"精简表达", reason:"删除重复强化语，保留原有要求。" },
    { from:"确保各项工作顺利开展", to:"确保各项工作有序推进", type:"表达规范", reason:"将笼统结果表述调整为可执行的过程表述。" },
    { from:"按时完成相关工作任务", to:"按期完成各项任务", type:"术语统一", reason:"统一时间要求和任务称谓。" },
    { from:"有关工作要求通知如下", to:"现将有关事项通知如下", type:"公文表达", reason:"调整为通知类文稿常用的承启表达。" },
    { from:"要高度重视", to:"应高度重视", type:"语气规范", reason:"统一责任要求的规范表达。" },
    { from:"及时发现问题并进行整改", to:"及时发现并整改问题", type:"逻辑优化", reason:"压缩动词结构，使行动关系更清晰。" },
    { from:"积极主动地", to:"主动", type:"消除冗余", reason:"删除重复修饰语，避免口号化表达。" }
    ,{ from:"帮助项目单位解决问题", to:"协调解决项目单位诉求", type:"政务表达", reason:"将口语化的“帮助解决问题”调整为职责边界更清晰的政务服务表述。" }
    ,{ from:"避免问题长期搁置", to:"防止问题长期未解决", type:"表达准确", reason:"“搁置”带有主观判断，调整为可客观判断的办理状态表述。" }
  ];

  const CATEGORIES = [
    ["base","格式与基础规范"],
    ["term","政务用语"],
    ["redun","冗余压缩"],
    ["style","风格统一"],
    ["logic","逻辑结构"]
  ];

  const esc = value => String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const host = () => window.JBAITaskPilotHost || window.JBAIPlanPilotHost || null;
  let panel = null;
  let active = null;
  let running = false;
  let focusVisible = false;
  let taskDocumentInfo = null;
  let runToken = 0;
  let lastSelectionText = "";

  function ensurePanel() {
    if (panel) return panel;
    const main = document.querySelector("#documentEditorPanel .editor-main-content");
    if (!main) return null;
    panel = document.createElement("section");
    panel.id = "integratedPolishPanel";
    panel.className = "integrated-polish-panel";
    panel.hidden = true;
    main.insertBefore(panel, document.querySelector("#editorHistoryDrawer"));
    return panel;
  }

  function currentSelectionBelongsToPaper() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return false;
    const paper = document.querySelector("#editorPaper");
    return !!paper && paper.contains(selection.getRangeAt(0).commonAncestorContainer);
  }

  function rememberSelection() {
    if (!currentSelectionBelongsToPaper()) return;
    lastSelectionText = window.getSelection().toString().trim();
  }

  function hasSpecificTarget(text) {
    const value = String(text || "");
    const hasLiveSelection = currentSelectionBelongsToPaper() && !!window.getSelection().toString().trim();
    return hasLiveSelection || /(第[一二三四五六七八九十\d]+段|第[一二三四五六七八九十\d]+句|标题|开头段|结尾段|落款|主送单位|“[^”]{3,}”|"[^"]{3,}")/.test(value);
  }

  function shouldStartFull(context) {
    const value = String(context?.text || "");
    if (context?.explicitAgent) return true;
    if (!context?.hasDocument) return false;
    if (!/(润色|优化|改写|语言调整|表达调整|语病|术语统一|精简全文)/.test(value)) return false;
    return !hasSpecificTarget(value);
  }

  function categoryForType(type) {
    if (["文字校正","语句校正"].includes(type)) return "base";
    if (["表述规范","信息明确","政务表达","术语统一","公文表达"].includes(type)) return "term";
    if (["精简表达","消除冗余"].includes(type)) return "redun";
    if (["表达规范","语气规范","表达准确"].includes(type)) return "style";
    return "logic";
  }

  function categoryLabel(value) {
    return (CATEGORIES.find(item => item[0] === value) || [value,value])[1];
  }

  function problemDescription(type) {
    const descriptions = {
      "文字校正":"存在重复、遗漏或明显录入问题，影响文稿准确性。",
      "语句校正":"句子成分衔接不完整，阅读时存在停顿或歧义。",
      "表述规范":"当前用语偏口语化，不符合正式政务文稿的常用表达。",
      "信息明确":"频次、对象或行动要求表达不够完整。",
      "精简表达":"存在不影响原意的虚词或程度副词，句子可以进一步压缩。",
      "政务表达":"当前表达职责边界或行动导向不够清晰。",
      "消除冗余":"动词或修饰语重复，影响行文简洁性。",
      "术语统一":"责任主体、任务或时间要求的称谓前后不够统一。",
      "表达规范":"结果表述较笼统，缺少清晰的执行导向。",
      "语气规范":"语气偏口语或命令化，建议调整为正式、审慎表达。",
      "逻辑优化":"动作关系或语句顺序不够紧凑，影响逻辑衔接。",
      "公文表达":"承启语不符合通知类公文的常用表达习惯。",
      "表达准确":"存在主观判断或含义边界不够明确的词语。"
    };
    return descriptions[type] || "当前表述可进一步优化，以提升政务文稿的准确性和可读性。";
  }

  function evidenceFor(category) {
    const common = { file:"《党政机关公文处理工作条例》", clause:"第十九条第（二）项：内容简洁，主题突出，观点鲜明，结构严谨，表述准确，文字精练。" };
    const evidence = {
      base:{ file:"《党政机关公文处理工作条例》", clause:"第十九条第（二）项：表述准确，文字精练。" },
      term:common,
      redun:common,
      style:common,
      logic:{ file:"《党政机关公文处理工作条例》", clause:"第十九条第（二）项：结构严谨，表述准确，文字精练。" }
    };
    return evidence[category] || common;
  }

  function decorateDocument(html) {
    const box = document.createElement("div");
    box.innerHTML = html || "";
    const nodes = [];
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        return parent && !parent.closest("script,style,del,ins") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    while (walker.nextNode()) nodes.push(walker.currentNode);
    const changes = [];
    nodes.forEach(node => {
      let rest = node.nodeValue, touched = false;
      const fragment = document.createDocumentFragment();
      while (rest && changes.length < 24) {
        let hit = null;
        RULES.forEach(rule => {
          const index = rest.indexOf(rule.from);
          if (index >= 0 && (!hit || index < hit.index)) hit = { rule, index };
        });
        if (!hit) break;
        touched = true;
        if (hit.index) fragment.append(document.createTextNode(rest.slice(0, hit.index)));
        const id = `POLISH-${changes.length + 1}`;
        const span = document.createElement("span");
        span.dataset.polishId = id;
        span.dataset.original = hit.rule.from;
        span.dataset.suggestion = hit.rule.to;
        span.textContent = hit.rule.to;
        fragment.append(span);
        const block = node.parentElement?.closest("h1,h2,h3,h4,p,li");
        const paragraphs = Array.from(box.querySelectorAll("p,li"));
        const paragraphIndex = block ? paragraphs.indexOf(block) : -1;
        const position = block?.matches("h1,h2,h3,h4") ? "标题" : paragraphIndex >= 0 ? `正文第${paragraphIndex + 1}段` : "正文";
        const basisMap = {
          "文字校正":"语言文字规范库", "语句校正":"语言文字规范库", "表述规范":"政务行文规则库", "信息明确":"政务行文规则库",
          "精简表达":"简明表达规则库", "政务表达":"政务术语库", "消除冗余":"简明表达规则库", "术语统一":"政务术语库",
          "语气规范":"政务文书风格库", "逻辑优化":"篇章逻辑规则库", "公文表达":"公文范文库", "表达准确":"政务行文规则库"
        };
        const category=categoryForType(hit.rule.type), evidence=evidenceFor(category);
        changes.push({ id, original:hit.rule.from, suggestion:hit.rule.to, type:hit.rule.type, category, problem:problemDescription(hit.rule.type), reason:hit.rule.reason, position, basis:basisMap[hit.rule.type] || "平台润色规则库", evidenceFile:evidence.file, evidenceClause:evidence.clause, state:"pending" });
        rest = rest.slice(hit.index + hit.rule.from.length);
      }
      if (touched) { fragment.append(document.createTextNode(rest)); node.replaceWith(fragment); }
    });
    return { template:box.innerHTML, changes };
  }

  function resultHTML(mode) {
    if (!active) return "";
    if (active.manualHTML != null) return active.manualHTML;
    const box = document.createElement("div");
    box.innerHTML = active.template;
    box.querySelectorAll("[data-polish-id]").forEach(span => {
      const change = active.changes.find(item => item.id === span.dataset.polishId);
      if (!change || change.state === "ignored" || (mode === "commit" && change.state !== "accepted")) { span.replaceWith(document.createTextNode(span.dataset.original || "")); return; }
      if (mode === "trace") {
        const fragment = document.createDocumentFragment(), del = document.createElement("del"), ins = document.createElement("ins");
        del.textContent = span.dataset.original || ""; ins.textContent = span.dataset.suggestion || "";
        fragment.append(del, ins); span.replaceWith(fragment); return;
      }
      const mark = document.createElement("mark");
      mark.className = mode === "commit" ? "polish-adopted" : "polish-result-change";
      mark.dataset.polishAdopted = change.id;
      mark.textContent = span.dataset.suggestion || "";
      span.replaceWith(mark);
    });
    return box.innerHTML;
  }

  function replaceManualText(box, from, to, markChange) {
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, {
      acceptNode(node) { return node.nodeValue.includes(from) && !node.parentElement?.closest("script,style") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    const node=walker.nextNode();
    if(!node)return false;
    if(!markChange){
      const adopted=node.parentElement?.closest("mark.polish-adopted");
      if(adopted && adopted.textContent.includes(from)){
        adopted.replaceWith(document.createTextNode(adopted.textContent.replace(from,to)));
        return true;
      }
    }
    const index=node.nodeValue.indexOf(from),fragment=document.createDocumentFragment();
    fragment.append(document.createTextNode(node.nodeValue.slice(0,index)));
    if(markChange){const mark=document.createElement("mark");mark.className="polish-adopted";mark.textContent=to;fragment.append(mark);}
    else fragment.append(document.createTextNode(to));
    fragment.append(document.createTextNode(node.nodeValue.slice(index+from.length)));
    node.replaceWith(fragment);return true;
  }

  function setManualHTML(html) {
    if(!active)return;
    active.manualHTML=html;
    active.manualEdited=true;
    syncTask("ready",{stage:"当前润色稿已手工编辑，可继续处理建议或重新润色。"});
  }

  function setChangeState(item,nextState) {
    if(!active || item.state===nextState)return;
    if(active.manualHTML!=null){
      const box=document.createElement("div");box.innerHTML=active.manualHTML;
      if(nextState==="accepted")replaceManualText(box,item.original,item.suggestion,true);
      else if(item.state==="accepted")replaceManualText(box,item.suggestion,item.original,false);
      active.manualHTML=box.innerHTML;
    }
    item.state=nextState;
  }

  function changeCounts() {
    const rows = active?.changes || [], categories = new Set(rows.map(item => item.category));
    return { total:rows.length, pending:rows.filter(item => item.state === "pending").length, accepted:rows.filter(item => item.state === "accepted").length, ignored:rows.filter(item => item.state === "ignored").length, categories:categories.size };
  }

  function visibleChanges() {
    const selected=active?.activeCategories || new Set();
    return (active?.changes || []).filter(item => selected.has(item.category));
  }

  function categoryFiltersHTML() {
    return CATEGORIES.map(([value,label]) => {
      const selected=active.activeCategories.has(value), count=active.changes.filter(item=>item.category===value).length;
      return `<button type="button" class="${selected?"active":""}" data-polish-category="${value}" aria-pressed="${selected}"><span class="polish-category-check">${selected?"✓":""}</span>${label}<em>${count}</em></button>`;
    }).join("");
  }

  function reportData() {
    const counts=changeCounts();
    const manuallyEdited=!!active.manualEdited;
    return { ...counts, manuallyEdited, conclusion:counts.pending?`已形成当前润色稿${manuallyEdited?"（含手工编辑）":""}，${counts.pending} 项未处理并保留原文`:counts.accepted?`已采纳 ${counts.accepted} 项优化建议${manuallyEdited?"并包含手工编辑":""}`:manuallyEdited?"当前润色稿包含手工编辑":"已保留原文，未采纳优化建议" };
  }

  function reportHTML() {
    const data=reportData();
    const rows=active.changes.map((item,index)=>`<tr><td>${index+1}</td><td>${esc(categoryLabel(item.category))}</td><td>${esc(item.type)}</td><td>${esc(item.original)}</td><td>${esc(item.suggestion)}</td><td>${esc(item.reason)}</td><td>${item.state==="accepted"?"已采纳（写入当前润色稿）":item.state==="ignored"?"已忽略（保留原文）":"未处理（保留原文）"}</td></tr>`).join("");
    return `<article class="polish-report"><header><p>文本智能润色报告</p><h2>${esc(active.documentInfo.title)}</h2><span>${esc(data.conclusion)}</span></header>
      <div class="polish-report-kpis"><div><b>${data.total}</b><span>识别优化项</span></div><div><b>${data.categories}</b><span>覆盖分类</span></div><div><b>${data.accepted}</b><span>已采纳</span></div><div><b>${data.ignored}</b><span>已忽略</span></div></div>
      <section><h3>润色说明</h3><p>本报告记录本次润色识别出的优化项、分类、原文、建议、修改原因及用户处理结果。未处理及已忽略的建议均保持原文；数字、日期、机构、人名和政策名称未主动改写。</p></section>
      <section><h3>优化项处理明细</h3><div class="polish-report-table"><table><thead><tr><th>序号</th><th>分类</th><th>细分类型</th><th>原文</th><th>润色建议</th><th>修改说明</th><th>处理结果</th></tr></thead><tbody>${rows||'<tr><td colspan="7">本次未识别到可优化项。</td></tr>'}</tbody></table></div></section></article>`;
  }

  function reportViewHTML() {
    return `<div class="polish-report-shell"><div class="polish-report-tools"><span>报告已根据当前处理状态实时生成</span><button type="button" data-polish-action="download-report">下载润色报告</button></div>${reportHTML()}</div>`;
  }

  function notesHTML() {
    if (!active?.changes.length) return '<div class="polish-empty"><b>当前文稿未发现可确定的语言问题</b><p>未对原文进行强制改写，避免为了产生痕迹而改变原意。</p></div>';
    const c = changeCounts(), visible=visibleChanges(), visiblePending=visible.filter(item=>item.state==="pending").length;
    return `<section class="polish-overview" aria-label="润色结果概览"><div><span>优化建议</span><b>${c.total}</b></div><div><span>覆盖分类</span><b>${c.categories}</b></div><div><span>已采纳</span><b>${c.accepted}</b></div><div><span>已忽略</span><b>${c.ignored}</b></div></section>
      <section class="polish-category-panel" aria-label="可优化项分类"><header><div><b>可优化项分类</b><span>选择分类筛选右侧结果</span></div><div><button data-polish-action="select-categories">全选分类</button><button data-polish-action="invert-categories">反选分类</button></div></header><div class="polish-category-chips">${categoryFiltersHTML()}</div></section>
      <div class="polish-guidance-strip"><b>统一润色</b><span>优化项仅在用户采纳后写入最终稿，逻辑结构类内容只提供调整建议。</span><em>规则依据：中国国家规范 → 江苏省规范 → 南京市规范 → 江北新区内部规则</em></div>
      <div class="polish-list-head"><div><b>润色结果</b><span>当前展示 ${visible.length} 项，点击卡片可定位原文</span></div><div class="polish-batch-actions"><button data-polish-action="ignore-all" ${visiblePending?"":"disabled"}>全部忽略</button><button class="primary" data-polish-action="accept-all" ${visiblePending?"":"disabled"}>全部采纳</button></div></div>
      <div class="polish-note-list">${visible.length?visible.map(item => { const index=active.changes.indexOf(item); return `<article class="polish-note-card ${item.state}" data-polish-locate="${item.id}" title="点击定位原文">
      <span class="polish-note-number">${index + 1}</span>
      <div class="polish-note-main"><header><span class="polish-main-category" title="优化分类" aria-label="优化分类：${esc(categoryLabel(item.category))}">${esc(categoryLabel(item.category))}</span><b>${esc(item.type)}</b><span class="polish-state-tag">${item.state === "ignored" ? "已忽略" : item.state === "accepted" ? "已采纳" : "待处理"}</span></header>
        <div class="polish-note-meta"><span>${esc(item.position)}</span></div><div class="polish-problem-description"><small>问题描述</small><p>${esc(item.problem)}</p></div><div class="polish-note-compare"><div><b>原文内容</b><br>${esc(item.original)}</div><div><b>润色建议</b><br>${esc(item.suggestion)}</div></div><details class="polish-note-explanation"><summary>查看修改说明</summary><div class="polish-note-explanation-body"><section><small>润色建议描述</small><p>${esc(item.reason)}</p></section><dl><div><dt>建议依据来源</dt><dd>${esc(item.basis)}</dd></div><div><dt>依据文件名称</dt><dd>${esc(item.evidenceFile)}</dd></div><div><dt>依据条款</dt><dd>${esc(item.evidenceClause)}</dd></div></dl></div></details></div>
      <div class="polish-note-actions"><button class="${item.state === "accepted" ? "active" : ""}" data-polish-action="accept" data-change-id="${item.id}">采纳</button><button class="ignore ${item.state === "ignored" ? "active" : ""}" data-polish-action="ignore" data-change-id="${item.id}">忽略</button></div>
    </article>`;}).join(""):`<div class="polish-filter-empty"><b>当前分类下没有可优化项</b><p>可全选或反选其他分类继续查看。</p></div>`}</div>`;
  }

  function syncTask(state, extra) {
    const documentInfo = active?.documentInfo || taskDocumentInfo;
    if (!documentInfo) return null;
    const c = active ? changeCounts() : { total:0,pending:0,accepted:0,ignored:0,categories:0 };
    return host()?.updateDocumentToolTask?.({
      conversationId:documentInfo.conversationId,
      messageIndex:documentInfo.messageIndex,
      documentTitle:documentInfo.title,
      kind:"polish",
      state,
      total:c.total,
      pending:c.pending,
      accepted:c.accepted,
      ignored:c.ignored,
      categories:c.categories,
      stage:state === "processing" ? "正在识别可优化内容并生成修改建议。" : state === "ready" ? `识别出 ${c.total} 项可优化内容，请进入专注模式继续处理。` : "全文智能润色已完成，结果和报告已保存。",
      ...(extra || {})
    });
  }

  function hideFocus(finalHTML) {
    focusVisible = false;
    document.querySelector("#documentEditorPanel")?.classList.remove("polish-active");
    if (panel) panel.hidden = true;
    window.JBAIDocumentFocus?.exit?.({ html:finalHTML != null ? finalHTML : active?.originalHTML || taskDocumentInfo?.html || "" });
  }

  function discard(options) {
    if (!running && !active && !taskDocumentInfo && !focusVisible && options?.finalHTML == null) return;
    runToken += 1;
    const html = options?.finalHTML != null ? options.finalHTML : active?.originalHTML || taskDocumentInfo?.html || "";
    running = false;
    hideFocus(html);
    active = null;
    taskDocumentInfo = null;
    if (panel) panel.innerHTML = "";
  }

  function render() {
    if (!ensurePanel() || !active) return;
    const counts = changeCounts(), view=active.view || "results", body=view==="report"?reportViewHTML():notesHTML();
    const canApply=counts.accepted || active.manualEdited;
    panel.innerHTML = `<header class="polish-result-bar"><nav class="polish-view-tabs" aria-label="文本润色视图"><button class="polish-view-tab ${view==="results"?"active":""}" data-polish-view="results">润色结果 <span>${counts.total}</span></button><button class="polish-view-tab ${view==="report"?"active":""}" data-polish-view="report">润色报告</button></nav><div class="polish-header-actions"><button class="polish-repolish-button" data-polish-action="repolish">重新润色</button><button class="polish-close-button" data-polish-action="close">退出润色</button></div></header>
      <div class="polish-workspace">${body}</div>
      <footer class="polish-action-bar final-choice"><p>${counts.pending?`已采纳 ${counts.accepted} 项，另有 ${counts.pending} 项未处理并保持原文；可直接应用当前润色稿，系统将同时保存润色报告。`:"当前润色结果可直接采用；系统将同时保存润色报告。"}</p><button data-polish-action="use-original">使用原稿</button><button class="primary" data-polish-action="apply" ${canApply ? "" : "disabled"}>应用当前润色稿</button></footer>`;
    window.JBAIDocumentFocus?.refresh?.();
  }

  function showLoading(documentInfo) {
    if (!ensurePanel()) return;
    document.querySelector("#documentEditorPanel")?.classList.add("polish-active");
    panel.hidden = false;
    focusVisible = true;
    window.JBAIDocumentFocus?.enter?.({ kind:"polish", title:documentInfo.title, originalHTML:documentInfo.html, getCurrentHTML:()=>documentInfo.html, view:"current" });
    panel.innerHTML = `<div class="polish-loading"><div class="polish-loading-card"><div class="polish-spinner"></div><h3>正在润色当前文稿</h3><p>正在检查政务用语、语句冗余、逻辑衔接和术语一致性…</p></div></div>`;
  }

  function openResult(documentInfo, trigger) {
    const decorated = decorateDocument(documentInfo.html);
    active = { documentInfo, originalHTML:documentInfo.html, template:decorated.template, changes:decorated.changes, manualHTML:null, manualEdited:false, view:"results", activeCategories:new Set(CATEGORIES.map(item=>item[0])), reportRecordId:"", trigger:trigger || "button" };
    running = false;
    taskDocumentInfo = documentInfo;
    syncTask("ready", {stage:`已识别 ${decorated.changes.length} 项可优化内容，请进入专注模式继续处理。`});
    if (focusVisible) {
      window.JBAIDocumentFocus?.enter?.({ kind:"polish", title:documentInfo.title, originalHTML:documentInfo.html, getCurrentHTML:()=>resultHTML("commit"), onCurrentChange:setManualHTML, canEditCurrent:true, view:"current" });
      render();
    }
  }

  function startFromEditor(options) {
    if (running) { host()?.toast?.("全文智能润色正在处理中，请稍候。"); return false; }
    let documentInfo = host()?.getActiveDocument?.();
    if (!documentInfo) { host()?.toast?.("请先生成或载入一份文稿。"); return false; }
    if(options?.trigger!=="demo" && !/重点项目服务保障通知（演示文稿）/.test(documentInfo.title || "")) {
      const text=window.JBAIPilotContent?.examples?.polish?.text;
      const prepared=text && host()?.preparePolishDocument?.(documentInfo.conversationId,{name:"重点项目服务保障通知（演示文稿）",type:"政务办公场景演示",text});
      if(!prepared){host()?.toast?.("演示文稿载入失败，请稍后重试。");return false;}
      window.setTimeout(()=>startFromEditor({prompt:"使用政务通知示例进行全文润色",trigger:"demo"}),30);
      return true;
    }
    window.JBAIReviewPilot?.discard?.({ silent:true });
    discard({ silent:true });
    taskDocumentInfo = documentInfo;
    running = true;
    focusVisible = true;
    showLoading(documentInfo);
    syncTask("processing");
    const token = ++runToken;
    window.setTimeout(() => { if (token === runToken) openResult(documentInfo, options?.trigger); }, 850);
    return true;
  }

  function start(args) {
    const text=window.JBAIPilotContent?.examples?.polish?.text;
    const source=text?{name:"重点项目服务保障通知（演示文稿）",type:"政务办公场景演示",text}:args.source;
    const prepared = host()?.preparePolishDocument?.(args.conversationId, source);
    if (!prepared) { host()?.toast?.("未找到可润色的文稿内容。"); return false; }
    window.setTimeout(() => startFromEditor({ prompt:args.prompt, trigger:"demo" }), 30);
    return true;
  }

  function close(options) {
    if (options?.finalHTML != null || options?.discard) { discard(options); return; }
    if (!running && !active) return;
    if (!options?.silent && active) {
      const changedCount=changeCounts().accepted + (active.manualEdited ? 1 : 0);
      if (changedCount > 0) {
        host()?.confirmDocumentToolVersion?.({kind:"polish",changedCount,onUseOriginal:useOriginal,onUseRevision:apply});
        return;
      }
      useOriginal();
      return;
    }
    hideFocus(active?.originalHTML || taskDocumentInfo?.html || "");
    syncTask(running ? "processing" : "ready");
    if (!options?.silent) host()?.toast?.(running ? "已退出专注模式，全文智能润色仍在后台进行。" : "润色任务已保留，可从对话任务卡继续处理。");
  }

  function resumeFromTask() {
    if (!running && !active) return false;
    focusVisible = true;
    if (running) { showLoading(taskDocumentInfo); return true; }
    document.querySelector("#documentEditorPanel")?.classList.add("polish-active");
    if (panel) panel.hidden = false;
    window.JBAIDocumentFocus?.enter?.({ kind:"polish", title:active.documentInfo.title, originalHTML:active.originalHTML, getCurrentHTML:()=>resultHTML("commit"), onCurrentChange:setManualHTML, canEditCurrent:true, view:"current" });
    render();
    return true;
  }

  function apply() {
    if (!active) return;
    const counts = changeCounts();
    if (!counts.accepted && !active.manualEdited) { host()?.toast?.("当前没有可应用的修改。"); return; }
    const html = resultHTML("commit"), report=reportHTML();
    const saved=host()?.savePolishReport?.({reportId:active.reportRecordId,reportHTML:report,totalCount:counts.total,acceptedCount:counts.accepted,ignoredCount:counts.ignored,pendingCount:counts.pending,categoryCount:counts.categories,selectedVersion:"polished",summary:`全文智能润色：采纳${counts.accepted}处，忽略${counts.ignored}处，未处理${counts.pending}处`});
    if(saved?.id)active.reportRecordId=saved.id;
    const ok = host()?.commitPolishedDocument?.({ html, reportId:active.reportRecordId,reportHTML:report,acceptedCount:counts.accepted,ignoredCount:counts.ignored,pendingCount:counts.pending,totalCount:counts.total,categoryCount:counts.categories,summary:`全文智能润色：采纳${counts.accepted}处，忽略${counts.ignored}处，未处理${counts.pending}处` });
    if (ok) {
      syncTask("complete",{pending:counts.pending,manualEdited:!!active.manualEdited,selectedVersion:"polished",stage:`已应用当前润色稿：采纳 ${counts.accepted} 项${active.manualEdited?"，并保留手工编辑内容":""}，${counts.pending} 项未处理并保持原文；润色报告已保存。`});
      discard({ silent:true, finalHTML:html });
      host()?.toast?.(`已应用润色版本，共采用 ${counts.accepted} 处修改；原稿已保留。`);
    }
  }

  function useOriginal() {
    if(!active)return false;
    const html=active.originalHTML, counts=changeCounts(), saved=host()?.savePolishReport?.({reportId:active.reportRecordId,reportHTML:reportHTML(),totalCount:counts.total,acceptedCount:counts.accepted,ignoredCount:counts.ignored,pendingCount:counts.pending,categoryCount:counts.categories,selectedVersion:"original",summary:`全文智能润色：识别${counts.total}处，选择保留原稿`});
    if(saved?.id)active.reportRecordId=saved.id;
    syncTask("complete",{selectedVersion:"original",stage:"全文智能润色已完成，润色报告已保存。"});
    discard({silent:true,finalHTML:html});
    host()?.toast?.("已使用原稿，润色报告已保留在当前文稿历史中。");
    return true;
  }

  function downloadReport() {
    if(!active)return false;
    return host()?.downloadActivePolishReport?.({title:`${active.documentInfo.title}（文本润色报告）`,html:reportHTML()})!==false;
  }

  function repolish() {
    if(!active)return false;
    const source=resultHTML("commit"), decorated=decorateDocument(source);
    active.template=decorated.template;
    active.changes=decorated.changes;
    active.manualHTML=null;
    active.manualEdited=source!==active.originalHTML;
    active.activeCategories=new Set(CATEGORIES.map(item=>item[0]));
    active.view="results";
    render();syncTask("ready",{stage:`重新润色完成，识别出 ${decorated.changes.length} 项可优化内容。`});
    host()?.toast?.(`重新润色完成，识别出 ${decorated.changes.length} 项可优化内容。`);
    return true;
  }

  document.addEventListener("selectionchange", rememberSelection);
  document.addEventListener("click", event => {
    const locate = event.target.closest("[data-polish-locate]");
    if (locate && active && !event.target.closest("button")) {
      const item = active.changes.find(row => row.id === locate.dataset.polishLocate);
      if (item) window.JBAIDocumentFocus?.locateText?.(item.original);
      return;
    }
    const view = event.target.closest("[data-polish-view]");
    if (view && active) { active.view = view.dataset.polishView; render(); return; }
    const category=event.target.closest("[data-polish-category]");
    if(category&&active){
      const value=category.dataset.polishCategory;
      if(active.activeCategories.has(value))active.activeCategories.delete(value);else active.activeCategories.add(value);
      active.view="results";render();return;
    }
    const button = event.target.closest("[data-polish-action]");
    if (!button) return;
    const action = button.dataset.polishAction;
    if (action === "start") { startFromEditor({ trigger:"button" }); return; }
    if (action === "close") { close(); return; }
    if (action === "use-original") { useOriginal(); return; }
    if (action === "apply") { apply(); return; }
    if (action === "download-report") { downloadReport(); return; }
    if (action === "repolish") { repolish(); return; }
    if (action === "select-categories" && active) { active.activeCategories=new Set(CATEGORIES.map(item=>item[0]));render();return; }
    if (action === "invert-categories" && active) { active.activeCategories=new Set(CATEGORIES.map(item=>item[0]).filter(value=>!active.activeCategories.has(value)));render();return; }
    if ((action === "accept-all" || action === "ignore-all") && active) {
      visibleChanges().forEach(item=>{if(item.state==="pending")setChangeState(item,action==="accept-all"?"accepted":"ignored");});
      render();syncTask("ready");return;
    }
    if ((action === "accept" || action === "ignore") && active) {
      const item = active.changes.find(row => row.id === button.dataset.changeId);
      if (!item) return;
      setChangeState(item,action === "accept" ? "accepted" : "ignored");
      render();syncTask("ready");
    }
  });

  window.JBAIPolishPilot = {
    shouldStartFull,
    hasSpecificTarget,
    start,
    startFromEditor,
    useOriginal,
    downloadReport,
    close,
    discard,
    resumeFromTask,
    repolish,
    onEditorOpen() { lastSelectionText = ""; if (!document.querySelector("#view-chat")?.classList.contains("editor-open")) close({ silent:true }); },
    getState() { return active ? { view:active.view, activeCategories:[...active.activeCategories],reportRecordId:active.reportRecordId,changes:active.changes.map(item => ({ ...item })) } : null; }
  };
})();
