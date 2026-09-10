/* 试点的来源与结构化数据适配层。默认使用原文摘录，不冒充真实模型或术语库。 */
(function () {
  "use strict";
  const missing = "原文未明确";
  const clean = value => String(value || "").trim();
  const examples = {
    review:{text:`【政务办公场景演示文稿｜仅用于体验合规审查】
关于开展2026年三季度安全生产检查有关工作的通知
各街道、各有关单位：
根据新区安全生产专项整治要求，按照新区领导有关要求，为了进一步加强安全生产工作，现将有关事项通知如下：
一、各单位要全面彻底排查重点场所和关键环节，确保所有隐患一次性清零。
二、对检查发现的问题，要建立问题清单，明确整改责任和整改要求，各单位要对照有关要求逐项核查。
三、请各单位、各有关单位高度重视，原则上不得晚于七月十五日之前报送检查情况和问题清单，发现重大隐患要立即上报；对整改不到位的一律严肃追责。
联系人：李某某，联系电话：025-58150000。
南京江北新区综合办公室
2026年7月9日`},
    polish:{text:`【政务办公场景演示文稿｜仅用于体验润色效果】
关于进一步做好2026年三季度重点项目服务保障有关工作要求的通知
各街道、各相关单位：
为了进一步加强重点项目服务保障，现将有关工作要求通知如下：
一、要高度重视项目服务保障工作。各相关单位要切实提高政治站位，认真做好各项服务保障工作，积极主动地帮助项目单位解决问题。
二、建立“一项目一专班”机制，限时办结企业诉求，周通报进展。对企业反映的问题要及时进行反馈，避免问题长期搁置。
三、围绕审批服务、要素保障和施工协调等环节进行全面排查，及时发现问题并进行整改，确保各项工作顺利开展。
四、请各有关单位于2026年9月底前前按时完成相关工作任务，并将办理情况报送新区重点项目服务保障工作专班。`},
    plan:{text:`【业务演示材料｜非正式部署文件】
南京江北新区政务服务中心2026年第四季度重点工作部署
一、推进企业开办服务提质
政务服务中心负责梳理企业开办高频事项；2026年10月15日前形成不少于20项事项的材料清单和办理流程台账；逐项记录办理环节、提交材料与常见退件原因。
政务服务中心负责组织窗口联合校核；2026年11月20日前完成不少于2轮模拟办理；根据问题台账修订办事指南，并在服务大厅同步更新。
二、完善跨部门协同办理
数据局牵头梳理跨部门数据核验需求；2026年10月30日前完成不少于10项需求的确认；明确提供单位、使用场景和授权范围，不得擅自扩大数据使用范围。
数据局负责组织联合测试；2026年12月10日前完成不少于10项需求的验证；逐项登记异常、责任单位和整改结果。
三、提升窗口服务质量
政务服务中心负责开展业务培训；2026年11月30日前开展不少于3场培训；内容覆盖新修订指南、一次性告知及疑难事项处置。
政务服务中心负责组织季度复盘；2026年12月25日前完成不少于30件已办事项抽查；整理典型问题、落实整改并形成季度工作总结。`},
    interpret:{text:`【政府网站真实原文节选｜仅用于原型演示】
关于印发《南京江北新区促进软件产业高质量发展的若干政策措施》的通知
发布机构：经济发展局；文号：宁新区管规字〔2026〕4号；生成日期：2026年7月31日。
官方来源：https://njna.nanjing.gov.cn/njsjbxqglwyh/202607/t20260731_5887148.html
为贯彻落实产业强市战略，结合《南京江北新区软件产业发展行动方案（2026—2028年）》，充分发挥江北新区科技、人才等资源要素优势，培育壮大自主可控与智能引领的软件生态体系，特制定如下政策措施：
一、科技研发能力建设
1. 鼓励企事业单位建设工业软件、人工智能领域国家级重点实验室、技术创新中心、中试基地等科技创新和产业创新平台，最高按照国拨经费给予1:1配套支持。
2. 围绕新区现代化产业体系建设，支持产业平台面向软件、人工智能领域发布重点研发计划，单个研发项目最高支持500万元。鼓励工业企业、研发机构等发布根技术、操作系统、数据集、算法模型、智能体等核心攻关项目和“智改数转网联”等应用场景，单个项目验收结题且就地产业转化的，根据课题完成度，给予发布方最高100万元支持，给予承接方最高500万元支持。
4. 鼓励企业自主研发智能开发测试工具（平台），实施关键软件智能化攻关和技改，开发智能原生应用。对使用智算开展相关业务的软件企业，单个企业每年给予最高200万元补贴。
二、场景建设和应用
5. 鼓励企业积极申报国家、省级首版次软件（含智能体）、首台（套）工业硬件产品。对在新区运营并采购使用首版次、首台（套）工业软硬件产品的企业，给予最高200万元支持。
6. 鼓励企业和园区开展基础设施、设备和产品的国产开源操作系统技术适配和改造。对完成国产开源操作系统适配、迁移、改造和应用验证的企业或园区，按照适配难度、改造投入和应用成效，给予最高200万元支持。
三、人才培育和引进
7. 支持软件企业申报各级人才政策。支持企业培养复合型人才，对获得工业及软件领域多行业技术资格认证的人才给予奖励，单人最高10万元，每家企业给予最高不超过30万元支持。
8. 支持与高校通过共建特色学院、联合开发课程与教材、共建实训基地等多种形式开展产教深度融合。对共建工业软件学院、人工智能学院、卓越工程师学院等特色学院的企业，给予最高200万元分阶段资助；对课程共建、人才实训、联合培养等非学院类合作项目，给予最高50万元支持。
四、附则
本文件适用于以软件产业为主导产业的平台、街道，由南京江北新区管理委员会负责解释，具体解释工作由经济发展局会同相关部门负责，并指导相关产业平台、街道开展政策申报工作。
本文件自2026年9月1日施行，有效期至2028年12月31日。在实施过程中，如扶持政策有重复或与市、区同类扶持政策重复的，按“就高、不重复”原则执行。如遇政策调整，按照最新政策要求进行相应调整。`}
  };
  function dateValue(value,period) {
    const text=clean(value), iso=text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const match=text.match(/(?:(\d{4})年)?(\d{1,2})月(?:(\d{1,2})日|(底))/);
    const year=iso?+iso[1]:match?+(match[1]||(String(period||"").match(/\d{4}/)||[])[0]):0;
    if(!year||(!iso&&!match))return "";
    const month=+(iso?iso[2]:match[2]),day=iso?+iso[3]:match[4]?new Date(year,month,0).getDate():+match[3];
    const date=new Date(year,month-1,day);
    return date.getFullYear()===year&&date.getMonth()===month-1&&date.getDate()===day?`${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`:"";
  }
  function units(text) {
    let article = "";
    return clean(text).split(/\n+/).map(clean).filter(Boolean).map((line, index) => {
      const match = line.match(/^(第[一二三四五六七八九十百千万\d]+条)/);
      if (match) article = match[1];
      const chapter = /^第[一二三四五六七八九十百千万\d]+章/.test(line);
      if(chapter)article="";
      return { id:`SRC-${index + 1}`, label:match ? match[1] : article && !chapter ? `${article}·第${index + 1}段` : `第${index + 1}段`, text:line, type:chapter ? "chapter" : "paragraph" };
    });
  }
  function refs(rows) { return rows.map(row => ({ id:row.id, label:row.label })); }
  function insight(id, title, rows, fallback) {
    return { id, title, text:rows.length ? rows.map(row => row.text).join("\n") : fallback || missing, references:refs(rows), sourceId:rows[0]?.id || "", sourceLabel:rows.map(row => row.label).join("、") || missing, grounded:rows.length > 0 };
  }
  function fields(text) {
    return {
      owner:((text.match(/(?:由|^|[，。；\s])([\u4e00-\u9fa5]{2,22}(?:局|处|部门|单位|中心|办公室|委员会|人员))(?:负责|牵头|组织|应|要)/) || [])[1] || missing).replace(/^(?:先|随后|同步|同时)?由/,""),
      deadline:(text.match(/(?:\d{4}年)?\d{1,2}月(?:\d{1,2}日)?(?:前|底|起)?|\d+个?工作日(?:内|前)?|\d+日内|每[年月季周][^，。；]{0,8}/) || [])[0] || missing,
      metric:(text.match(/(?:不少于|不超过|达到|完成率|提升|增长|降低|至少|超过|最高(?:支持|补贴|资助|奖励|给予)?|≥|≤)[^，。；]{0,20}\d+(?:\.\d+)?\s*(?:%|％|个|项|万元|亿元|次|家|人)|\d+(?:\.\d+)?\s*(?:%|％|万元|亿元)|\d+\s*:\s*\d+/) || [])[0] || missing
    };
  }
  function interpret(source, terminology) {
    const segments = units(source.text), body = segments.filter(row => row.type !== "chapter" && !/(?:解读重点|重点关注问题)【(?:必填|可选)】/.test(row.text));
    const match = re => body.filter(row => re.test(row.text));
    const summary = [
      insight("SUM-1", "核心宗旨", match(/为[了促进加强推进保障贯彻落实]|旨在|宗旨/).slice(0,2)),
      insight("SUM-2", "主要领域", match(/主要任务|重点|围绕|涉及|适用于/).slice(0,2), "原文未单独概括主要领域，请结合下方原文要点阅读。"),
      insight("SUM-3", "总体要求", match(/总体要求|坚持|应当|必须|按照/).slice(0,2))
    ];
    const background = [
      insight("BG-1", "出台背景", match(/为解决|针对|鉴于|当前|存在|背景|形势/)),
      insight("BG-2", "制定依据", match(/根据|依据|贯彻|落实.{0,20}精神/)),
      insight("BG-3", "预期目标", match(/目标|旨在|实现|达到|确保|提升/))
    ];
    const actions = match(/应当|负责|牵头|组织|推进|完成|落实|提交|申请|受理|审核|公示|兑现|报送|反馈|开展|建立|制定|支持|鼓励|给予|施行/).filter(row => {
      if(/^第.+章/.test(row.text))return false;
      if(/未规定|不得|严禁|禁止|是指/.test(row.text)&&fields(row.text).owner===missing)return false;
      return fields(row.text).owner!==missing||fields(row.text).deadline!==missing||!/^(?:为|关于|【)/.test(row.text);
    });
    const service = actions.some(row => /申请|申报|提交材料/.test(row.text)) && actions.some(row => /受理|审核|公示/.test(row.text));
    const path = actions.map((row,index) => ({ ...insight(`PATH-${index+1}`, row.text.replace(/^第.+?条\s*/, "").slice(0,28), [row]), ...fields(row.text), parallel:/同步|同时|并行|分别/.test(row.text), phase: service ? (/准备|材料|资格/.test(row.text) ? "准备" : /提交|申请|申报/.test(row.text) ? "申请" : /审核|受理|公示/.test(row.text) ? "审核" : /兑现|落实|拨付/.test(row.text) ? "落实" : "执行要求") : (/目标|达到|实现/.test(row.text) ? "目标" : "推进举措") }));
    const definitions = match(/是指|以下简称|定义为/);
    const terms = definitions.map((row,index) => ({ ...insight(`TERM-${index+1}`, (row.text.match(/[“「]([^”」]+)[”」]/) || [])[1] || row.text.split(/是指|以下简称|定义为/)[0].slice(-18), [row]), authority:"原文定义" }));
    const definedNames=new Set(terms.map(item=>item.title));
    const quotedTerms=[];
    body.forEach(row=>{
      for(const match of row.text.matchAll(/[“「]([^”」]{2,16})[”」]/g)){
        const name=match[1].trim();
        if(definedNames.has(name)||quotedTerms.some(item=>item.title===name))continue;
        quotedTerms.push({ ...insight(`TERM-USE-${quotedTerms.length+1}`,name,[row]), text:"原文使用该概念但未提供专门定义，正式解读时应关联权威术语库或配套文件核验口径。", authority:"原文用语（未定义）" });
      }
    });
    terms.push(...quotedTerms.slice(0,6));
    (terminology || []).filter(term => term.name && source.text.includes(term.name) && term.definition && term.source).forEach((term,index) => terms.push({ id:`DICT-${index}`, title:term.name, text:term.definition, grounded:false, references:[], authority:term.source, definitionSource:term.source }));
    const limits = [
      insight("LIMIT-1", "适用范围", match(/适用范围|适用于|本区域|本辖区/)),
      insight("LIMIT-2", "适用对象与资格", match(/适用对象|申请人|申报单位|符合.{0,15}条件|依法登记|具备/)),
      insight("LIMIT-3", "禁止性规定", match(/不得|禁止|严禁|不予|不允许/)),
      insight("LIMIT-4", "时间、数量与金额限制", match(/截止|期限|时限|不超过|不少于|万元|亿元|工作日|月.{0,4}日前|%|％/))
    ];
    const exceptions = match(/除外|例外|但书|另有规定|不适用/);
    if (exceptions.length) limits.push(insight("LIMIT-5", "例外情形", exceptions));
    const allRefs = items => [...new Map(items.flatMap(item => item.references || []).map(ref => [ref.id,ref])).values()];
    const metricRows=path.filter(item=>item.metric&&item.metric!==missing);
    const dateRows=match(/施行|有效期|截止|期限|月.{0,4}日前|工作日/);
    const qa = [
      { id:"QA-1", question:"这份内容主要讲什么？", answer:summary.filter(item=>item.grounded).map(item=>item.text).join("\n") || missing, references:allRefs(summary) },
      { id:"QA-2", question:"需要做什么，先做什么、后做什么？", answer:path.length ? path.map((item,index)=>`${index+1}. ${item.text}`).join("\n") : "原文未明确具体执行步骤，不补写办理流程。", references:allRefs(path) },
      { id:"QA-3", question:"适用对象及限制条件有哪些？", answer:limits.filter(item=>item.grounded).map(item=>`${item.title}：${item.text}`).join("\n") || missing, references:allRefs(limits) },
      { id:"QA-4", question:"有哪些明确的数量、比例或资金指标？", answer:metricRows.length?metricRows.map(item=>`${item.title}：${item.metric}`).join("\n"):"原文未明确量化指标。", references:allRefs(metricRows) },
      { id:"QA-5", question:"文件什么时候施行，有效期到什么时候？", answer:dateRows.length?dateRows.map(row=>row.text).join("\n"):"原文未明确施行时间或有效期。", references:refs(dateRows) }
    ].map(item=>({...item,title:item.question,text:item.answer,sourceId:item.references[0]?.id || "",sourceLabel:item.references.map(ref=>ref.label).join("、") || missing,grounded:item.references.length>0}));
    return { source:{...source,segments,wordCount:source.text.replace(/\s/g,"").length}, summary, background, path, terms, limits, qa, routeNote:service ? "以下按原文行动要求组织；只有原文明示的先后关系才作为执行顺序，并行事项单独标注。" : "按原文工作部署梳理目标与推进举措；不套用申报审核流程，不推定未说明的先后关系。" };
  }
  function clusters(source) {
    let current = {id:"CL-1",name:"重点工作",items:[]};
    const rows=[current];
    units(source.text).forEach((row,index)=>{
      if (/^(?:[一二三四五六七八九十]+[、．]|第.+章)/.test(row.text) && row.text.length<65) {
        current={id:`CL-${index+2}`,name:row.text.replace(/^[一二三四五六七八九十]+[、．]\s*/,""),items:[]}; rows.push(current);
      } else if (!/^(?:【业务演示|南京.*(?:工作部署|工作安排)$|请|帮我).{0,15}(?:编排|生成|整理|计划)?/.test(row.text)) current.items.push({id:`ITEM-${index+1}`,text:row.text,source:row.label,sourceId:row.id,originalText:row.text});
    });
    return rows.filter(row=>row.items.length);
  }
  function goals(groups, meta) {
    return groups.map(group=>{
      const dates=group.items.map(row=>fields(row.text).deadline).filter(value=>value!==missing);
      const absolute=dates.map(value=>({raw:value,iso:dateValue(value,meta?.period)})).filter(row=>row.iso).sort((a,b)=>a.iso.localeCompare(b.iso));
      return {id:`GOAL-${group.id}`,originId:group.id,content:group.name,metric:group.items.map(row=>fields(row.text).metric).filter(value=>value!==missing).join("；"),deadline:absolute.at(-1)?.raw||dates[0]||"",owner:[...new Set(group.items.map(row=>fields(row.text).owner).filter(value=>value!==missing))].join("、"),human:false};
    });
  }
  function tasks(groups, targetGoals) {
    return groups.map(group=>{
      const goal=targetGoals.find(item=>item.originId===group.id);
      return {id:`TASK-${group.id}`,originId:group.id,title:group.name,desc:"",owner:goal?.owner||"",deadline:goal?.deadline||"",human:false,subtasks:group.items.map(row=>({id:`SUB-${row.id}`,title:row.text.slice(0,35),steps:row.text.split(/[；;]/).filter(Boolean).map((text,index)=>({id:`STEP-${row.id}-${index}`,text})),source:row.source}))};
    });
  }
  function plan(source, meta) {
    const groups=clusters(source);
    return {meta:{...meta,title:meta.title||`${meta.unit}${meta.period}工作计划`,secret:""},sources:[{id:source.id,name:source.name,detail:source.type,text:source.text}],clusters:groups,thinking:"",goals:[],tasks:[]};
  }
  window.JBAIPilotContent={units,interpret,clusters,goals,tasks,plan,fields,dateValue,examples};
})();
