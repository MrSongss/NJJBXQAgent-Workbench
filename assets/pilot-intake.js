(function () {
  "use strict";
  const files = new Map(), running = new Set();
  const esc = value => String(value || "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const textFromHTML = html => { const node=document.createElement("div"); node.innerHTML=html||""; return Array.from(node.querySelectorAll("h1,h2,h3,h4,p,li")).map(row=>row.textContent.trim()).filter(Boolean).join("\n") || node.textContent.trim(); };
  document.addEventListener("change",event=>{
    if(event.target.id==="fileInput") Array.from(event.target.files||[]).forEach(file=>files.set(file.name,file));
  },true);
  function request(title,body,read,label) {
    return new Promise(resolve=>{
      const dialog=document.createElement("dialog"); dialog.className="pilot-dialog";
      dialog.innerHTML=`<form><header><h2>${esc(title)}</h2><button type="button" data-dismiss aria-label="关闭">×</button></header><div class="pilot-dialog-body">${body}<p class="pilot-field-error" role="alert"></p></div><footer><button type="button" class="jb-ds-btn is-secondary" data-dismiss>取消</button><button class="jb-ds-btn is-primary" type="submit">${esc(label||"确认并继续")}</button></footer></form>`;
      document.body.append(dialog);
      dialog.querySelectorAll('[data-pilot-example]').forEach(button=>button.onclick=()=>{
        const input=dialog.querySelector('[name=text]'), demo=window.JBAIPilotContent.examples[button.dataset.pilotExample];
        if(input && demo){input.value=demo.text;input.dataset.demo=button.dataset.pilotExample;input.focus();}
      });
      let result=null;
      dialog.querySelectorAll("[data-dismiss]").forEach(button=>button.onclick=()=>dialog.close());
      dialog.querySelector("form").onsubmit=event=>{event.preventDefault();try{result=read(dialog);dialog.close();}catch(error){dialog.querySelector(".pilot-field-error").textContent=error.message;}};
      dialog.addEventListener("close",()=>{dialog.remove();resolve(result);},{once:true});
      dialog.showModal();
    });
  }
  async function readFile(file) {
    if(window.JBAIPilotServices?.parseFile) return window.JBAIPilotServices.parseFile(file);
    if(/\.(txt|md|csv)$/i.test(file.name)) return file.text();
    if(/\.docx$/i.test(file.name)) {
      const bytes=new Uint8Array(await file.arrayBuffer()), view=new DataView(bytes.buffer);
      for(let offset=0;offset+46<bytes.length;offset++) {
        if(view.getUint32(offset,true)!==0x02014b50) continue;
        const size=view.getUint32(offset+20,true), fullSize=view.getUint32(offset+24,true), length=view.getUint16(offset+28,true);
        const name=new TextDecoder().decode(bytes.slice(offset+46,offset+46+length));
        if(name!=="word/document.xml") continue;
        if(fullSize>30*1024*1024) throw new Error("文档解压后的正文过大，请拆分后上传或粘贴需要处理的内容。");
        const local=view.getUint32(offset+42,true), start=local+30+view.getUint16(local+26,true)+view.getUint16(local+28,true);
        let data=bytes.slice(start,start+size);
        const method=view.getUint16(offset+10,true);
        if(method===8) data=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
        else if(method!==0) throw new Error("不支持该文档压缩格式。");
        const xml=new DOMParser().parseFromString(new TextDecoder().decode(data),"application/xml");
        return Array.from(xml.getElementsByTagNameNS("*","p")).map(row=>row.textContent).join("\n");
      }
      throw new Error("未读取到Word正文，请检查文件是否损坏或加密。");
    }
    throw new Error("本试点尚未接入该格式的解析服务，可粘贴正文继续；不会使用示例内容替代原文。");
  }
  function pasted(prompt,agentId) {
    const value=String(prompt||"").trim();
    if(agentId==="polish" && /使用.*(?:通知|文稿).*示例|示例.*全文润色/.test(value)) return "";
    if(agentId==="review" && (/使用.*(?:通知|文稿).*示例|示例.*合规审查/.test(value) || /^(?:帮我|请|开始|进行)?(?:对当前文稿|对这篇文件|全文)?(?:做|进行)?(?:辅助文本)?(?:合规|文本)?审查(?:一下)?[。！!？?]*$/.test(value))) return "";
    const colon=value.match(/(?:正文|原文|以下内容|以下文字|以下通知|以下材料|(?:解读|编排|整理|润色|优化|审查)(?:一下)?)\s*[:：]\s*([\s\S]+)/);
    if(colon) return colon[1].trim();
    if(value.includes("\n")) return value.split("\n").filter((line,index)=>index>0 || !/帮我|请.*(?:解读|编排|审查|润色)/.test(line)).join("\n").trim();
    if(value.length>=20 && /[。；]/.test(value) && !/[？?]$/.test(value)) return value;
    if(agentId==="polish" && value.length>=6 && !/^(?:帮我|请|开始|进行)?(?:全文)?(?:润色|优化|改写)(?:一下|这篇|当前文稿|文件|材料)?[。！!？?]*$/.test(value)) return value;
    return "";
  }
  function capture(names,knowledge,generated,prompt,options) {
    const candidates=(names||[]).map(name=>({id:`upload:${name}:${files.get(name)?.lastModified||0}`,name,type:"本次上传内容",file:files.get(name),text:""}));
    (knowledge||[]).forEach(item=>candidates.push({id:`kb:${item.id}`,name:item.name,type:"已选知识内容",text:item.text||textFromHTML(item.contentHTML),isKb:item.isKb}));
    const polishDemo=options?.agentId==="polish" && /使用.*(?:通知|文稿).*示例|示例.*全文润色/.test(prompt) && window.JBAIPilotContent?.examples?.polish;
    const reviewDemo=options?.agentId==="review" && /使用.*(?:通知|文稿).*示例|示例.*合规审查/.test(prompt) && window.JBAIPilotContent?.examples?.review;
    const paste=options?.skipPasted||polishDemo||reviewDemo?"":pasted(prompt,options?.agentId);
    if(paste) candidates.push({id:`paste:${Date.now()}`,name:"本次粘贴内容",type:"本次粘贴内容",text:paste});
    if(polishDemo) candidates.push({id:`demo:polish:${Date.now()}`,name:"重点项目服务保障通知（演示文稿）",type:"政务办公场景演示",text:window.JBAIPilotContent.examples.polish.text});
    if(reviewDemo) candidates.push({id:`demo:review:${Date.now()}`,name:"安全生产检查通知（演示文稿）",type:"政务办公场景演示",text:window.JBAIPilotContent.examples.review.text});
    if(generated && (options?.agentId==="polish" || options?.agentId==="review" || /(这篇|刚生成|当前文稿|上面|刚才.{0,8}(通知|公告|文件))/.test(prompt))) candidates.push({id:`generated:${generated.id||generated.title}`,name:generated.title,type:"当前生成文稿",text:textFromHTML(generated.html)});
    return candidates;
  }
  async function chooseSource(candidates,agentId) {
    let source;
    let selectable=candidates;
    if(agentId==="polish" || agentId==="review") {
      const fileSources=candidates.filter(item=>item.type==="本次上传内容" || item.type==="已选知识内容");
      const pastedSource=candidates.find(item=>item.type==="本次粘贴内容" || item.type==="政务办公场景演示");
      const generatedSource=candidates.find(item=>item.type==="当前生成文稿");
      selectable=fileSources.length ? fileSources : pastedSource ? [pastedSource] : generatedSource ? [generatedSource] : [];
    }
    if(selectable.length===1) source=selectable[0];
    if(selectable.length>1) source=await request("确认本次处理的内容",`<p>${agentId==="polish"?"检测到多个文件，请选择本次需要润色的一份。":"检测到多个来源，请选择本次要处理的一份。"}</p><div class="pilot-source-options">${selectable.map((item,index)=>`<label><input name="source" type="radio" value="${index}" ${index===0?"checked":""}><span><b>${esc(item.name)}</b><small>${esc(item.type)}</small></span></label>`).join("")}</div>`,dialog=>selectable[Number(dialog.querySelector("[name=source]:checked").value)]);
    if(candidates.length && !source) return null;
    let problem="";
    if(source?.file) try {source={...source,text:await readFile(source.file)};} catch(error){problem=error.message;}
    if(!source?.text?.trim()) {
      const exampleKey=agentId==="interpret"?"interpret":agentId==="polish"?"polish":agentId==="review"?"review":"plan";
      const exampleLabel=agentId==="interpret"?"使用真实政策原文演示":agentId==="polish"?"使用政务通知示例":agentId==="review"?"使用安全生产通知示例":"使用业务演示材料";
      const exampleHint=agentId==="interpret"?"江北新区政府网站真实政策原文节选，附文号与官方地址。":agentId==="polish"?"包含冗余、口语化、重复字和不规范表达，可直接查看润色效果。":agentId==="review"?"包含政策名称、绝对化表述、日期、附件和落款等典型问题。":"模拟业务场景，非正式政策，不替代你的原文。";
      const text=await request(source ? "补充可读取的正文" : "请提供需要处理的内容",`<p>${esc(problem|| (source?.isKb ? "请选择知识库中的具体文件，或粘贴本次需要处理的正文。" : source ? "该来源当前没有可读取的正文。请粘贴原文继续，或取消后重新选择材料。" : "上传附件、选择具体知识文件，或在此粘贴正文。"))}</p>${!source?`<div class="pilot-demo-entry"><button type="button" class="pilot-action-button" data-pilot-example="${exampleKey}">${exampleLabel}</button><small>${exampleHint}</small></div>`:""}<label class="jb-ds-field"><span>正文内容</span><textarea class="jb-ds-textarea" name="text" required rows="8" placeholder="${agentId==="polish"?"粘贴需要全文润色的原文":agentId==="review"?"粘贴需要合规审查的原文":"粘贴需要解读或编排的原文"}"></textarea></label>`,dialog=>{const value=dialog.querySelector("[name=text]").value.trim();if(!value)throw new Error("请提供正文后继续。");return value;});
      if(!text)return null;
      const officialDemo=text.startsWith("【政府网站真实原文节选");
      source={id:`paste:${Date.now()}`,name:officialDemo?"南京江北新区促进软件产业高质量发展的若干政策措施":"本次粘贴内容",type:officialDemo?"政府网站公开文件":"本次粘贴内容",text};
    }
    return {id:source.id,name:source.name,type:source.type,text:source.text,version:Date.now()};
  }
  async function confirmPlan(values,existing) {
    const data={type:values.type||"年度工作计划",unit:values.issuer||"",period:values.period||"",...existing};
    for(const key of ["unit","period"]) if(/XX|待补充|运行时/.test(data[key])) data[key]="";
    const year=new Date().getFullYear();
    return window.JBAITaskPilotHost.confirmFields({agentId:"plan",values:data,fields:[
      {key:"type",label:"计划类型",question:"这份工作计划属于哪种类型？",options:["年度工作计划","季度工作计划","专项工作计划"]},
      {key:"unit",label:"编制单位",question:"这份工作计划由哪个单位编制？",options:["南京江北新区数据局","南京江北新区政务服务中心","南京江北新区建设与交通局"]},
      {key:"period",label:"计划周期",question:"这份工作计划覆盖什么时间？",options:[`${year}年度`,`${year}年第三季度`,`${year}年第四季度`,`${year+1}年度`]}
    ]});
  }
  function confirmInterpret(values) {
    return window.JBAITaskPilotHost.confirmFields({agentId:"interpret",values:values||{},fields:[
      {key:"audience",label:"解读对象",question:"这份解读主要给谁看？",options:["政务工作人员","企业群众","内部决策参考"]},
      {key:"depth",label:"解读深度",question:"希望解读到什么程度？",options:["简明解读","标准解读","深度解读"]}
    ]});
  }
  async function run(args) {
    const host=window.JBAITaskPilotHost;
    if(running.has(args.conversationId)) {host.toast("当前材料正在处理中，请稍候。");return;}
    running.add(args.conversationId);
    const progress=host.progress(args.conversationId,"主智能体 · 已识别需求，正在核对材料来源",false);
    try {
      const source=await chooseSource(args.sources||[],args.agentId);
      if(!source){host.progress(args.conversationId,"已取消本次处理，未创建新任务。",true,progress);return;}
      if(host.isCurrent&&!host.isCurrent(args.conversationId)){host.progress(args.conversationId,"已切换对话，本次确认已取消。返回原对话后可重新发起。",true,progress);return;}
      let meta=null;
      if(args.agentId==="plan") {meta=await confirmPlan(args.values||{});if(!meta){host.progress(args.conversationId,"已取消信息确认，未创建新任务。",true,progress);return;}}
      const questionOnly=args.agentId==="interpret" && !/解读|生成.{0,8}报告|全面分析/.test(args.prompt) && /[？?]|哪些|如何|是否|什么|多久|谁/.test(args.prompt);
      if(args.agentId==="interpret"&&!questionOnly){meta=await confirmInterpret(args.values);if(!meta){host.progress(args.conversationId,"已取消解读设置确认，未创建新任务。",true,progress);return;}}
      host.progress(args.conversationId,questionOnly?"已识别为原文问答，正在定位相关内容。":args.agentId==="polish"?"已确认文稿，正在生成润色稿、修改痕迹和修改说明。":args.agentId==="review"?"已确认文稿，正在识别文种并匹配合规规则。":"已确认材料，正在提炼结构化内容。",false,progress);
      // 预留正式模型服务；静态试点采用可溯源的摘录与字段提取，不编造政策结论。
      const content=window.JBAIPilotContent;
      const interpreted=args.agentId==="interpret" ? (window.JBAIPilotServices?.interpret ? await window.JBAIPilotServices.interpret(source) : content.interpret(source,window.JBAIPilotServices?.terminology)) : null;
      if(questionOnly) {
        const words=args.prompt.replace(/帮我|请问|这篇|文件|一下|[？?]/g,"").match(/[\u4e00-\u9fa5]{2,4}/g)||[];
        const rows=interpreted.source.segments.filter(row=>words.some(word=>row.text.includes(word)));
        host.addAgentMessage(args.conversationId,`<p>${rows.length?rows.map(row=>`${esc(row.text)}（${esc(row.label)}）`).join("<br>"):"当前原文未找到能够支持该问题的明确依据，请补充具体条款或问题。"}</p>`,{agent:"interpret"});
      } else {
        const pilot=args.agentId==="plan"?window.JBAIPlanPilot:args.agentId==="interpret"?window.JBAIInterpretPilot:args.agentId==="review"?window.JBAIReviewPilot:window.JBAIPolishPilot;
        pilot.start({...args,source,meta,interpreted,newTask:true});
      }
      host.progress(args.conversationId,questionOnly?"已完成原文定位与回答。":args.agentId==="polish"?"主智能体 · 识别完成，已进入全文智能润色":args.agentId==="review"?"主智能体 · 识别完成，已进入合规审查":"主智能体 · 识别完成，已进入任务处理",true,progress);
    } catch(error) {host.progress(args.conversationId,`处理未完成：${error.message}。请检查材料后重新发送。`,true,progress);}
    finally{running.delete(args.conversationId);}
  }
  window.JBAIPilotIntake={capture,run,request,confirmPlan,textFromHTML,pasted};
})();
