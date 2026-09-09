(function () {
  "use strict";

  const STORAGE_KEY = "jbai.plan-pilot.tasks.v1";
  const PLAN_STEP_LABELS = ["结构化梳理", "思路与目标", "任务与步骤", "成文"];
  const INTERPRET_STEP_LABELS = ["查看解读结果", "报告信息确认"];
  const CHANNEL = { CHAT: "对话指令", PAGE: "页面编辑", AI: "AI自动填充" };
  const $ = (selector, root) => (root || document).querySelector(selector);
  const esc = (value) => String(value == null ? "" : value)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const now = () => new Date().toLocaleString("zh-CN", { hour12: false });
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const icon = (name, size) => `<svg class="svg-icon" style="width:${size || 14}px;height:${size || 14}px"><use href="#${name}"></use></svg>`;
  const cnNumber = (number) => ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"][number] || String(number);

  let taskStore = loadTasks();
  let activeTaskId = null;
  let tabs = null;
  let panel = null;
  let previewDrawer = null;
  let staleBanner = null;
  let resizer = null;
  let inputDirty = false;
  let editingCommit = false;
  let restoreTimer = null;
  let dragReorder = null;
  let interpretFocusTaskId = null;

  function host() { return window.JBAITaskPilotHost || window.JBAIPlanPilotHost || null; }
  function toast(message) { const api = host(); if (api && api.toast) api.toast(message); }

  function loadTasks() {
    try {
      const rows = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(rows) ? rows.map(task => {
        task.maxStep = task.maxStep || task.currentStep || 1;
        task.invalidStages = task.invalidStages || [];
        (task.data?.tasks || []).forEach(item => item.subtasks.forEach(sub => { sub.steps = sub.steps.map((step,index) => typeof step === "string" ? { id:`${sub.id}-STEP-${index}`, text:step } : step); }));
        return task;
      }) : [];
    } catch (error) { return []; }
  }

  function persist() {
    try {
      const compact = taskStore.slice(0, 8).map((task) => ({ ...task, past: (task.past || []).slice(-20), operations: (task.operations || []).slice(-80) }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compact));
    } catch (error) { /* 原型存储失败不阻断当前会话 */ }
  }

  function getTask(id) { return taskStore.find((task) => task.id === id) || null; }
  function taskForConversation(conversationId, agentId) {
    return taskStore.find((task) => task.conversationId === conversationId && (!agentId || (task.agentId || "plan") === agentId) && task.status !== "已归档" && task.status !== "已取消") || null;
  }
  function taskAgent(task) { return task && task.agentId ? task.agentId : "plan"; }
  function stepLabels(task) { return taskAgent(task) === "interpret" ? INTERPRET_STEP_LABELS : PLAN_STEP_LABELS; }
  function stepTotal(task) { return stepLabels(task).length; }
  function taskAgentName(task) { return taskAgent(task) === "interpret" ? "政务文件解读" : "工作计划编排智能生成"; }


  function createTask(args) {
    const data=window.JBAIPilotContent.plan(args.source,args.meta);
    const task={id:uid("PLAN"),agentId:"plan",conversationId:args.conversationId,title:data.meta.title,status:"待确认",artifactStatus:"未生成",currentStep:1,maxStep:1,activeTab:"task",version:1,changedCount:0,previewChangedCount:0,previewOpen:false,manualTab:false,data,confirmations:[],suggestions:[],past:[],operations:[],invalidStages:[],snapshot:{templateVersion:args.meta.type,model:"默认模型",createdAt:now()},artifact:{messageIndex:null,version:0,html:"",previewHTML:"",exported:false},createdAt:now(),updatedAt:now()};
    taskStore.unshift(task);persist();return task;
  }



  function createInterpretTask(args) {
    const data=args.interpreted || window.JBAIPilotContent.interpret(args.source);
    const sourceHeading=data.source.segments.find(row=>row.text.length<100&&/通知|办法|意见|公告/.test(row.text)&&!/^【/.test(row.text))?.text;
    data.meta={title:(args.source.type==="本次粘贴内容"?(sourceHeading||"政务内容"):args.source.name.replace(/\.[^.]+$/,""))+"解读报告",audience:args.meta?.audience||"政务工作人员",depth:args.meta?.depth||"标准解读"};
    const task={id:uid("INTERPRET"),agentId:"interpret",conversationId:args.conversationId,title:data.meta.title,status:"待确认",artifactStatus:"未生成",currentStep:1,maxStep:1,activeTab:"task",activeSection:"summary",version:1,changedCount:0,previewChangedCount:0,previewOpen:false,sourceOpen:false,sourceFocusId:"",manualTab:false,data,confirmations:[],suggestions:[],past:[],operations:[],snapshot:{createdAt:now(),sourceVersion:args.source.version},artifact:{messageIndex:null,version:0,html:"",previewHTML:"",exported:false},createdAt:now(),updatedAt:now()};
    taskStore.unshift(task);persist();return task;
  }

  function pendingCount(task) {
    return task.confirmations.filter((item) => !item.confirmed).length + task.suggestions.filter((item) => item.state === "建议中" || item.state === "待确认").length;
  }

  function taskSummaryHTML(task, message) {
    const isInterpret = taskAgent(task) === "interpret";
    const labels = stepLabels(task);
    const meta = isInterpret
      ? `<span>${task.data.source.segments.length}个原文单元</span><span>已生成4类解读</span><span>可直接浏览结果</span>`
      : `<span>${task.data.sources.length}份材料</span><span>${task.data.tasks.length}项重点任务</span><span>待确认${pendingCount(task)}项</span>`;
    return `<p>${esc(message || "已完成附件解析和任务初步归类，请在右侧确认结构化结果。")}</p>
      <div class="plan-chat-summary-card">
        <b>${esc(task.title)}</b>
        <p>当前步骤：${esc(labels[task.currentStep - 1])}。${isInterpret ? "每条解读均可定位原文依据，并可携带条款上下文继续追问。" : "对话中的修改只生成建议，确认后才会写入任务。"}</p>
        <div class="plan-chat-summary-meta">${meta}</div>
        <button class="plan-chat-open" type="button" data-plan-chat-open="${task.id}">${isInterpret ? "进入专注解读" : "前往任务区"}</button>
      </div>`;
  }

  function interpretSourceHTML(task) {
    const source=task.data.source,segments=source.segments||[];
    return `<div class="interpret-focus-source"><header><span>政策原文</span><h2>${esc(source.name||"待解读内容")}</h2><p>${segments.length} 个原文单元 · 点击右侧依据可定位</p></header>${segments.map(segment=>`<section class="interpret-focus-source-unit" data-source-unit="${esc(segment.id)}"><b>${esc(segment.label)}</b><p>${esc(segment.text)}</p></section>`).join("")||"<p>该任务未保存可定位的原文内容。</p>"}</div>`;
  }

  function restoreInterpretPanel(finalHTML) {
    if (!panel) return;
    const editorPanel=$("#documentEditorPanel"),bottomArea=$(".editor-bottom-area",editorPanel);
    window.JBAIDocumentFocus?.exit?.({html:finalHTML});
    panel.classList.remove("interpret-focus-panel");
    editorPanel?.classList.remove("interpret-focus-active");
    if (bottomArea && panel.parentElement!==editorPanel) editorPanel.insertBefore(panel,bottomArea);
    interpretFocusTaskId=null;
  }

  function enterInterpretFocus(task) {
    const state=window.JBAIDocumentFocus?.getState?.();
    if (state?.kind==="interpret" && state.paused) return;
    const editorPanel=$("#documentEditorPanel"),main=$(".editor-main-content",editorPanel);
    if (!editorPanel||!main||!panel) return;
    if (panel.parentElement!==main) main.appendChild(panel);
    panel.classList.add("interpret-focus-panel");
    editorPanel.classList.remove("plan-task-tab");
    editorPanel.classList.add("interpret-focus-active");
    const sourceHTML=interpretSourceHTML(task);
    if (interpretFocusTaskId!==task.id || state?.kind!=="interpret") {
      interpretFocusTaskId=task.id;
      window.JBAIDocumentFocus?.enter?.({kind:"interpret",title:"政策原文",originalHTML:sourceHTML,getCurrentHTML:()=>sourceHTML,view:"original"});
    }
  }

  function ensureShell() {
    if (tabs) return true;
    const editorPanel = $("#documentEditorPanel"), topBar = $(".editor-top-bar", editorPanel), bottomArea = $(".editor-bottom-area", editorPanel), main = $(".editor-main-content", editorPanel);
    if (!editorPanel || !topBar || !bottomArea || !main) return false;
    tabs = document.createElement("div");
    tabs.className = "plan-pilot-tabs";
    tabs.id = "planPilotTabs";
    tabs.hidden = true;
    tabs.innerHTML = `<button class="plan-pilot-tab active" type="button" data-plan-tab="task">${icon("i-clipboard",14)}任务处理 <span class="plan-tab-badge pending" id="planTaskBadge">0</span></button>
      <button class="plan-pilot-tab" type="button" data-plan-tab="result">${icon("i-file",14)}成果文稿 <span class="plan-tab-badge" id="planResultBadge">未生成</span></button>
      <span class="plan-pilot-tabs-spacer"></span>
      <button class="plan-pilot-ghost" hidden type="button" data-plan-action="undo">${icon("i-refresh",13)}撤销</button>
      <button class="plan-pilot-ghost" hidden type="button" data-plan-action="togglePreview">${icon("i-file",13)}预览</button>
      <button class="plan-pilot-ghost" type="button" data-plan-action="toggleFullscreen">${icon("i-expand",13)}全屏</button>
      <button class="plan-pilot-ghost" type="button" data-plan-action="closePilot" aria-label="关闭任务区"><span aria-hidden="true">×</span>关闭</button>
      <button class="plan-pilot-ghost plan-pilot-mobile-back" type="button" data-plan-action="toggleNarrowChat">${icon("i-chat",13)}返回对话</button>`;
    topBar.insertBefore(tabs, $("#ooToolbar", topBar));

    staleBanner = document.createElement("div");
    staleBanner.className = "plan-stale-banner";
    staleBanner.hidden = true;
    staleBanner.innerHTML = `${icon("i-info",14)}<span>任务数据已变化，当前文稿不是最新版本。</span><button class="plan-link-action" type="button" data-plan-action="refreshArtifact">更新文稿</button>`;
    topBar.insertBefore(staleBanner, $("#ooToolbar", topBar));

    panel = document.createElement("section");
    panel.id = "planPilotPanel";
    panel.className = "plan-pilot-panel";
    panel.hidden = true;
    editorPanel.insertBefore(panel, bottomArea);

    previewDrawer = document.createElement("aside");
    previewDrawer.className = "plan-preview-drawer";
    previewDrawer.id = "planPreviewDrawer";
    previewDrawer.hidden = true;
    editorPanel.appendChild(previewDrawer);

    resizer = document.createElement("div");
    resizer.className = "plan-workspace-resizer";
    resizer.setAttribute("aria-hidden", "true");
    editorPanel.appendChild(resizer);
    wireResizer(resizer);
    return true;
  }

  function openTask(task, force) {
    if(!task || !ensureShell())return;
    if(host()?.isCurrent && !host().isCurrent(task.conversationId))return;
    const changed=activeTaskId!==task.id;
    activeTaskId=task.id;
    if(changed || force) {task.activeTab="task";task.manualTab=false;task.previewOpen=false;task.sourceOpen=false;}
    host()?.openShell?.({taskId:task.id,title:taskAgent(task)==="interpret"?"政务文件解读":"工作计划编排"});
    $("#view-chat")?.classList.remove("plan-show-chat");
    persist();
    if(task.activeTab==="result" && task.artifact.messageIndex!=null)host()?.openArtifact?.(task.conversationId,task.artifact.messageIndex,task.id);
    else render();
  }

  function setTab(tabName, options) {
    const task = getTask(activeTaskId); if (!task || !ensureShell()) return;
    const editorPanel = $("#documentEditorPanel");
    const manual = !options || options.manual !== false;
    task.manualTab = manual || task.manualTab;
    task.activeTab = tabName;
    $("#view-chat")?.classList.remove("plan-show-chat");
    if (tabName === "result" && task.artifact.messageIndex != null) {
      if(taskAgent(task)==="interpret")restoreInterpretPanel(task.artifact.html);
      const api = host();
      if (api && api.openArtifact) api.openArtifact(task.conversationId, task.artifact.messageIndex, task.id);
      return;
    }
    if(taskAgent(task)==="interpret")enterInterpretFocus(task);else editorPanel.classList.add("plan-task-tab");
    panel.hidden = false;
    previewDrawer.hidden = true;
    render();
    persist();
  }

  function attachArtifact(args) {
    const task = getTask(args.taskId || activeTaskId); if (!task || !ensureShell()) return;
    activeTaskId = task.id;
    if(taskAgent(task)==="interpret" && window.JBAIDocumentFocus?.getState?.()?.kind==="interpret")restoreInterpretPanel(task.artifact.html);
    task.artifact.messageIndex = Number(args.messageIndex);
    task.activeTab = "result";
    const editorPanel = $("#documentEditorPanel");
    editorPanel.classList.remove("plan-task-tab");
    panel.hidden = true;
    previewDrawer.hidden = true;
    renderTabs(task);
    renderStaleBanner(task);
    persist();
  }

  function close() {
    if (!ensureShell()) return;
    const closingTask=getTask(activeTaskId);
    if(taskAgent(closingTask)==="interpret" && window.JBAIDocumentFocus?.getState?.()?.kind==="interpret")restoreInterpretPanel(closingTask?.artifactStatus!=="未生成"?closingTask.artifact.html:interpretSourceHTML(closingTask));
    tabs.hidden = true;
    panel.hidden = true;
    previewDrawer.hidden = true;
    staleBanner.hidden = true;
    $("#documentEditorPanel")?.classList.remove("plan-task-tab");
    $("#view-chat")?.classList.remove("plan-pilot-open", "plan-pilot-fullscreen", "plan-show-chat");
    activeTaskId = null;
    inputDirty = false;
    $("#pilotFollowupChip")?.remove();
  }

  function render() {
    const task = getTask(activeTaskId); if (!task || !ensureShell()) return;
    tabs.hidden = false;
    renderTabs(task);
    renderStaleBanner(task);
    if (task.activeTab === "result" && task.artifact.messageIndex != null) return;
    panel.hidden = false;
    if(taskAgent(task)==="interpret")enterInterpretFocus(task);else $("#documentEditorPanel")?.classList.add("plan-task-tab");
    if (task.activeTab === "result") renderResultEmpty(task);
    else renderTaskPanel(task);
    renderPreview(task);
    const focusState=window.JBAIDocumentFocus?.getState?.();
    if(taskAgent(task)==="interpret" && focusState?.kind==="interpret" && focusState.paused)panel.hidden=true;
  }

  function renderTabs(task) {
    if(!tabs)return;
    tabs.querySelectorAll("[data-plan-tab]").forEach(button=>button.classList.toggle("active",button.dataset.planTab===task.activeTab));
    const generated=task.artifactStatus!=="未生成";
    tabs.querySelector('[data-plan-action="undo"]').hidden=taskAgent(task)==="interpret" || !generated || !(task.past||[]).length;
    tabs.querySelector('[data-plan-action="togglePreview"]').hidden=!generated;
    $("#documentEditorPanel")?.classList.toggle("pilot-is-interpret",taskAgent(task)==="interpret");
    const taskBadge=$("#planTaskBadge"),resultBadge=$("#planResultBadge");
    if(taskBadge){taskBadge.textContent=pendingCount(task)?`待确认 ${pendingCount(task)}`:"";taskBadge.hidden=!pendingCount(task);}
    if(resultBadge){resultBadge.textContent=task.artifactStatus==="已过期"?"待更新":generated?`V${task.artifact.version}`:"未生成";resultBadge.className=`plan-tab-badge ${task.artifactStatus==="已过期"?"stale":generated?"ready":""}`;}
  }

  function renderStaleBanner(task) {
    if (!staleBanner) return;
    const show = task.activeTab === "result" && task.artifactStatus === "已过期";
    staleBanner.hidden = !show;
    if (show) $("span", staleBanner).textContent = `任务数据已有${task.changedCount || 1}处变化，当前文稿不是最新版本，更新前不可导出。`;
  }

  function renderResultEmpty(task) {
    const isInterpret = taskAgent(task) === "interpret";
    panel.innerHTML = `<div class="plan-result-empty"><div class="plan-result-empty-inner"><div class="plan-result-empty-icon">文</div><h3>${isInterpret ? "解读报告尚未生成" : "成果文稿尚未生成"}</h3><p>${isInterpret ? "系统已自动生成四类解读结果，浏览结果并确认报告信息后即可生成解读报告。" : "请先完成材料梳理、思路目标和任务拆解。到第4步确认后，系统将在这里生成可编辑工作计划。"}</p><button class="plan-primary-action" style="margin-top:16px" type="button" data-plan-action="backToTask">继续处理任务</button></div></div>`;
  }

  function renderTaskPanel(task) {
    if(taskAgent(task)==="interpret"){renderInterpretPanel(task);return;}
    panel.dataset.protoScope="page:chat:work-plan";panel.dataset.protoLayer="10";
    const step=task.currentStep,labels=stepLabels(task);
    task.invalidStages=task.invalidStages||[];
    panel.innerHTML=`<header class="plan-task-summary workplan-task-summary"><div class="task-summary-symbol">${icon("i-list",20)}</div><div class="plan-task-summary-copy"><h2>工作计划编排</h2><p>将部署要求整理为可执行、可检查的工作计划</p><div class="plan-head-facts"><span>${esc(task.data.meta.unit)}</span><span>${esc(task.data.meta.period)}</span><span>${esc(task.data.meta.type)}</span></div></div><div class="plan-head-actions"><button class="pilot-action-button plan-meta-adjust" type="button" data-plan-action="adjustMeta">${icon("i-edit",13)}调整信息</button><span class="plan-task-state">${esc(task.status)}</span></div></header>
      <nav class="plan-step-nav" aria-label="工作计划编排步骤">${labels.map((label,index)=>`<button type="button" class="plan-step ${index+1===step?"active":index+1<step?"done":""}" data-plan-step="${index+1}" ${index+1>(task.maxStep||step)?"disabled":""}><span class="plan-step-index">${index+1}</span><span class="plan-step-label">${esc(label)}</span></button>`).join("")}</nav>
      <div class="plan-task-scroll" id="planTaskScroll">${renderSuggestions(task)}${task.invalidStages.includes(step)?`<div class="plan-notice">上游内容已变化，本步骤需要更新。<button class="plan-link-action" data-plan-action="rebuildStage" data-stage="${step}">更新本步骤</button></div>`:""}${task.restoreNotice?`<div class="pilot-restore" role="status">已删除所选内容 <button class="plan-link-action" data-plan-action="restoreDelete">恢复</button></div>`:""}${step===1?renderStepOne(task):step===2?renderStepTwo(task):step===3?renderStepThree(task):renderStepFour(task)}</div>${renderFooter(task)}`;
  }

  function evidenceActions(task,item) {
    const references=item.references || (item.sourceId?[{id:item.sourceId,label:item.sourceLabel}]:[]);
    const segments=task.data.source.segments||[];
    const excerpts=references.map(ref=>({id:ref.id,label:ref.label||"原文依据",text:segments.find(row=>row.id===ref.id)?.text||""})).filter(row=>row.text);
    const sourceHTML=excerpts.length?`<div class="interpret-evidence-snippets" aria-label="对应原文依据">${excerpts.map(row=>`<button type="button" class="interpret-evidence-snippet" data-plan-action="viewSource" data-evidence-id="${item.id}" data-reference-id="${esc(row.id)}" title="在左侧定位原文"><b>${esc(row.label)}</b><span>${esc(row.text)}</span></button>`).join("")}</div>`:`<span class="interpret-missing">${esc(item.definitionSource?`定义来源：${item.definitionSource}`:"未定位到原文依据，可在上方手动补充内容")}</span>`;
    return `${sourceHTML}<button class="pilot-evidence-button" type="button" data-plan-action="askEvidence" data-evidence-id="${item.id}">${icon("i-chat",12)}基于此条追问</button>`;
  }

  function interpretSections() { return [["summary","核心摘要"],["path","实施路径"],["terms","术语限制"],["qa","问答口径"]]; }
  function sectionSignature(task,id) {
    const data=task.data;
    const values=id==="summary"?[data.summary,data.background]:id==="terms"?[data.terms,data.limits]:[data[id]];
    return JSON.stringify([data.source.version,...values]);
  }
  function sectionConfirmed(task,id) { return task.sectionReviews?.[id]===sectionSignature(task,id); }
  function requireInterpretReview(task) {
    return true;
  }
  function dateField(task,path,value,label) {
    const date=window.JBAIPilotContent.dateValue(value,task.data.meta.period);
    return `<label class="plan-field pilot-date-field"><span>${label}</span><input type="date" aria-label="${label}" data-date-picker data-plan-edit="${path}" value="${esc(date)}">${value&&!date?`<small class="pilot-date-hint">原文时间：${esc(value)}；请选择具体日期。</small>`:""}</label>`;
  }

  function insightCard(task,collection,item) {
    const manual=!!item.manual,editable=!item.grounded||manual;
    const status=manual?"人工补充":item.authority||(item.grounded?"原文提炼":"待补充");
    const body=editable?`<label class="interpret-manual-field"><span>${item.grounded?"修改内容":"补充内容"}</span><textarea rows="3" data-interpret-edit="insight:${collection}:${item.id}:text" placeholder="请输入核实后的内容">${esc(item.text==="原文未明确"?"":item.text)}</textarea></label>`:`<p>${esc(item.text)}</p>`;
    return `<article class="interpret-insight-card ${item.grounded ? "" : "missing"} ${manual?"manual":""}"><span class="interpret-insight-number">${icon(item.grounded?"i-check":"i-edit",14)}</span><div class="interpret-insight-copy"><header><h4>${esc(item.title)}</h4><span>${esc(status)}</span></header>${body}<div class="interpret-evidence-actions">${evidenceActions(task,item)}</div></div></article>`;
  }

  function renderInterpretPanel(task) {
    const step=task.currentStep,labels=stepLabels(task);
    const segments=task.data.source.segments?.length||0;
    panel.dataset.protoScope="page:chat:policy-interpretation";panel.dataset.protoLayer="10";
    panel.innerHTML=`<header class="plan-task-summary interpret-task-summary"><div class="task-summary-symbol interpret-task-symbol">${icon("i-book",20)}</div><div class="plan-task-summary-copy"><h2>政务文件解读</h2><div class="interpret-head-facts"><span><b>${segments}</b> 个原文单元</span><span><b>${task.data.path.length}</b> 项执行信息</span></div></div><div class="interpret-head-actions"><button class="pilot-action-button" type="button" data-plan-action="viewAllSource">${icon("i-file",13)}原文</button><button class="pilot-action-button" type="button" data-plan-action="exitInterpret">退出解读</button></div></header><nav class="plan-step-nav two-steps" aria-label="政务文件解读步骤">${labels.map((label,index)=>`<button class="plan-step ${step===index+1?"active":index+1<step?"done":""}" data-plan-step="${index+1}" ${index+1>(task.maxStep||step)?"disabled":""}><span class="plan-step-index">${index+1}</span><span class="plan-step-label">${label}</span></button>`).join("")}</nav><div class="plan-task-scroll" id="planTaskScroll">${step===1?renderInterpretCombined(task):renderInterpretStepFour(task)}</div>${renderFooter(task)}`;
  }

  function renderInterpretCombined(task) {
    const data=task.data,section=task.activeSection||"summary",sections=interpretSections();
    task.sectionVisits=task.sectionVisits||{};task.sectionVisits[section]=true;
    const counts={summary:data.summary.length+(data.background||[]).length,path:data.path.length,terms:data.terms.length+(data.limits||[]).length,qa:data.qa.length};
    const tabIcons={summary:"i-file-check",path:"i-list",terms:"i-book",qa:"i-chat"};
    let content="";
    if(section==="summary")content=`<section class="interpret-section-block"><header class="interpret-section-head"><div><h3>核心摘要与政策背景</h3><p>先看结论，再按需核对每条结论对应的原文依据。</p></div><span>${counts.summary} 项内容</span></header><h3 class="pilot-subheading">核心要点</h3><div class="interpret-card-grid">${data.summary.map(item=>insightCard(task,"summary",item)).join("")}</div><h3 class="pilot-subheading">出台背景、依据与目标</h3><div class="interpret-card-grid">${(data.background||[]).map(item=>insightCard(task,"background",item)).join("")}</div></section>`;
    if(section==="path")content=`<section class="interpret-section-block"><header class="interpret-section-head"><div><h3>实施路径与支持措施</h3><p>${esc(data.routeNote||"仅呈现原文明确的执行要求，不补写办理流程。")}</p></div><span>${counts.path} 项信息</span></header><div class="interpret-path-list">${data.path.length?data.path.map((item,index)=>`<article class="interpret-path-step interpret-path-card"><header><span class="interpret-path-index">${String(index+1).padStart(2,"0")}</span><div><span class="interpret-phase">${esc(item.phase||"执行要求")}</span><h4>${esc(item.title)}</h4></div>${item.parallel?'<span class="pilot-parallel">并行事项</span>':""}</header><p>${esc(item.text)}</p><div class="pilot-action-facts">${["owner","deadline","metric"].map((field,n)=>{const labels=["责任主体","时间要求","量化指标"],value=item[field],isMissing=!value||value==="原文未明确";return isMissing?`<label><span>${labels[n]}</span><input data-interpret-edit="path:${item.id}:${field}" value="" placeholder="可手动补充"></label>`:`<div><span>${labels[n]}</span><strong>${esc(value)}</strong></div>`;}).join("")}</div><div class="interpret-evidence-actions">${evidenceActions(task,item)}</div></article>`).join(""):'<div class="pilot-empty">原文未明确具体行动步骤，不自动补写办理流程。</div>'}</div></section>`;
    if(section==="terms")content=`<section class="interpret-section-block"><header class="interpret-section-head"><div><h3>术语、适用范围与限制条件</h3><p>原文有明确定义时直接引用；没有定义时可人工补充并标记为人工内容。</p></div><span>${counts.terms} 项内容</span></header><h3 class="pilot-subheading">关键术语</h3><div class="interpret-card-grid">${data.terms.length?data.terms.map(item=>insightCard(task,"terms",item)).join(""):'<p class="pilot-empty">原文未提供专门术语定义；当前未连接权威术语库，不将模型猜测作为标准定义。</p>'}</div><h3 class="pilot-subheading">适用与限制</h3><div class="interpret-card-grid">${(data.limits||[]).map(item=>insightCard(task,"limits",item)).join("")}</div></section>`;
    if(section==="qa")content=`<section class="interpret-section-block"><header class="interpret-section-head"><div><h3>常用问答口径</h3><p>回答保持与原文一致，可直接查看依据片段或带入左侧继续追问。</p></div><span>${counts.qa} 组问答</span></header><div class="interpret-qa-list">${data.qa.map((item,index)=>`<article class="pilot-qa ${item.grounded?"":"missing"}"><header><span>Q${index+1}</span><h4>${esc(item.question)}</h4></header>${item.grounded?`<p>${esc(item.answer)}</p>`:`<label class="interpret-manual-field"><span>补充回答</span><textarea rows="3" data-interpret-edit="insight:qa:${item.id}:answer" placeholder="请输入核实后的答复口径">${esc(item.answer==="原文未明确"?"":item.answer)}</textarea></label>`}<div class="interpret-evidence-actions">${evidenceActions(task,item)}</div></article>`).join("")}</div></section>`;
    return `<section class="pilot-results"><nav class="interpret-result-tabs" aria-label="解读内容分类">${sections.map(([id,label])=>`<button class="${section===id?"active":""}" data-plan-action="switchInterpretSection" data-section="${id}" aria-pressed="${section===id}"><span class="interpret-tab-main">${icon(tabIcons[id],16)}${label}</span><small>${counts[id]}项</small></button>`).join("")}</nav><div class="pilot-result-content">${content}</div></section>`;
  }





  function renderInterpretStepFour(task) {
    return `<section class="pilot-publish"><header class="pilot-publish-head"><span class="pilot-document-symbol">${icon("i-file",30)}</span><div><h3>确认并生成解读报告</h3><p>解读结果已生成，报告将保留原文依据与人工补充标记。</p></div></header><div class="pilot-publish-body"><label class="plan-field"><span>报告标题</span><input aria-label="报告标题" data-interpret-edit="meta.title" value="${esc(task.data.meta.title)}" required></label><h4>解读设置</h4><dl class="pilot-publish-meta"><div><dt>解读对象</dt><dd>${esc(task.data.meta.audience)}</dd></div><div><dt>解读深度</dt><dd>${esc(task.data.meta.depth)}</dd></div></dl><p class="pilot-description">已在开始解读前确认，仅展示；本次结果按以上设置组织。</p><h4>报告内容</h4><ol class="pilot-report-contents"><li>核心摘要与政策背景</li><li>实施路径图示与责任、时限清单</li><li>术语解释与适用限制对照表</li><li>问答口径与原文依据</li></ol><p class="pilot-description">图示仅帮助阅读，不推定原文未明确的先后关系或办理条件。</p></div></section>`;
  }

  function renderSuggestions(task) {
    const rows = task.suggestions.filter((item) => item.state === "建议中" || item.state === "待确认" || item.state === "冲突");
    if (!rows.length) return "";
    return `<section class="plan-section" id="planSuggestionSection"><div class="plan-section-head"><div><h3>待处理修改建议</h3><p>对话修改先形成建议卡；确认时会再次校验当前数据版本。</p></div></div><div class="plan-section-body"><div class="plan-suggestion-list">${rows.map((item) => `<article class="plan-suggestion-card ${item.state === "冲突" ? "conflict" : ""}"><div class="plan-suggestion-title"><b>${esc(item.anchor)}</b><span class="plan-suggestion-state">${esc(item.state)}</span></div><dl class="plan-change-grid"><dt>修改字段</dt><dd>${esc(item.fieldLabel)}</dd><dt>修改前</dt><dd>${esc(item.before || "（空）")}</dd><dt>修改后</dt><dd class="after">${esc(item.after || "删除该任务")}</dd></dl>${item.state === "冲突" ? `<div class="plan-notice error" style="margin:10px 0 0">当前值已发生变化，请刷新建议后重新确认，系统不会静默覆盖。</div>` : ""}<div class="plan-suggestion-actions"><button class="plan-link-action" type="button" data-plan-action="cancelSuggestion" data-suggestion-id="${item.id}">取消</button><button class="plan-primary-action" type="button" data-plan-action="applySuggestion" data-suggestion-id="${item.id}">${item.state === "冲突" ? "刷新建议" : "应用修改"}</button></div></article>`).join("")}</div></div></section>`;
  }

  function renderStepOne(task) {
    const groups=task.data.clusters;
    return `<section class="plan-section"><div class="plan-section-head"><div><h3>结构化任务清单</h3><p>已归为 ${groups.length} 个大类，共 ${groups.reduce((n,g)=>n+g.items.length,0)} 项工作要求。拖拽手柄可调整大类顺序，点击内容可直接修改。</p></div><div class="pilot-inline-actions"><button class="pilot-action-button" data-plan-action="reparse">${icon("i-refresh")}重新解析</button><button class="pilot-action-button emphasized" data-plan-action="addCluster">${icon("i-plus")}新增任务大类</button></div></div><div class="plan-section-body">${groups.map((group,index)=>`<section class="pilot-cluster pilot-sort-card" data-reorder-kind="cluster" data-reorder-id="${group.id}"><header><button class="pilot-drag" draggable="true" data-reorder-handle="cluster:${group.id}" title="拖拽调整大类顺序" aria-label="拖拽调整${esc(group.name)}顺序">${icon("i-menu",14)}</button><button class="pilot-fold" data-plan-action="toggleCluster" data-cluster-id="${group.id}" aria-label="${group.collapsed?"展开":"收起"}任务大类" aria-expanded="${!group.collapsed}">${icon(group.collapsed?"i-chevron-right":"i-chevron-down")}</button><span class="pilot-group-index">${String(index+1).padStart(2,"0")}</span><input class="pilot-inline" aria-label="任务大类名称" data-plan-edit="cluster:${group.id}:name" value="${esc(group.name)}"><small>${group.items.length} 项</small><button class="plan-mini-danger" data-plan-action="deleteCluster" data-cluster-id="${group.id}">删除</button></header><div class="pilot-cluster-body" ${group.collapsed?"hidden":""}><div class="pilot-cluster-items">${group.items.map((item,n)=>`<article class="pilot-list-row"><span class="pilot-order">${n+1}</span><div class="pilot-item-copy"><textarea class="pilot-inline" rows="2" aria-label="任务条目" data-plan-edit="item:${group.id}:${item.id}">${esc(item.text)}</textarea>${!item.edited&&item.source&&item.source!=="手动新增"?`<button type="button" class="pilot-citation" data-plan-action="viewPlanSource" data-cluster-id="${group.id}" data-item-id="${item.id}">${icon("i-file",12)}<span>引用 ${esc(item.source)}</span><b>查看原文</b></button>`:""}</div><button class="plan-mini-danger pilot-item-delete" aria-label="删除第${n+1}条任务" data-plan-action="deleteItem" data-cluster-id="${group.id}" data-item-id="${item.id}">删除</button></article>`).join("")||'<p class="pilot-empty">当前大类暂无条目。</p>'}</div><div class="pilot-cluster-footer"><button class="pilot-action-button add-row" data-plan-action="addItem" data-cluster-id="${group.id}">${icon("i-plus")}新增条目</button><small>条目较多时可在上方区域滚动查看</small></div></div></section>`).join("")||'<p class="pilot-empty">暂未提取到任务，点击“新增任务大类”补充。</p>'}</div></section>`;
  }

  function renderStepTwo(task) {
    return `<section class="plan-section"><div class="plan-section-head"><div><h3>总体工作思路</h3><p>先确定方向，再核对可落地、可检查的目标。</p></div><button class="pilot-action-button" data-plan-action="rebuildStage" data-stage="2">${icon("i-refresh")}重新凝练</button></div><div class="plan-section-body"><textarea class="pilot-thinking" aria-label="总体工作思路" data-plan-edit="thinking">${esc(task.data.thinking)}</textarea></div></section><section class="plan-section"><div class="plan-section-head"><div><h3>核心工作目标 <small>${task.data.goals.length} 项</small></h3><p>拖拽目标卡片左侧手柄调整成文顺序。</p></div><button class="pilot-action-button emphasized" data-plan-action="addGoal">${icon("i-plus")}新增目标</button></div><div class="plan-section-body pilot-sort-list">${task.data.goals.map((goal,index)=>`<article class="pilot-goal pilot-sort-card" data-reorder-kind="goal" data-reorder-id="${goal.id}"><header><button class="pilot-drag" draggable="true" data-reorder-handle="goal:${goal.id}" title="拖拽调整目标顺序" aria-label="拖拽调整第${index+1}项目标顺序">${icon("i-menu",14)}</button><span class="pilot-group-index">${index+1}</span><input class="pilot-inline" aria-label="目标内容" data-plan-edit="goal:${goal.id}:content" value="${esc(goal.content)}"><button class="plan-mini-danger" data-plan-action="deleteGoal" data-goal-id="${goal.id}">删除</button></header>${goal.orphaned?'<p class="pilot-warning">上游任务已移除；本条含人工修改，请核对是否保留。</p>':""}<div class="pilot-goal-fields"><label class="plan-field"><span>量化指标</span><input data-plan-edit="goal:${goal.id}:metric" value="${esc(goal.metric)}" placeholder="原文未明确，可补充"></label>${dateField(task,`goal:${goal.id}:deadline`,goal.deadline,"完成时限")}<label class="plan-field"><span>责任主体</span><input data-plan-edit="goal:${goal.id}:owner" value="${esc(goal.owner)}" placeholder="原文未明确，可补充"></label></div></article>`).join("")||'<p class="pilot-empty">暂无目标，可新增目标。</p>'}</div></section>`;
  }

  function renderStepThree(task) {
    return `<section class="plan-section"><div class="plan-section-head"><div><h3>重点任务与实施步骤</h3><p>拖拽任务卡片左侧手柄调整顺序，字段修改自动保存。</p></div><div class="pilot-inline-actions"><button class="pilot-action-button" data-plan-action="addTask">${icon("i-plus")}新增任务</button><button class="pilot-action-button" data-plan-action="rebuildStage" data-stage="3">${icon("i-refresh")}重新生成</button></div></div><div class="plan-section-body pilot-sort-list">${task.data.tasks.map((item,index)=>`<article class="pilot-tree-task pilot-sort-card" data-drag-task="${item.id}" data-reorder-kind="task" data-reorder-id="${item.id}"><header><button class="pilot-drag" draggable="true" data-drag-handle="${item.id}" data-reorder-handle="task:${item.id}" title="拖拽调整任务顺序" aria-label="拖拽调整第${index+1}项任务顺序">${icon("i-menu",14)}</button><button class="pilot-fold" data-plan-action="toggleTask" data-task-id="${item.id}" aria-expanded="${!item.collapsed}" aria-label="展开或收起任务">${icon(item.collapsed?"i-chevron-right":"i-chevron-down",14)}</button><span class="pilot-group-index">${String(index+1).padStart(2,"0")}</span><input class="pilot-inline" aria-label="任务名称" data-plan-edit="task:${item.id}:title" value="${esc(item.title)}"><button class="plan-mini-danger" data-plan-action="deleteTask" data-task-id="${item.id}">删除</button></header><div class="pilot-tree-body" ${item.collapsed?"hidden":""}>${item.orphaned?'<p class="pilot-warning">上游任务已移除；本条含人工修改，请核对是否保留。</p>':""}<textarea class="pilot-inline" aria-label="任务说明" data-plan-edit="task:${item.id}:desc" placeholder="补充任务说明">${esc(item.desc)}</textarea><div class="plan-field-grid"><label class="plan-field"><span>责任单位</span><input data-plan-edit="task:${item.id}:owner" value="${esc(item.owner)}" placeholder="原文未明确"></label>${dateField(task,`task:${item.id}:deadline`,item.deadline,"完成时间")}</div>${item.subtasks.map(sub=>`<section class="pilot-tree-sub"><header><input class="pilot-inline" aria-label="子任务名称" data-plan-edit="sub:${item.id}:${sub.id}" value="${esc(sub.title)}"><button class="pilot-action-button" data-plan-action="addStep" data-task-id="${item.id}" data-sub-id="${sub.id}">新增步骤</button><button class="plan-mini-danger" data-plan-action="deleteSub" data-task-id="${item.id}" data-sub-id="${sub.id}">删除</button></header>${sub.steps.map((step,n)=>`<div class="pilot-list-row"><span class="pilot-order">${n+1}</span><textarea class="pilot-inline" aria-label="实施步骤" data-plan-edit="step:${item.id}:${sub.id}:${step.id}">${esc(step.text)}</textarea><button class="plan-mini-danger" data-plan-action="deleteStep" data-task-id="${item.id}" data-sub-id="${sub.id}" data-step-id="${step.id}">删除</button></div>`).join("")}</section>`).join("")}<button class="pilot-action-button" data-plan-action="addSub" data-task-id="${item.id}">${icon("i-plus")}新增子任务</button></div></article>`).join("")||'<p class="pilot-empty">暂无重点任务，可新增任务。</p>'}</div></section>`;
  }

  function renderStepFour(task) {
    const data=task.data,steps=data.tasks.reduce((n,t)=>n+t.subtasks.reduce((s,sub)=>s+sub.steps.length,0),0);
    return `<section class="pilot-publish"><header class="pilot-publish-head"><span class="pilot-document-symbol">${icon("i-file",30)}</span><div><h3>工作计划已就绪</h3><p>核对成文信息，即可生成可编辑文稿。</p></div></header><div class="pilot-publish-body"><label class="plan-field"><span>文稿标题</span><input aria-label="文稿标题" data-plan-edit="meta.title" value="${esc(data.meta.title)}"></label><dl class="pilot-publish-meta"><div><dt>编制单位</dt><dd>${esc(data.meta.unit)}</dd></div><div><dt>计划周期</dt><dd>${esc(data.meta.period)}</dd></div><div><dt>计划类型</dt><dd>${esc(data.meta.type)}</dd></div></dl><h4>文稿结构</h4><ol class="pilot-document-outline"><li><span>一</span><div><b>总体工作思路</b><p>${esc(data.thinking||"尚未填写，请返回思路与目标补充")}</p></div><button class="pilot-action-button" data-plan-step="2">调整</button></li><li><span>二</span><div><b>核心工作目标</b><p>${data.goals.length} 项目标 · 包含量化指标、责任主体和完成时限</p></div><button class="pilot-action-button" data-plan-step="2">核对</button></li><li><span>三</span><div><b>重点任务与推进举措</b><p>${data.tasks.length} 项任务 · ${steps} 个实施步骤</p></div><button class="pilot-action-button" data-plan-step="3">核对</button></li></ol><div class="pilot-check-heading"><h4>生成前检查</h4><button class="pilot-action-button" data-plan-action="formatCheck">${icon("i-check")}格式校验</button></div><ul class="pilot-check-list">${(task.checkResults||formatIssues(task)).map(row=>`<li>${esc(row)}</li>`).join("")}</ul>${task.invalidStages?.length?'<p class="pilot-warning">上游内容已变化，请先返回相应步骤完成更新。</p>':""}<p class="pilot-description">生成后可在“成果文稿”中编辑、下载；本页不重复填写已确认的信息。</p></div></section>`;
  }

  function renderFooter(task) {
    const step=task.currentStep,isInterpret=taskAgent(task)==="interpret",total=stepTotal(task);
    const label=step<total?(isInterpret?"确认并继续":["","进入思路与目标","进入任务与步骤","进入成文确认"][step]):task.artifactStatus==="最新"?"查看成果文稿":task.artifactStatus==="已过期"?"更新成果文稿":isInterpret?"生成解读报告":"生成工作计划";
    const action=step<total?"nextStep":task.artifactStatus==="最新"?"showResult":task.artifactStatus==="已过期"?"refreshArtifact":"generateArtifact";
    return `<footer class="plan-task-footer">${step>1?'<button class="pilot-action-button" data-plan-action="previousStep">上一步</button>':""}<span class="plan-task-footer-copy">${isInterpret?(step===1?"浏览四类解读结果后继续":"报告信息确认后生成"):"修改自动保存"}</span><button class="plan-primary-action" data-plan-action="${action}" ${task.busy?"disabled":""}>${task.busy?"处理中…":label}</button></footer>`;
  }

  function renderPreview(task) {
    if(!previewDrawer)return;
    previewDrawer.hidden=!task.sourceOpen&&!(task.previewOpen&&task.artifactStatus!=="未生成");
    if(previewDrawer.hidden)return;
    if(task.sourceOpen){
      const isInterpret=taskAgent(task)==="interpret",source=isInterpret?task.data.source:task.data.sources[0],selected=task.sourceFocusIds||[];
      const segments=source.segments||window.JBAIPilotContent.units(source.text||"");
      previewDrawer.innerHTML=`<div class="plan-preview-head"><b>原文依据</b><button class="pilot-action-button" data-plan-action="closeSource">${isInterpret?"返回解读":"返回任务清单"}</button></div><div class="plan-preview-scroll"><article class="interpret-source-paper"><h2>${esc(source.name)}</h2><p>${esc(source.type||source.detail)}</p>${segments.length?segments.map(segment=>`<section class="interpret-source-unit ${selected.includes(segment.id)?"active":""}" id="interpret-${segment.id}"><b>${esc(segment.label)}</b><p>${esc(segment.text)}</p></section>`).join(""):'<p>该历史任务未保存原文，请重新上传材料。</p>'}</article></div>`;
      if(selected[0])setTimeout(()=>$("#interpret-"+selected[0])?.scrollIntoView?.({block:"center"}),0);
      return;
    }
    previewDrawer.innerHTML=`<div class="plan-preview-head"><b>${taskAgent(task)==="interpret"?"报告":"文稿"}预览 · V${task.artifact.version}</b>${task.artifactStatus==="已过期"?'<span class="plan-tab-badge stale">待更新，不能导出</span>':""}<button class="pilot-action-button" data-plan-action="togglePreview">关闭</button></div><div class="plan-preview-scroll"><article class="plan-preview-paper">${task.artifact.html}</article></div>`;
  }

  function buildDocument(task) {
    if(taskAgent(task)==="interpret")return buildInterpretDocument(task);
    const data=task.data,field=value=>esc(value||"待补充");
    const goalRows=data.goals.map((goal,index)=>`<p>（${cnNumber(index+1)}）${esc(goal.content)}。量化指标：${field(goal.metric)}；完成时限：${field(goal.deadline)}；责任主体：${field(goal.owner)}。</p>`).join("");
    const rows=data.tasks.map((item,index)=>`<p><strong>（${cnNumber(index+1)}）${esc(item.title)}</strong></p><p>${esc(item.desc)}责任单位：${field(item.owner)}；完成时间：${field(item.deadline)}。</p>${item.subtasks.map((sub,n)=>`<p>${n+1}. ${esc(sub.title)}</p>${sub.steps.map((step,i)=>`<p>（${i+1}）${esc(typeof step==="string"?step:step.text)}</p>`).join("")}`).join("")}`).join("");
    const special=/专项/.test(data.meta.type),quarter=/季度/.test(data.meta.type);
    return `<h2>${esc(data.meta.title)}</h2><h3>一、总体工作思路</h3><p>${esc(data.thinking)}</p><h3>二、${quarter?"季度工作目标":special?"专项工作目标":"年度工作目标"}</h3>${goalRows}<h3>三、${special?"实施步骤与重点任务":"重点任务及推进举措"}</h3>${rows}<p style="text-align:right;text-indent:0">${esc(data.meta.unit)}</p><p style="text-align:right;text-indent:0">${esc(data.meta.period)}</p>`;
  }

  function buildInterpretDocument(task) {
    const data=task.data;
    const basis=item=>item.manual?"人工补充（无原文依据）":item.grounded?`${data.source.name} · ${(item.references||[]).map(ref=>ref.label).join("、")||item.sourceLabel}`:item.definitionSource?`定义来源：${item.definitionSource}`:"原文未明确";
    const cell=(text,head)=>`<${head?"th":"td"} style="border:1px solid #ced8e8;padding:10px;text-align:left;vertical-align:top;word-break:break-word;${head?"background:#edf2fb;color:#22365c;":""}">${esc(text).replace(/\n/g,"<br>")}</${head?"th":"td"}>`;
    const table=(heads,rows)=>`<table style="width:100%;border-collapse:collapse;font-size:14px;table-layout:fixed"><thead><tr>${heads.map(h=>cell(h,true)).join("")}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(v=>cell(v)).join("")}</tr>`).join("")}</tbody></table>`;
    const row=item=>`<p><strong>${esc(item.title||item.question)}：</strong>${esc(item.text||item.answer).replace(/\n/g,"<br>")}<br><small>依据：${esc(basis(item))}</small></p>`;
    const overview=table(["阅读重点","解读内容与依据"],data.summary.map(item=>[item.title,`${item.text}\n依据：${basis(item)}`]));
    // 用文档可编辑的表格和编号路径表现信息，不依赖图片服务，也不把并行事项画成强制串行。
    const route= data.path.map((item,index)=>`<div style="margin:12px 0;padding:14px;background:#f1f5fb;border:1px solid #d8e1f0"><p style="margin:0;color:#244e99;text-indent:0"><strong>${index+1}. ${esc(item.phase||"执行要求")} · ${esc(item.title)}</strong>${item.parallel?"（包含并行事项）":""}</p><p style="margin:8px 0;text-indent:0">${esc(item.text)}</p><p style="margin:0;font-size:12px;text-indent:0">依据：${esc(basis(item))}</p></div>`).join("");
    return `<h2>${esc(data.meta.title)}</h2><p>解读对象：${esc(data.meta.audience)}　解读深度：${esc(data.meta.depth)}<br>来源：${esc(data.source.name)}</p><h3>一、核心摘要与政策背景</h3>${overview}${(data.background||[]).map(row).join("")}<h3>二、实施路径与执行清单</h3><p>${esc(data.routeNote||"")}以下编号用于阅读定位，不表示原文未规定的执行先后。</p>${route||"<p>原文未明确具体执行步骤。</p>"}${data.path.length?table(["事项","责任主体","时间要求","量化指标"],data.path.map((item,i)=>[`${i+1}. ${item.title}\n${(item.references||[]).map(ref=>ref.label).join("、")}`,item.owner||"原文未明确",item.deadline||"原文未明确",item.metric||"原文未明确"])):""}<h3>三、术语与适用限制</h3>${data.terms.length?table(["术语","解释","依据"],data.terms.map(item=>[item.title,item.text,basis(item)])):"<p>当前没有可核验的专门术语定义。</p>"}${table(["核对事项","范围或限制","依据"],(data.limits||[]).map(item=>[item.title,item.text,basis(item)]))}<h3>四、问答口径</h3>${data.qa.map(row).join("")}<h3>核实提示</h3><p>本报告基于本次来源内容形成；原文未明确的信息不作推断。演示材料、生成文稿和粘贴内容不视为已正式发布的政策。</p>`;
  }

  function snapshot(task) { return { data: clone(task.data), confirmations: clone(task.confirmations), version: task.version, invalidStages:clone(task.invalidStages||[]) }; }
  function commit(task,label,updater,channel) {
    const before=snapshot(task);
    task.past=task.past||[];task.past.push({label,channel:channel||CHANNEL.PAGE,at:now(),snapshot:before});
    if(task.past.length>30)task.past.shift();
    updater();
    if(taskAgent(task)==="plan") {
      const invalid=new Set(task.invalidStages||[]);
      if(JSON.stringify(before.data.clusters)!==JSON.stringify(task.data.clusters)){invalid.add(2);invalid.add(3);}
      if(JSON.stringify(before.data.goals)!==JSON.stringify(task.data.goals)||before.data.thinking!==task.data.thinking)invalid.add(3);
      task.invalidStages=[...invalid];
    }
    task.version++;task.updatedAt=now();task.operations.push({id:uid("OP"),label,channel:channel||CHANNEL.PAGE,at:task.updatedAt,version:task.version});
    if(task.artifactStatus==="最新")task.artifactStatus="已过期";
    task.changedCount++;task.previewChangedCount++;inputDirty=false;
    persist();
    if(!editingCommit)render();else{renderTabs(task);renderStaleBanner(task);}
  }

  function undo(task) {
    const entry = task.past && task.past.pop();
    if (!entry) { toast("暂无可撤销的业务操作"); return; }
    task.data = clone(entry.snapshot.data);
    task.confirmations = clone(entry.snapshot.confirmations);
    task.invalidStages = clone(entry.snapshot.invalidStages || []);
    task.version += 1;
    task.updatedAt = now();
    task.operations.push({ id: uid("OP"), label: `撤销：${entry.label}`, channel: CHANNEL.PAGE, at: task.updatedAt, version: task.version });
    if (task.artifactStatus === "最新") task.artifactStatus = "已过期";
    task.changedCount += 1;
    task.previewChangedCount += 1;
    persist(); render(); toast(`已撤销：${entry.label}`);
  }

  function editValue(task,path,value) {
    const parts=path.split(":");
    let object,key;
    if(path==="thinking"){object=task.data;key="thinking";}
    else if(path.startsWith("meta.")){object=task.data.meta;key=path.slice(5);}
    else if(parts[0]==="cluster"){object=task.data.clusters.find(item=>item.id===parts[1]);key="name";}
    else if(parts[0]==="item"){object=task.data.clusters.find(item=>item.id===parts[1])?.items.find(item=>item.id===parts[2]);key="text";}
    else if(parts[0]==="goal"){object=task.data.goals.find(item=>item.id===parts[1]);key=parts[2];}
    else if(parts[0]==="task"){object=task.data.tasks.find(item=>item.id===parts[1]);key=parts[2];}
    else if(parts[0]==="sub" || parts[0]==="step"){
      const target=task.data.tasks.find(item=>item.id===parts[1]),sub=target?.subtasks.find(item=>item.id===parts[2]);
      object=parts[0]==="sub"?sub:sub?.steps.find(item=>item.id===parts[3]);key=parts[0]==="sub"?"title":"text";
    }
    if(!object || object[key]===value)return;
    commit(task,"修改工作计划内容",()=>{
      object[key]=value;
      if(parts[0]==="item")object.edited=true;
      if(parts[0]==="goal"||parts[0]==="task")object.human=true;
      if(parts[0]==="sub"||parts[0]==="step")task.data.tasks.find(item=>item.id===parts[1]).human=true;
      if(path==="thinking")task.thinkingHuman=true;
      if(path==="meta.title")task.title=value;
    },CHANNEL.PAGE);
  }

  function editInterpretValue(task,path,value) {
    if(path.startsWith("meta.")){
      const key=path.replace("meta.","");
      if(key!=="title"||task.data.meta[key]===value)return;
      commit(task,"修改解读报告信息",()=>{task.data.meta[key]=value;if(key==="title")task.title=value;},CHANNEL.PAGE);return;
    }
    const parts=path.split(":"),kind=parts[0];
    let item,field;
    if(kind==="insight"){
      const collection=parts[1],id=parts[2];
      item=(task.data[collection]||[]).find(row=>row.id===id);field=parts[3]||"text";
    }else if(kind==="path"){
      item=task.data.path.find(row=>row.id===parts[1]);field=parts[2];
    }
    if(!item||!field||item[field]===value)return;
    commit(task,"人工补充解读信息",()=>{
      item[field]=value||"原文未明确";
      item.manual=!!value;
      if(field==="answer")item.text=item[field];
    },CHANNEL.PAGE);
  }

  function parseIndex(raw) {
    const map = { "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9, "十": 10 };
    return map[raw] || Number(raw) || 0;
  }

  function suggestionForInstruction(task, text) {
    const suggestions = [];
    const indexMatch = text.match(/第\s*([一二三四五六七八九十\d]+)\s*项/);
    const index = indexMatch ? parseIndex(indexMatch[1]) - 1 : -1;
    const named = task.data.tasks.filter(item => item.title && text.includes(item.title));
    const target = named.length === 1 ? named[0] : index >= 0 ? task.data.tasks[index] : null;
    if (indexMatch && !target) return { message: `当前任务清单中不存在“第${index + 1}项”，请使用任务名称说明要修改的内容。`, suggestions: [] };
    if (target && /(不要了|删除|移除)/.test(text)) {
      suggestions.push({ id: uid("SG"), type: "delete-task", targetId: target.id, anchor: `「${target.title}」（当前第${index + 1}项）`, fieldLabel: "任务", before: target.title, after: "", state: "待确认", baseVersion: task.version, baseValue: target.title });
    }
    const ownerMatch = text.match(/(?:责任单位|责任部门|牵头单位|责任主体)[^，。；;]*(?:改成|调整为|改为|设为)\s*([^，。；;]+)/);
    if (target && ownerMatch) suggestions.push({ id: uid("SG"), type: "set-field", targetId: target.id, field: "owner", anchor: `「${target.title}」（当前第${index + 1}项）`, fieldLabel: "责任单位", before: target.owner, after: ownerMatch[1].trim(), state: "待确认", baseVersion: task.version, baseValue: target.owner });
    const deadlineMatch = text.match(/(?:完成时间|完成时限|截止时间)[^，。；;]*(?:改成|调整到|调整为|改为|设为)\s*([^，。；;]+)/);
    if (target && deadlineMatch) suggestions.push({ id: uid("SG"), type: "set-field", targetId: target.id, field: "deadline", anchor: `「${target.title}」（当前第${index + 1}项）`, fieldLabel: "完成时间", before: target.deadline, after: deadlineMatch[1].trim(), state: "待确认", baseVersion: task.version, baseValue: target.deadline });
    const titleMatch = text.match(/(?:标题|计划名称)[^，。；;]*(?:改成|调整为|改为)\s*[“"]?([^”"，。；;]+)[”"]?/);
    if (titleMatch) suggestions.push({ id: uid("SG"), type: "set-meta", field: "title", anchor: "工作计划文稿", fieldLabel: "文稿标题", before: task.data.meta.title, after: titleMatch[1].trim(), state: "建议中", baseVersion: task.version, baseValue: task.data.meta.title });
    if (!suggestions.length && indexMatch) return { message: "这条指令只定位到了序号，但没有识别出明确字段和值。请说明要修改任务名称、责任单位还是完成时间。", suggestions: [] };
    return { message: "", suggestions };
  }

  function currentSuggestionValue(task, suggestion) {
    if (suggestion.type === "delete-task") return task.data.tasks.find((item) => item.id === suggestion.targetId)?.title || "";
    if (suggestion.type === "set-field") return task.data.tasks.find((item) => item.id === suggestion.targetId)?.[suggestion.field] || "";
    if (suggestion.type === "set-meta") return task.data.meta[suggestion.field] || "";
    return "";
  }

  function applySuggestion(task, id) {
    const suggestion = task.suggestions.find((item) => item.id === id); if (!suggestion) return;
    const current = currentSuggestionValue(task, suggestion);
    if (suggestion.state === "冲突") {
      suggestion.before = current;
      suggestion.baseValue = current;
      suggestion.baseVersion = task.version;
      suggestion.state = suggestion.field === "owner" || suggestion.field === "deadline" || suggestion.type === "delete-task" ? "待确认" : "建议中";
      persist(); render(); toast("建议已按当前数据刷新，请再次确认"); return;
    }
    if (current !== suggestion.baseValue) {
      suggestion.state = "冲突"; persist(); render(); toast("当前字段已变化，建议未应用"); return;
    }
    commit(task, `应用对话修改：${suggestion.fieldLabel}`, () => {
      if (suggestion.type === "delete-task") task.data.tasks = task.data.tasks.filter((item) => item.id !== suggestion.targetId);
      if (suggestion.type === "set-field") { const target = task.data.tasks.find((item) => item.id === suggestion.targetId); if (target) { target[suggestion.field] = suggestion.after; target.human = true; } }
      if (suggestion.type === "set-meta") { task.data.meta[suggestion.field] = suggestion.after; if (suggestion.field === "title") task.title = suggestion.after; }
      suggestion.state = "已生效";
    }, CHANNEL.CHAT);
    toast("修改已应用，可通过撤销恢复");
  }

  function handleInstruction(args) {
    const task = taskForConversation(args.conversationId, "plan"); if (!task) return false;
    activeTaskId = task.id;
    const text = String(args.text || "").trim();
    const api = host();
    if (/^(撤销|撤销刚才|撤销刚才的修改)/.test(text)) {
      const last = task.past?.at(-1);
      if(last?.channel===CHANNEL.CHAT){undo(task);if(api&&api.addAgentMessage)api.addAgentMessage(task.conversationId,"<p>已恢复最近一条对话修改前的内容。</p>",{planTaskId:task.id});return true;}
      const html = `<p>最近一次操作不是对话修改，未执行撤销，避免覆盖后续页面编辑。</p>`;
      if (api && api.addAgentMessage) api.addAgentMessage(task.conversationId, html, { planTaskId: task.id });
      openTask(task); return true;
    }
    if (/生成|形成.*文稿|输出.*计划/.test(text) && task.currentStep >= 3) {
      task.currentStep = 4; task.status = "待确认"; persist(); openTask(task);
      if (api && api.addAgentMessage) api.addAgentMessage(task.conversationId, taskSummaryHTML(task, "已进入成文确认步骤，请核对标题、编制单位和计划周期后生成文稿。"), { planTaskId: task.id });
      return true;
    }
    const parsed = suggestionForInstruction(task, text);
    if (!parsed.suggestions.length) {
      if (api && api.addAgentMessage) api.addAgentMessage(task.conversationId, `<p>${esc(parsed.message || "我已收到补充内容。请明确指出要修改的任务名称、字段和新值，系统会先生成修改建议供您确认。")}</p>${taskSummaryHTML(task, "")}`, { planTaskId: task.id });
      openTask(task); return true;
    }
    task.suggestions.push(...parsed.suggestions);
    task.status = "待确认";
    task.updatedAt = now();
    persist();
    if (api && api.addAgentMessage) api.addAgentMessage(task.conversationId, taskSummaryHTML(task, `已形成${parsed.suggestions.length}条修改建议，尚未写入任务。请在右侧确认应用。`), { planTaskId: task.id });
    openTask(task);
    setTimeout(() => $("#planSuggestionSection")?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
    return true;
  }

  function allInterpretInsights(task) {return [...task.data.summary,...(task.data.background||[]),...task.data.path,...task.data.terms,...(task.data.limits||[]),...task.data.qa];}
  function interpretInsight(task, id) { return allInterpretInsights(task).find(item => item.id === id) || null; }
  function handleInterpretInstruction(args) {
    const task=taskForConversation(args.conversationId,"interpret");if(!task)return false;
    activeTaskId=task.id;
    const text=String(args.text||"").trim(),api=host();
    if(/^(撤销|撤销刚才)/.test(text)){api?.addAgentMessage(task.conversationId,"<p>政务文件解读不提供任务级撤销。可以查看已有报告，或明确提出需要修改的内容。</p>",{agent:"interpret"});return true;}
    if(/生成|形成|输出/.test(text)&&/报告/.test(text)){
      if(!requireInterpretReview(task)){api?.addAgentMessage(task.conversationId,"<p>请先核对并确认核心摘要、实施路径、术语限制和问答口径，再生成报告。</p>",{agent:"interpret"});return true;}
      task.currentStep=2;task.maxStep=2;task.activeTab="task";persist();openTask(task,true);return true;
    }
    if(/加入报告|添加到报告|更新到报告/.test(text)&&task.lastAnswer){
      commit(task,"将本次追问加入报告",()=>task.data.qa.push({...task.lastAnswer,id:uid("QA")}),CHANNEL.CHAT);
      api?.addAgentMessage(task.conversationId,"<p>已加入问答口径；已有报告将标记为待更新。</p>",{agent:"interpret"});return true;
    }
    const context=task.followupContext;
    const selected=context?interpretInsight(task,context.itemId):null;
    const keywords=text.replace(/请|帮我|进一步|说明|这个|这条|关于|[？?]/g,"").match(/[\u4e00-\u9fa5]{2,4}/g)||[];
    const candidates=task.data.source.segments.filter(row=>keywords.some(word=>row.text.includes(word)));
    const sourceRows=selected?(selected.references||[]).map(ref=>task.data.source.segments.find(row=>row.id===ref.id)).filter(Boolean):candidates;
    const answer=sourceRows.length?sourceRows.map(row=>`${row.text}（${row.label}）`).join("\n"):"原文没有提供足以支持该问题的明确依据，请补充具体条款或向发布机关核实。";
    task.lastAnswer={question:text,answer,text:answer,references:sourceRows.map(row=>({id:row.id,label:row.label})),grounded:sourceRows.length>0,sourceLabel:sourceRows.map(row=>row.label).join("、")};
    task.followupContext=null;$("#pilotFollowupChip")?.remove();persist();
    api?.addAgentMessage(task.conversationId,`<p>${esc(answer).replace(/\n/g,"<br>")}</p><p class="pilot-description">${selected?`已基于「${esc(selected.title||selected.question)}」的原文作答。`:""}本次追问未自动修改报告；如需纳入，请说“加入报告”。</p>`,{agent:"interpret",taskPilotId:task.id,kind:"interpret-qa"});
    return true;
  }

  function generateArtifact(task) {
    const api=host();if(!api||!api.createArtifact)return;
    if(!requireInterpretReview(task))return;
    if(!task.data.meta.title?.trim()){toast("请填写文稿标题。");return;}
    if(taskAgent(task)==="plan" && task.invalidStages?.length){toast("请先返回并更新受影响的步骤。");return;}
    const html=buildDocument(task);
    task.status="已完成";task.artifactStatus="最新";task.artifact.version=Math.max(1,task.artifact.version+1);task.artifact.html=html;task.artifact.previewHTML=html;task.artifact.exported=false;task.changedCount=0;task.previewChangedCount=0;task.updatedAt=now();
    if(taskAgent(task)==="interpret")restoreInterpretPanel(html);
    const index=api.createArtifact(task.conversationId,{taskId:task.id,agentId:taskAgent(task),sourceName:taskAgentName(task),title:task.data.meta.title,html,version:task.artifact.version,structuredValues:clone(task.data.meta)});
    task.artifact.messageIndex=index;persist();
    const editing=document.activeElement?.matches?.("input,textarea,[contenteditable=true]");
    if(!task.manualTab&&!editing&&!inputDirty && (!api.isCurrent||api.isCurrent(task.conversationId)))api.openArtifact(task.conversationId,index,task.id);
    else{render();toast("新成果已生成，可点击成果文稿查看。");}
  }

  function refreshArtifact(task) {
    const api = host(); if (!api) return;
    if(!requireInterpretReview(task))return;
    const html = buildDocument(task);
    if (task.artifact.exported || task.artifact.messageIndex == null) {
      generateArtifact(task); return;
    }
    task.artifact.html = html;
    task.artifact.previewHTML = html;
    task.artifactStatus = "最新";
    task.changedCount = 0;
    task.previewChangedCount = 0;
    task.updatedAt = now();
    if (api.updateArtifact) api.updateArtifact(task.conversationId, task.artifact.messageIndex, { taskId: task.id, agentId:taskAgent(task), sourceName:taskAgentName(task), title: task.data.meta.title, html, version: task.artifact.version });
    persist();
    if(!inputDirty&&!document.activeElement?.matches?.("input,textarea,[contenteditable=true]")&&(!api.isCurrent||api.isCurrent(task.conversationId)))api.openArtifact(task.conversationId,task.artifact.messageIndex,task.id);
    else{render();toast("成果已更新，可点击成果文稿查看。");}
  }

  function onAction(action, element) {
    const task=getTask(activeTaskId);if(!task)return;
    const isInterpret=taskAgent(task)==="interpret",generated=task.artifactStatus!=="未生成";
    if(action==="undo") {if(!isInterpret&&generated)undo(task);return;}
    if(action==="restoreDelete"){
      task.restoreNotice=false;
      if(task.restoreVersion!==task.version){$(".pilot-restore")?.remove();toast("删除后已有新的修改，未恢复，避免覆盖后续内容。");return;}
      undo(task);return;
    }
    if(action==="togglePreview"){if(!generated)return;task.sourceOpen=false;task.previewOpen=!task.previewOpen;renderPreview(task);return;}
    if(action==="toggleFullscreen"){$("#view-chat")?.classList.toggle("plan-pilot-fullscreen");return;}
    if(action==="closePilot"){$('[data-editor-action="close"]')?.click();return;}
    if(action==="toggleNarrowChat"){$("#view-chat")?.classList.toggle("plan-show-chat");return;}
    if(action==="exitInterpret"&&isInterpret){
      window.JBAIPilotIntake.request("退出政务文件解读","<p>当前解读进度会保留，可从对话中的任务卡再次进入专注解读。</p>",()=>true,"保存并退出").then(ok=>{if(ok){restoreInterpretPanel(task.artifactStatus!=="未生成"?task.artifact.html:interpretSourceHTML(task));panel.hidden=true;$("#view-chat")?.classList.remove("plan-pilot-fullscreen");toast("已保存解读进度，可稍后继续。");}});return;
    }
    if(action==="backToTask")return setTab("task");
    if(action==="showResult")return setTab("result");
    if(action==="previousStep"){task.currentStep=Math.max(1,task.currentStep-1);persist();render();return;}
    if(action==="nextStep")return advanceStep(task);
    if(action==="switchInterpretSection"){if(!interpretSections().some(([id])=>id===element.dataset.section))return;task.activeSection=element.dataset.section;render();persist();return;}
    if(action==="viewPlanSource"){
      const item=task.data.clusters?.find(g=>g.id===element.dataset.clusterId)?.items.find(i=>i.id===element.dataset.itemId);
      if(!item||item.edited)return;
      const rows=window.JBAIPilotContent.units(task.data.sources[0]?.text||""),source=rows.find(row=>row.id===item.sourceId)||rows.find(row=>row.label===item.source&&row.text===item.text);
      if(!source){toast("该历史条目未保存可定位原文，请重新解析材料。");return;}
      task.sourceFocusIds=[source.id];task.sourceOpen=true;task.previewOpen=false;renderPreview(task);return;
    }
    if(action==="viewAllSource"||action==="viewSource"){
      const item=action==="viewSource"?interpretInsight(task,element.dataset.evidenceId):null;
      if(isInterpret&&window.JBAIDocumentFocus?.getState?.()?.kind==="interpret"){
        const refs=item?(item.references||[{id:item.sourceId}]):[];
        const requestedId=element.dataset.referenceId,sourceRow=requestedId?task.data.source.segments.find(row=>row.id===requestedId):refs.length?task.data.source.segments.find(row=>row.id===refs[0].id):task.data.source.segments[0];
        if(sourceRow)window.JBAIDocumentFocus.locateText(sourceRow.text);else window.JBAIDocumentFocus.showPane?.("document");
        return;
      }
      task.sourceFocusIds=item?(item.references||[{id:item.sourceId}]).map(ref=>ref.id):[];
      task.sourceOpen=true;task.previewOpen=false;renderPreview(task);return;
    }
    if(action==="closeSource"){task.sourceOpen=false;renderPreview(task);return;}
    if(action==="askEvidence"){
      const item=interpretInsight(task,element.dataset.evidenceId);if(!item)return;
      task.followupContext={taskId:task.id,itemId:item.id,sourceVersion:task.data.source.version,references:clone(item.references||[])};
      const input=$("#composerInput");if(!input)return;
      $("#pilotFollowupChip")?.remove();
      const title=item.title||item.question,prompt=`对“${title}”的追问：${title}内容再解释一下`;
      const previous=task.followupDraft;
      input.value=(!input.value.trim()||input.value===previous)?prompt:`${input.value}\n${prompt}`;
      task.followupDraft=prompt;
      input.dispatchEvent(new Event("input",{bubbles:true}));
      if(isInterpret)window.JBAIDocumentFocus?.pauseForQuestion?.();
      $("#view-chat")?.classList.add("plan-show-chat");input.focus();input.setSelectionRange?.(input.value.length,input.value.length);persist();return;
    }
    if(action==="generateArtifact")return generateArtifact(task);
    if(action==="refreshArtifact"){if(!task.data.meta.title.trim()||task.invalidStages?.length){toast("请先确认标题并更新受影响的步骤。");return;}return refreshArtifact(task);}
    if(action==="applySuggestion")return applySuggestion(task,element.dataset.suggestionId);
    if(action==="cancelSuggestion"){const item=task.suggestions.find(row=>row.id===element.dataset.suggestionId);if(item)item.state="已取消";persist();render();return;}
    if(action==="adjustMeta")return adjustMeta(task);
    if(action==="rebuildStage")return rebuildStage(task,Number(element.dataset.stage));
    if(action==="reparse")return reparseTask(task);
    if(action==="formatCheck"){task.checkResults=formatIssues(task);render();return;}
    const group=task.data.clusters?.find(row=>row.id===element.dataset.clusterId),target=task.data.tasks?.find(row=>row.id===element.dataset.taskId),sub=target?.subtasks.find(row=>row.id===element.dataset.subId);
    if(action==="toggleCluster"&&group){group.collapsed=!group.collapsed;render();return;}
    if(action==="toggleTask"&&target){target.collapsed=!target.collapsed;render();return;}
    const mutations={
      addCluster:()=>task.data.clusters.push({id:uid("CL"),name:"新增任务大类",items:[]}),
      deleteCluster:()=>{task.data.clusters=task.data.clusters.filter(row=>row!==group);},
      addItem:()=>group?.items.push({id:uid("ITEM"),text:"新增工作要求",source:"手动新增"}),
      deleteItem:()=>{if(group)group.items=group.items.filter(row=>row.id!==element.dataset.itemId);},
      addGoal:()=>task.data.goals.push({id:uid("GOAL"),content:"新增目标",metric:"",deadline:"",owner:"",human:true}),
      deleteGoal:()=>{task.data.goals=task.data.goals.filter(row=>row.id!==element.dataset.goalId);},
      addTask:()=>task.data.tasks.push({id:uid("TASK"),title:"新增任务",desc:"",owner:"",deadline:"",human:true,subtasks:[]}),
      deleteTask:()=>{task.data.tasks=task.data.tasks.filter(row=>row!==target);},
      addSub:()=>target?.subtasks.push({id:uid("SUB"),title:"新增子任务",steps:[]}),
      deleteSub:()=>{if(target)target.subtasks=target.subtasks.filter(row=>row!==sub);},
      addStep:()=>sub?.steps.push({id:uid("STEP"),text:"新增实施步骤"}),
      deleteStep:()=>{if(sub)sub.steps=sub.steps.filter(row=>row.id!==element.dataset.stepId);}
    };
    if(!mutations[action])return;
    const apply=()=>{task.restoreNotice=action.startsWith("delete");task.restoreVersion=task.restoreNotice?task.version+1:null;commit(task,action.startsWith("delete")?"删除所选内容":"调整工作计划",()=>{mutations[action]();if(target)target.human=true;},CHANNEL.PAGE);if(task.restoreNotice){clearTimeout(restoreTimer);restoreTimer=setTimeout(()=>{task.restoreNotice=false;$(".pilot-restore")?.remove();},10000);}};
    if(action==="deleteCluster"&&group?.items.length){window.JBAIPilotIntake.request("删除任务大类",`<p>删除「${esc(group.name)}」将同时删除其中${group.items.length}条工作要求，后续目标与任务将需要更新。</p>`,()=>true,"确认删除").then(ok=>{if(ok)apply();});}
    else apply();
  }

  function formatIssues(task) {
    const data=task.data,checks=[];
    checks.push(data.meta.title?.trim()?"标题：已填写":"标题：未填写");
    checks.push(data.meta.unit&&data.meta.period?"成文信息：单位、周期已确认":"成文信息：请补充单位或周期");
    checks.push(data.goals.length&&data.tasks.length?"结构：已包含工作思路、目标和重点任务":"结构：请补充核心目标和重点任务");
    const incomplete=data.tasks.filter(item=>!item.owner||!item.deadline).length;
    checks.push(incomplete?`${incomplete}项任务的责任或时间待补充，成稿中会明确标注。`:"任务要素：责任和时间已填写");
    checks.push("层级：采用一、（一）、1.、（1）的成文编号；最终Word版式需由文档服务校验。");
    return checks;
  }
  async function adjustMeta(task) {
    const value=await window.JBAIPilotIntake.confirmPlan({},task.data.meta);if(!value)return;
    commit(task,"调整编制信息",()=>{Object.assign(task.data.meta,value);task.invalidStages=[2,3];},CHANNEL.PAGE);
  }
  async function rebuildStage(task,stage) {
    if(task.busy)return false;
    if(stage===3&&task.invalidStages?.includes(2)){toast("请先更新思路与目标，再生成任务步骤。");return false;}
    const current=stage===2?task.data.goals:task.data.tasks;
    const human=current.some(item=>item.human)||(stage===2&&task.thinkingHuman);
    let mode="replace";
    if(human){mode=await window.JBAIPilotIntake.request("确认更新范围",`<p>本步骤包含人工修改。更新仅影响本步骤；不会静默覆盖你的修改。</p><label class="pilot-choice"><input name="mode" type="radio" value="preserve" checked>保留人工修改，更新其他内容</label><label class="pilot-choice"><input name="mode" type="radio" value="replace">重新生成本步骤，替换人工修改</label>`,dialog=>dialog.querySelector('[name="mode"]:checked').value,"确认更新");if(!mode)return false;}
    task.busy=true;render();
    try{
      const content=window.JBAIPilotContent;
      let fresh=stage===2?content.goals(task.data.clusters,task.data.meta):content.tasks(task.data.clusters,task.data.goals);
      if(mode==="preserve"){
        fresh=fresh.map(row=>current.find(old=>old.originId===row.originId&&old.human)||row);
        current.filter(old=>old.human&&!fresh.some(row=>row.id===old.id)).forEach(old=>fresh.push({...old,orphaned:!!old.originId}));
      }
      commit(task,stage===2?"更新思路与目标":"更新任务与步骤",()=>{
        if(stage===2){task.data.goals=fresh;if(mode!=="preserve"||!task.thinkingHuman){task.data.thinking=`围绕${task.data.meta.period}工作安排，重点推进${task.data.clusters.map(group=>group.name).join("、")}，结合职责分工细化任务与推进措施。`;task.thinkingHuman=false;}}
        else task.data.tasks=fresh;
      },CHANNEL.AI);
      task.invalidStages=(task.invalidStages||[]).filter(value=>value!==stage);persist();return true;
    }finally{task.busy=false;render();}
  }
  async function reparseTask(task) {
    const source=task.data.sources[0];if(!source?.text){toast("该历史任务没有保存原文，请重新上传材料创建任务。");return;}
    const ok=await window.JBAIPilotIntake.request("重新解析材料",'<p>将重新梳理任务清单并替换当前清单中的人工修改。后续目标与任务会标为待更新。</p>',()=>true,"确认重新解析");
    if(ok)commit(task,"重新解析材料",()=>{task.data.clusters=window.JBAIPilotContent.clusters(source);},CHANNEL.AI);
  }
  async function advanceStep(task) {
    if(taskAgent(task)==="interpret"){if(!requireInterpretReview(task))return;task.currentStep=Math.min(2,task.currentStep+1);task.maxStep=2;persist();render();return;}
    if(task.invalidStages?.includes(task.currentStep)){toast("请先更新当前步骤。");return;}
    if(task.currentStep===1&&!task.data.clusters.some(group=>group.items.length)){toast("请至少保留一条工作要求。");return;}
    const next=Math.min(4,task.currentStep+1);
    if(next===2&&(!task.data.goals.length||task.invalidStages?.includes(2)) || next===3&&(!task.data.tasks.length||task.invalidStages?.includes(3)))if(!await rebuildStage(task,next))return;
    if(next===4&&task.invalidStages?.length){toast("请先更新受影响的步骤。");return;}
    task.currentStep=next;task.maxStep=Math.max(task.maxStep||1,next);task.status=next===4?"待生成":"处理中";persist();render();
  }

  function wireResizer(handle) {
    let dragging = false;
    handle.addEventListener("pointerdown", (event) => { if (window.innerWidth < 1280) return; dragging = true; handle.classList.add("dragging"); handle.setPointerCapture(event.pointerId); event.preventDefault(); });
    handle.addEventListener("pointermove", (event) => { if (!dragging) return; const width = Math.max(360, Math.min(680, event.clientX)); $("#view-chat")?.style.setProperty("--plan-chat-width", `${width}px`); localStorage.setItem("jbai.plan-pilot.chat-width", String(width)); });
    handle.addEventListener("pointerup", () => { dragging = false; handle.classList.remove("dragging"); });
  }

  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-plan-chat-open]");
    if (open) { event.preventDefault(); const task = getTask(open.dataset.planChatOpen); if (task) openTask(task); return; }
    const tab = event.target.closest("[data-plan-tab]");
    if (tab && activeTaskId) { event.preventDefault(); setTab(tab.dataset.planTab); return; }
    const step = event.target.closest("[data-plan-step]");
    if (step && activeTaskId) {
      event.preventDefault();
      const task = getTask(activeTaskId), targetStep = Number(step.dataset.planStep);
      const total = task ? stepTotal(task) : 0;
      if(task&&taskAgent(task)==="interpret"&&targetStep>1&&!requireInterpretReview(task))return;
      if (task && targetStep <= Math.max(task.maxStep || task.currentStep, task.artifactStatus !== "未生成" ? total : task.currentStep)) {
        task.currentStep = Math.max(1, Math.min(total, targetStep));
        task.activeTab = "task";
        persist(); render();
      }
      return;
    }
    const action = event.target.closest("[data-plan-action]");
    if (action && activeTaskId) { event.preventDefault(); onAction(action.dataset.planAction, action); }
  });

  document.addEventListener("input", (event) => {
    if(event.target.closest("#planPilotPanel")&&event.target.matches("[data-plan-edit],[data-interpret-edit]"))inputDirty=true;
    if(event.target.dataset.planEdit?.startsWith("item:"))event.target.closest(".pilot-list-row")?.querySelector(".pilot-citation")?.remove();
  });
  document.addEventListener("click",event=>{
    const field=event.target.closest("[data-date-picker]");if(!field)return;
    try{field.showPicker?.();}catch(error){field.focus();}
  });
  document.addEventListener("keydown",event=>{
    if(event.target.matches("[data-date-picker]")&&/^[0-9]$/.test(event.key))event.preventDefault();
  });
  function commitEditedField(event) {
    const field = event.target.closest("[data-plan-edit],[data-interpret-edit]");
    const task = getTask(activeTaskId);
    if (!field || !task) return;
    if(event.type==="focusout"&&field.matches("[data-date-picker]"))return;
    editingCommit = true;
    try {
      if (field.dataset.interpretEdit) editInterpretValue(task, field.dataset.interpretEdit, field.value.trim());
      else editValue(task, field.dataset.planEdit, field.value.trim());
    } finally { editingCommit = false; }
  }
  document.addEventListener("change", commitEditedField);
  document.addEventListener("focusout", commitEditedField);

  function reorderRows(task,kind) {
    if(kind==="cluster")return task.data.clusters;
    if(kind==="goal")return task.data.goals;
    if(kind==="task")return task.data.tasks;
    return null;
  }
  function reorderLabel(kind) {
    return kind==="cluster"?"调整任务大类排序":kind==="goal"?"调整工作目标排序":"调整重点任务排序";
  }
  function clearReorderVisuals() {
    document.querySelectorAll(".pilot-sort-card.is-dragging,.pilot-sort-card.is-drop-target").forEach(row=>row.classList.remove("is-dragging","is-drop-target"));
  }
  function reorderItem(task,kind,id,targetId) {
    const rows=reorderRows(task,kind);if(!rows)return false;
    const from=rows.findIndex(item=>item.id===id),to=rows.findIndex(item=>item.id===targetId);
    if(from<0||to<0||from===to)return false;
    commit(task,reorderLabel(kind),()=>{const [item]=rows.splice(from,1);rows.splice(to,0,item);},CHANNEL.PAGE);
    return true;
  }
  document.addEventListener("dragstart", event => {
    const handle=event.target.closest("[data-reorder-handle]");if(!handle)return;
    const [kind,id]=handle.dataset.reorderHandle.split(":");if(!kind||!id)return;
    dragReorder={kind,id};
    handle.closest(".pilot-sort-card")?.classList.add("is-dragging");
    handle.setAttribute("aria-grabbed","true");
    if(event.dataTransfer){event.dataTransfer.effectAllowed="move";event.dataTransfer.setData("text/plain",`${kind}:${id}`);}
  });
  document.addEventListener("dragover", event => {
    const row=event.target.closest("[data-reorder-kind]");
    if(!dragReorder||!row||row.dataset.reorderKind!==dragReorder.kind||row.dataset.reorderId===dragReorder.id)return;
    event.preventDefault();if(event.dataTransfer)event.dataTransfer.dropEffect="move";
    document.querySelectorAll(".pilot-sort-card.is-drop-target").forEach(item=>item.classList.remove("is-drop-target"));
    row.classList.add("is-drop-target");
  });
  document.addEventListener("drop", event => {
    const row=event.target.closest("[data-reorder-kind]"),task=getTask(activeTaskId);
    if(!row||!dragReorder||!task||row.dataset.reorderKind!==dragReorder.kind)return;
    event.preventDefault();
    reorderItem(task,dragReorder.kind,dragReorder.id,row.dataset.reorderId);
    dragReorder=null;clearReorderVisuals();
  });
  document.addEventListener("dragend",event=>{
    event.target.closest("[data-reorder-handle]")?.setAttribute("aria-grabbed","false");
    dragReorder=null;clearReorderVisuals();
  });
  document.addEventListener("keydown",event=>{
    const handle=event.target.closest("[data-reorder-handle]");
    if(!handle||!["ArrowUp","ArrowDown"].includes(event.key))return;
    const task=getTask(activeTaskId),[kind,id]=handle.dataset.reorderHandle.split(":"),rows=task&&reorderRows(task,kind);
    if(!task||!rows)return;
    const from=rows.findIndex(item=>item.id===id),to=from+(event.key==="ArrowUp"?-1:1);
    if(from<0||to<0||to>=rows.length)return;
    event.preventDefault();
    if(reorderItem(task,kind,id,rows[to].id))setTimeout(()=>document.querySelector(`[data-reorder-handle="${kind}:${id}"]`)?.focus(),0);
  });

  document.addEventListener("click", (event) => {
    const download = event.target.closest('[data-editor-action="download"]');
    const task = getTask(activeTaskId);
    if (!download || !task || task.activeTab !== "result") return;
    if (task.artifactStatus === "已过期") {
      event.preventDefault(); event.stopImmediatePropagation();
      toast("当前文稿已过期，请先更新文稿再导出");
    } else {
      task.artifact.exported = true; persist();
    }
  }, true);

  window.addEventListener("beforeunload", (event) => {
    if (!inputDirty) return;
    event.preventDefault(); event.returnValue = "";
  });

  window.addEventListener("DOMContentLoaded", () => {
    ensureShell();
    const width = Number(localStorage.getItem("jbai.plan-pilot.chat-width") || 0);
    if (width) $("#view-chat")?.style.setProperty("--plan-chat-width", `${Math.max(360, Math.min(680, width))}px`);
  });

  window.JBAIPlanPilot = {
    hasTask(conversationId) { return !!taskForConversation(conversationId, "plan"); },
    start(args) {
      let task = taskForConversation(args.conversationId, "plan");
      if (task && !args.newTask) return handleInstruction({ conversationId: args.conversationId, text: args.prompt });
      task = createTask(args);
      const api = host();
      if (api && api.addAgentMessage) api.addAgentMessage(task.conversationId, taskSummaryHTML(task), { planTaskId: task.id, kind: "plan-task-created" });
      openTask(task);
      return true;
    },
    handleInstruction,
    attachArtifact,
    close,
    reopen(conversationId) { const task = taskForConversation(conversationId, "plan"); if (task) openTask(task); },
    getActiveTask() { return getTask(activeTaskId); }
  };
  window.JBAIInterpretPilot = {
    hasTask(conversationId) { return !!taskForConversation(conversationId, "interpret"); },
    isFollowup(conversationId,text) {
      const task=taskForConversation(conversationId,"interpret"),context=task?.followupContext;
      if(!context||context.sourceVersion!==task.data.source.version)return false;
      const item=interpretInsight(task,context.itemId);
      return !!item&&String(text).includes(`对“${item.title||item.question}”的追问：`);
    },
    start(args) {
      let task = taskForConversation(args.conversationId, "interpret");
      if (task && !args.newTask) return handleInterpretInstruction({ conversationId:args.conversationId, text:args.prompt });
      task = createInterpretTask(args);
      const api = host();
      if (api && api.addAgentMessage) api.addAgentMessage(task.conversationId, taskSummaryHTML(task, "已整理四类解读内容，可查看原文核对；缺失信息保留“原文未明确”。"), { agent:"interpret", taskPilotId:task.id, kind:"interpret-task-created" });
      openTask(task); return true;
    },
    handleInstruction:handleInterpretInstruction,
    attachArtifact,
    close,
    reopen(conversationId) { const task = taskForConversation(conversationId, "interpret"); if (task) openTask(task); },
    getActiveTask() { return getTask(activeTaskId); }
  };
})();
