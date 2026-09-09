/* interpret.html 冒烟测试：独立工作台结构 / 对话材料自动带入 / 四类结果 / 成果回流事件 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join("C:/Users/juniu/.workbuddy/binaries/node/workspace/node_modules/jsdom"));

const html = fs.readFileSync(path.join(__dirname, "interpret.html"), "utf8");
const dom = new JSDOM(html, { runScripts:"dangerously", resources:"usable", pretendToBeVisual:true, url:"http://localhost/agent-workbench/interpret.html" });
const { window } = dom;
const { document } = window;
let passed = 0, failed = 0;
const received = [];
const t = (name, cond) => { if (cond) { passed++; console.log("PASS", name); } else { failed++; console.log("FAIL", name); } };
window.addEventListener("message", event => received.push(event.data));

setTimeout(() => {
  t("1. 独立工作台保留原文与解读结果双栏", !!document.getElementById("docPage") && !!document.getElementById("resultPanel"));
  t("2. 提供核心摘要、实施路径、术语限制、问答口径四类结果", document.querySelectorAll(".result-tab").length === 4);
  t("3. 支持从广场直接进入后自主新建任务", !!document.querySelector('[data-action="newTask"]'));
  t("4. 已注册对话任务载入接口", typeof window.JBAIInterpretWorkbenchLoad === "function");

  window.JBAIInterpretWorkbenchLoad({
    targetAgentId:"interpret",
    taskId:"WB-INTERPRET-SMOKE",
    conversationId:"C-SMOKE",
    version:2,
    sources:["南京江北新区促进软件产业高质量发展的若干政策措施.pdf"],
    sourcePayloads:[{ name:"南京江北新区促进软件产业高质量发展的若干政策措施.pdf", type:"本次上传内容", text:"第一条 为加快软件产业高质量发展，支持企业提升技术创新能力。\n第二条 申报主体应当在新区依法登记并实际经营。\n第三条 申报单位应提交营业执照、项目说明和信用承诺书。\n第四条 主管部门受理后组织审核，审核结果公示无异议后予以兑现。\n第五条 已享受同类财政扶持的项目不得重复申报。" }]
  });

  setTimeout(() => {
    t("5. 对话附件自动带入且无需再次上传", /南京江北新区促进软件产业高质量发展的若干政策措施/.test(document.getElementById("docHint").textContent));
    t("6. 自动展示带定位标记的政策原文", document.querySelectorAll("#docPage .source-mark").length >= 5);
    t("7. 自动完成解析并显示结果面板", document.getElementById("resultPanel").classList.contains("show") && document.getElementById("sideRate").textContent === "100%");
    t("8. 四类结果均生成内容", ["summary","path","terms","qa"].every(tab => { document.querySelector(`[data-tab="${tab}"]`).click(); return document.querySelectorAll("#resultList .result-card").length > 0; }));
    const completed = received.find(data => data && data.type === "JBAI_WORKBENCH_TASK_EVENT" && data.event === "complete");
    t("9. 完成后发送成果回流事件", !!completed && completed.agentId === "interpret" && completed.taskId === "WB-INTERPRET-SMOKE");
    t("10. 回流事件包含四类成果数量", !!completed && completed.summaryCount > 0 && completed.pathCount > 0 && completed.termCount > 0 && completed.qaCount > 0);
    console.log(`RESULT ${passed}/${passed + failed}`);
    window.close();
    process.exit(failed ? 1 : 0);
  }, 2100);
}, 120);
