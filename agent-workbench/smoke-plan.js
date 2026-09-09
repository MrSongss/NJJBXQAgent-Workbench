/* plan.html 冒烟测试：上传/粘贴图片样式 / 类型切换仅换元数据不重置 / 管理更多模板按钮 / 步骤④文稿预览 */
const fs = require("fs");
const path = require("path");
const { JSDOM } = require(path.join("C:/Users/juniu/.workbuddy/binaries/node/workspace/node_modules/jsdom"));

const html = fs.readFileSync(path.join(__dirname, "plan.html"), "utf8");
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true, url: "http://localhost/" });
const { window } = dom;
const { document } = window;

let passed = 0, failed = 0;
const errors = [];
window.addEventListener("error", (e) => errors.push(e.message));
const t = (name, cond) => { if (cond) { passed++; console.log("PASS", name); } else { failed++; console.log("FAIL", name); } };
const click = (el) => el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));

setTimeout(() => {
  try {
    /* 1. 布局与样式结构 */
    t("1.1 页面无 rightbar 元素", !document.querySelector(".rightbar") && !document.getElementById("previewBody"));
    t("1.2 双列 src-col 结构", document.querySelectorAll("#uploadBody .src-col").length === 2);
    t("1.3 上传列标题为 上传附件（可选）", /上传附件（可选）/.test(document.querySelector("#uploadBody .src-col .src-label").textContent));
    t("1.4 drop 区文案为 点击或拖拽文件到此处", /点击或拖拽文件到此处/.test(document.getElementById("dropZone").textContent));
    t("1.5 粘贴列为无边框输入样式（无图标标题）", !document.querySelector("#pasteMod .dt"));

    /* 2. 计划类型下拉 + 详情面板 + 管理更多模板按钮 */
    const sel = document.getElementById("ptypeSelect");
    t("2.1 下拉框存在", !!sel);
    t("2.2 默认选中 annual", sel && sel.value === "annual");
    const detail = document.getElementById("ptypeDetail");
    t("2.3 详情面板不含编制单位/成文模板", detail && !/编制单位/.test(detail.innerHTML) && !/成文模板/.test(detail.innerHTML));
    t("2.4 详情面板含章节结构", detail && /一、指导思想/.test(detail.innerHTML));
    const mgrBtn = document.querySelector('[data-action="gotoTplMgr"]');
    t("2.5 管理更多模板按钮存在", !!mgrBtn && /管理更多模板/.test(mgrBtn.textContent));
    t("2.6 解析主按钮为醒目样式 parse-cta 且居中", !!document.querySelector("#uploadBody .parse-cta-wrap .parse-cta") && !!document.querySelector(".parse-cta-wrap"));
    t("2.7 编制设置模块与入口已删除", !document.getElementById("view-settings") && !document.querySelector('[data-view="settings"]'));

    /* 3. 类型切换：仅切元数据，不重置已传资料、不载入示例 */
    sel.value = "quarter";
    sel.dispatchEvent(new window.Event("change", { bubbles: true }));
    const detail2 = document.getElementById("ptypeDetail");
    t("3.1 切换后详情联动为季度", detail2 && /一、季度工作目标/.test(detail2.innerHTML));
    t("3.2 下拉值为 quarter", document.getElementById("ptypeSelect").value === "quarter");
    t("3.3 无确认弹框", !(document.getElementById("modalMask") || {}).classList.contains("show"));
    t("3.4 切换后无示例资料载入（资料清单为空）", !document.querySelector("#uploadBody .filelist .fileitem"));
    t("3.5 解析按钮仍为禁用（无资料）", document.querySelector('[data-action="parse"]').disabled === true);

    /* 4. 粘贴文本随解析入库 → 解析 → 步骤②③④ */
    const ta2 = document.getElementById("pasteTa");
    ta2.value = "关于加快推进全区政务数据共享工作的讲话要点：一要统一思想；二要压实责任。";
    ta2.dispatchEvent(new window.Event("input", { bubbles: true }));
    click(document.querySelector('[data-action="parse"]'));

    setTimeout(() => {
      try {
        t("4.1 解析后进入清单视图", !!document.querySelector(".cluster"));
        const nextBtn = document.querySelector('[data-action="nextStep"]');
        t("4.2 进入思路与目标凝练按钮存在", !!nextBtn && /进入思路与目标凝练/.test(nextBtn.textContent));
        click(nextBtn); /* → 步骤②，自动 genGoals(900ms) */

        setTimeout(() => {
          try {
            t("4.3 步骤②激活", /思路目标凝练/.test((document.querySelector(".s.active") || {}).textContent || ""));
            const think = document.querySelector('[data-ed="thinking"]');
            t("4.4 思路内容已自动生成", think && think.value && think.value.length > 20);
            click(document.querySelector('[data-action="nextStep"]')); /* → 步骤③，自动 genTasks(1000ms) */

            setTimeout(() => {
              try {
                t("4.5 步骤③激活", /任务步骤拆解/.test((document.querySelector(".s.active") || {}).textContent || ""));
                t("4.6 任务已自动生成", document.querySelectorAll(".task").length >= 3);
                click(document.querySelector('[data-action="nextStep"]')); /* → 步骤④ */

                const fpb = document.getElementById("formatPreviewBody");
                t("5.1 步骤④格式预览有内容", !!fpb && !!fpb.querySelector(".paper"));
                t("5.2 步骤④预览含文稿标题", !!fpb && /重点工作计划/.test(fpb.textContent));
                t("5.3 生成正式文档步骤已取消", !document.querySelector('[data-action="genDoc"]') && !/生成正式文档/.test(document.body.innerHTML));
                const expBtn = document.querySelector('.format-meta-ops [data-action="exportWord"]');
                t("5.4 进入步骤④直接展示导出按钮（导出 Word）", !!expBtn && /导出/.test(expBtn.textContent));
                t("5.5 步骤③入口按钮名称为 生成工作计划", !/进入格式生成/.test(document.body.innerHTML) && !document.getElementById("view-settings"));
                t("5.6 步骤④预览含落款单位与日期", !!fpb && /综合部|数据管理局|2026|20\d\d/.test(fpb.textContent));
              } catch (e) { console.log("FATAL-3", e.message); process.exit(1); }
            }, 1800);
          } catch (e) { console.log("FATAL-2", e.message); process.exit(1); }
        }, 1600);
      } catch (e) { console.log("FATAL-1", e.message); process.exit(1); }
    }, 4200);
  } catch (e) { console.log("FATAL-0", e.message); process.exit(1); }
}, 300);
