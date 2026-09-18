(function () {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const host = () => window.JBAITaskPilotHost || window.JBAIPlanPilotHost || null;
  const esc = value => String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  let focusState = null;
  let selectionState = null;
  let proposalState = null;
  let polishRequestId = 0;
  let toolbar, menu, actionCard, focusBar, resumeBar, resumeFloat;

  function focusMeta(kind) {
    if (kind === "review") return { name:"合规审查", panel:"#integratedReviewPanel", current:"当前修订稿" };
    if (kind === "interpret") return { name:"政务文件解读", panel:"#planPilotPanel", current:"政策原文" };
    return { name:"全文润色", panel:"#integratedPolishPanel", current:"当前修订稿" };
  }

  function icon(name) { return `<svg class="svg-icon" aria-hidden="true"><use href="#${name}"></use></svg>`; }

  function ensureFocusUI() {
    const main = $("#documentEditorPanel .editor-main-content");
    if (!main) return;
    if (!focusBar) {
      focusBar = document.createElement("div");
      focusBar.id = "focusDocumentBar";
      focusBar.className = "focus-document-bar";
      focusBar.hidden = true;
      focusBar.innerHTML = `<div class="focus-document-heading"><span class="focus-mode-badge">专注处理</span><b id="focusDocumentTitle">当前文稿</b></div>
        <div class="focus-mobile-tabs" role="tablist" aria-label="专注处理区域"><button type="button" class="active" data-focus-pane="document" role="tab" aria-selected="true">文稿</button><button type="button" data-focus-pane="results" role="tab" aria-selected="false">处理结果</button></div>
        <div class="focus-document-switch" role="tablist" aria-label="文稿版本"><button type="button" class="active" data-focus-document-view="original" role="tab" aria-selected="true">原稿</button><button type="button" data-focus-document-view="current" role="tab" aria-selected="false">当前稿</button></div>`;
      main.insertBefore(focusBar, $("#editorStage"));
    }
    if (!resumeBar) {
      resumeBar = document.createElement("div");
      resumeBar.id = "focusResumeBar";
      resumeBar.className = "focus-resume-bar";
      resumeBar.hidden = true;
      resumeBar.innerHTML = `<span id="focusResumeText">任务已暂停，可在对话中追问后返回继续处理。</span><button type="button" data-focus-resume>${icon("i-chevron-right")}返回处理</button>`;
      main.insertBefore(resumeBar, focusBar);
    }
    if (!resumeFloat) {
      resumeFloat = document.createElement("button");
      resumeFloat.type = "button";
      resumeFloat.className = "focus-floating-resume";
      resumeFloat.hidden = true;
      resumeFloat.dataset.focusResume = "true";
      resumeFloat.innerHTML = `${icon("i-chevron-right")}返回处理任务`;
      document.body.append(resumeFloat);
    }
  }

  function ensureSelectionUI() {
    if (toolbar) return;
    toolbar = document.createElement("div");
    toolbar.id = "editorSelectionToolbar";
    toolbar.className = "editor-selection-toolbar";
    toolbar.hidden = true;
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "选中文字操作");
    toolbar.innerHTML = `<button type="button" data-selection-action="polish" aria-expanded="false">${icon("i-wand")}润色</button><button type="button" data-selection-action="ask">${icon("i-chat")}问一问</button>`;
    document.body.append(toolbar);

    menu = document.createElement("div");
    menu.id = "selectionPolishMenu";
    menu.className = "selection-polish-menu";
    menu.hidden = true;
    menu.setAttribute("role", "dialog");
    menu.setAttribute("aria-label", "选择润色方式");
    menu.innerHTML = `<header><b>选择润色方式</b><span>模型将生成建议，采纳后才写入文稿</span></header><div class="selection-polish-options">
      <button type="button" data-selection-style="快速润色">快速润色</button><button type="button" data-selection-style="更正式">更正式</button>
      <button type="button" data-selection-style="更精炼">更精炼</button><button type="button" data-selection-style="更严谨">更严谨</button>
      <button type="button" data-selection-style="政务公文风">政务公文风</button><button type="button" data-selection-style="更通顺">更通顺</button>
      </div><div class="selection-custom-row"><input type="text" maxlength="60" placeholder="输入自定义要求"><button type="button" data-selection-custom>执行</button></div>`;
    document.body.append(menu);

    actionCard = document.createElement("div");
    actionCard.id = "selectionActionCard";
    actionCard.className = "selection-action-card";
    actionCard.hidden = true;
    actionCard.setAttribute("role", "status");
    actionCard.setAttribute("aria-live", "polite");
    document.body.append(actionCard);
  }

  function currentFocusHTML() {
    if (!focusState) return "";
    return focusState.view === "original" ? focusState.originalHTML : (focusState.getCurrentHTML?.() || focusState.originalHTML);
  }

  function renderFocusDocument() {
    if (!focusState || focusState.paused) return;
    const paper = $("#editorPaper");
    if (!paper) return;
    paper.innerHTML = currentFocusHTML();
    const editable = focusState.view === "current" && focusState.canEditCurrent;
    paper.contentEditable = editable ? "true" : "false";
    paper.classList.toggle("focus-current-editable", !!editable);
    paper.setAttribute("aria-readonly", String(!editable));
    focusBar?.querySelectorAll("[data-focus-document-view]").forEach(button => {
      const selected = button.dataset.focusDocumentView === focusState.view;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  }

  function enterFocus(config) {
    ensureFocusUI(); ensureSelectionUI(); discardProposalSilently(); hideSelectionUI({includeProposal:true});
    focusState = {
      kind:config.kind,
      title:config.title || "当前文稿",
      originalHTML:config.originalHTML || "",
      getCurrentHTML:config.getCurrentHTML,
      onCurrentChange:config.onCurrentChange,
      canEditCurrent:!!config.canEditCurrent,
      view:config.view || "original",
      paused:false
    };
    const chatView = $("#view-chat"), panel = $("#documentEditorPanel");
    chatView?.classList.add("document-focus-mode", "focus-pane-document");
    chatView?.classList.remove("focus-pane-results", "focus-question-mode");
    panel?.classList.remove("focus-task-paused");
    if (focusBar) {
      focusBar.hidden = false;
      focusBar.classList.toggle("interpret-focus", focusState.kind === "interpret");
      const title=$("#focusDocumentTitle"), current=focusBar.querySelector('[data-focus-document-view="current"]');
      if(title) title.textContent=focusState.title;
      if(current) current.textContent=focusMeta(focusState.kind).current;
    }
    if (resumeBar) resumeBar.hidden = true;
    if (resumeFloat) resumeFloat.hidden = true;
    renderFocusDocument();
  }

  function refreshFocus() { renderFocusDocument(); }

  function exitFocus(options) {
    ensureFocusUI(); discardProposalSilently(); hideSelectionUI({includeProposal:true});
    const paper=$("#editorPaper"), html=options?.html != null ? options.html : (focusState?.originalHTML || paper?.innerHTML || "");
    $("#view-chat")?.classList.remove("document-focus-mode", "focus-pane-document", "focus-pane-results", "focus-question-mode");
    $("#documentEditorPanel")?.classList.remove("focus-task-paused");
    if (focusBar) focusBar.hidden=true;
    if (resumeBar) resumeBar.hidden=true;
    if (resumeFloat) resumeFloat.hidden=true;
    if (paper) { paper.innerHTML=html; paper.contentEditable="true"; paper.classList.remove("focus-current-editable"); paper.removeAttribute("aria-readonly"); }
    focusState=null;
  }

  function pauseForQuestion() {
    if (!focusState || focusState.paused) return false;
    focusState.paused=true;
    const paper=$("#editorPaper");
    if (paper) { paper.innerHTML=focusState.getCurrentHTML?.() || focusState.originalHTML; paper.contentEditable="false"; }
    $("#view-chat")?.classList.remove("document-focus-mode", "focus-pane-document", "focus-pane-results");
    $("#view-chat")?.classList.add("focus-question-mode");
    $("#documentEditorPanel")?.classList.add("focus-task-paused");
    if (focusBar) focusBar.hidden=true;
    const meta=focusMeta(focusState.kind);
    if (resumeBar) { resumeBar.hidden=false; const text=$("#focusResumeText"); if(text) text.textContent=`${meta.name}已暂停，可在对话中追问后返回继续处理。`; }
    if (resumeFloat) { resumeFloat.hidden=false; resumeFloat.innerHTML=`${icon("i-chevron-right")}返回${meta.name}`; }
    const panel=$(meta.panel);
    if(panel) panel.hidden=true;
    return true;
  }

  function resumeFocus() {
    if (!focusState?.paused) return false;
    focusState.paused=false;
    const meta=focusMeta(focusState.kind),panel=$(meta.panel);
    if(panel) panel.hidden=false;
    enterFocus({ ...focusState, view:focusState.view });
    host()?.toast?.(`已返回${meta.name}任务。`);
    return true;
  }

  function showPane(value) {
    if (!focusState) return false;
    const view=$("#view-chat"),documentPane=value!=="results";
    view?.classList.toggle("focus-pane-document",documentPane);
    view?.classList.toggle("focus-pane-results",!documentPane);
    focusBar?.querySelectorAll("[data-focus-pane]").forEach(button=>{
      const selected=button.dataset.focusPane===(documentPane?"document":"results");
      button.classList.toggle("active",selected);button.setAttribute("aria-selected",String(selected));
    });
    return true;
  }

  function locateText(text) {
    if (!focusState || !text) return false;
    showPane("document");
    focusState.view="original"; renderFocusDocument();
    const paper=$("#editorPaper"), walker=document.createTreeWalker(paper,NodeFilter.SHOW_TEXT);
    let node;
    while((node=walker.nextNode())) {
      const index=node.nodeValue.indexOf(text);
      if(index<0) continue;
      const range=document.createRange(); range.setStart(node,index);range.setEnd(node,index+text.length);
      const mark=document.createElement("mark");mark.className="focus-located-text";range.surroundContents(mark);
      mark.scrollIntoView({block:"center",behavior:"smooth"});
      window.setTimeout(()=>mark.replaceWith(document.createTextNode(mark.textContent)),1900);
      return true;
    }
    host()?.toast?.("当前原稿中未定位到该段文字。");
    return false;
  }

  function blockOf(node) { return (node?.nodeType===1?node:node?.parentElement)?.closest?.("p,li,h1,h2,h3,h4,blockquote") || null; }
  function validSelection() {
    const selection=window.getSelection(), paper=$("#editorPaper");
    if(!selection || selection.isCollapsed || !selection.rangeCount || !paper || !$("#view-chat")?.classList.contains("editor-open")) return null;
    const range=selection.getRangeAt(0), start=range.startContainer, end=range.endContainer;
    if(!paper.contains(start) || !paper.contains(end)) return null;
    const text=selection.toString().replace(/\s+/g," ").trim();
    if(!text || text.length>1200) return null;
    const rect=range.getBoundingClientRect();
    if(!rect.width && !rect.height) return null;
    return { range:range.cloneRange(), text, rect, sameBlock:blockOf(start)===blockOf(end), documentHTML:paper.innerHTML, documentInfo:host()?.getActiveDocument?.() };
  }

  function place(node,left,top) {
    node.hidden=false;
    const box=node.getBoundingClientRect(), x=Math.max(10,Math.min(left,window.innerWidth-box.width-10)), y=Math.max(10,Math.min(top,window.innerHeight-box.height-10));
    node.style.left=`${x}px`;node.style.top=`${y}px`;
  }
  function hideSelectionUI(options) {
    if(toolbar) toolbar.hidden=true;
    if(menu) menu.hidden=true;
    if(actionCard && (options?.includeProposal || !proposalState)) actionCard.hidden=true;
  }
  function discardProposalSilently() {
    if(!proposalState)return;
    polishRequestId+=1;
    const anchor=proposalState.anchor;
    if(anchor?.isConnected){const parent=anchor.parentNode;anchor.replaceWith(document.createTextNode(proposalState.original));parent?.normalize?.();}
    proposalState=null;selectionState=null;
    if(actionCard)actionCard.hidden=true;
    if(menu)menu.hidden=true;
  }
  function captureSelection() {
    ensureSelectionUI();
    if(toolbar?.contains(document.activeElement) || menu?.contains(document.activeElement)) return;
    if(proposalState && !proposalState.anchor?.isConnected){
      proposalState=null;
      if(actionCard)actionCard.hidden=true;
    }
    if(proposalState){
      if(toolbar) toolbar.hidden=true;
      positionProposalBubble();
      return;
    }
    const found=validSelection();
    if(!found){ if(!menu || menu.hidden) toolbar.hidden=true; return; }
    selectionState=found;
    const left=found.rect.left+found.rect.width/2-92, top=found.rect.top-44;
    place(toolbar,left,top<8?found.rect.bottom+8:top);
    const polish=toolbar.querySelector('[data-selection-action="polish"]');
    if(polish){polish.hidden=!!focusState;polish.disabled=!found.sameBlock;}
  }

  function rewrite(text,style,custom) {
    let value=text;
    const shared=[[/月底前前/g,"月底前"],[/为了进一步/g,"为进一步"],[/为了/g,"为"],[/进一步加强/g,"加强"],[/进行全面排查/g,"全面排查"],[/及时进行反馈/g,"及时反馈"],[/各相关单位/g,"各有关单位"],[/工作有关事项通知如下/g,"工作的有关事项通知如下"],[/有关工作要求通知如下/g,"现将有关事项通知如下"],[/及时发现问题并进行整改/g,"及时发现并整改问题"],[/按时完成相关工作任务/g,"按期完成各项任务"],[/确保各项工作顺利开展/g,"确保各项工作有序推进"]];
    const concise=[[/积极主动地/g,"主动"],[/切实提高/g,"提高"],[/认真做好/g,"做好"],[/开展进行/g,"开展"],[/共同一起/g,"共同"]];
    const formal=[[/要高度重视/g,"应高度重视"],[/周通报进展/g,"每周通报工作进展"],[/限时办结/g,"按时限办结"],[/马上/g,"立即"],[/搞好/g,"做好"]];
    const rigorous=[[/全部彻底解决/g,"推动相关问题有序解决"],[/一次性清零/g,"形成排查整改闭环"],[/绝对不会/g,"原则上不"],[/确保百分之百/g,"力争全面"]];
    let rules=[...shared];
    if(style==="更精炼") rules.push(...concise);
    else if(style==="更正式" || style==="政务公文风") rules.push(...formal);
    else if(style==="更严谨") rules.push(...rigorous);
    else rules.push(...concise,...formal,...rigorous);
    if(custom && /精简|简洁|压缩/.test(custom)) rules.push(...concise);
    if(custom && /正式|公文|政务/.test(custom)) rules.push(...formal);
    if(custom && /严谨|客观/.test(custom)) rules.push(...rigorous);
    rules.forEach(([pattern,replacement])=>{value=value.replace(pattern,replacement);});
    value=value.replace(/[ \t]{2,}/g," ");
    return value;
  }

  function positionProposalBubble() {
    if(!proposalState?.anchor?.isConnected || !actionCard || actionCard.hidden)return;
    const rect=proposalState.anchor.getBoundingClientRect();
    place(actionCard,rect.left,rect.bottom+8);
  }

  function showProposalCard(message) {
    if(!proposalState)return;
    actionCard.classList.remove("is-loading","is-error");
    actionCard.innerHTML=`<div class="selection-action-head"><span class="selection-action-copy"><b>${esc(message || "已生成润色建议")}</b><small>确认采纳后才会写入文稿与版本记录</small></span><span class="selection-action-buttons"><button type="button" class="primary" data-selection-action="accept">采纳</button><button type="button" data-selection-action="reject">不采纳</button><button type="button" data-selection-action="retry">重新润色</button></span></div>`;
    actionCard.hidden=false;
    positionProposalBubble();
  }

  function showLoadingCard(style) {
    actionCard.classList.remove("is-error");
    actionCard.classList.add("is-loading");
    actionCard.innerHTML=`<div class="selection-action-loading"><span class="selection-loading-mark" aria-hidden="true"></span><span><b>正在调用模型润色</b><small>${esc(style)} · 原文暂未写入修改记录</small></span></div>`;
    actionCard.hidden=false;
    positionProposalBubble();
  }

  function showProposalError(message) {
    if(!proposalState)return;
    actionCard.classList.remove("is-loading");
    actionCard.classList.add("is-error");
    const canAccept=proposalState.replacement && proposalState.replacement!==proposalState.original;
    actionCard.innerHTML=`<div class="selection-action-head"><span class="selection-action-copy"><b>本次润色未完成</b><small>${esc(message || "模型暂时不可用，原文未受影响")}</small></span><span class="selection-action-buttons">${canAccept?'<button type="button" class="primary" data-selection-action="accept">采纳</button>':''}<button type="button" data-selection-action="reject">不采纳</button><button type="button" data-selection-action="retry">重新润色</button></span></div>`;
    actionCard.hidden=false;
    positionProposalBubble();
  }

  function proposalPreviewClass(replacement,original) {
    if(!replacement)return "inline-polish-anchor";
    return "inline-polish-change";
  }

  async function requestSelectionPolish(payload) {
    const provider=window.JBAISelectionPolishProvider;
    const providerRun=typeof provider==="function"?provider:provider?.polish;
    const hostRun=host()?.polishSelection;
    if(typeof providerRun==="function"){
      const result=await providerRun.call(provider,payload);
      return typeof result==="string"?result:String(result?.text||result?.replacement||"");
    }
    if(typeof hostRun==="function"){
      const result=await hostRun(payload);
      return typeof result==="string"?result:String(result?.text||result?.replacement||"");
    }
    // 静态原型兜底：保留异步模型调用节奏；正式环境由上方 provider/host 适配器接管。
    await new Promise(resolve=>window.setTimeout(resolve,520));
    return rewrite(payload.text,payload.style,payload.custom);
  }

  function ensureProposalAnchor() {
    if(proposalState?.anchor?.isConnected)return proposalState.anchor;
    if(!selectionState?.sameBlock){host()?.toast?.("请在同一段内选择需要润色的文字。");return null;}
    const paper=$("#editorPaper"),range=selectionState.range;
    if(!paper || !paper.contains(range.commonAncestorContainer)){host()?.toast?.("选区已失效，请重新选择文字。");hideSelectionUI({includeProposal:true});return null;}
    const anchor=document.createElement("mark");
    anchor.className="inline-polish-anchor";
    anchor.dataset.inlinePolish="preview";
    anchor.dataset.original=selectionState.text;
    anchor.contentEditable="false";
    anchor.textContent=selectionState.text;
    range.deleteContents();range.insertNode(anchor);
    proposalState={anchor,original:selectionState.text,replacement:"",style:"",loading:false};
    window.getSelection()?.removeAllRanges();
    return anchor;
  }

  async function applySelectionPolish(style,custom) {
    const anchor=ensureProposalAnchor();
    if(!anchor)return;
    const requestId=++polishRequestId;
    const displayStyle=custom?`自定义：${custom}`:style;
    const previous={text:anchor.textContent,replacement:proposalState.replacement,style:proposalState.style};
    proposalState.loading=true;
    proposalState.style=displayStyle;
    anchor.className="inline-polish-anchor is-loading";
    anchor.setAttribute("aria-busy","true");
    if(menu)menu.hidden=true;
    if(toolbar)toolbar.hidden=true;
    toolbar?.querySelector('[data-selection-action="polish"]')?.setAttribute("aria-expanded","false");
    showLoadingCard(displayStyle);
    try{
      const replacement=(await requestSelectionPolish({text:proposalState.original,style,custom:custom||"",document:selectionState?.documentInfo||null})).trim();
      if(requestId!==polishRequestId || !anchor.isConnected)return;
      if(!replacement){
        anchor.textContent=previous.replacement?previous.text:proposalState.original;
        anchor.className=proposalPreviewClass(previous.replacement,proposalState.original);
        proposalState.replacement=previous.replacement;
        proposalState.style=previous.style;
        proposalState.loading=false;
        anchor.removeAttribute("aria-busy");
        showProposalError("模型没有生成有效的新版本，请更换润色方式后重试");
        return;
      }
      if(replacement===proposalState.original){
        anchor.textContent=proposalState.original;
        anchor.className="inline-polish-change";
        anchor.removeAttribute("aria-busy");
        proposalState.replacement=proposalState.original;
        proposalState.style=displayStyle;
        proposalState.loading=false;
        showProposalCard(`已按“${displayStyle}”生成建议`);
        return;
      }
      anchor.textContent=replacement;
      anchor.className="inline-polish-change";
      anchor.removeAttribute("aria-busy");
      proposalState.replacement=replacement;
      proposalState.style=displayStyle;
      proposalState.loading=false;
      showProposalCard(`已按“${displayStyle}”生成建议`);
    }catch(error){
      if(requestId!==polishRequestId || !anchor.isConnected)return;
      anchor.textContent=previous.replacement?previous.text:proposalState.original;
      anchor.className=proposalPreviewClass(previous.replacement,proposalState.original);
      anchor.removeAttribute("aria-busy");
      proposalState.replacement=previous.replacement;
      proposalState.style=previous.style;
      proposalState.loading=false;
      showProposalError(error?.message || "模型服务暂时不可用，原文未受影响");
    }
  }

  function acceptProposal() {
    const paper=$("#editorPaper"),proposal=proposalState;
    if(!paper || !proposal?.anchor?.isConnected || !proposal.replacement || proposal.loading)return;
    const text=document.createTextNode(proposal.replacement),parent=proposal.anchor.parentNode;
    proposal.anchor.replaceWith(text);parent?.normalize?.();
    const saved=host()?.commitInlinePolish?.({html:paper.innerHTML,original:proposal.original,replacement:proposal.replacement,style:proposal.style});
    proposalState=null;selectionState=null;actionCard.hidden=true;
    if(saved===false)host()?.toast?.("修改未能保存，请稍后重试。");
    else host()?.toast?.("已采纳润色建议并保存到当前文稿。");
  }

  function rejectProposal() {
    const proposal=proposalState;
    if(!proposal?.anchor?.isConnected)return;
    polishRequestId+=1;
    const parent=proposal.anchor.parentNode;
    proposal.anchor.replaceWith(document.createTextNode(proposal.original));parent?.normalize?.();
    proposalState=null;selectionState=null;actionCard.hidden=true;if(menu)menu.hidden=true;
    host()?.toast?.("已不采纳本次润色，正文已恢复。");
  }

  function reopenPolishMenu() {
    if(!proposalState?.anchor?.isConnected || proposalState.loading)return;
    const rect=proposalState.anchor.getBoundingClientRect();
    menu.dataset.retry="true";
    place(menu,rect.left,rect.bottom+8);
    actionCard.hidden=true;
    menu.querySelector("button")?.focus();
  }

  function askSelection() {
    if(!selectionState?.text)return;
    if(focusState) pauseForQuestion();
    host()?.quoteDocumentSelection?.({text:selectionState.text,documentTitle:selectionState.documentInfo?.title||"当前文稿",version:selectionState.documentInfo?.createdAt||Date.now()});
    hideSelectionUI();
  }

  document.addEventListener("mouseup",()=>window.setTimeout(captureSelection,0));
  document.addEventListener("input",event=>{
    const paper=$("#editorPaper");
    if(!focusState || focusState.paused || focusState.view!=="current" || !focusState.canEditCurrent || event.target!==paper)return;
    focusState.onCurrentChange?.(paper.innerHTML);
  });
  document.addEventListener("keyup",event=>{if(event.shiftKey || ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))window.setTimeout(captureSelection,0);});
  document.addEventListener("scroll",()=>{if(toolbar)toolbar.hidden=true;if(menu)menu.hidden=true;positionProposalBubble();},true);
  window.addEventListener("resize",()=>{if(toolbar)toolbar.hidden=true;if(menu)menu.hidden=true;positionProposalBubble();});
  document.addEventListener("keydown",event=>{
    if(event.key!=="Escape")return;
    if(menu&&!menu.hidden){menu.hidden=true;if(proposalState)showProposalCard("当前润色建议待确认");return;}
    if(toolbar&&!toolbar.hidden)toolbar.hidden=true;
  });
  document.addEventListener("click",event=>{
    ensureFocusUI();ensureSelectionUI();
    const pane=event.target.closest("[data-focus-pane]");
    if(pane){showPane(pane.dataset.focusPane);return;}
    const docView=event.target.closest("[data-focus-document-view]");
    if(docView&&focusState){focusState.view=docView.dataset.focusDocumentView;renderFocusDocument();return;}
    if(event.target.closest("[data-focus-resume]")){resumeFocus();return;}
    const action=event.target.closest("[data-selection-action]");
    if(action){
      const type=action.dataset.selectionAction;
      if(type==="polish"){const rect=toolbar.getBoundingClientRect();menu.dataset.retry="false";action.setAttribute("aria-expanded",String(menu.hidden));if(menu.hidden)place(menu,rect.left,rect.bottom+6);else menu.hidden=true;return;}
      if(type==="ask"){askSelection();return;}
      if(type==="accept"){acceptProposal();return;}
      if(type==="reject"){rejectProposal();return;}
      if(type==="retry"){reopenPolishMenu();return;}
    }
    const style=event.target.closest("[data-selection-style]");
    if(style){applySelectionPolish(style.dataset.selectionStyle);return;}
    if(event.target.closest("[data-selection-custom]")){const input=menu.querySelector("input"),value=input.value.trim();if(!value){input.focus();return;}applySelectionPolish("自定义",value);return;}
    if(!event.target.closest("#editorSelectionToolbar,#selectionPolishMenu,#selectionActionCard,#editorPaper")) hideSelectionUI();
  });

  ensureFocusUI();ensureSelectionUI();
  window.JBAIDocumentFocus={enter:enterFocus,refresh:refreshFocus,exit:exitFocus,pauseForQuestion,resume:resumeFocus,locateText,showPane,isActive:()=>!!focusState&&!focusState.paused,getState:()=>focusState?{kind:focusState.kind,view:focusState.view,paused:focusState.paused}:null,hideSelectionUI};
  window.JBAISelectionTools={getState:()=>proposalState?{original:proposalState.original,replacement:proposalState.replacement,style:proposalState.style,loading:proposalState.loading}:null};
})();
