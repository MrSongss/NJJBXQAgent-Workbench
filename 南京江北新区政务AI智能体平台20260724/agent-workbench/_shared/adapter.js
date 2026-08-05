// agent-workbench/_shared/adapter.js
// 嵌入平台 iframe 时，隐藏 demo 自身外壳（顶栏/侧栏），避免与平台 wb-bar 三层叠加。
// demo 只需：window.ADAPTER_CONFIG = { hideSelectors: ["#sidebar", ".main-header"] }
(function () {
  var cfg = window.ADAPTER_CONFIG || {};
  function applyHide() {
    if (window.parent === window) return; // 独立打开（非嵌入）则保持原样
    (cfg.hideSelectors || []).forEach(function (sel) {
      try { document.querySelectorAll(sel).forEach(function (el) { el.style.display = "none"; }); } catch (e) {}
    });
  }
  if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(applyHide, 80);
  else document.addEventListener("DOMContentLoaded", applyHide);
})();
