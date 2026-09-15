(function () {
  "use strict";

  const RULES = [
    { from:"新区安全生产专项整治要求", to:"《南京江北新区安全生产专项整治三年行动实施方案》", dimension:"content", risk:"high", category:"政策依据", title:"政策依据名称不完整", position:"正文第1段", reason:"引用政策文件时应使用完整、准确的文件名称。", file:"《南京江北新区安全生产专项整治三年行动实施方案》", agency:"南京江北新区安全生产委员会", clause:"第三部分 重点任务", synced:"2026-08-18 09:30" },
    { from:"确保所有隐患一次性清零", to:"推动风险隐患排查整改形成闭环", dimension:"content", risk:"high", category:"内容导向", title:"政策表述存在绝对化风险", position:"正文第2段", reason:"避免使用无法客观验证的绝对化结果承诺。", file:"《政务文稿规范表述指引》", agency:"南京江北新区管理委员会办公室", clause:"第四章 规范表述要求", synced:"2026-08-19 16:20" },
    { from:"于七月十五日前", to:"于7月15日前", dimension:"format", risk:"general", category:"公文要素", title:"日期数字用法不规范", position:"正文第4段", reason:"公文中的具体日期应使用阿拉伯数字。", file:"GB/T 9704—2012《党政机关公文格式》", agency:"国家质量监督检验检疫总局、国家标准化管理委员会", clause:"7.3.5.4 成文日期中的数字", synced:"2026-08-20 10:15" },
    { from:"立即上报", to:"立即报告", dimension:"writing", risk:"medium", category:"行文规范", title:"向上行文用语不规范", position:"正文第4段", reason:"向上级机关反映情况时使用“报告”等规范表述。", file:"《党政机关公文处理工作条例》", agency:"中共中央办公厅、国务院办公厅", clause:"第二章 公文种类", synced:"2026-08-20 10:15" },
    { from:"南京江北新区综合办公室", to:"南京江北新区管理委员会办公室", dimension:"format", risk:"high", category:"机构名称", title:"落款机关名称需核实", position:"落款", reason:"发文机关和落款机关名称应与机构名录保持一致。", file:"南京江北新区机构名录", agency:"南京江北新区管理委员会", clause:"管理机构规范名称", synced:"2026-08-22 14:40" },
    { from:"按照新区领导有关要求", to:"依据正式会议纪要、批示或工作部署文件补充具体来源", dimension:"content", risk:"medium", category:"政策依据", title:"依据表述过于笼统", position:"正文第1段", reason:"政策与制度依据应当可识别、可核验，避免使用无法追溯的笼统表述。", file:"《政务文稿规范表述指引》", agency:"南京江北新区管理委员会办公室", clause:"第二章 依据引用规范", synced:"2026-08-22 15:10" },
    { from:"全面彻底排查", to:"全面排查", dimension:"writing", risk:"general", category:"简明表达", title:"同义修饰语叠加", position:"正文第2段", reason:"“全面”与“彻底”在此处语义叠加，政务行文应简明准确。", file:"《政务文稿规范表述指引》", agency:"南京江北新区管理委员会办公室", clause:"第四章 简明表达要求", synced:"2026-08-22 15:10" },
    { from:"各单位、各有关单位", to:"各有关单位", dimension:"writing", risk:"medium", category:"责任主体", title:"责任主体表述重复", position:"正文第4段", reason:"同一语句中的责任主体应边界明确，避免包含关系重复。", file:"江北新区机构与责任主体规范库", agency:"南京江北新区管理委员会办公室", clause:"责任主体规范称谓", synced:"2026-08-22 14:40" },
    { from:"原则上不得晚于七月十五日之前", to:"于7月15日前", dimension:"writing", risk:"medium", category:"时限表达", title:"完成时限条件叠加", position:"正文第4段", reason:"时间要求应明确唯一，避免“原则上”“不得晚于”“之前”等条件叠加。", file:"《党政机关公文处理工作条例》配套行文规则", agency:"中共中央办公厅、国务院办公厅", clause:"准确、简明的行文要求", synced:"2026-08-20 10:15" },
    { from:"对整改不到位的一律严肃追责", to:"对未按要求完成整改的，依照有关规定处理", dimension:"content", risk:"high", category:"法律责任", title:"追责表述缺少适用依据和程序边界", position:"正文第4段", reason:"责任追究类表述应有制度依据，并保留认定条件和程序边界。", file:"《中华人民共和国安全生产法》", agency:"全国人民代表大会常务委员会", clause:"第六章 法律责任相关规定", synced:"2026-08-20 10:00" }
  ];

  const DIMENSIONS = [["all","全部维度"],["format","格式规范"],["writing","行文规则"],["content","内容合规"]];
  const RISKS = [["all","全部风险"],["high","高风险"],["medium","中风险"],["general","一般问题"]];

  const esc = value => String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const host = () => window.JBAITaskPilotHost || window.JBAIPlanPilotHost || null;
  let panel = null, active = null, running = false, focusVisible = false, taskDocumentInfo = null, runToken = 0;

  function ensurePanel() {
    if (panel) return panel;
    const main = document.querySelector("#documentEditorPanel .editor-main-content");
    if (!main) return null;
    panel = document.createElement("section");
    panel.id = "integratedReviewPanel";
    panel.className = "integrated-review-panel";
    panel.hidden = true;
    main.insertBefore(panel, document.querySelector("#editorHistoryDrawer"));
    return panel;
  }

  function plainLines(html) {
    const box = document.createElement("div");
    box.innerHTML = html || "";
    const rows = Array.from(box.querySelectorAll("h1,h2,h3,h4,p,li")).map(row => row.textContent.trim()).filter(Boolean);
    return rows.length ? rows : [box.textContent.trim()].filter(Boolean);
  }

  function detectDocType(html) {
    const text = plainLines(html).join("\n");
    const rules = [["纪要",/会议纪要|议定事项/],["请示",/请示|妥否.{0,4}请批示/],["报告",/报告如下|特此报告/],["函",/特此函|盼复/],["通报",/情况通报|通报批评|通报表扬/],["通知",/通知|请遵照执行/]];
    return (rules.find(([,regex]) => regex.test(text)) || ["正式公文"])[0];
  }

  function issue(data, id) {
    return { id:`REVIEW-${id}`, state:"pending", mode:"replace", dimension:"writing", risk:"general", ...data };
  }

  function analyze(html) {
    const lines = plainLines(html), text = lines.join("\n"), results = [];
    RULES.forEach(rule => { if (text.includes(rule.from)) results.push(issue(rule, results.length + 1)); });
    if (text.includes("问题清单") && !/[附\s]*件[：:]/.test(text)) {
      results.push(issue({ dimension:"format", risk:"medium", category:"公文要素", title:"正文提及附件但缺少附件说明", original:"报送检查情况和问题清单", suggestion:"附件：安全生产检查问题清单", position:"正文末尾", reason:"正文涉及附件时，应在正文后标注附件名称。", mode:"append", file:"GB/T 9704—2012《党政机关公文格式》", agency:"国家质量监督检验检疫总局、国家标准化管理委员会", clause:"7.3.7 附件", synced:"2026-08-20 10:15" }, results.length + 1));
    }
    if (!/\d{4}年\d{1,2}月\d{1,2}日/.test(text)) {
      const today = new Date();
      results.push(issue({ dimension:"format", risk:"medium", category:"公文要素", title:"缺少成文日期", original:"未识别到成文日期", suggestion:`${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`, position:"文稿末尾", reason:"正式公文应标注完整成文日期。", mode:"append", file:"GB/T 9704—2012《党政机关公文格式》", agency:"国家质量监督检验检疫总局、国家标准化管理委员会", clause:"7.3.5.4 成文日期", synced:"2026-08-20 10:15" }, results.length + 1));
    }
    return results;
  }

  function replaceFirst(box, from, to, mark) {
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT, {
      acceptNode(node) { return node.nodeValue.includes(from) && !node.parentElement?.closest("mark,del,ins,script,style") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT; }
    });
    const node = walker.nextNode();
    if (!node) return false;
    const index = node.nodeValue.indexOf(from), fragment = document.createDocumentFragment();
    fragment.append(document.createTextNode(node.nodeValue.slice(0,index)));
    if (mark) {
      const el = document.createElement("mark"); el.className = "review-adopted"; el.textContent = to; fragment.append(el);
    } else fragment.append(document.createTextNode(to));
    fragment.append(document.createTextNode(node.nodeValue.slice(index + from.length)));
    node.replaceWith(fragment);
    return true;
  }

  function applyIssues(html, issues, mark) {
    const box = document.createElement("div"); box.innerHTML = html || "";
    issues.filter(row => row.state === "accepted").forEach(row => {
      if (row.mode === "append") {
        const p = document.createElement("p");
        if (mark) { const m = document.createElement("mark"); m.className = "review-adopted"; m.textContent = row.suggestion; p.append(m); }
        else p.textContent = row.suggestion;
        box.append(p);
      } else replaceFirst(box, row.from || row.original, row.to || row.suggestion, mark);
    });
    return box.innerHTML;
  }

  function workingHTML(mark) {
    if (!active) return "";
    if (active.manualHTML != null) return active.manualHTML;
    let html = applyIssues(active.currentHTML, active.issues, false);
    if (!mark) return html;
    const accepted = [...active.acceptedChanges, ...active.issues.filter(row => row.state === "accepted")];
    const box = document.createElement("div"); box.innerHTML = html;
    accepted.forEach(row => replaceFirst(box, row.to || row.suggestion, row.to || row.suggestion, true));
    return box.innerHTML;
  }

  function setManualHTML(html) {
    if (!active) return;
    active.manualHTML = html;
    active.manualEdited = true;
    syncTask("ready", {stage:"当前修订稿已手工编辑，可继续处理问题或重新审查。"});
  }

  function removeAppendedIssue(box, row) {
    const target = row.suggestion || row.to || "";
    const block = Array.from(box.querySelectorAll("p,li")).find(item => item.textContent.trim() === target.trim());
    if (block) { block.remove(); return true; }
    return false;
  }

  function updateManualIssue(row, nextState) {
    if (!active || active.manualHTML == null || row.state === nextState) return;
    const box = document.createElement("div"); box.innerHTML = active.manualHTML;
    if (nextState === "accepted") {
      if (row.mode === "append") {
        const p = document.createElement("p"), mark = document.createElement("mark");
        mark.className = "review-adopted"; mark.textContent = row.suggestion; p.append(mark); box.append(p);
      } else replaceFirst(box, row.original || row.from, row.suggestion || row.to, true);
    } else if (row.state === "accepted") {
      if (row.mode === "append") removeAppendedIssue(box,row);
      else {
        const suggestion=row.suggestion || row.to, original=row.original || row.from;
        const adopted=Array.from(box.querySelectorAll("mark.review-adopted")).find(item=>item.textContent===suggestion);
        if(adopted)adopted.replaceWith(document.createTextNode(original));
        else replaceFirst(box,suggestion,original,false);
      }
    }
    active.manualHTML = box.innerHTML;
  }

  function setIssueState(row, nextState) {
    updateManualIssue(row,nextState);
    row.state = nextState;
  }

  function counts() {
    const rows = active?.issues || [];
    return {
      total:rows.length,
      pending:rows.filter(row => row.state === "pending").length,
      accepted:rows.filter(row => row.state === "accepted").length,
      ignored:rows.filter(row => row.state === "ignored").length
    };
  }

  function labelOf(list, value) {
    return (list.find(item => item[0] === value) || [value,value])[1];
  }

  function filteredIssues() {
    const rows = active?.issues || [];
    return rows.filter(row => (active.activeDimension === "all" || row.dimension === active.activeDimension) && (active.activeRisk === "all" || row.risk === active.activeRisk));
  }

  function filterCount(type, value) {
    const rows = active?.issues || [];
    if (type === "dimension") return rows.filter(row => value === "all" || row.dimension === value).length;
    return rows.filter(row => value === "all" || row.risk === value).length;
  }

  function filterButtonsHTML(type, values) {
    const current = type === "dimension" ? active.activeDimension : active.activeRisk;
    return values.map(([value,label]) => `<button type="button" class="${current===value?"active":""}" data-review-filter="${type}" data-filter-value="${value}">${label}<span>${filterCount(type,value)}</span></button>`).join("");
  }

  function issueCardsHTML() {
    const c = counts();
    if (!active.issues.length) return `<div class="review-pass-state"><span>✓</span><b>本轮未发现需要处理的合规问题</b><p>已完成文种、格式、行文规则、政策依据与机构名称检查。</p></div>`;
    const dimensions = new Set(active.issues.map(row => row.dimension)).size, visible=filteredIssues(), visiblePending=visible.filter(row=>row.state==="pending").length;
    return `<section class="review-overview" aria-label="审查结果概览"><div><span>发现问题</span><b>${c.total}</b></div><div><span>待处理</span><b>${c.pending}</b></div><div><span>已处理</span><b>${c.accepted + c.ignored}</b></div><div><span>覆盖维度</span><b>${dimensions}</b></div></section>
      <section class="review-filter-panel" aria-label="审查结果筛选">
        <div class="review-filter-row"><b>审查维度</b><div class="review-filter-chips">${filterButtonsHTML("dimension",DIMENSIONS)}</div></div>
        <div class="review-filter-row"><b>风险程度</b><div class="review-filter-chips risk">${filterButtonsHTML("risk",RISKS)}</div></div>
      </section>
      <div class="review-list-head"><div><b>审查结果</b><span>${c.pending ? `还有 ${c.pending} 项未处理；可直接应用当前修订稿，未处理项将保留原文` : "本轮问题已处理，也可重新审查当前修订稿"}</span></div><div class="review-batch-actions"><button data-review-action="ignore-all" ${visiblePending ? "" : "disabled"}>全部忽略</button><button class="primary" data-review-action="accept-all" ${visiblePending ? "" : "disabled"}>全部采纳</button></div></div>
      <div class="review-issue-list">${visible.length?visible.map(row => { const index=active.issues.indexOf(row); return `<article class="review-issue-card ${row.state} risk-${row.risk}" data-review-locate="${row.id}" data-review-category="${esc(row.category)}" title="点击定位原文">
        <span class="review-issue-index">${index+1}</span>
        <div class="review-issue-main"><header><span class="review-dimension-badge">${esc(labelOf(DIMENSIONS,row.dimension))}</span><span class="review-risk-badge ${row.risk}">${esc(labelOf(RISKS,row.risk))}</span><b>${esc(row.title)}</b><em>${row.state==="accepted"?"已采纳":row.state==="ignored"?"已忽略":"待处理"}</em></header>
          <div class="review-compare"><div><small>原文</small><p>${esc(row.original || row.from)}</p></div><div><small>修改建议</small><p>${esc(row.suggestion || row.to)}</p></div></div>
          <p class="review-reason"><b>${esc(row.category)}</b> · ${esc(row.reason)}</p>
          <details class="review-basis"><summary>审查依据与原文位置</summary><dl><div><dt>文件名称</dt><dd>${esc(row.file)}</dd></div><div><dt>发布机关</dt><dd>${esc(row.agency)}</dd></div><div><dt>具体条款</dt><dd>${esc(row.clause)}</dd></div><div><dt>最后同步时间</dt><dd>${esc(row.synced)}</dd></div></dl><p>原文位置：${esc(row.position)}</p></details>
        </div>
        <div class="review-issue-actions"><button class="${row.state==="accepted"?"active":""}" data-review-action="accept" data-issue-id="${row.id}">采纳</button><button class="${row.state==="ignored"?"active":""}" data-review-action="ignore" data-issue-id="${row.id}">忽略</button></div>
      </article>`;}).join(""):`<div class="review-filter-empty"><b>当前筛选下没有审查问题</b><p>可切换其他维度或风险程度继续查看。</p></div>`}</div>`;
  }

  function recordsHTML() {
    return `<div class="review-record-list">${active.versions.map((version,index) => {
      const pending=version.issues.filter(row=>row.state==="pending").length, accepted=version.issues.filter(row=>row.state==="accepted").length, ignored=version.issues.filter(row=>row.state==="ignored").length;
      return `<article class="review-record-row"><span class="review-record-node">${index+1}</span><div><header><b>${index?"第"+index+"次复审":"初审"}</b><time>${esc(version.time)}</time></header><p>冻结问题 ${version.issues.length} 项 · 采纳 ${accepted} 项 · 忽略 ${ignored} 项 · 待处理 ${pending} 项</p></div></article>`;
    }).join("")}</div>`;
  }

  function reportData() {
    const initial=active.versions[0]?.issues || [], latest=active.issues || [];
    const allRows=[...active.versions.flatMap(row=>row.issues),...(active.acceptedChanges||[])];
    const acceptedTitles=new Set(allRows.filter(row=>row.state==="accepted").map(row=>row.title));
    const ignoredTitles=new Set(allRows.filter(row=>row.state==="ignored"&&!acceptedTitles.has(row.title)).map(row=>row.title));
    const pendingRows=latest.filter(row=>row.state==="pending"&&!acceptedTitles.has(row.title)&&!ignoredTitles.has(row.title));
    const accepted=acceptedTitles.size, ignored=ignoredTitles.size, pending=pendingRows.length, manuallyEdited=!!active.manualEdited;
    const conclusion=pending
      ? `已形成当前修订稿${manuallyEdited?"（含手工编辑）":""}，${pending} 项未处理并保留原文`
      : ignored
        ? `本次处理已完成${manuallyEdited?"，当前稿含手工编辑":""}，${ignored} 项已忽略并保留原文`
        : accepted
          ? `本次处理已完成，已采纳 ${accepted} 项修改${manuallyEdited?"并包含手工编辑":""}`
          : manuallyEdited?"本次处理已完成，当前修订稿包含手工编辑":"本次审查未修改原文";
    return { initial, latest, acceptedTitles, ignoredTitles, accepted, fixed:accepted, ignored, pending, remaining:pending, manuallyEdited, conclusion };
  }

  function reportHTML() {
    const data=reportData();
    const rows=data.initial.map((row,index)=>`<tr><td>${index+1}. ${esc(row.title)}</td><td>${esc(labelOf(DIMENSIONS,row.dimension))}</td><td>${esc(labelOf(RISKS,row.risk))}</td><td>${esc(row.original||row.from)}</td><td>${esc(row.suggestion||row.to)}</td><td>${data.acceptedTitles.has(row.title)?"已采纳（写入当前修订稿）":data.ignoredTitles.has(row.title)?"已忽略（保留原文）":"未处理（保留原文）"}</td></tr>`).join("");
    return `<article class="review-report"><header><p>辅助文本合规审查报告</p><h2>${esc(active.documentInfo.title)}</h2><span>${esc(data.conclusion)}</span></header>
      <div class="review-report-kpis"><div><b>${data.initial.length}</b><span>初审发现</span></div><div><b>${data.accepted}</b><span>已采纳</span></div><div><b>${data.ignored}</b><span>已忽略</span></div><div><b>${data.pending}</b><span>未处理</span></div></div>
      <section><h3>问题处理明细</h3><div class="review-report-table"><table><thead><tr><th>问题</th><th>维度</th><th>风险</th><th>原文</th><th>修改建议</th><th>处理结果</th></tr></thead><tbody>${rows||'<tr><td colspan="6">本次初审未检出问题。</td></tr>'}</tbody></table></div></section>
      <section><h3>审查结论</h3><p>本报告保留初审问题快照和本次处理结果。结论为“${esc(data.conclusion)}”；未处理及已忽略的问题均保持原文，不影响用户采用当前修订稿，后续仍可再次发起审查。</p></section></article>`;
  }

  function reportViewHTML() {
    return `<div class="review-report-shell"><div class="review-report-tools"><span>报告已根据当前处理状态实时生成</span><button type="button" data-review-action="download-report">下载审查报告</button></div>${reportHTML()}</div>`;
  }

  function syncTask(state, extra) {
    const documentInfo = active?.documentInfo || taskDocumentInfo;
    if (!documentInfo) return null;
    const c = active ? counts() : { total:0,pending:0,accepted:0,ignored:0 };
    const data = active ? reportData() : null;
    const initialCount = data?.initial?.length || c.total;
    const acceptedCount = data?.accepted ?? c.accepted;
    const ignoredCount = data?.ignored ?? c.ignored;
    return host()?.updateDocumentToolTask?.({
      conversationId:documentInfo.conversationId,
      messageIndex:documentInfo.messageIndex,
      documentTitle:documentInfo.title,
      kind:"review",
      state,
      total:initialCount,
      pending:data?.pending ?? c.pending,
      accepted:acceptedCount,
      ignored:ignoredCount,
      docType:active?.docType || "",
      stage:state === "processing" ? "正在识别文种并匹配适用规则。" : state === "ready" ? `初审发现 ${initialCount} 项问题，请进入专注模式继续处理。` : "合规审查已完成，结果和报告已保存。",
      ...(extra || {})
    });
  }

  function hideFocus(finalHTML) {
    focusVisible = false;
    document.querySelector("#documentEditorPanel")?.classList.remove("review-active");
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
    const view=active.view || "issues", c=counts(), data=reportData();
    const body=view==="issues"?issueCardsHTML():view==="document"?`<article class="review-paper">${workingHTML(true)}</article>`:view==="records"?recordsHTML():reportViewHTML();
    panel.innerHTML=`<header class="review-result-bar"><nav class="review-view-tabs" aria-label="合规审查视图">
        <button class="${view==="issues"?"active":""}" data-review-view="issues">问题处理 <span>${c.total}</span></button>
        <button class="${view==="records"?"active":""}" data-review-view="records">审查记录 <span>${active.versions.length}</span></button>
        <button class="${view==="report"?"active":""}" data-review-view="report">审查报告</button>
      </nav><div class="review-header-actions"><button class="review-recheck-button" data-review-action="recheck">重新审查</button><button class="review-close-button" data-review-action="close">退出审查</button></div></header>
      <div class="review-workspace">${body}</div>
      <footer class="review-action-bar final-choice"><p>${c.pending?`已采纳 ${data.accepted} 项，另有 ${c.pending} 项未处理并保持原文；可直接应用当前修订稿，系统将同时生成审查报告。`:`当前问题处理结果可直接采用；系统将同时生成并保存审查报告。`}</p><button data-review-action="use-original">使用原稿</button><button class="primary" data-review-action="apply">应用当前修订稿</button></footer>`;
    window.JBAIDocumentFocus?.refresh?.();
  }

  function showLoading(documentInfo) {
    if (!ensurePanel()) return;
    document.querySelector("#documentEditorPanel")?.classList.add("review-active");
    panel.hidden=false;focusVisible=true;
    window.JBAIDocumentFocus?.enter?.({kind:"review",title:documentInfo.title,originalHTML:documentInfo.html,getCurrentHTML:()=>documentInfo.html,view:"current"});
    panel.innerHTML=`<div class="review-loading"><div><span></span><h3>正在执行合规审查</h3><p>正在匹配公文格式、行文规范、政策依据、制度和保密规则…</p></div></div>`;
  }

  function openResult(documentInfo, trigger) {
    const issues=analyze(documentInfo.html), now=new Date().toLocaleString("zh-CN",{hour12:false});
    active={documentInfo,originalHTML:documentInfo.html,currentHTML:documentInfo.html,manualHTML:null,manualEdited:false,docType:detectDocType(documentInfo.html),issues,acceptedChanges:[],versions:[{round:1,time:now,issues}],view:"issues",trigger:trigger||"conversation",reportGenerated:true,activeDimension:"all",activeRisk:"all",reportRecordId:""};
    running=false;taskDocumentInfo=documentInfo;
    syncTask("ready",{stage:`自动识别为“${active.docType}”，初审发现 ${issues.length} 项问题，请进入专注模式继续处理。`});
    if (focusVisible) {
      window.JBAIDocumentFocus?.enter?.({kind:"review",title:documentInfo.title,originalHTML:documentInfo.html,getCurrentHTML:()=>workingHTML(true),onCurrentChange:setManualHTML,canEditCurrent:true,view:"current"});
      render();
    }
  }

  function shouldStart(context) {
    const text=String(context?.text||"");
    if (context?.explicitAgent) return true;
    return !!context?.hasDocument && /(合规审查|文本审查|审查.*(?:文稿|材料|文件)|检查.*(?:合规|行文|格式)|风险审查)/.test(text);
  }

  function startFromEditor(options) {
    if (running) { host()?.toast?.("合规审查正在处理中，请稍候。"); return false; }
    let documentInfo=host()?.getActiveDocument?.();
    if (!documentInfo) { host()?.toast?.("请先生成或载入一份文稿。"); return false; }
    if(options?.trigger!=="demo" && !/安全生产检查通知（演示文稿）/.test(documentInfo.title || "")) {
      const text=window.JBAIPilotContent?.examples?.review?.text;
      const prepared=text && host()?.prepareReviewDocument?.(documentInfo.conversationId,{name:"安全生产检查通知（演示文稿）",type:"政务办公场景演示",text});
      if(!prepared){host()?.toast?.("演示文稿载入失败，请稍后重试。");return false;}
      window.setTimeout(()=>startFromEditor({prompt:"使用安全生产通知示例进行合规审查",trigger:"demo"}),30);
      return true;
    }
    window.JBAIPolishPilot?.discard?.({silent:true});discard({silent:true});
    taskDocumentInfo=documentInfo;running=true;focusVisible=true;showLoading(documentInfo);syncTask("processing");
    const token=++runToken;
    window.setTimeout(()=>{if(token===runToken)openResult(documentInfo,options?.trigger);},850);
    return true;
  }

  function start(args) {
    const text=window.JBAIPilotContent?.examples?.review?.text;
    const source=text?{name:"安全生产检查通知（演示文稿）",type:"政务办公场景演示",text}:args.source;
    const prepared=host()?.prepareReviewDocument?.(args.conversationId,source);
    if (!prepared) { host()?.toast?.("未找到可审查的文稿内容。"); return false; }
    window.setTimeout(()=>startFromEditor({prompt:args.prompt,trigger:"demo"}),30);
    return true;
  }

  function recheck() {
    if (!active) return;
    active.acceptedChanges.push(...active.issues.filter(row=>row.state==="accepted").map(row=>({...row})));
    const ignoredTitles=new Set(active.versions.flatMap(row=>row.issues).filter(row=>row.state==="ignored").map(row=>row.title));
    active.currentHTML=workingHTML(false);
    active.manualEdited = active.manualEdited || active.currentHTML !== active.originalHTML;
    active.manualHTML=null;
    const next=analyze(active.currentHTML).filter(row=>!ignoredTitles.has(row.title));
    active.issues=next;
    active.versions.push({round:active.versions.length+1,time:new Date().toLocaleString("zh-CN",{hour12:false}),issues:next});
    active.view=next.length?"issues":"records";active.reportGenerated=true;render();syncTask("ready",{stage:next.length?`重新审查后仍有 ${next.length} 项问题，可继续处理或直接应用当前修订稿。`:"重新审查未发现遗留问题，可直接应用当前修订稿。"});
    host()?.toast?.(next.length?`重新审查完成，仍有 ${next.length} 项问题。`:"重新审查完成，未发现遗留问题。");
  }

  function downloadReport() {
    if(!active)return false;
    return host()?.downloadActiveReviewReport?.({title:`${active.documentInfo.title}（合规审查报告）`,html:reportHTML()})!==false;
  }

  function applyReviewedVersion() {
    if(!active)return false;
    const data=reportData(), html=workingHTML(true), report=reportHTML();
    const ok=host()?.commitReviewedDocument?.({html,reportId:active.reportRecordId,reportHTML:report,initialCount:data.initial.length,remainingCount:data.pending,fixedCount:data.accepted,ignoredCount:data.ignored,conclusion:data.conclusion,summary:`初审${data.initial.length}项，采纳${data.accepted}项，忽略${data.ignored}项，未处理${data.pending}项`});
    if(!ok)return false;
    syncTask("complete",{total:data.initial.length,pending:data.pending,accepted:data.accepted,ignored:data.ignored,remaining:data.pending,manualEdited:data.manuallyEdited,selectedVersion:"reviewed",stage:`已应用当前修订稿：采纳 ${data.accepted} 项${data.manuallyEdited?"，并保留手工编辑内容":""}，${data.pending} 项未处理并保持原文；审查报告已保存。`});
    discard({silent:true,finalHTML:html});
    host()?.toast?.("已应用当前修订稿，并保留原稿与审查记录。");
    return true;
  }

  function useOriginal() {
    if(!active)return false;
    const html=active.originalHTML, data=reportData();
    const saved=host()?.saveReviewReport?.({
      reportId:active.reportRecordId,
      reportHTML:reportHTML(),
      initialCount:data.initial.length,
      remainingCount:data.pending,
      fixedCount:data.accepted,
      ignoredCount:data.ignored,
      conclusion:data.conclusion,
      selectedVersion:"original",
      summary:`初审${data.initial.length}项，采纳${data.accepted}项，忽略${data.ignored}项，未处理${data.pending}项，最终选择保留原稿`
    });
    if(saved?.id)active.reportRecordId=saved.id;
    syncTask("complete",{total:data.initial.length,pending:data.pending,accepted:data.accepted,ignored:data.ignored,remaining:data.pending,selectedVersion:"original",stage:`已使用原稿；本次 ${data.accepted} 项采纳、${data.ignored} 项忽略和 ${data.pending} 项未处理情况已写入审查报告。`});
    discard({silent:true,finalHTML:html});
    host()?.toast?.("已使用原稿，本次审查修改未写回文稿。");
    return true;
  }

  function close(options) {
    if (options?.finalHTML != null || options?.discard) { discard(options); return; }
    if (!running && !active) return;
    if (!options?.silent && active) {
      const changedCount=reportData().accepted + (active.manualEdited ? 1 : 0);
      if (changedCount > 0) {
        host()?.confirmDocumentToolVersion?.({kind:"review",changedCount,onUseOriginal:useOriginal,onUseRevision:applyReviewedVersion});
        return;
      }
      useOriginal();
      return;
    }
    hideFocus(active?.originalHTML || taskDocumentInfo?.html || "");
    syncTask(running ? "processing" : "ready", active ? {stage:"审查结果已生成，可返回继续处理或直接采用当前修订稿；未处理项将保持原文。"} : null);
    if(!options?.silent)host()?.toast?.(running?"已退出专注模式，合规审查仍在后台进行。":"审查任务已保留，可从对话任务卡继续处理。");
  }

  function resumeFromTask() {
    if (!running && !active) return false;
    focusVisible = true;
    if (running) { showLoading(taskDocumentInfo); return true; }
    document.querySelector("#documentEditorPanel")?.classList.add("review-active");
    if (panel) panel.hidden = false;
    window.JBAIDocumentFocus?.enter?.({kind:"review",title:active.documentInfo.title,originalHTML:active.originalHTML,getCurrentHTML:()=>workingHTML(true),onCurrentChange:setManualHTML,canEditCurrent:true,view:"current"});
    render();
    return true;
  }

  document.addEventListener("click",event=>{
    const locate=event.target.closest("[data-review-locate]");
    if(locate&&active&&!event.target.closest("button,summary,details")){
      const row=active.issues.find(item=>item.id===locate.dataset.reviewLocate);
      if(row)window.JBAIDocumentFocus?.locateText?.(row.original||row.from);
      return;
    }
    const view=event.target.closest("[data-review-view]");
    if(view&&active&&!view.disabled){active.view=view.dataset.reviewView;render();return;}
    const filter=event.target.closest("[data-review-filter]");
    if(filter&&active){
      if(filter.dataset.reviewFilter==="dimension")active.activeDimension=filter.dataset.filterValue;
      else active.activeRisk=filter.dataset.filterValue;
      render();return;
    }
    const button=event.target.closest("[data-review-action]");
    if(!button)return;
    const action=button.dataset.reviewAction;
    if(action==="start"){startFromEditor({trigger:"button"});return;}
    if(action==="close"){close();return;}
    if(action==="use-original"){useOriginal();return;}
    if(action==="apply"){applyReviewedVersion();return;}
    if(action==="download-report"){downloadReport();return;}
    if(action==="recheck"){recheck();return;}
    if((action==="accept-all"||action==="ignore-all")&&active){
      filteredIssues().forEach(row=>{if(row.state==="pending")setIssueState(row,action==="accept-all"?"accepted":"ignored");});
      active.reportGenerated=true;render();syncTask("ready");return;
    }
    if((action==="accept"||action==="ignore")&&active){
      const row=active.issues.find(item=>item.id===button.dataset.issueId);if(!row)return;
      setIssueState(row,action==="accept"?"accepted":"ignored");active.reportGenerated=true;render();syncTask("ready");
    }
  });

  window.JBAIReviewPilot={
    shouldStart,start,startFromEditor,applyReviewedVersion,useOriginal,downloadReport,close,discard,resumeFromTask,
    onEditorOpen(){if(!document.querySelector("#view-chat")?.classList.contains("editor-open"))close({silent:true});},
    analyze,
    getState(){return active?{docType:active.docType,view:active.view,versions:active.versions.length,issues:active.issues.map(row=>({...row})),reportGenerated:active.reportGenerated,activeDimension:active.activeDimension,activeRisk:active.activeRisk,reportRecordId:active.reportRecordId}:null;}
  };
})();
