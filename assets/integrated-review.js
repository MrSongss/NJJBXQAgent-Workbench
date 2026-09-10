(function () {
  "use strict";

  const RULES = [
    { from:"新区安全生产专项整治要求", to:"《南京江北新区安全生产专项整治三年行动实施方案》", category:"政策依据", title:"政策依据名称不完整", position:"正文第1段", reason:"引用政策文件时应使用完整、准确的文件名称。", file:"《南京江北新区安全生产专项整治三年行动实施方案》", agency:"南京江北新区安全生产委员会", clause:"第三部分 重点任务", synced:"2026-08-18 09:30" },
    { from:"确保所有隐患一次性清零", to:"推动风险隐患排查整改形成闭环", category:"内容导向", title:"政策表述存在绝对化风险", position:"正文第2段", reason:"避免使用无法客观验证的绝对化结果承诺。", file:"《政务文稿规范表述指引》", agency:"南京江北新区管理委员会办公室", clause:"第四章 规范表述要求", synced:"2026-08-19 16:20" },
    { from:"于七月十五日前", to:"于7月15日前", category:"公文要素", title:"日期数字用法不规范", position:"正文第4段", reason:"公文中的具体日期应使用阿拉伯数字。", file:"GB/T 9704—2012《党政机关公文格式》", agency:"国家质量监督检验检疫总局、国家标准化管理委员会", clause:"7.3.5.4 成文日期中的数字", synced:"2026-08-20 10:15" },
    { from:"立即上报", to:"立即报告", category:"行文规范", title:"向上行文用语不规范", position:"正文第4段", reason:"向上级机关反映情况时使用“报告”等规范表述。", file:"《党政机关公文处理工作条例》", agency:"中共中央办公厅、国务院办公厅", clause:"第二章 公文种类", synced:"2026-08-20 10:15" },
    { from:"南京江北新区综合办公室", to:"南京江北新区管理委员会办公室", category:"机构名称", title:"落款机关名称需核实", position:"落款", reason:"发文机关和落款机关名称应与机构名录保持一致。", file:"南京江北新区机构名录", agency:"南京江北新区管理委员会", clause:"管理机构规范名称", synced:"2026-08-22 14:40" },
    { from:"按照新区领导有关要求", to:"依据正式会议纪要、批示或工作部署文件补充具体来源", category:"政策依据", title:"依据表述过于笼统", position:"正文第1段", reason:"政策与制度依据应当可识别、可核验，避免使用无法追溯的笼统表述。", file:"《政务文稿规范表述指引》", agency:"南京江北新区管理委员会办公室", clause:"第二章 依据引用规范", synced:"2026-08-22 15:10" },
    { from:"全面彻底排查", to:"全面排查", category:"简明表达", title:"同义修饰语叠加", position:"正文第2段", reason:"“全面”与“彻底”在此处语义叠加，政务行文应简明准确。", file:"《政务文稿规范表述指引》", agency:"南京江北新区管理委员会办公室", clause:"第四章 简明表达要求", synced:"2026-08-22 15:10" },
    { from:"各单位、各有关单位", to:"各有关单位", category:"责任主体", title:"责任主体表述重复", position:"正文第4段", reason:"同一语句中的责任主体应边界明确，避免包含关系重复。", file:"江北新区机构与责任主体规范库", agency:"南京江北新区管理委员会办公室", clause:"责任主体规范称谓", synced:"2026-08-22 14:40" },
    { from:"原则上不得晚于七月十五日之前", to:"于7月15日前", category:"时限表达", title:"完成时限条件叠加", position:"正文第4段", reason:"时间要求应明确唯一，避免“原则上”“不得晚于”“之前”等条件叠加。", file:"《党政机关公文处理工作条例》配套行文规则", agency:"中共中央办公厅、国务院办公厅", clause:"准确、简明的行文要求", synced:"2026-08-20 10:15" },
    { from:"对整改不到位的一律严肃追责", to:"对未按要求完成整改的，依照有关规定处理", category:"法律责任", title:"追责表述缺少适用依据和程序边界", position:"正文第4段", reason:"责任追究类表述应有制度依据，并保留认定条件和程序边界。", file:"《中华人民共和国安全生产法》", agency:"全国人民代表大会常务委员会", clause:"第六章 法律责任相关规定", synced:"2026-08-20 10:00" }
  ];

  const esc = value => String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const host = () => window.JBAITaskPilotHost || window.JBAIPlanPilotHost || null;
  let panel = null, active = null, running = false;

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
    return { id:`REVIEW-${id}`, state:"pending", mode:"replace", ...data };
  }

  function analyze(html) {
    const lines = plainLines(html), text = lines.join("\n"), results = [];
    RULES.forEach(rule => { if (text.includes(rule.from)) results.push(issue(rule, results.length + 1)); });
    if (text.includes("问题清单") && !/[附\s]*件[：:]/.test(text)) {
      results.push(issue({ category:"公文要素", title:"正文提及附件但缺少附件说明", original:"报送检查情况和问题清单", suggestion:"附件：安全生产检查问题清单", position:"正文末尾", reason:"正文涉及附件时，应在正文后标注附件名称。", mode:"append", file:"GB/T 9704—2012《党政机关公文格式》", agency:"国家质量监督检验检疫总局、国家标准化管理委员会", clause:"7.3.7 附件", synced:"2026-08-20 10:15" }, results.length + 1));
    }
    if (!/\d{4}年\d{1,2}月\d{1,2}日/.test(text)) {
      const today = new Date();
      results.push(issue({ category:"公文要素", title:"缺少成文日期", original:"未识别到成文日期", suggestion:`${today.getFullYear()}年${today.getMonth()+1}月${today.getDate()}日`, position:"文稿末尾", reason:"正式公文应标注完整成文日期。", mode:"append", file:"GB/T 9704—2012《党政机关公文格式》", agency:"国家质量监督检验检疫总局、国家标准化管理委员会", clause:"7.3.5.4 成文日期", synced:"2026-08-20 10:15" }, results.length + 1));
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
    let html = applyIssues(active.currentHTML, active.issues, false);
    if (!mark) return html;
    const accepted = [...active.acceptedChanges, ...active.issues.filter(row => row.state === "accepted")];
    const box = document.createElement("div"); box.innerHTML = html;
    accepted.forEach(row => replaceFirst(box, row.to || row.suggestion, row.to || row.suggestion, true));
    return box.innerHTML;
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

  function issueCardsHTML() {
    const c = counts();
    if (!active.issues.length) return `<div class="review-pass-state"><span>✓</span><b>本轮未发现需要处理的合规问题</b><p>已完成文种、格式、行文规则、政策依据与机构名称检查。</p></div>`;
    const dimensions = new Set(active.issues.map(row => row.category)).size;
    return `<section class="review-overview" aria-label="审查结果概览"><div><span>发现问题</span><b>${c.total}</b></div><div><span>待处理</span><b>${c.pending}</b></div><div><span>已处理</span><b>${c.accepted + c.ignored}</b></div><div><span>覆盖维度</span><b>${dimensions}</b></div></section>
      <div class="review-list-head"><div><b>问题清单</b><span>${c.pending ? `还有 ${c.pending} 项待处理，点击卡片可定位原文` : "本轮问题已处理，可发起重新审查"}</span></div><button data-review-action="accept-all" ${c.pending ? "" : "disabled"}>全部采纳</button></div>
      <div class="review-issue-list">${active.issues.map((row,index) => `<article class="review-issue-card ${row.state}" data-review-locate="${row.id}" data-review-category="${esc(row.category)}" title="点击定位原文">
        <span class="review-issue-index">${index+1}</span>
        <div class="review-issue-main"><header><span>${esc(row.category)}</span><b>${esc(row.title)}</b><em>${row.state==="accepted"?"已采纳":row.state==="ignored"?"已忽略":"待处理"}</em></header>
          <div class="review-compare"><div><small>原文</small><p>${esc(row.original || row.from)}</p></div><div><small>修改建议</small><p>${esc(row.suggestion || row.to)}</p></div></div>
          <p class="review-reason">${esc(row.reason)}</p>
          <details class="review-basis" ${index < 2 ? "open" : ""}><summary>审查依据与原文位置</summary><dl><div><dt>文件名称</dt><dd>${esc(row.file)}</dd></div><div><dt>发布机关</dt><dd>${esc(row.agency)}</dd></div><div><dt>具体条款</dt><dd>${esc(row.clause)}</dd></div><div><dt>最后同步时间</dt><dd>${esc(row.synced)}</dd></div></dl><p>原文位置：${esc(row.position)}</p></details>
        </div>
        <div class="review-issue-actions"><button class="${row.state==="accepted"?"active":""}" data-review-action="accept" data-issue-id="${row.id}">采纳</button><button class="${row.state==="ignored"?"active":""}" data-review-action="ignore" data-issue-id="${row.id}">忽略</button></div>
      </article>`).join("")}</div>`;
  }

  function recordsHTML() {
    return `<div class="review-record-list">${active.versions.map((version,index) => {
      const pending=version.issues.filter(row=>row.state==="pending").length, accepted=version.issues.filter(row=>row.state==="accepted").length, ignored=version.issues.filter(row=>row.state==="ignored").length;
      return `<article class="review-record-row"><span class="review-record-node">${index+1}</span><div><header><b>${index?"第"+index+"次复审":"初审"}</b><time>${esc(version.time)}</time></header><p>冻结问题 ${version.issues.length} 项 · 采纳 ${accepted} 项 · 忽略 ${ignored} 项 · 待处理 ${pending} 项</p></div></article>`;
    }).join("")}</div>`;
  }

  function reportData() {
    const initial=active.versions[0]?.issues || [], latest=active.issues || [];
    const latestTitles=new Set(latest.map(row=>row.title));
    const fixed=initial.filter(row=>row.state==="accepted"&&!latestTitles.has(row.title)).length;
    const ignored=active.versions.flatMap(row=>row.issues).filter(row=>row.state==="ignored").length;
    const remaining=latest.length;
    return { initial, fixed, ignored, remaining, conclusion:remaining?"仍有问题需要整改":ignored?"存在已忽略问题，需人工确认":"复审通过" };
  }

  function reportHTML() {
    const data=reportData();
    const rows=data.initial.map((row,index)=>`<tr><td>${index+1}. ${esc(row.title)}</td><td>${esc(row.original||row.from)}</td><td>${esc(row.suggestion||row.to)}</td><td>${row.state==="accepted"?(data.remaining?"已采纳，待后续复审":"复审通过"):row.state==="ignored"?"已忽略，待人工确认":"仍需处理"}</td></tr>`).join("");
    return `<article class="review-report"><header><p>辅助文本合规审查报告</p><h2>${esc(active.documentInfo.title)}</h2><span>${esc(data.conclusion)}</span></header>
      <div class="review-report-kpis"><div><b>${data.initial.length}</b><span>初审发现</span></div><div><b>${data.fixed}</b><span>已整改</span></div><div><b>${data.remaining}</b><span>复审遗留</span></div><div><b>${data.ignored}</b><span>人工确认</span></div></div>
      <section><h3>整改闭环明细</h3><div class="review-report-table"><table><thead><tr><th>问题</th><th>原文</th><th>修改建议</th><th>复审结果</th></tr></thead><tbody>${rows||'<tr><td colspan="4">本次初审未检出问题。</td></tr>'}</tbody></table></div></section>
      <section><h3>审查结论</h3><p>本报告保留初审问题快照、处理方式和复审结果。结论为“${esc(data.conclusion)}”；已忽略问题不视为自动通过，仍需经办人员人工确认。</p></section></article>`;
  }

  function render() {
    if (!ensurePanel() || !active) return;
    const view=active.view || "issues", c=counts(), data=reportData();
    const body=view==="issues"?issueCardsHTML():view==="document"?`<article class="review-paper">${workingHTML(true)}</article>`:view==="records"?recordsHTML():reportHTML();
    const canRecheck=!c.pending && c.total>0;
    const canReport=!c.pending && (active.versions[0].issues.length===0 || active.versions.length>1);
    panel.innerHTML=`<header class="review-result-bar"><nav class="review-view-tabs" aria-label="合规审查视图">
        <button class="${view==="issues"?"active":""}" data-review-view="issues">问题处理 <span>${c.total}</span></button>
        <button class="${view==="records"?"active":""}" data-review-view="records">审查记录 <span>${active.versions.length}</span></button>
        <button class="${view==="report"?"active":""}" data-review-view="report" ${active.reportGenerated?"":"disabled"}>审查报告</button>
      </nav><button class="review-close-button" data-review-action="close">${active.reportGenerated?"完成并退出":"退出审查"}</button></header>
      <div class="review-workspace">${body}</div>
      <footer class="review-action-bar"><p>${c.pending?`请处理剩余 ${c.pending} 项问题后重新审查。`:active.versions.length===1?"本轮问题已处理，重新审查后生成闭环报告。":`复审结论：${esc(data.conclusion)}`}</p><button data-review-action="recheck" ${canRecheck?"":"disabled"}>重新审查</button><button class="primary" data-review-action="report" ${canReport?"":"disabled"}>${active.reportGenerated?"更新审查报告":"生成审查报告"}</button></footer>`;
    window.JBAIDocumentFocus?.refresh?.();
  }

  function showLoading(documentInfo) {
    if (!ensurePanel()) return;
    document.querySelector("#documentEditorPanel")?.classList.add("review-active");
    panel.hidden=false;
    window.JBAIDocumentFocus?.enter?.({kind:"review",title:documentInfo.title,originalHTML:documentInfo.html,getCurrentHTML:()=>documentInfo.html});
    panel.innerHTML=`<div class="review-loading"><div><span></span><h3>正在执行合规审查</h3><p>正在匹配公文格式、行文规范、政策依据、制度和保密规则…</p></div></div>`;
  }

  function openResult(documentInfo, trigger) {
    const issues=analyze(documentInfo.html), now=new Date().toLocaleString("zh-CN",{hour12:false});
    active={documentInfo,originalHTML:documentInfo.html,currentHTML:documentInfo.html,docType:detectDocType(documentInfo.html),issues,acceptedChanges:[],versions:[{round:1,time:now,issues}],view:"issues",trigger:trigger||"conversation",reportGenerated:false};
    running=false;
    window.JBAIDocumentFocus?.enter?.({kind:"review",title:documentInfo.title,originalHTML:documentInfo.html,getCurrentHTML:()=>workingHTML(true)});
    render();
    host()?.addAgentMessage?.(documentInfo.conversationId,`<p>合规审查已完成，自动识别为“<b>${esc(active.docType)}</b>”，初审发现 <b>${issues.length}</b> 项问题。请在右侧逐条处理，完成后点击“重新审查”。</p>`,{agent:"review",kind:"integrated-review-complete",noTrust:true});
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
    window.JBAIPolishPilot?.close({silent:true});close({silent:true});
    running=true;showLoading(documentInfo);
    host()?.addAgentMessage?.(documentInfo.conversationId,"<p><b>主智能体 · 意图识别完成</b></p><p>已识别为辅助文本合规审查，正在自动识别文种并匹配适用规则。</p>",{agent:"review",kind:"integrated-review-start",noTrust:true});
    window.setTimeout(()=>openResult(documentInfo,options?.trigger),850);
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
    const c=counts();
    if (c.pending) { host()?.toast?.("请先处理全部问题。"); return; }
    active.acceptedChanges.push(...active.issues.filter(row=>row.state==="accepted").map(row=>({...row})));
    const ignoredTitles=new Set(active.versions.flatMap(row=>row.issues).filter(row=>row.state==="ignored").map(row=>row.title));
    active.currentHTML=workingHTML(false);
    const next=analyze(active.currentHTML).filter(row=>!ignoredTitles.has(row.title));
    active.issues=next;
    active.versions.push({round:active.versions.length+1,time:new Date().toLocaleString("zh-CN",{hour12:false}),issues:next});
    active.view=next.length?"issues":"records";active.reportGenerated=false;render();
    host()?.toast?.(next.length?`重新审查完成，仍有 ${next.length} 项问题。`:"重新审查完成，未发现遗留问题。");
  }

  function generateReport() {
    const c=counts();
    if (c.pending) { host()?.toast?.("请先处理全部问题。"); return; }
    if (active.versions[0].issues.length && active.versions.length<2) { host()?.toast?.("请先重新审查，再生成闭环报告。"); return; }
    const data=reportData(), html=workingHTML(true), report=reportHTML();
    const ok=host()?.commitReviewedDocument?.({html,reportHTML:report,initialCount:data.initial.length,remainingCount:data.remaining,summary:`初审${data.initial.length}项，整改${data.fixed}项，遗留${data.remaining}项，忽略${data.ignored}项`});
    if (!ok) return;
    active.reportGenerated=true;active.view="report";render();
    host()?.toast?.("闭环审查报告已生成，初审问题和复审结果均已保留。");
  }

  function close(options) {
    const previous=active;
    const finalHTML=options?.finalHTML!=null?options.finalHTML:(previous?.reportGenerated?workingHTML(true):previous?.originalHTML);
    running=false;active=null;
    document.querySelector("#documentEditorPanel")?.classList.remove("review-active");
    if(panel){panel.hidden=true;panel.innerHTML="";}
    window.JBAIDocumentFocus?.exit?.({html:finalHTML});
    if(!options?.silent)host()?.toast?.(previous?.reportGenerated?"已退出审查，右侧显示审查完成文稿。":"已退出审查，本次处理未应用。");
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
    const button=event.target.closest("[data-review-action]");
    if(!button)return;
    const action=button.dataset.reviewAction;
    if(action==="start"){startFromEditor({trigger:"button"});return;}
    if(action==="close"){close();return;}
    if(action==="recheck"){recheck();return;}
    if(action==="report"){generateReport();return;}
    if(action==="accept-all"&&active){active.issues.forEach(row=>{if(row.state==="pending")row.state="accepted";});render();return;}
    if((action==="accept"||action==="ignore")&&active){
      const row=active.issues.find(item=>item.id===button.dataset.issueId);if(!row)return;
      row.state=action==="accept"?"accepted":"ignored";active.reportGenerated=false;render();
    }
  });

  window.JBAIReviewPilot={
    shouldStart,start,startFromEditor,close,
    onEditorOpen(){if(!document.querySelector("#view-chat")?.classList.contains("editor-open"))close({silent:true});},
    analyze,
    getState(){return active?{docType:active.docType,view:active.view,versions:active.versions.length,issues:active.issues.map(row=>({...row})),reportGenerated:active.reportGenerated}:null;}
  };
})();
