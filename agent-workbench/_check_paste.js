const fs = require("fs");
const html = fs.readFileSync("meeting.html", "utf8");
const m = html.match(/<script>([\s\S]*?)<\/script>/);
try { new Function(m[1]); console.log("JS_SYNTAX_OK"); } catch (e) { console.log("JS_SYNTAX_ERROR: " + e.message); }

const residues = [];
if (html.includes("focusPasteTextarea")) residues.push("focusPasteTextarea");
if (html.includes("onPasteBlur")) residues.push("onPasteBlur");
if (html.includes("has-content")) residues.push("has-content");
if (html.includes("paste-area-inner")) residues.push("paste-area-inner");
if (html.includes("pasteInner")) residues.push("pasteInner");
if (html.includes("paste-title") || html.includes("paste-hint")) residues.push("paste-title/hint CSS");
console.log("残留:", residues.length ? residues.join(" | ") : "CLEAN");

// textarea CSS 默认可见
const css = html.match(/\.paste-textarea\s*\{[^}]*\}/);
console.log("textarea CSS:", css ? css[0].slice(0, 90) : "未找到");

// 状态栏初始 inline 样式
const sb = html.match(/id="pasteStatusBar"[^>]*/);
console.log("状态栏:", sb ? (sb[0].includes("display:none") ? "隐藏(旧)" : "常显(新)") : "未找到");
