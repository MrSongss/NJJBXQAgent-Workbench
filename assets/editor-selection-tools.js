(function () {
  "use strict";

  const $ = selector => document.querySelector(selector);
  const host = () => window.JBAITaskPilotHost || window.JBAIPlanPilotHost || null;
  const esc = value => String(value == null ? "" : value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  let focusState = null;
  let selectionState = null;
  let lastInlineChange = null;
  let toolbar, menu, actionCard, focusBar, resumeBar, resumeFloat;

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
    menu.innerHTML = `<header>选择本段的润色方式</header><div class="selection-polish-options">
      <button type="button" data-selection-style="快速润色">快速润色</button><button type="button" data-selection-style="更正式">更正式</button>
      <button type="button" data-selection-style="更精炼">更精炼</button><button type="button" data-selection-style="更严谨">更严谨</button>
      <button type="button" data-selection-style="政务公文风">政务公文风</button><button type="button" data-selection-style="更通顺">更通顺</button>
      </div><div class="selection-custom-row"><input type="text" maxlength="60" placeholder="输入自定义要求"><button type="button" data-selection-custom>执行</button></div>`;
    document.body.append(menu);

    actionCard = document.createElement("div");
    actionCard.id = "selectionActionCard";
    actionCard.className = "selection-action-card";
    actionCard.hidden = true;
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
    paper.contentEditable = "false";
    focusBar?.querySelectorAll("[data-focus-document-view]").forEach(button => {
      const selected = button.dataset.focusDocumentView === focusState.view;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
    });
  }

  function enterFocus(config) {
    ensureFocusUI(); ensureSelectionUI(); hideSelectionUI();
    focusState = { kind:config.kind, title:config.title || "当前文稿", originalHTML:config.originalHTML || "", getCurrentHTML:config.getCurrentHTML, view:config.view || "original", paused:false };
    const chatView = $("#view-chat"), panel = $("#documentEditorPanel");
    chatView?.classList.add("document-focus-mode", "focus-pane-document");
    chatView?.classList.remove("focus-pane-results", "focus-question-mode");
    panel?.classList.remove("focus-task-paused");
    if (focusBar) {
      focusBar.hidden = false;
      const title=$("#focusDocumentTitle"), current=focusBar.querySelector('[data-focus-document-view="current"]');
      if(title) title.textContent=focusState.title;
      if(current) current.textContent=focusState.kind === "review" ? "当前修订稿" : "当前润色稿";
    }
    if (resumeBar) resumeBar.hidden = true;
    if (resumeFloat) resumeFloat.hidden = true;
    renderFocusDocument();
  }

  function refreshFocus() { renderFocusDocument(); }

  function exitFocus(options) {
    ensureFocusUI(); hideSelectionUI();
    const paper=$("#editorPaper"), html=options?.html != null ? options.html : (focusState?.originalHTML || paper?.innerHTML || "");
    $("#view-chat")?.classList.remove("document-focus-mode", "focus-pane-document", "focus-pane-results", "focus-question-mode");
    $("#documentEditorPanel")?.classList.remove("focus-task-paused");
    if (focusBar) focusBar.hidden=true;
    if (resumeBar) resumeBar.hidden=true;
    if (resumeFloat) resumeFloat.hidden=true;
    if (paper) { paper.innerHTML=html; paper.contentEditable="true"; }
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
    if (resumeBar) { resumeBar.hidden=false; const text=$("#focusResumeText"); if(text) text.textContent=`${focusState.kind === "review" ? "合规审查" : "全文润色"}已暂停，可在对话中追问后返回继续处理。`; }
    if (resumeFloat) { resumeFloat.hidden=false; resumeFloat.innerHTML=`${icon("i-chevron-right")}返回${focusState.kind === "review" ? "合规审查" : "全文润色"}`; }
    const panel=$(focusState.kind === "review" ? "#integratedReviewPanel" : "#integratedPolishPanel");
    if(panel) panel.hidden=true;
    return true;
  }

  function resumeFocus() {
    if (!focusState?.paused) return false;
    focusState.paused=false;
    const panel=$(focusState.kind === "review" ? "#integratedReviewPanel" : "#integratedPolishPanel");
    if(panel) panel.hidden=false;
    enterFocus({ ...focusState, view:focusState.view });
    host()?.toast?.(`已返回${focusState.kind === "review" ? "合规审查" : "全文润色"}任务。`);
    return true;
  }

  function locateText(text) {
    if (!focusState || !text) return false;
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
  function hideSelectionUI() {
    if(toolbar) toolbar.hidden=true;
    if(menu) menu.hidden=true;
    if(actionCard) actionCard.hidden=true;
  }
  function captureSelection() {
    ensureSelectionUI();
    if(toolbar?.contains(document.activeElement) || menu?.contains(document.activeElement)) return;
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

  function showActionCard(change,rect) {
    lastInlineChange=change;
    actionCard.innerHTML=`<div class="selection-action-head"><b>已按“${esc(change.style)}”替换选中文字</b><button type="button" data-selection-action="undo">撤销</button><button type="button" data-selection-action="compare">查看对比</button></div><div class="selection-action-compare" hidden><div><small>修改前</small>${esc(change.original)}</div><div><small>修改后</small>${esc(change.replacement)}</div></div>`;
    place(actionCard,rect.left,rect.bottom+8);
  }

  function applySelectionPolish(style,custom) {
    if(!selectionState?.sameBlock){host()?.toast?.("请在同一段内选择需要润色的文字。");return;}
    const paper=$("#editorPaper"), range=selectionState.range;
    if(!paper || !paper.contains(range.commonAncestorContainer)){host()?.toast?.("选区已失效，请重新选择文字。");hideSelectionUI();return;}
    const replacement=rewrite(selectionState.text,style,custom);
    if(!replacement || replacement===selectionState.text){host()?.toast?.("这段文字未发现可确定的表达问题，请换一种方式或输入自定义要求。");return;}
    const beforeHTML=paper.innerHTML, mark=document.createElement("mark");
    mark.className="inline-polish-change";mark.dataset.inlinePolish="true";mark.dataset.original=selectionState.text;mark.textContent=replacement;
    range.deleteContents();range.insertNode(mark);
    const afterHTML=paper.innerHTML;
    host()?.commitInlinePolish?.({html:afterHTML,original:selectionState.text,replacement,style:custom?`自定义：${custom}`:style});
    hideSelectionUI();
    showActionCard({beforeHTML,afterHTML,original:selectionState.text,replacement,style:custom?`自定义：${custom}`:style},mark.getBoundingClientRect());
    window.getSelection()?.removeAllRanges();
  }

  function askSelection() {
    if(!selectionState?.text)return;
    if(focusState) pauseForQuestion();
    host()?.quoteDocumentSelection?.({text:selectionState.text,documentTitle:selectionState.documentInfo?.title||"当前文稿",version:selectionState.documentInfo?.createdAt||Date.now()});
    hideSelectionUI();
  }

  function undoInlineChange() {
    const paper=$("#editorPaper");
    if(!paper || !lastInlineChange)return;
    if(paper.innerHTML!==lastInlineChange.afterHTML){host()?.toast?.("文稿已继续修改，不能直接撤销该次局部润色。");return;}
    paper.innerHTML=lastInlineChange.beforeHTML;
    host()?.commitInlinePolish?.({html:lastInlineChange.beforeHTML,original:lastInlineChange.replacement,replacement:lastInlineChange.original,style:"撤销局部润色"});
    actionCard.hidden=true;lastInlineChange=null;
    host()?.toast?.("已撤销本次局部润色。");
  }

  document.addEventListener("mouseup",()=>window.setTimeout(captureSelection,0));
  document.addEventListener("keyup",event=>{if(event.shiftKey || ["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"].includes(event.key))window.setTimeout(captureSelection,0);});
  document.addEventListener("scroll",()=>{if(toolbar)toolbar.hidden=true;if(menu)menu.hidden=true;},true);
  window.addEventListener("resize",hideSelectionUI);
  document.addEventListener("click",event=>{
    ensureFocusUI();ensureSelectionUI();
    const pane=event.target.closest("[data-focus-pane]");
    if(pane){const value=pane.dataset.focusPane,view=$("#view-chat");view?.classList.toggle("focus-pane-document",value==="document");view?.classList.toggle("focus-pane-results",value==="results");focusBar.querySelectorAll("[data-focus-pane]").forEach(button=>{const selected=button===pane;button.classList.toggle("active",selected);button.setAttribute("aria-selected",String(selected));});return;}
    const docView=event.target.closest("[data-focus-document-view]");
    if(docView&&focusState){focusState.view=docView.dataset.focusDocumentView;renderFocusDocument();return;}
    if(event.target.closest("[data-focus-resume]")){resumeFocus();return;}
    const action=event.target.closest("[data-selection-action]");
    if(action){
      const type=action.dataset.selectionAction;
      if(type==="polish"){const rect=toolbar.getBoundingClientRect();action.setAttribute("aria-expanded",String(menu.hidden));if(menu.hidden)place(menu,rect.left,rect.bottom+6);else menu.hidden=true;return;}
      if(type==="ask"){askSelection();return;}
      if(type==="undo"){undoInlineChange();return;}
      if(type==="compare"){const compare=actionCard.querySelector(".selection-action-compare");compare.hidden=!compare.hidden;return;}
    }
    const style=event.target.closest("[data-selection-style]");
    if(style){applySelectionPolish(style.dataset.selectionStyle);return;}
    if(event.target.closest("[data-selection-custom]")){const input=menu.querySelector("input"),value=input.value.trim();if(!value){input.focus();return;}applySelectionPolish("自定义",value);return;}
    if(!event.target.closest("#editorSelectionToolbar,#selectionPolishMenu,#selectionActionCard,#editorPaper")) hideSelectionUI();
  });

  ensureFocusUI();ensureSelectionUI();
  window.JBAIDocumentFocus={enter:enterFocus,refresh:refreshFocus,exit:exitFocus,pauseForQuestion,resume:resumeFocus,locateText,isActive:()=>!!focusState&&!focusState.paused,getState:()=>focusState?{kind:focusState.kind,view:focusState.view,paused:focusState.paused}:null,hideSelectionUI};
})();
