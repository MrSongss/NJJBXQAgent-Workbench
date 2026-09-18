/**
 * ppt.html 批次29+30 jsdom 回归测试
 * 批次29: 初始落地页=screen-1（首页），而非知识库 screen-4
 * 批次30: 一键生成模式步骤条只显示2步(需求输入→预览优化)；提交后落在预览优化
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const htmlPath = 'D:/marketingforce/marketforce/南京项目/南京江北新区政务AI智能体平台20260724/agent-workbench/ppt.html';
const html = fs.readFileSync(htmlPath, 'utf8');

const results = [];
function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + ' | ' + name + (detail ? ' | ' + detail : ''));
}

let jsdomErrors = [];
const dom = new JSDOM(html, {
  url: 'http://localhost/ppt.html',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  resources: 'usable',
  beforeParse(window) {
    window.addEventListener('jsdomError', (e) => { jsdomErrors.push(String(e.detail && e.detail.stack || e.detail || e)); });
  }
});
const w = dom.window;
const d = w.document;

setTimeout(() => {
  try {
    // ===== 批次29 验收 =====
    // T1 初始激活屏是 screen-1
    const activeScreen = d.querySelector('.screen.active');
    record('T1 初始激活屏=screen-1(首页)', !!activeScreen && activeScreen.id === 'screen-1', activeScreen ? activeScreen.id : 'null');

    // T2 首页模式按钮：普通模式高亮，一键不高亮
    const modeBtns = d.querySelectorAll('.mode-btn');
    let normalActive = false, oneclickActive = false;
    modeBtns.forEach(b => {
      const t = (b.textContent || '').trim();
      if (t.indexOf('一键生成') >= 0) oneclickActive = b.classList.contains('active');
      else if (b.classList.contains('active')) normalActive = true;
    });
    record('T2a 初始普通模式按钮高亮', normalActive);
    record('T2b 初始一键生成按钮不高亮', !oneclickActive);

    // T3 步骤条初始状态: mode-normal, step-1 active, 无done残留
    const nav = d.getElementById('stepsNav');
    record('T3a 步骤条初始含mode-normal', !!nav && nav.classList.contains('mode-normal'));
    const step1 = nav ? nav.querySelector('[data-step="1"]') : null;
    record('T3b 步骤条step-1初始active', !!step1 && step1.classList.contains('active'));
    const doneCount = nav ? nav.querySelectorAll('.step.done').length : -1;
    record('T3c 步骤条无done残留', doneCount === 0, 'done=' + doneCount);

    // ===== 批次30 验收 =====
    // T4 步骤条HTML: 5个中间步骤带 step-oneclick-only
    const hideInOneClick = nav ? nav.querySelectorAll('.step-oneclick-only').length : 0;
    record('T4 步骤条中间步骤(含连接线)标记oneclick隐藏数>=9', hideInOneClick >= 9, 'count=' + hideInOneClick);

    // T5 一键模式函数序列=[1,7]
    const seq = w.eval('getOneClickModeSequence ? getOneClickModeSequence() : null');
    record('T5 一键生成序列=[1,7]', Array.isArray(seq) && seq[0] === 1 && seq[1] === 7, JSON.stringify(seq));

    // T6 激活一键模式 → 步骤条变2步
    w.eval('selectMode("oneclick")');
    setTimeout(() => {
      try {
        const nav2 = d.getElementById('stepsNav');
        record('T6a 一键模式步骤条含mode-oneclick', nav2.classList.contains('mode-oneclick'), nav2.className);
        // 可见步骤 = 需求输入 + 预览优化（类名为 step-item；优先计算样式，jsdom 不支持时退回类逻辑）
        const visibleSteps = [];
        const hiddenByClass = [];
        nav2.querySelectorAll('.step-item').forEach(s => {
          const cs = w.getComputedStyle(s);
          const oneClickOnly = s.classList.contains('step-oneclick-only');
          if (cs.display === 'none') { if (!oneClickOnly) hiddenByClass.push(s.getAttribute('data-step')); }
          else if (!oneClickOnly) visibleSteps.push(s.getAttribute('data-step'));
        });
        // 类逻辑断言：step1/step7 无 step-oneclick-only（不被隐藏），其余5步全部有
        let classLogicOk = true;
        nav2.querySelectorAll('.step-item').forEach(s => {
          const st = s.getAttribute('data-step');
          const oneClickOnly = s.classList.contains('step-oneclick-only');
          if ((st === '1' || st === '7') && oneClickOnly) classLogicOk = false;
          if (st !== '1' && st !== '7' && !oneClickOnly) classLogicOk = false;
        });
        record('T6b 一键模式可见步骤只有step1和step7', classLogicOk && visibleSteps.length <= 2 && hiddenByClass.length === 0,
          'computed-visible=' + JSON.stringify(visibleSteps) + ' anomalyHidden=' + JSON.stringify(hiddenByClass) + ' classLogicOk=' + classLogicOk);

        // T7 一键模式预览优化编号显示为2
        const step7 = nav2.querySelector('[data-step="7"]');
        const numEl = step7 ? step7.querySelector('.step-num, .num, span') : null;
        const step7Text = step7 ? (step7.textContent || '').trim() : '';
        record('T7 预览优化步骤编号=2', step7Text.indexOf('2') >= 0, step7Text.replace(/\s+/g, ' ').slice(0, 30));

        // T8 模拟点击提交并一键生成 → 动画后落在screen-7(预览优化)
        // 先回到第一步： navigateTo(1) 已在screen-1
        const submitBtn = d.getElementById('submitBtn');
        record('T8a 提交按钮存在', !!submitBtn);
        if (submitBtn) {
          w.eval('state.needGenerate = true;');
          submitBtn.click();
        }
        setTimeout(() => {
          try {
            const finalActive = d.querySelector('.screen.active');
            const isScreen7 = finalActive && finalActive.id === 'screen-7';
            record('T8b 提交一键生成后落在screen-7(预览优化)', isScreen7, finalActive ? finalActive.id : 'null');
            // T9 步骤条最终态：step7 done/active
            const nav3 = d.getElementById('stepsNav');
            const s7final = nav3.querySelector('[data-step="7"]');
            record('T9 完成后步骤条落在预览优化(done或active)', !!s7final && (s7final.classList.contains('done') || s7final.classList.contains('active')),
              s7final ? s7final.className : 'null');

            // T10 无JS运行错误
            record('T10 无JS运行错误', jsdomErrors.length === 0, jsdomErrors.slice(0, 2).join(' || ').slice(0, 300));

            // ===== 批次31 验收：导出弹窗初始不弹出 =====
            const modal = d.getElementById('exportModal');
            record('T11a 弹窗元素无静态show类', !!modal && !modal.classList.contains('show'), modal ? modal.className : 'null');
            const csModal = w.getComputedStyle(modal);
            record('T11b 弹窗初始不可见(opacity:0)', csModal.opacity === '0' || csModal.opacity === '', 'opacity=' + csModal.opacity);

            // T12 到达 screen-8 点击导出按钮 → 弹窗出现
            w.eval('navigateTo(8)');
            setTimeout(() => {
              try {
                const active8 = d.querySelector('.screen.active');
                record('T12a navigateTo(8)到达screen-8', !!active8 && active8.id === 'screen-8', active8 ? active8.id : 'null');
                const exportBtn = d.getElementById('exportBtn');
                record('T12b screen-8导出按钮存在', !!exportBtn);
                if (exportBtn) exportBtn.click();
                const modalAfter = d.getElementById('exportModal');
                record('T12c 点击导出后弹窗show类加上', modalAfter.classList.contains('show'), modalAfter.className);

                // T13 关闭弹窗 → show类移除
                w.eval('closeExportModal()');
                const modalClosed = d.getElementById('exportModal');
                record('T13 关闭后show类移除', !modalClosed.classList.contains('show'), modalClosed.className);

                // T14 预览页导出按钮同样触发弹窗
                w.eval('navigateTo(7)');
                setTimeout(() => {
                  try {
                    const previewExportBtn = d.getElementById('previewExportBtn');
                    record('T14a 预览页导出按钮存在', !!previewExportBtn);
                    if (previewExportBtn) previewExportBtn.click();
                    const modalReopen = d.getElementById('exportModal');
                    record('T14b 预览页导出按钮触发弹窗show', modalReopen.classList.contains('show'), modalReopen.className);

                    const passed = results.filter(r => r.ok).length;
                    console.log('\n===== ' + passed + '/' + results.length + ' PASS =====');
                    process.exit(passed === results.length ? 0 : 1);
                  } catch (e) { console.error('T14 block error:', e); process.exit(2); }
                }, 150);
              } catch (e) { console.error('T12-13 block error:', e); process.exit(2); }
            }, 150);
          } catch (e) { console.error('T8-10 block error:', e); process.exit(2); }
        }, 8200); // 一键生成动画约8s
      } catch (e) { console.error('T6-7 block error:', e); process.exit(2); }
    }, 150);
  } catch (e) { console.error('T1-5 block error:', e); process.exit(2); }
}, 300);
