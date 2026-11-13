window.__ModuleLoader__.load({
  id: '@einfachllm/dsh-pomodoro-timer',
  factory(require) {
    const React = require('react');
    const reactDom = require('react-dom');
    const h = React.createElement;

    const NS = 'pomodoro';
    const ENTRY_ID = 'pomodoro-timer';
    const ROUTE = '/pomodoro-timer/api';
    const DEFAULT_FOCUS_MS = 25 * 60 * 1000;

    const DICTS = {
      en: {
        pill: { focus: 'Focus', break: 'Break', long: 'Long break', idle: 'Focus' },
        dialog: {
          title: 'Focus timer', start: 'Start', pause: 'Pause', skip: 'Skip phase', reset: 'Reset day',
          rounds: 'Focus rounds today', focusTime: 'Focus time today', sessionTime: 'Session running for',
          nextIsLong: 'Long break after this round', toastFocus: 'Focus complete — break started.', toastBreak: 'Break over — back to focus.',
          goal: 'Daily goal', streak: 'Streak', week: 'Last 7 days',
        },
        settings: {
          durations: { title: 'Pomodoro lengths', desc: 'Minutes for focus, short break, long break, and focus rounds before a long break.', focus: 'Focus', break: 'Break', long: 'Long', rounds: 'Rounds' },
          auto: { title: 'Start phases automatically', desc: 'Continue into the next phase without a click.', all: 'All phases', break: 'Breaks only', off: 'Manually' },
          signal: { title: 'Phase-change signal', desc: 'Short beep and optional desktop notification when a phase completes.', sound: 'Beep', desktop: 'Desktop notification', preview: 'Preview' },
          goal: { title: 'Daily goal', desc: 'Focus rounds you aim to finish each day.', label: 'rounds/day' },
          agent: { title: 'Agent integration', desc: 'Let the model see your focus state and suggest a break when a round ends.', context: 'Focus context', hints: 'Break hint' },
          webhook: { title: 'Webhook', desc: 'POST a JSON event to this URL when a phase completes (optional).', placeholder: 'https://…' },
        },
      },
      de: {
        pill: { focus: 'Fokus', break: 'Pause', long: 'Lange Pause', idle: 'Fokus' },
        dialog: {
          title: 'Fokus-Timer', start: 'Start', pause: 'Pausieren', skip: 'Phase überspringen', reset: 'Tag zurücksetzen',
          rounds: 'Fokusrunden heute', focusTime: 'Fokuszeit heute', sessionTime: 'Sitzung läuft seit',
          nextIsLong: 'Lange Pause nach dieser Runde', toastFocus: 'Fokus beendet — Pause läuft.', toastBreak: 'Pause vorbei — zurück zum Fokus.',
          goal: 'Tagesziel', streak: 'Serie', week: 'Letzte 7 Tage',
        },
        settings: {
          durations: { title: 'Pomodoro-Längen', desc: 'Minuten für Fokus, kurze Pause, lange Pause sowie Fokusrunden vor der langen Pause.', focus: 'Fokus', break: 'Pause', long: 'Lang', rounds: 'Runden' },
          auto: { title: 'Phasen automatisch starten', desc: 'Ohne Klick in die nächste Phase übergehen.', all: 'Alle Phasen', break: 'Nur Pausen', off: 'Manuell' },
          signal: { title: 'Signal bei Phasenwechsel', desc: 'Kurzer Signalton und optionale Desktop-Benachrichtigung, wenn eine Phase endet.', sound: 'Signalton', desktop: 'Desktop-Benachrichtigung', preview: 'Anhören' },
          goal: { title: 'Tagesziel', desc: 'Fokusrunden, die du pro Tag schaffen willst.', label: 'Runden/Tag' },
          agent: { title: 'Agent-Integration', desc: 'Das Modell sieht deinen Fokus-Status und schlägt am Rundenende eine Pause vor.', context: 'Fokus-Kontext', hints: 'Pausen-Hinweis' },
          webhook: { title: 'Webhook', desc: 'POSTet ein JSON-Event an diese URL, wenn eine Phase endet (optional).', placeholder: 'https://…' },
        },
      },
      zh: {
        pill: { focus: '专注', break: '休息', long: '长休息', idle: '专注' },
        dialog: {
          title: '专注计时器', start: '开始', pause: '暂停', skip: '跳过阶段', reset: '重置今日',
          rounds: '今日专注轮数', focusTime: '今日专注时长', sessionTime: '会话已运行',
          nextIsLong: '本轮后进入长休息', toastFocus: '专注完成 — 休息开始。', toastBreak: '休息结束 — 回到专注。',
          goal: '今日目标', streak: '连续天数', week: '近 7 天',
        },
        settings: {
          durations: { title: '番茄钟时长', desc: '专注、短休息、长休息的分钟数，以及长休息前的专注轮数。', focus: '专注', break: '休息', long: '长休息', rounds: '轮数' },
          auto: { title: '自动开始阶段', desc: '无需点击即进入下一阶段。', all: '所有阶段', break: '仅休息', off: '手动' },
          signal: { title: '阶段切换信号', desc: '阶段完成时的提示音与可选桌面通知。', sound: '提示音', desktop: '桌面通知', preview: '试听' },
          goal: { title: '每日目标', desc: '每天期望完成的专注轮数。', label: '轮/天' },
          agent: { title: 'Agent 集成', desc: '让模型感知专注状态，并在专注结束时提示休息。', context: '专注上下文', hints: '结束提示' },
          webhook: { title: 'Webhook', desc: '阶段完成时向该 URL 发送 JSON 事件（可选）。', placeholder: 'https://…' },
        },
      },
    };

    const NOTIFICATION_TEXTS = {
      en: { title: 'Pomodoro', focusDone: 'Focus finished — time for a break.', breakDone: 'Break finished — back to focus.' },
      de: { title: 'Pomodoro', focusDone: 'Fokus beendet — Zeit für die Pause.', breakDone: 'Pause beendet — zurück zum Fokus.' },
      zh: { title: '番茄钟', focusDone: '专注结束 — 该休息了。', breakDone: '休息结束 — 回到专注。' },
    };

    // The DSH locale service resolves FLAT dot-keys (e.g. "dialog.title"), not nested
    // objects. Flatten the readable nested dictionaries before registering them.
    function flattenDict(node, prefix, out) {
      for (const k of Object.keys(node)) {
        const v = node[k];
        const key = prefix ? prefix + '.' + k : k;
        if (v && typeof v === 'object') flattenDict(v, key, out);
        else out[key] = v;
      }
      return out;
    }
    const FLAT_DICTS = Object.fromEntries(Object.entries(DICTS).map(([lang, d]) => [lang, flattenDict(d, '', {})]));

    const DEFAULT_CONFIG = {
      focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, roundsPerLongBreak: 4,
      autoStart: 'all', sound: true, desktopNotifications: false,
      dailyGoal: 8, webhookUrl: '', agentHints: false, agentContext: true,
    };

    let state = {
      phase: 'idle', running: false, endsAt: 0, remainingMs: DEFAULT_FOCUS_MS,
      focusCount: 0, focusMs: 0, day: '', goal: 8, streak: 0, history: [],
      lastCompletion: { id: 0, phase: 'focus', at: 0 },
      config: DEFAULT_CONFIG, now: Date.now(),
    };
    const listeners = new Set();
    let notifyTexts = NOTIFICATION_TEXTS.en;

    function notify() { for (const l of listeners) l(); }

    let audioCtx = null;
    function ensureAudio() {
      try {
        if (audioCtx === null) { const Ctx = window.AudioContext || window.webkitAudioContext; if (Ctx) audioCtx = new Ctx(); }
        if (audioCtx !== null && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      } catch { /* audio unavailable */ }
      return audioCtx;
    }
    function beep() {
      const ctx = ensureAudio();
      if (ctx === null) return;
      try {
        const t0 = ctx.currentTime + 0.02;
        [0, 0.3].forEach((offset, index) => {
          const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = 'sine'; osc.frequency.value = index === 0 ? 880 : 1174.66;
          gain.gain.setValueAtTime(0.0001, t0 + offset);
          gain.gain.exponentialRampToValueAtTime(0.16, t0 + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.24);
          osc.connect(gain); gain.connect(ctx.destination);
          osc.start(t0 + offset); osc.stop(t0 + offset + 0.26);
        });
      } catch { /* silent */ }
    }
    function announce(completedPhase) {
      if (state.config.sound) beep();
      if (state.config.desktopNotifications && typeof window.Notification !== 'undefined' && window.Notification.permission === 'granted') {
        try { new window.Notification(notifyTexts.title, { body: completedPhase === 'focus' ? notifyTexts.focusDone : notifyTexts.breakDone }); } catch { /* silent */ }
      }
    }

    function adopt(next) {
      const prevPhase = state.phase; const prevRemaining = state.remainingMs;
      state = { ...state, ...next, now: Date.now() };
      if (prevRemaining > 1000 && next.phase !== prevPhase && prevPhase !== 'idle') announce(prevPhase);
      notify();
    }
    async function poll() {
      try { const r = await window.fetch(ROUTE, { method: 'GET', cache: 'no-store' }); if (r.ok) adopt(await r.json()); } catch { /* keep last */ }
    }
    async function act(action) {
      try {
        const r = await window.fetch(ROUTE, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action }) });
        if (r.ok) adopt(await r.json());
      } catch { /* unreachable */ }
    }
    const actions = {
      toggleRun() { if (state.config.sound) ensureAudio(); act(state.running ? 'pause' : 'start'); },
      skip() { act('skip'); },
      resetDay() { act('reset'); },
    };
    function subscribe(l) { listeners.add(l); return () => listeners.delete(l); }
    function getSnapshot() { return state; }

    const sessionStarts = new Map();
    function sessionElapsed(id) {
      let s = sessionStarts.get(id);
      if (s === undefined) { s = Date.now(); sessionStarts.set(id, s); }
      return Math.max(0, Date.now() - s);
    }

    function mmss(ms) { const t = Math.ceil(Math.max(0, ms) / 1000); return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); }
    function hms(ms) { const t = Math.floor(Math.max(0, ms) / 1000); const hh = Math.floor(t / 3600); const mm = Math.floor((t % 3600) / 60); const ss = t % 60; return hh > 0 ? hh + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0') : String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0'); }
    function minutesWords(ms) { const t = Math.floor(Math.max(0, ms) / 60000); const hh = Math.floor(t / 60); const mm = t % 60; return hh > 0 ? (mm > 0 ? hh + ' h ' + mm + ' min' : hh + ' h') : mm + ' min'; }

    const CSS = [
      '.pomo-anchor{min-width:0;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));display:inline-flex}',
      '.pomo-pill{box-sizing:border-box;border-radius:var(--dsw-radius-sm);max-width:100%;color:var(--dsw-alias-label-tertiary);font:inherit;font-variant-numeric:tabular-nums;line-height:inherit;white-space:nowrap;background:0 0;border:none;align-items:center;gap:6px;padding:1px 8px;display:inline-flex;cursor:pointer}',
      '.pomo-pill svg{flex:none;width:14px;height:14px}',
      '.pomo-pill[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '@media (hover:hover){.pomo-pill:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}}',
      '.pomo-label{min-width:0;overflow:hidden;text-overflow:ellipsis}',
      '.pomo-phase{color:var(--dsw-alias-label-secondary)}',
      '.pomo-sep{color:var(--dsw-alias-separator-primary);margin:0 2px}',
      '.pomo-panel{z-index:1100;box-sizing:border-box;width:max-content;min-width:min(300px,calc(100vw - 24px));border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-secondary);cursor:default;border:0;padding:16px;font-size:12px;line-height:18px;position:fixed}',
      '.pomo-title{color:var(--dsw-alias-label-primary);justify-content:space-between;gap:16px;margin-bottom:8px;font-weight:500;display:flex}',
      '.pomo-titleLabel{align-items:center;gap:6px;min-width:0;display:inline-flex}',
      '.pomo-titleLabel svg{flex:none;width:14px;height:14px}',
      '.pomo-titleRule{border-top:.5px solid var(--dsw-alias-border-l2);margin-bottom:10px}',
      '.pomo-bigrow{display:flex;align-items:center;gap:14px;margin:2px 0 12px}',
      '.pomo-big{color:var(--dsw-alias-label-primary);font-size:26px;line-height:32px;font-weight:500;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:10px;margin:0}',
      '.pomo-bigLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:20px}',
      '.pomo-mascot{position:relative;flex:none;width:76px;height:76px;display:grid;place-items:center}',
      '.pomo-mascot .pomo-ring{position:absolute;inset:0;width:76px;height:76px}',
      '.pomo-mascot .pomo-art{position:relative;width:56px;height:56px;display:block}',
      '.pomo-mascot .pomo-art svg{width:56px;height:56px;display:block}',
      '@media (prefers-reduced-motion: no-preference){.pomo-ringProg{transition:stroke-dashoffset .6s linear}}',
      '.pomo-details{color:var(--dsw-alias-label-tertiary);grid-template-columns:minmax(120px,auto) minmax(0,1fr);gap:6px 16px;margin:0 0 12px;display:grid}',
      '.pomo-details dt,.pomo-details dd{min-width:0;margin:0}',
      '.pomo-details dd{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;text-align:right}',
      '.pomo-week{display:flex;align-items:flex-end;gap:6px;margin:0 0 12px}',
      '.pomo-weekBar{flex:1;display:flex;flex-direction:column;align-items:center;gap:4px;min-width:0}',
      '.pomo-weekCol{width:100%;border-radius:3px 3px 0 0;background:var(--dsw-alias-brand-primary);min-height:2px}',
      '.pomo-weekCol.met{background:var(--dsw-alias-state-success-primary)}',
      '.pomo-weekLab{color:var(--dsw-alias-label-tertiary);font-size:10px;line-height:12px}',
      '.pomo-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.pomo-btn{font:inherit;font-size:12px;line-height:20px;color:var(--dsw-alias-label-primary);background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:3px 12px;cursor:pointer}',
      '@media (hover:hover){.pomo-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}}',
      '.pomo-btn[disabled]{opacity:.5;cursor:default}',
      '.pomo-note{color:var(--dsw-alias-label-tertiary);margin:0 0 10px}',
      '.pomo-toast{position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:1200;background:var(--dsw-specific-menu);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-lg);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary);font-size:13px;line-height:20px;padding:10px 16px;max-width:calc(100vw - 32px)}',
      '.pomo-srow{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:16px;padding:16px 0;display:flex}',
      '.pomo-srowText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}',
      '.pomo-srowTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}',
      '.pomo-srowDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}',
      '.pomo-srowCtl{align-items:flex-end;gap:12px;flex:none;display:flex;flex-wrap:wrap;justify-content:flex-end}',
      '.pomo-ctl{flex-direction:column;align-items:center;gap:3px;display:flex}',
      '.pomo-ctlLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px}',
      '.pomo-num{width:4.5em;box-sizing:border-box;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:4px 8px;text-align:right}',
      '.pomo-text{width:220px;box-sizing:border-box;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:4px 8px}',
      '.pomo-sel{font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);height:30px;padding:0 8px;cursor:pointer}',
      '.pomo-chk{accent-color:var(--dsw-alias-brand-primary);width:15px;height:15px;cursor:pointer}',
    ].join('');

    // ---- Kawaii tomato with detail tiers ----
    let tomatoSeq = 0;
    function kawaiiDefs(uid) {
      const ids = { body: 'kwB' + uid, leaf: 'kwL' + uid, stem: 'kwS' + uid };
      const defs = h('defs', null, [
        h('radialGradient', { key: 'b', id: ids.body, cx: 0.34, cy: 0.24, r: 0.95 }, [
          h('stop', { key: 0, offset: 0, stopColor: '#ff9c8f' }), h('stop', { key: 1, offset: 0.36, stopColor: '#f2605a' }),
          h('stop', { key: 2, offset: 0.74, stopColor: '#d93a38' }), h('stop', { key: 3, offset: 1, stopColor: '#9c232a' }),
        ]),
        h('linearGradient', { key: 'l', id: ids.leaf, gradientUnits: 'userSpaceOnUse', x1: 20, y1: 10, x2: 44, y2: 24 }, [
          h('stop', { key: 0, offset: 0, stopColor: '#95e07c' }), h('stop', { key: 1, offset: 0.5, stopColor: '#52ad58' }), h('stop', { key: 2, offset: 1, stopColor: '#2a6c3b' }),
        ]),
        h('linearGradient', { key: 's', id: ids.stem, x1: 0, y1: 0, x2: 1, y2: 1 }, [
          h('stop', { key: 0, offset: 0, stopColor: '#78c963' }), h('stop', { key: 1, offset: 1, stopColor: '#2c6f3c' }),
        ]),
      ]);
      return { ids, defs };
    }
    function kawaiiBody(ids) {
      return [
        h('ellipse', { key: 'body', cx: 32, cy: 39, rx: 22, ry: 20.6, fill: `url(#${ids.body})` }),
        h('ellipse', { key: 'hi', cx: 22.8, cy: 29.4, rx: 7.6, ry: 4.6, fill: '#fff', opacity: 0.26, transform: 'rotate(-32 22.8 29.4)' }),
        h('ellipse', { key: 'hi2', cx: 19.8, cy: 27.4, rx: 2, ry: 1.3, fill: '#fff', opacity: 0.6, transform: 'rotate(-32 19.8 27.4)' }),
        h('g', { key: 'leaf' }, [
          h('path', { key: 0, d: 'M32 21c-4.2 1.4-8 4-10.4 7.7 3.7.7 7.3-.4 9.8-2.8z', fill: `url(#${ids.leaf})` }),
          h('path', { key: 1, d: 'M32 21c4.2 1.4 8 4 10.4 7.7-3.7.7-7.3-.4-9.8-2.8z', fill: `url(#${ids.leaf})` }),
          h('path', { key: 2, d: 'M32 20.8c-2.2-1.6-4.2-3.7-5.7-6.2 3 .3 5.3 1.4 6.9 3.1z', fill: `url(#${ids.leaf})` }),
          h('path', { key: 3, d: 'M32 20.8c2.2-1.6 4.2-3.7 5.7-6.2-3 .3-5.3 1.4-6.9 3.1z', fill: `url(#${ids.leaf})` }),
          h('path', { key: 4, d: 'M31 21c-.8-3.2-.2-6.7 1-9.4', fill: 'none', stroke: `url(#${ids.stem})`, strokeWidth: 2.8, strokeLinecap: 'round' }),
        ]),
      ];
    }
    function kawaiiFace(mood) {
      const happy = mood === 'break' || mood === 'long';
      const eyes = happy
        ? [h('path', { key: 'e0', d: 'M20.6 38.6c1.6-2.6 6-2.6 7.6 0', fill: 'none', stroke: '#332a2b', strokeWidth: 2.2, strokeLinecap: 'round' }),
           h('path', { key: 'e1', d: 'M35.8 38.6c1.6-2.6 6-2.6 7.6 0', fill: 'none', stroke: '#332a2b', strokeWidth: 2.2, strokeLinecap: 'round' })]
        : [h('ellipse', { key: 'w0', cx: 24.4, cy: 38.6, rx: 4.4, ry: 4.8, fill: '#fff' }), h('ellipse', { key: 'w1', cx: 39.6, cy: 38.6, rx: 4.4, ry: 4.8, fill: '#fff' }),
           h('circle', { key: 'p0', cx: 25.4, cy: 39.4, r: 2.3, fill: '#332a2b' }), h('circle', { key: 'p1', cx: 40.6, cy: 39.4, r: 2.3, fill: '#332a2b' }),
           h('circle', { key: 'g0', cx: 24.6, cy: 38.4, r: 0.8, fill: '#fff' }), h('circle', { key: 'g1', cx: 39.8, cy: 38.4, r: 0.8, fill: '#fff' })];
      return h('g', { key: 'face' }, [
        ...eyes,
        h('ellipse', { key: 'b0', cx: 19.4, cy: 45.2, rx: 3.2, ry: 2, fill: '#ff8f8f', opacity: happy ? 0.8 : 0.6 }),
        h('ellipse', { key: 'b1', cx: 44.6, cy: 45.2, rx: 3.2, ry: 2, fill: '#ff8f8f', opacity: happy ? 0.8 : 0.6 }),
        happy ? h('path', { key: 'm', d: 'M27.6 44.2c2.2 4 6.6 4 8.8 0', fill: 'none', stroke: '#7d1d26', strokeWidth: 2.2, strokeLinecap: 'round' })
              : h('path', { key: 'm', d: 'M28.4 44.6c1.8 3 5.4 3 7.2 0', fill: 'none', stroke: '#7d1d26', strokeWidth: 2, strokeLinecap: 'round' }),
      ]);
    }
    function TomatoIcon({ size = 14, mood = 'focus' }) {
      const rawId = React.useId ? React.useId() : 't' + (++tomatoSeq);
      const uid = String(rawId).replace(/[^a-zA-Z0-9]/g, '');
      const { ids, defs } = kawaiiDefs(uid);
      return h('svg', { viewBox: '0 0 64 64', width: size, height: size, 'aria-hidden': true }, [defs, ...kawaiiBody(ids), size >= 24 ? kawaiiFace(mood) : null]);
    }
    const PHASE_RING = { focus: '#d93a38', break: '#52ad58', long: '#f08c00', idle: '#d93a38' };
    function Mascot({ phase, remainingMs, config }) {
      const minutes = phase === 'focus' ? config.focusMinutes : phase === 'long' ? config.longBreakMinutes : config.breakMinutes;
      const duration = minutes * 60000;
      const frac = phase === 'idle' || duration <= 0 ? 0 : Math.min(1, Math.max(0, 1 - remainingMs / duration));
      const R = 33; const C = 2 * Math.PI * R;
      const color = PHASE_RING[phase] || PHASE_RING.focus;
      return h('span', { className: 'pomo-mascot', 'aria-hidden': true }, [
        h('svg', { key: 'ring', className: 'pomo-ring', viewBox: '0 0 76 76' }, [
          h('circle', { key: 'track', cx: 38, cy: 38, r: R, fill: 'none', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 4 }),
          h('circle', { key: 'prog', className: 'pomo-ringProg', cx: 38, cy: 38, r: R, fill: 'none', stroke: color, strokeWidth: 4, strokeLinecap: 'round', strokeDasharray: C, strokeDashoffset: C * (1 - frac), transform: 'rotate(-90 38 38)' }),
        ]),
        h('span', { key: 'art', className: 'pomo-art' }, h(TomatoIcon, { size: 56, mood: phase })),
      ]);
    }

    const MEASURE_STYLE = { visibility: 'hidden', left: 0, top: 0 };
    function useAnchoredPanel(open) {
      const rootRef = React.useRef(null); const panelRef = React.useRef(null);
      const [pos, setPos] = React.useState(null);
      React.useEffect(() => {
        if (!open) { setPos(null); return undefined; }
        const measure = () => {
          const a = rootRef.current; const p = panelRef.current;
          if (!a || !p) return;
          const r = a.getBoundingClientRect(); const w = p.offsetWidth; const hh = p.offsetHeight;
          const m = 12; const g = 8;
          let top = r.top - g - hh;
          if (top < m) top = Math.min(r.bottom + g, window.innerHeight - m - hh);
          top = Math.max(m, top);
          let left = r.right - w;
          left = Math.max(m, Math.min(left, window.innerWidth - m - w));
          setPos({ top: Math.round(top), left: Math.round(left) });
        };
        measure();
        window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true);
        return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
      }, [open]);
      return { rootRef, panelRef, pos };
    }

    function phaseLabelKey(p) { return p === 'focus' ? 'pill.focus' : p === 'long' ? 'pill.long' : p === 'break' ? 'pill.break' : 'pill.idle'; }
    function dayLabel(day) { try { return new Date(day + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'narrow' }); } catch { return ''; } }

    const PomodoroPill = React.memo(function PomodoroPill({ sessionId, t }) {
      const s = React.useSyncExternalStore(subscribe, getSnapshot);
      const [open, setOpen] = React.useState(false);
      const [toast, setToast] = React.useState(null);
      const lastCompletionRef = React.useRef(null);
      const toastTimer = React.useRef(0);
      const { rootRef, panelRef, pos } = useAnchoredPanel(open);

      const remainingMs = s.running ? Math.max(0, s.endsAt - s.now) : s.remainingMs;
      const labelKey = phaseLabelKey(s.phase);
      const sessionMs = sessionId !== undefined ? sessionElapsed(sessionId) : 0;

      React.useEffect(() => {
        const lc = s.lastCompletion || { id: 0 };
        if (lastCompletionRef.current === null) { lastCompletionRef.current = lc.id; return undefined; }
        if (lc.id !== lastCompletionRef.current) {
          lastCompletionRef.current = lc.id;
          if (lc.id > 0) {
            setToast({ id: lc.id, phase: lc.phase });
            clearTimeout(toastTimer.current);
            toastTimer.current = setTimeout(() => setToast(null), 6000);
          }
        }
        return undefined;
      }, [s.lastCompletion]);
      React.useEffect(() => () => clearTimeout(toastTimer.current), []);

      React.useEffect(() => {
        if (!open) return undefined;
        const prev = document.activeElement;
        const raf = requestAnimationFrame(() => { const b = panelRef.current && panelRef.current.querySelector('button'); if (b) b.focus(); });
        const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        const onClick = (e) => {
          const r = rootRef.current; const p = panelRef.current;
          if (r && r.contains(e.target)) return;
          if (p && p.contains(e.target)) return;
          setOpen(false);
        };
        document.addEventListener('keydown', onKey); document.addEventListener('click', onClick, true);
        return () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', onKey); document.removeEventListener('click', onClick, true); if (prev && prev.focus) prev.focus(); };
      }, [open, rootRef, panelRef]);

      const reading = t(labelKey) + ' ' + mmss(remainingMs);

      const week = [...(s.history || []), { day: s.day, focusCount: s.focusCount, focusMs: s.focusMs }].slice(-7);
      const maxCount = Math.max(1, s.goal || 1, ...week.map((d) => d.focusCount));

      const panel = h('div', { ref: panelRef, className: 'pomo-panel', role: 'dialog', 'aria-modal': true, 'aria-label': t('dialog.title'), style: pos ?? MEASURE_STYLE }, [
        h('div', { key: 'title', className: 'pomo-title' }, [h('span', { key: 'l', className: 'pomo-titleLabel' }, [h(TomatoIcon, { key: 'i' }), t('dialog.title')])]),
        h('div', { key: 'rule', className: 'pomo-titleRule', 'aria-hidden': true }),
        h('div', { key: 'bigrow', className: 'pomo-bigrow' }, [
          h(Mascot, { key: 'm', phase: s.phase, remainingMs, config: s.config }),
          h('div', { key: 'big', className: 'pomo-big' }, [h('span', { key: 'time' }, mmss(remainingMs)), h('span', { key: 'phase', className: 'pomo-bigLabel' }, t(labelKey))]),
        ]),
        h('dl', { key: 'details', className: 'pomo-details' }, [
          h('dt', { key: 'r' }, t('dialog.rounds')), h('dd', { key: 'rv' }, String(s.focusCount)),
          h('dt', { key: 'g' }, t('dialog.goal')), h('dd', { key: 'gv' }, s.focusCount + '/' + (s.goal || 0)),
          h('dt', { key: 'st' }, t('dialog.streak')), h('dd', { key: 'stv' }, String(s.streak || 0)),
          h('dt', { key: 'f' }, t('dialog.focusTime')), h('dd', { key: 'fv' }, minutesWords(s.focusMs)),
          h('dt', { key: 'se' }, t('dialog.sessionTime')), h('dd', { key: 'sev' }, hms(sessionMs)),
        ]),
        h('div', { key: 'week', className: 'pomo-week', role: 'img', 'aria-label': t('dialog.week') }, week.map((d) =>
          h('div', { key: d.day, className: 'pomo-weekBar', title: d.day + ': ' + d.focusCount }, [
            h('div', { key: 'c', className: 'pomo-weekCol' + (d.focusCount >= (s.goal || 1) ? ' met' : ''), style: { height: Math.max(2, Math.round(40 * d.focusCount / maxCount)) + 'px' } }),
            h('span', { key: 'l', className: 'pomo-weekLab' }, dayLabel(d.day)),
          ]))),
        s.phase === 'focus' && s.focusCount > 0 && s.focusCount % s.config.roundsPerLongBreak === s.config.roundsPerLongBreak - 1
          ? h('p', { key: 'note', className: 'pomo-note' }, t('dialog.nextIsLong')) : null,
        h('div', { key: 'actions', className: 'pomo-actions' }, [
          h('button', { key: 'run', type: 'button', className: 'pomo-btn', onClick: actions.toggleRun }, s.running ? t('dialog.pause') : t('dialog.start')),
          h('button', { key: 'skip', type: 'button', className: 'pomo-btn', disabled: s.phase === 'idle', onClick: actions.skip }, t('dialog.skip')),
          h('button', { key: 'reset', type: 'button', className: 'pomo-btn', onClick: actions.resetDay }, t('dialog.reset')),
        ]),
      ]);
      const dialog = open ? reactDom.createPortal(panel, document.body) : null;
      const toastEl = toast ? reactDom.createPortal(h('div', { className: 'pomo-toast', role: 'status', 'aria-live': 'polite' }, t(toast.phase === 'focus' ? 'dialog.toastFocus' : 'dialog.toastBreak')), document.body) : null;

      return h(React.Fragment, null, [
        h('style', { key: 'css' }, CSS),
        h('span', { key: 'anchor', ref: rootRef, className: 'pomo-anchor', 'data-composer-pomodoro': 'pomodoro' }, [
          h('button', { key: 'pill', type: 'button', className: 'pomo-pill', 'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-label': reading + ' — ' + t('dialog.title'), onClick: () => setOpen(!open) }, [
            h(TomatoIcon, { key: 'i' }),
            h('span', { key: 'l', className: 'pomo-label' }, [h('span', { key: 'p', className: 'pomo-phase' }, reading)]),
            h('span', { key: 's', className: 'pomo-sep', 'aria-hidden': true }, '·'),
            h('span', { key: 'se', className: 'pomo-label' }, hms(sessionMs)),
          ]),
        ]),
        dialog,
        toastEl,
      ]);
    });

    // ---- Settings rows ----
    function NumberField({ value, min, max, label, onCommit }) {
      const [text, setText] = React.useState(String(value));
      React.useEffect(() => { setText(String(value)); }, [value]);
      const commit = () => { const n = Math.round(Number(text)); onCommit(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value); };
      return h('label', { className: 'pomo-ctl' }, [
        h('span', { key: 'l', className: 'pomo-ctlLabel' }, label),
        h('input', { key: 'i', type: 'number', className: 'pomo-num', min, max, value: text, onChange: (e) => setText(e.target.value), onBlur: commit, onKeyDown: (e) => { if (e.key === 'Enter') e.target.blur(); } }),
      ]);
    }
    function CheckField({ checked, label, onCommit }) {
      return h('label', { className: 'pomo-ctl' }, [
        h('input', { key: 'i', type: 'checkbox', className: 'pomo-chk', checked, onChange: (e) => onCommit(e.target.checked) }),
        h('span', { key: 'l', className: 'pomo-ctlLabel' }, label),
      ]);
    }
    function TextField({ value, placeholder, onCommit }) {
      const [text, setText] = React.useState(value || '');
      React.useEffect(() => { setText(value || ''); }, [value]);
      return h('input', { type: 'url', className: 'pomo-text', value: text, placeholder, onChange: (e) => setText(e.target.value), onBlur: () => onCommit(text.trim()), onKeyDown: (e) => { if (e.key === 'Enter') e.target.blur(); } });
    }
    function SettingsRow({ t, sectionKey, children }) {
      return h(React.Fragment, null, [
        h('style', { key: 'css' }, CSS),
        h('div', { key: 'row', className: 'pomo-srow' }, [
          h('div', { key: 't', className: 'pomo-srowText' }, [h('div', { key: 'ti', className: 'pomo-srowTitle' }, t(sectionKey + '.title')), h('div', { key: 'de', className: 'pomo-srowDesc' }, t(sectionKey + '.desc'))]),
          h('div', { key: 'c', className: 'pomo-srowCtl' }, children),
        ]),
      ]);
    }
    function DurationsRow(p) {
      const v = p.usePomodoro((x) => x) ?? {};
      return h(SettingsRow, { t: p.t, sectionKey: 'settings.durations' }, [
        h(NumberField, { key: 'f', value: Math.round(Number(v.focusMinutes)) || 25, min: 1, max: 120, label: p.t('settings.durations.focus'), onCommit: p.setFocusMinutes }),
        h(NumberField, { key: 'b', value: Math.round(Number(v.breakMinutes)) || 5, min: 1, max: 60, label: p.t('settings.durations.break'), onCommit: p.setBreakMinutes }),
        h(NumberField, { key: 'l', value: Math.round(Number(v.longBreakMinutes)) || 15, min: 5, max: 60, label: p.t('settings.durations.long'), onCommit: p.setLongBreakMinutes }),
        h(NumberField, { key: 'r', value: Math.round(Number(v.roundsPerLongBreak)) || 4, min: 2, max: 12, label: p.t('settings.durations.rounds'), onCommit: p.setRoundsPerLongBreak }),
      ]);
    }
    function AutoStartRow(p) {
      const v = p.usePomodoro((x) => x) ?? {};
      const cur = ['all', 'break', 'off'].includes(v.autoStart) ? v.autoStart : 'all';
      return h(SettingsRow, { t: p.t, sectionKey: 'settings.auto' }, [
        h('select', { key: 's', className: 'pomo-sel', value: cur, onChange: (e) => p.setAutoStart(e.target.value) }, ['all', 'break', 'off'].map((m) => h('option', { key: m, value: m }, p.t('settings.auto.' + m)))),
      ]);
    }
    function SignalRow(p) {
      const v = p.usePomodoro((x) => x) ?? {};
      return h(SettingsRow, { t: p.t, sectionKey: 'settings.signal' }, [
        h(CheckField, { key: 's', checked: v.sound !== false, label: p.t('settings.signal.sound'), onCommit: p.setSound }),
        h(CheckField, { key: 'd', checked: v.desktopNotifications === true, label: p.t('settings.signal.desktop'), onCommit: p.setDesktopNotifications }),
        h('button', { key: 'p', type: 'button', className: 'pomo-btn', onClick: () => beep() }, p.t('settings.signal.preview')),
      ]);
    }
    function GoalRow(p) {
      const v = p.usePomodoro((x) => x) ?? {};
      return h(SettingsRow, { t: p.t, sectionKey: 'settings.goal' }, [
        h(NumberField, { key: 'g', value: Math.round(Number(v.dailyGoal)) || 8, min: 1, max: 24, label: p.t('settings.goal.label'), onCommit: p.setDailyGoal }),
      ]);
    }
    function AgentRow(p) {
      const v = p.usePomodoro((x) => x) ?? {};
      return h(SettingsRow, { t: p.t, sectionKey: 'settings.agent' }, [
        h(CheckField, { key: 'c', checked: v.agentContext !== false, label: p.t('settings.agent.context'), onCommit: p.setAgentContext }),
        h(CheckField, { key: 'h', checked: v.agentHints === true, label: p.t('settings.agent.hints'), onCommit: p.setAgentHints }),
      ]);
    }
    function WebhookRow(p) {
      const v = p.usePomodoro((x) => x) ?? {};
      return h(SettingsRow, { t: p.t, sectionKey: 'settings.webhook' }, [
        h(TextField, { key: 'w', value: v.webhookUrl, placeholder: p.t('settings.webhook.placeholder'), onCommit: p.setWebhookUrl }),
      ]);
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, FLAT_DICTS));
        try {
          const snap = ctx.locale.getSnapshot();
          const id = String((snap && (snap.locale || snap.id || snap.current)) || '');
          notifyTexts = NOTIFICATION_TEXTS[id.startsWith('de') ? 'de' : id.startsWith('zh') ? 'zh' : 'en'];
        } catch { notifyTexts = NOTIFICATION_TEXTS.en; }

        ctx.effect(() => {
          const id = window.setInterval(() => { state = { ...state, now: Date.now() }; notify(); poll(); }, 1000);
          poll();
          return () => window.clearInterval(id);
        });

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock', id: 'pomodoro', order: 2, locale: NS,
          inject: (sessionId) => ({ sessionId }),
        }, PomodoroPill));

        const form = ctx.configForms.get(ENTRY_ID);
        const setField = (f, v) => { form.set(f, v).catch(() => {}); };
        const setDesktopNotifications = (on) => {
          setField('desktopNotifications', on);
          if (on && typeof window.Notification !== 'undefined' && window.Notification.permission === 'default') window.Notification.requestPermission().catch(() => {});
        };
        ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => {
          const face = { getSnapshot: () => form.getSnapshot().value ?? {}, subscribe: (l) => form.subscribe(l) };
          const reg = (id, order, inject, Comp) => ctx.slots.inject('settings.general.item', () => ctx.slots.register({ name: 'settings.general.item', id, order, locale: NS, inject }, Comp));
          const ds = [
            reg('pomodoro-durations', 40, () => ({ hooks: { pomodoro: face }, setFocusMinutes: (v) => setField('focusMinutes', v), setBreakMinutes: (v) => setField('breakMinutes', v), setLongBreakMinutes: (v) => setField('longBreakMinutes', v), setRoundsPerLongBreak: (v) => setField('roundsPerLongBreak', v) }), DurationsRow),
            reg('pomodoro-auto-start', 41, () => ({ hooks: { pomodoro: face }, setAutoStart: (v) => setField('autoStart', v) }), AutoStartRow),
            reg('pomodoro-signal', 42, () => ({ hooks: { pomodoro: face }, setSound: (v) => setField('sound', v), setDesktopNotifications }), SignalRow),
            reg('pomodoro-goal', 43, () => ({ hooks: { pomodoro: face }, setDailyGoal: (v) => setField('dailyGoal', v) }), GoalRow),
            reg('pomodoro-agent', 44, () => ({ hooks: { pomodoro: face }, setAgentContext: (v) => setField('agentContext', v), setAgentHints: (v) => setField('agentHints', v) }), AgentRow),
            reg('pomodoro-webhook', 45, () => ({ hooks: { pomodoro: face }, setWebhookUrl: (v) => setField('webhookUrl', v) }), WebhookRow),
          ];
          return () => { for (const d of ds) d(); };
        }));
      },
    };
  },
});
