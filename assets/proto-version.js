// assets/proto-version.js
// 原型版本角标：读取 <meta name="prototype-version" content="v1.0.0 · 2026-08-06">，
// 在页面右下角渲染一个可点击关闭的版本徽标。
// - content 为空（开发版）时不显示，避免干扰原型评审。
// - 点击徽标可临时隐藏。
(function () {
  "use strict";
  var meta = document.querySelector('meta[name="prototype-version"]');
  var ver = meta ? (meta.getAttribute("content") || "").trim() : "";
  if (!ver) return; // 开发版：不显示角标

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }
  ready(function () {
    if (document.getElementById("proto-version-badge")) return;
    var b = document.createElement("div");
    b.id = "proto-version-badge";
    b.textContent = ver;
    b.title = "工程化原型版本号 · 详见 CHANGELOG.md（点击关闭）";
    b.style.cssText = [
      "position:fixed", "right:12px", "bottom:12px", "z-index:2147483647",
      "padding:4px 10px", "font-size:11px", "line-height:1.4",
      "font-family:Consolas,Menlo,'Microsoft YaHei',monospace", "color:#eaf8f8",
      "background:rgba(24,36,95,.80)", "border:1px solid rgba(85,198,207,.55)",
      "border-radius:6px", "cursor:pointer", "user-select:none",
      "box-shadow:0 2px 8px rgba(0,0,0,.22)", "opacity:.92"
    ].join(";");
    b.addEventListener("click", function () { b.style.display = "none"; });
    document.body.appendChild(b);
  });
})();
