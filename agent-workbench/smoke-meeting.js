/* meeting.html 冒烟测试：粘贴文本页签 / 模板回显 / 自定义会议类型 / 非录音路径直连生成 / 历史状态三种 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join("C:/Users/juniu/.workbuddy/binaries/node/workspace/node_modules/jsdom"));

const html = fs.readFileSync(path.join(__dirname, "meeting.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom;
const { document } = window;

let passed = 0, failed = 0;
const errors = [];
window.addEventListener("error", (e) => errors.push(e.message));
const t = (name, cond) => { if (cond) { passed++; console.log("PASS", name); } else { failed++; console.log("FAIL", name); } };
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
const change = (el) => el.dispatchEvent(new window.Event("change", { bubbles: true }));
const inputEvt = (el) => el.dispatchEvent(new window.Event("input", { bubbles: true }));
const ev = (code) => window.eval(code); // 访问 script 内 const/let 变量

setTimeout(() => {
  try {
    /* ===== 需求1：粘贴文本页签（已转写文本页签已删除） ===== */
    const tabs = document.querySelectorAll(".upload-tab");
    t("1.1 页签共 3 个（录音/粘贴/上传文件）", tabs.length === 3);
    t("1.1b 无已转写文本页签", ![...tabs].some(tb => tb.dataset.tab === "text"));
    t("1.1c 无 upload-text 面板", !document.getElementById("upload-text"));
    t("1.1d 无会议材料页签", ![...tabs].some(tb => tb.dataset.tab === "material"));
    t("1.1e 无 upload-material 面板", !document.getElementById("upload-material"));
    t("1.2 粘贴文本页签存在", [...tabs].some(tb => tb.dataset.tab === "paste" && /粘贴文本/.test(tb.textContent)));
    t("1.3 粘贴面板默认隐藏", document.getElementById("upload-paste").classList.contains("hidden"));
    const pasteTab = [...tabs].find(tb => tb.dataset.tab === "paste");
    click(pasteTab);
    t("1.4 点击后粘贴面板显示", !document.getElementById("upload-paste").classList.contains("hidden"));
    t("1.5 录音面板被切换隐藏", document.getElementById("upload-audio").classList.contains("hidden"));

    const ta = document.getElementById("pasteTextarea");
    t("1.6 粘贴输入框存在", !!ta);
    t("1.6b 输入框为直接输入态（无引导层）", !document.getElementById("pasteInner") && !ta.closest(".paste-area").querySelector(".paste-area-inner"));
    t("1.6c 状态栏常显", document.getElementById("pasteStatusBar").style.display !== "none");
    t("1.6d 初始字数提示 0 字", /0\s*字/.test(document.getElementById("pasteCount").textContent));
    // 短文本确认 → 拦截
    ta.value = "太短";
    inputEvt(ta);
    t("1.7 输入后字数统计更新", /已输入\s*2\s*字/.test(document.getElementById("pasteCount").textContent));
    click(document.querySelector(".paste-status-right .btn-primary"));
    t("1.8 少于50字确认被拦截（无主材料）", !ev("uploadFiles").paste && !document.getElementById("fileList-paste").textContent.includes("主材料"));
    // 正常文本确认
    ta.value = "李主任：现在开始今天的例会，主要研究三项工作。王副主任：上半年工作情况我先做个简要汇报，总体推进顺利。张处长：信息化项目一期八月中旬上线，请各处室配合做好培训准备，确保按期完成各项任务目标。";
    inputEvt(ta);
    click(document.querySelector(".paste-status-right .btn-primary"));
    t("1.9 确认后生成主材料条目", ev("uploadFiles").paste && document.getElementById("fileList-paste").textContent.includes("主材料"));
    t("1.10 uploadMode 为 paste", ev("uploadMode") === "paste");
    t("1.11 主按钮文案为 开始智能生成", document.getElementById("mainActionText").textContent === "开始智能生成");
    // 删除恢复
    click(document.querySelector("#fileList-paste .file-item-remove"));
    t("1.12 删除后粘贴状态清空", !ev("uploadFiles").paste && ev("uploadMode") === null);
    t("1.13 删除后输入框清空且统计归零", ta.value === "" && /0\s*字/.test(document.getElementById("pasteCount").textContent));

    /* ===== 需求2：模板智能匹配回显 ===== */
    const tplSel = document.getElementById("template");
    t("2.1 主下拉默认 智能匹配（推荐）", tplSel.value === "auto");
    t("2.2 主下拉含智能匹配选项", [...tplSel.options].some(o => o.value === "auto" && /智能匹配/.test(o.text)));
    // 选具体模板后打开预览，应回显该模板
    tplSel.value = "2";
    change(tplSel);
    click(document.querySelector('[onclick="openTemplatePreview()"]'));
    t("2.3 弹窗回显当前所选模板(2)", document.getElementById("templatePreviewSelect").value === "2");
    // 切回 auto 再打开，应回显 auto
    document.getElementById("templatePreviewSelect").value = "auto";
    change(document.getElementById("templatePreviewSelect"));
    click(document.querySelector('[onclick="applyTemplatePreview()"]'));
    t("2.4 使用该模板后主下拉同步为 auto", tplSel.value === "auto");
    click(document.querySelector("#modalTemplate .modal-close"));

    /* ===== 需求3：自定义会议类型 ===== */
    const typeSel = document.getElementById("meetingType");
    t("3.1 下拉含 自定义类型… 选项", [...typeSel.options].some(o => o.value === "custom"));
    t("3.2 自定义输入行默认隐藏", document.getElementById("customTypeRow").classList.contains("hidden"));
    typeSel.value = "custom";
    change(typeSel);
    t("3.3 选择自定义后输入行显示", !document.getElementById("customTypeRow").classList.contains("hidden"));
    t("3.4 自定义时模板自动切智能匹配", tplSel.value === "auto");
    document.getElementById("customMeetingType").value = "安全生产专题会";
    t("3.5 getMeetingTypeText 返回自定义名", ev("getMeetingTypeText")() === "安全生产专题会");
    // 空自定义名校验拦截
    document.getElementById("customMeetingType").value = "";
    t("3.6 空自定义名校验失败", ev("validateMeetingType")() === false);
    document.getElementById("customMeetingType").value = "安全生产专题会";
    t("3.7 有名称时校验通过", ev("validateMeetingType")() === true);
    // 返回下拉
    click(document.querySelector('[onclick="backToTypeSelect()"]'));
    t("3.8 返回后下拉重置且输入行隐藏", typeSel.value === "" && document.getElementById("customTypeRow").classList.contains("hidden"));
    typeSel.value = "1";
    change(typeSel);
    t("3.9 内置类型自动带出模板", tplSel.value === "1");
    t("3.10 getMeetingTypeText 返回内置名", ev("getMeetingTypeText")() === "工作例会");

    /* ===== 需求4：非录音路径直连生成（不进转写页） ===== */
    // 粘贴路径：直接 startGenerate（生成完成检查延后到 6.x，先只验证入口跳转）
    document.getElementById("meetingName").value = "测试会议";
    ta.value = "李主任：现在开始今天的例会，主要研究三项工作。王副主任：上半年工作情况我先做个简要汇报，总体推进顺利。张处长：信息化项目一期八月中旬上线，请各处室配合做好培训准备，确保按期完成各项任务目标。";
    inputEvt(ta);
    click(document.querySelector(".paste-status-right .btn-primary"));
    ev("uploadMode = 'paste'");
    ev("startGenerate()");
    t("4.1 粘贴路径进入生成进度页", document.getElementById("viewProgress").classList.contains("active"));
    t("4.2 未进入录音转写标记页", !document.getElementById("viewTranscribe").classList.contains("active"));
    t("4.3 生成中历史记录已创建", ev("historyData")[0].status === "generating");
    t("4.4 历史状态文案为 生成中", document.querySelector(".history-item[data-id=\"" + ev("historyData")[0].id + "\"] .history-status").textContent === "生成中");
    // 立即取消，避免与后续测试并发生成
    ev("confirmCancel()");

    /* ===== 需求5：历史状态仅三种 ===== */
    const statusMapVals = ["done", "draft", "generating"];
    const badStatus = ev("historyData").some(h => !statusMapVals.includes(h.status));
    t("5.1 历史数据无待审核(review)状态", !badStatus && !ev("historyData").some(h => h.status === "review"));
    t("5.2 页面无 待审核 文案", !/待审核/.test(document.getElementById("historyList").textContent));
    const statuses = [...document.querySelectorAll(".history-status")].map(e => e.textContent);
    t("5.3 状态仅含 已完成/草稿/生成中", statuses.every(s => ["已完成", "草稿", "生成中"].includes(s)));

    /* ===== 需求7：上传文件页签 ===== */
    // 粘贴路径生成已在 4.x 取消，此处测试文件路径
    ev("switchView('viewCreate')");
    const fileTab = [...tabs].find(tb => tb.dataset.tab === "file");
    t("7.1 上传文件页签存在", !!fileTab && /上传文件/.test(fileTab.textContent));
    t("7.2 上传文件面板默认隐藏", document.getElementById("upload-file").classList.contains("hidden"));
    click(fileTab);
    t("7.3 点击后上传文件面板显示", !document.getElementById("upload-file").classList.contains("hidden"));
    t("7.4 粘贴面板被切换隐藏", document.getElementById("upload-paste").classList.contains("hidden"));
    const fileArea = document.getElementById("fileUploadArea");
    t("7.5 上传区存在且可点击触发", !!fileArea && fileArea.getAttribute("onclick") === "simulateUpload('file')");
    // 与粘贴互斥：已有粘贴文本时上传文件被拦截
    ta.value = "李主任：现在开始今天的例会，主要研究三项工作。王副主任：上半年工作情况我先做个简要汇报，总体推进顺利。张处长：信息化项目一期八月中旬上线，请各处室配合做好培训准备，确保按期完成各项任务目标。";
    inputEvt(ta);
    click(document.querySelector(".paste-status-right .btn-primary"));
    ev("simulateUpload('file')");
    t("7.6 已有粘贴文本时上传文件被拦截", !ev("uploadFiles").file);
    // 删除粘贴文本后上传文件成功（直接注入完成态）
    click(document.querySelector("#fileList-paste .file-item-remove"));
    ev("uploadFiles.file = { name: '会议文稿_2026-09-07.docx', meta: '1.2 MB · 文本已自动提取' }");
    ev("renderFileList('file')");
    ev("uploadMode = 'file'");
    ev("updateMainActionBtn()");
    t("7.7 上传后生成主材料条目", document.getElementById("fileList-file").textContent.includes("主材料"));
    t("7.8 uploadMode 为 file", ev("uploadMode") === "file");
    t("7.9 主按钮文案为 开始智能生成", document.getElementById("mainActionText").textContent === "开始智能生成");

    // 文件路径直接生成（不进转写页）；本轮生成不取消，作为 6.x 完成态检查对象
    ev("startGenerate()");
    t("7.10 文件路径进入生成进度页", document.getElementById("viewProgress").classList.contains("active"));
    t("7.11 未进入录音转写标记页", !document.getElementById("viewTranscribe").classList.contains("active"));
    t("7.12 本轮生成历史为 file 测试记录", ev("historyData")[0].status === "generating");

    /* 等待生成完成（约 (12+480ms/条日志) ≈ 数秒） */
    setTimeout(() => {
      try {
        t("6.1 生成完成后进入结果页", document.getElementById("viewResult").classList.contains("active"));
        t("6.2 历史状态更新为 已完成", ev("historyData")[0].status === "done");
        t("6.3 结果页文本标签为 上传文档（file 路径）", document.getElementById("transcriptTabLabel").textContent === "上传文档");
        t("6.4 结果页无音频播放器（文本模式）", document.getElementById("audioPlayerBlock").classList.contains("hidden"));
        t("6.5 待办来源列显示 段（非时间）", document.getElementById("sourceColTitle").textContent === "文本段落");
        t("6.6 无 JS 运行时错误", errors.length === 0);
        // file 路径生成完成后回到创建页，验证删除恢复
        ev("switchView('viewCreate')");
        ev("uploadFiles.file = { name: 'x.docx', meta: '1 MB' }");
        ev("renderFileList('file')");
        click(document.querySelector("#fileList-file .file-item-remove"));
        t("7.13 删除后文件状态清空", !ev("uploadFiles").file && ev("uploadMode") === null);
        if (errors.length) console.log("ERRORS:", errors.join(" | "));
      } catch (e) { console.log("TEST_ERROR_6:", e.message); }
      console.log("RESULT:", passed, "passed,", failed, "failed");
      process.exit(failed > 0 ? 1 : 0);
    }, 12000);
  } catch (e) {
    console.log("TEST_ERROR:", e.message);
    console.log("RESULT:", passed, "passed,", failed, "failed");
    process.exit(1);
  }
}, 300);
