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

  const esc = value => String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const host = () => window.JBAITaskPilotHost || window.JBAIPlanPilotHost || null;
  let panel = null;
  let active = null;
  let running = false;
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
        changes.push({ id, original:hit.rule.from, suggestion:hit.rule.to, type:hit.rule.type, reason:hit.rule.reason, position, basis:basisMap[hit.rule.type] || "平台润色规则库", state:"pending" });
        rest = rest.slice(hit.index + hit.rule.from.length);
      }
      if (touched) { fragment.append(document.createTextNode(rest)); node.replaceWith(fragment); }
    });
    return { template:box.innerHTML, changes };
  }

  function resultHTML(mode) {
    if (!active) return "";
    const box = document.createElement("div");
    box.innerHTML = active.template;
    box.querySelectorAll("[data-polish-id]").forEach(span => {
      const change = active.changes.find(item => item.id === span.dataset.polishId);
      if (!change || change.state === "ignored") { span.replaceWith(document.createTextNode(span.dataset.original || "")); return; }
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

  function changeCounts() {
    const rows = active?.changes || [], types = new Set(rows.map(item => item.type));
    return { total:rows.length, accepted:rows.filter(item => item.state !== "ignored").length, ignored:rows.filter(item => item.state === "ignored").length, types:types.size };
  }

  function notesHTML() {
    if (!active?.changes.length) return '<div class="polish-empty"><b>当前文稿未发现可确定的语言问题</b><p>未对原文进行强制改写，避免为了产生痕迹而改变原意。</p></div>';
    const c = changeCounts();
    return `<section class="polish-overview" aria-label="润色结果概览"><div><span>优化建议</span><b>${c.total}</b></div><div><span>覆盖类型</span><b>${c.types}</b></div><div><span>已采纳</span><b>${active.changes.filter(item => item.state === "accepted").length}</b></div><div><span>事实保护</span><b>3</b></div></section><div class="polish-note-list">${active.changes.map((item,index) => `<article class="polish-note-card" data-polish-locate="${item.id}" title="点击定位原文">
      <span class="polish-note-number">${index + 1}</span>
      <div class="polish-note-main"><header><b>${esc(item.type)}</b><span>${item.state === "ignored" ? "已忽略" : item.state === "accepted" ? "已采纳" : "待处理"}</span></header>
        <div class="polish-note-meta"><span>${esc(item.position)}</span><span>${esc(item.basis)}</span></div><div class="polish-note-compare"><div><b>原文</b><br>${esc(item.original)}</div><div><b>建议</b><br>${esc(item.suggestion)}</div></div><p>${esc(item.reason)}</p></div>
      <div class="polish-note-actions"><button class="${item.state === "accepted" ? "active" : ""}" data-polish-action="accept" data-change-id="${item.id}">采纳</button><button class="ignore ${item.state === "ignored" ? "active" : ""}" data-polish-action="ignore" data-change-id="${item.id}">忽略</button></div>
    </article>`).join("")}</div>`;
  }

  function render() {
    if (!ensurePanel() || !active) return;
    const counts = changeCounts();
    panel.innerHTML = `<header class="polish-result-bar"><div class="polish-panel-heading"><b>润色建议</b><span>${counts.total} 处修改 · 点击建议可定位原文</span></div><button class="polish-close-button" data-polish-action="close">退出润色</button></header>
      <div class="polish-workspace">${notesHTML()}</div>
      <footer class="polish-action-bar"><p>采纳后生成新版本，不覆盖润色前文稿；忽略的建议将保留原文。</p><button data-polish-action="close">暂不采用</button><button class="primary" data-polish-action="apply" ${counts.accepted ? "" : "disabled"}>全部采纳并生成新版本</button></footer>`;
    window.JBAIDocumentFocus?.refresh?.();
  }

  function showLoading(documentInfo) {
    if (!ensurePanel()) return;
    document.querySelector("#documentEditorPanel")?.classList.add("polish-active");
    panel.hidden = false;
    window.JBAIDocumentFocus?.enter?.({ kind:"polish", title:documentInfo.title, originalHTML:documentInfo.html, getCurrentHTML:()=>documentInfo.html });
    panel.innerHTML = `<div class="polish-loading"><div class="polish-loading-card"><div class="polish-spinner"></div><h3>正在润色当前文稿</h3><p>正在检查政务用语、语句冗余、逻辑衔接和术语一致性…</p></div></div>`;
  }

  function openResult(documentInfo, trigger) {
    const decorated = decorateDocument(documentInfo.html);
    active = { documentInfo, originalHTML:documentInfo.html, template:decorated.template, changes:decorated.changes, view:"polished", trigger:trigger || "button" };
    running = false;
    window.JBAIDocumentFocus?.enter?.({ kind:"polish", title:documentInfo.title, originalHTML:documentInfo.html, getCurrentHTML:()=>resultHTML("trace") });
    render();
    const api = host();
    api?.addAgentMessage?.(documentInfo.conversationId, `<p>全文智能润色已完成，共形成 <b>${decorated.changes.length}</b> 处修改建议。右侧已展示润色后文稿、修改痕迹和修改说明，原稿不会被直接覆盖。</p>`, { agent:"polish", kind:"integrated-polish-complete", noTrust:true });
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
    window.JBAIReviewPilot?.close({ silent:true });
    close({ silent:true });
    running = true; showLoading(documentInfo);
    const reason = options?.prompt && !hasSpecificTarget(options.prompt) ? "未指定具体段落，已按全文智能润色处理。" : "已从文稿编辑区启动全文智能润色。";
    host()?.addAgentMessage?.(documentInfo.conversationId, `<p><b>主智能体 · 意图识别完成</b></p><p>${esc(reason)}正在基于当前版本生成润色稿、修改痕迹和修改说明。</p>`, { agent:"polish", kind:"integrated-polish-start", noTrust:true });
    window.setTimeout(() => openResult(documentInfo, options?.trigger), 850);
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
    const previous = active;
    const finalHTML = options?.finalHTML != null ? options.finalHTML : previous?.originalHTML;
    running = false; active = null;
    document.querySelector("#documentEditorPanel")?.classList.remove("polish-active");
    if (panel) { panel.hidden = true; panel.innerHTML = ""; }
    window.JBAIDocumentFocus?.exit?.({ html:finalHTML });
    if (!options?.silent) host()?.toast?.("已退出润色，本次建议未应用。");
  }

  function apply() {
    if (!active) return;
    const counts = changeCounts();
    if (!counts.accepted) { host()?.toast?.("当前没有可采纳的修改。"); return; }
    const html = resultHTML("commit");
    const ok = host()?.commitPolishedDocument?.({ html, acceptedCount:counts.accepted, summary:`全文智能润色：采纳${counts.accepted}处，忽略${counts.ignored}处` });
    if (ok) { close({ silent:true, finalHTML:html }); host()?.toast?.(`已采纳 ${counts.accepted} 处修改并生成新版本。`); }
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
    const button = event.target.closest("[data-polish-action]");
    if (!button) return;
    const action = button.dataset.polishAction;
    if (action === "start") { startFromEditor({ trigger:"button" }); return; }
    if (action === "close") { close(); return; }
    if (action === "apply") { apply(); return; }
    if ((action === "accept" || action === "ignore") && active) {
      const item = active.changes.find(row => row.id === button.dataset.changeId);
      if (!item) return;
      item.state = action === "accept" ? "accepted" : "ignored";
      render();
    }
  });

  window.JBAIPolishPilot = {
    shouldStartFull,
    hasSpecificTarget,
    start,
    startFromEditor,
    close,
    onEditorOpen() { lastSelectionText = ""; if (!document.querySelector("#view-chat")?.classList.contains("editor-open")) close({ silent:true }); },
    getState() { return active ? { view:active.view, changes:active.changes.map(item => ({ ...item })) } : null; }
  };
})();
