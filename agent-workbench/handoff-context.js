(function () {
  "use strict";

  var FIELD_LABELS = {
    subject: "主题/事项名称", body: "决策主体", date: "日期", type: "文种类型",
    matter: "核心事项", issuer: "发文单位", recipient: "主送单位", deadline: "完成时限",
    points: "正文要点", topic: "主题", occasion: "使用场合", speaker: "发言人",
    audience: "面向对象", duration: "篇幅/时长", kind: "文种", details: "主要内容",
    period: "总结周期", area: "业务领域", work: "重点工作", next: "下一步计划",
    event: "活动名称", place: "活动地点", channel: "发布渠道", people: "参加人员",
    content: "正文内容", sender: "发函单位", receiver: "收函单位", publisher: "发布主体",
    scope: "发布范围", requester: "请示单位", opinion: "批复意见", basis: "政策依据",
    title: "议案名称", proposer: "提案人", meeting: "会议名称", sourceMode: "解读来源",
    focus: "解读重点", depth: "解读深度", question: "关注问题"
  };

  function escapeHTML(value) {
    return String(value == null ? "" : value).replace(/[&<>"]/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char];
    });
  }

  function setControlValue(control, value) {
    if (!control || value == null || value === "") return;
    if (control.tagName === "SELECT" && !Array.from(control.options).some(function (option) { return option.value === value; })) {
      var option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      control.appendChild(option);
    }
    control.value = value;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function fillByLabels(values) {
    Object.keys(values || {}).forEach(function (key) {
      var value = values[key];
      if (value == null || value === "") return;
      var labelText = FIELD_LABELS[key] || key;
      var labels = Array.from(document.querySelectorAll("label,.form-label,.field-label,.n-form-item-label"));
      var label = labels.find(function (node) {
        var text = String(node.textContent || "").replace(/\s+/g, "");
        return labelText.split("/").some(function (part) { return text.indexOf(part.replace(/\s+/g, "")) >= 0; });
      });
      var host = label && (label.closest(".form-item,.form-group,.field,.el-form-item,.n-form-item") || label.parentElement);
      setControlValue(host && host.querySelector("input,select,textarea"), value);
    });
  }

  function stripHeading(html) {
    var box = document.createElement("div");
    box.innerHTML = html || "";
    var heading = box.querySelector("h1,h2");
    if (heading) heading.remove();
    return box.innerHTML;
  }

  function applyNoticeResult(payload) {
    if (payload.targetAgentId !== "notice") return false;
    var values = payload.structuredValues || {};
    if (typeof window.newDraft === "function") window.newDraft();
    setControlValue(document.getElementById("nlInput"), (payload.modelPayload && payload.modelPayload.prompt) || payload.text || "");
    setControlValue(document.getElementById("fTitle"), payload.title || values.subject || "");
    setControlValue(document.getElementById("fOrg"), values.issuer || "");
    setControlValue(document.getElementById("fTo"), values.recipient || "");
    setControlValue(document.getElementById("fDeadline"), String(values.deadline || "").replace(/\//g, "-"));
    setControlValue(document.getElementById("fContent"), values.points || payload.text || "");

    var formCard = document.getElementById("formCard");
    var guideCard = document.getElementById("guideCard");
    var typeResult = document.getElementById("typeResult");
    if (formCard) formCard.style.display = "";
    if (guideCard) guideCard.style.display = "none";
    if (typeResult) typeResult.style.display = "";
    if (typeof window.applyLayout === "function") window.applyLayout("split");
    if (typeof window.setPreviewMode === "function") window.setPreviewMode("draft");

    var draftTitle = document.getElementById("draftTitle");
    var draftTo = document.getElementById("draftTo");
    var draftBody = document.getElementById("draftBody");
    var draftSignOrg = document.getElementById("draftSignOrg");
    var draftSignDate = document.getElementById("draftSignDate");
    if (draftTitle) draftTitle.textContent = payload.title || ("关于" + (values.subject || "有关工作") + "的通知");
    if (draftTo) draftTo.textContent = (values.recipient || "各相关单位") + "：";
    if (draftBody) draftBody.innerHTML = stripHeading(payload.html) || "<p>" + escapeHTML(payload.text || "") + "</p>";
    if (draftSignOrg) draftSignOrg.textContent = values.issuer || "南京江北新区管理委员会";
    if (draftSignDate) draftSignDate.textContent = new Date().toLocaleDateString("zh-CN");
    if (typeof window.autoSaveForm === "function") window.autoSaveForm();
    if (typeof window.autoSaveDraft === "function") window.autoSaveDraft();
    if (typeof window.showToast === "function") window.showToast("✓ 已载入会话生成的通知初稿，可继续编辑", "success");
    return true;
  }

  function renderInFlowResult(payload) {
    var old = document.getElementById("jbaiHandoffResult");
    if (old) old.remove();
    var host = document.querySelector(".main-content,.content-area,.workspace,.workbench-main,main,#app") || document.body;
    var panel = document.createElement("section");
    panel.id = "jbaiHandoffResult";
    panel.style.cssText = "position:relative;flex:none;margin:12px 16px;padding:0;border:1px solid #c8ddeb;border-radius:10px;background:#fff;box-shadow:0 4px 14px rgba(24,48,79,.08);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Microsoft YaHei',sans-serif;color:#263750;overflow:hidden";
    var rows = Object.keys(payload.structuredValues || {}).map(function (key) {
      return "<tr><th style=\"width:150px;padding:7px 10px;border-bottom:1px solid #edf1f5;text-align:left;color:#607289\">" +
        escapeHTML(FIELD_LABELS[key] || key) + "</th><td style=\"padding:7px 10px;border-bottom:1px solid #edf1f5\">" +
        escapeHTML(payload.structuredValues[key] || "—") + "</td></tr>";
    }).join("");
    panel.innerHTML = "<div style=\"display:flex;align-items:center;gap:8px;padding:11px 14px;border-bottom:1px solid #e2edf2;background:#f5fbff\"><div style=\"flex:1\"><b style=\"display:block;font-size:14px\">已生成内容，可继续在本工作台编辑</b><small style=\"color:#6c7d91\">结构化要素、正文、知识库和附件参数均已带入当前流程</small></div><span style=\"padding:3px 8px;border-radius:999px;background:#e8f7ee;color:#168447;font-size:11px;font-weight:700\">已带入</span></div>" +
      "<div style=\"padding:12px 14px;max-height:52vh;overflow:auto\">" +
      (rows ? "<table style=\"width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px\"><tbody>" + rows + "</tbody></table>" : "") +
      "<div contenteditable=\"true\" style=\"padding:18px 22px;border:1px solid #dfe7ed;border-radius:8px;outline:none;line-height:1.9;font-family:'FangSong','仿宋','SimSun',serif\">" +
      (payload.html || "<p>" + escapeHTML(payload.text || "") + "</p>") + "</div></div>";
    host.insertBefore(panel, host.firstChild);
    panel.scrollIntoView({ block: "start" });
  }

  window.addEventListener("message", function (event) {
    var data = event.data || {};
    if (data.type !== "JBAI_WORKBENCH_CONTEXT" || !data.payload) return;
    var payload = data.payload;
    fillByLabels(payload.structuredValues || {});
    if (!applyNoticeResult(payload)) renderInFlowResult(payload);
  });
})();
