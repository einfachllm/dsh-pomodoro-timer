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
          title: 'Focus timer',
          start: 'Start',
          pause: 'Pause',
          skip: 'Skip phase',
          reset: 'Reset day',
          rounds: 'Focus rounds today',
          focusTime: 'Focus time today',
          sessionTime: 'Session running for',
          nextIsLong: 'Long break after this round',
        },
        settings: {
          durations: {
            title: 'Pomodoro lengths',
            desc: 'Minutes for focus, short break, long break, and focus rounds before a long break.',
            focus: 'Focus', break: 'Break', long: 'Long', rounds: 'Rounds',
          },
          auto: {
            title: 'Start phases automatically',
            desc: 'Continue into the next phase without a click.',
            all: 'All phases', break: 'Breaks only', off: 'Manually',
          },
          signal: {
            title: 'Phase-change signal',
            desc: 'Short beep and optional desktop notification when a phase completes.',
            sound: 'Beep', desktop: 'Desktop notification',
          },
        },
      },
      de: {
        pill: { focus: 'Fokus', break: 'Pause', long: 'Lange Pause', idle: 'Fokus' },
        dialog: {
          title: 'Fokus-Timer',
          start: 'Start',
          pause: 'Pausieren',
          skip: 'Phase überspringen',
          reset: 'Tag zurücksetzen',
          rounds: 'Fokusrunden heute',
          focusTime: 'Fokuszeit heute',
          sessionTime: 'Sitzung läuft seit',
          nextIsLong: 'Lange Pause nach dieser Runde',
        },
        settings: {
          durations: {
            title: 'Pomodoro-Längen',
            desc: 'Minuten für Fokus, kurze Pause, lange Pause sowie Fokusrunden vor der langen Pause.',
            focus: 'Fokus', break: 'Pause', long: 'Lang', rounds: 'Runden',
          },
          auto: {
            title: 'Phasen automatisch starten',
            desc: 'Ohne Klick in die nächste Phase übergehen.',
            all: 'Alle Phasen', break: 'Nur Pausen', off: 'Manuell',
          },
          signal: {
            title: 'Signal bei Phasenwechsel',
            desc: 'Kurzer Signalton und optionale Desktop-Benachrichtigung, wenn eine Phase endet.',
            sound: 'Signalton', desktop: 'Desktop-Benachrichtigung',
          },
        },
      },
    };

    const NOTIFICATION_TEXTS = {
      en: {
        title: 'Pomodoro',
        focusDone: 'Focus finished — time for a break.',
        breakDone: 'Break finished — back to focus.',
      },
      de: {
        title: 'Pomodoro',
        focusDone: 'Fokus beendet — Zeit für die Pause.',
        breakDone: 'Pause beendet — zurück zum Fokus.',
      },
    };

    // ---- Polled remote state: the Host owns the state machine; the page renders it ----

    const DEFAULT_CONFIG = {
      focusMinutes: 25, breakMinutes: 5, longBreakMinutes: 15, roundsPerLongBreak: 4,
      autoStart: 'all', sound: true, desktopNotifications: false,
    };

    let state = {
      phase: 'idle',
      running: false,
      endsAt: 0,
      remainingMs: DEFAULT_FOCUS_MS,
      focusCount: 0,
      focusMs: 0,
      day: '',
      config: DEFAULT_CONFIG,
      now: Date.now(),
    };
    const listeners = new Set();
    let notifyTexts = NOTIFICATION_TEXTS.en;

    function notify() {
      for (const listener of listeners) listener();
    }

    // ---- Phase-change signal: beep and optional desktop notification ----

    let audioCtx = null;
    function ensureAudio() {
      try {
        if (audioCtx === null) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (Ctx) audioCtx = new Ctx();
        }
        if (audioCtx !== null && audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      } catch {
        /* audio unavailable */
      }
      return audioCtx;
    }

    function beep() {
      const ctx = ensureAudio();
      if (ctx === null) return;
      try {
        const t0 = ctx.currentTime + 0.02;
        [0, 0.3].forEach((offset, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.value = index === 0 ? 880 : 1174.66;
          gain.gain.setValueAtTime(0.0001, t0 + offset);
          gain.gain.exponentialRampToValueAtTime(0.16, t0 + offset + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + offset + 0.24);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(t0 + offset);
          osc.stop(t0 + offset + 0.26);
        });
      } catch {
        /* audio errors stay silent */
      }
    }

    function announce(completedPhase) {
      if (state.config.sound) beep();
      if (state.config.desktopNotifications && typeof window.Notification !== 'undefined' && window.Notification.permission === 'granted') {
        try {
          new window.Notification(notifyTexts.title, {
            body: completedPhase === 'focus' ? notifyTexts.focusDone : notifyTexts.breakDone,
          });
        } catch {
          /* notification errors stay silent */
        }
      }
    }

    function adopt(next) {
      const prevPhase = state.phase;
      const prevRemaining = state.remainingMs;
      state = { ...next, now: Date.now() };
      // A phase with time left that changed is a natural completion: signal it.
      if (prevRemaining > 1000 && next.phase !== prevPhase && prevPhase !== 'idle') {
        announce(prevPhase);
      }
      notify();
    }

    async function poll() {
      try {
        const response = await window.fetch(ROUTE, { method: 'GET', cache: 'no-store' });
        if (!response.ok) return;
        adopt(await response.json());
      } catch {
        /* Host unreachable: keep the last known state */
      }
    }

    async function act(action) {
      try {
        const response = await window.fetch(ROUTE, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        if (!response.ok) return;
        adopt(await response.json());
      } catch {
        /* Host unreachable */
      }
    }

    const actions = {
      toggleRun() {
        if (state.config.sound) ensureAudio();
        act(state.running ? 'pause' : 'start');
      },
      skip() {
        act('skip');
      },
      resetDay() {
        act('reset');
      },
    };

    function subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    }

    function getSnapshot() {
      return state;
    }

    // Per-session first-seen map: measures how long each open session has been running.
    const sessionStarts = new Map();
    function sessionElapsed(sessionId) {
      let start = sessionStarts.get(sessionId);
      if (start === undefined) {
        start = Date.now();
        sessionStarts.set(sessionId, start);
      }
      return Math.max(0, Date.now() - start);
    }

    // ---- Formatting ----

    function mmss(ms) {
      const total = Math.ceil(Math.max(0, ms) / 1000);
      return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
    }

    function hms(ms) {
      const total = Math.floor(Math.max(0, ms) / 1000);
      const hh = Math.floor(total / 3600);
      const mm = Math.floor((total % 3600) / 60);
      const ss = total % 60;
      return hh > 0
        ? hh + ':' + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0')
        : String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
    }

    function minutesWords(ms) {
      const total = Math.floor(Math.max(0, ms) / 60000);
      const hh = Math.floor(total / 60);
      const mm = total % 60;
      if (hh > 0) return mm > 0 ? hh + ' h ' + mm + ' min' : hh + ' h';
      return mm + ' min';
    }

    // ---- Styles: host pill/dialog patterns plus settings rows; renamed classes, token references only ----

    const CSS = [
      '.pomo-anchor{min-width:0;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));display:inline-flex}',
      '.pomo-pill{box-sizing:border-box;border-radius:var(--dsw-radius-sm);max-width:100%;color:var(--dsw-alias-label-tertiary);font:inherit;font-variant-numeric:tabular-nums;line-height:inherit;white-space:nowrap;background:0 0;border:none;align-items:center;gap:6px;padding:1px 8px;display:inline-flex;cursor:pointer}',
      '.pomo-pill svg{flex:none;width:14px;height:14px}',
      '.pomo-pill[aria-expanded=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}',
      '@media (hover:hover){.pomo-pill:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}}',
      '.pomo-label{min-width:0;overflow:hidden;text-overflow:ellipsis}',
      '.pomo-phase{color:var(--dsw-alias-label-secondary)}',
      '.pomo-sep{color:var(--dsw-alias-separator-primary);margin:0 2px}',
      '.pomo-panel{z-index:1100;box-sizing:border-box;width:max-content;min-width:min(280px,calc(100vw - 24px));border-radius:var(--dsw-radius-lg);background:var(--dsw-specific-menu);backdrop-filter:var(--dsw-menu-backdrop-filter);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-secondary);cursor:default;border:0;padding:16px;font-size:12px;line-height:18px;position:fixed}',
      '.pomo-title{color:var(--dsw-alias-label-primary);justify-content:space-between;gap:16px;margin-bottom:8px;font-weight:500;display:flex}',
      '.pomo-titleLabel{align-items:center;gap:6px;min-width:0;display:inline-flex}',
      '.pomo-titleLabel svg{flex:none;width:14px;height:14px}',
      '.pomo-titleRule{border-top:.5px solid var(--dsw-alias-border-l2);margin-bottom:10px}',
      '.pomo-big{color:var(--dsw-alias-label-primary);font-size:26px;line-height:32px;font-weight:500;font-variant-numeric:tabular-nums;display:flex;align-items:baseline;gap:10px;margin:2px 0 10px}',
      '.pomo-bigLabel{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:20px}',
      '.pomo-details{color:var(--dsw-alias-label-tertiary);grid-template-columns:minmax(120px,auto) minmax(0,1fr);gap:6px 16px;margin:0 0 12px;display:grid}',
      '.pomo-details dt,.pomo-details dd{min-width:0;margin:0}',
      '.pomo-details dd{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;text-align:right}',
      '.pomo-actions{display:flex;gap:8px;flex-wrap:wrap}',
      '.pomo-btn{font:inherit;font-size:12px;line-height:20px;color:var(--dsw-alias-label-primary);background:0 0;border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:3px 12px;cursor:pointer}',
      '@media (hover:hover){.pomo-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}}',
      '.pomo-btn[disabled]{opacity:.5;cursor:default}',
      '.pomo-note{color:var(--dsw-alias-label-tertiary);margin:0 0 10px}',
      // Settings rows in the General section (host row pattern, renamed classes).
      '.pomo-srow{border-bottom:.5px solid var(--dsw-alias-border-l2);align-items:center;gap:16px;padding:16px 0;display:flex}',
      '.pomo-srowText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}',
      '.pomo-srowTitle{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}',
      '.pomo-srowDesc{color:var(--dsw-alias-label-tertiary);font-size:12px;font-weight:400;line-height:18px}',
      '.pomo-srowCtl{align-items:flex-end;gap:12px;flex:none;display:flex;flex-wrap:wrap;justify-content:flex-end}',
      '.pomo-ctl{flex-direction:column;align-items:center;gap:3px;display:flex}',
      '.pomo-ctlLabel{color:var(--dsw-alias-label-tertiary);font-size:11px;line-height:14px}',
      '.pomo-num{width:4.5em;box-sizing:border-box;font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);padding:4px 8px;text-align:right}',
      '.pomo-sel{font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1);border:1px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);height:30px;padding:0 8px;cursor:pointer}',
      '.pomo-chk{accent-color:var(--dsw-alias-brand-primary);width:15px;height:15px;cursor:pointer}',
    ].join('');

    // ---- Artwork ----

    function TomatoIcon() {
      return h('svg', { viewBox: '0 0 16 16', 'aria-hidden': true }, [
        h('circle', { key: 'body', cx: 8, cy: 9.6, r: 5.4, fill: '#d94a4a' }),
        h('path', { key: 'collar', d: 'M2.2 5.2c3.6-3.1 8-3.1 11.6 0-1.9 1.1-4 1.7-5.8 1.7S4.1 6.3 2.2 5.2z', fill: '#4aa254' }),
        h('path', { key: 'stem', d: 'M8 2.2c-.8 1.1-1.2 2.1-1.1 3.1.7.5 1.5.5 2.2 0 .1-1-.3-2-1.1-3.1z', fill: '#3f8f4f' }),
      ]);
    }

    // ---- Anchored panel placement (measure pass, then viewport-clamped fixed position) ----

    const MEASURE_STYLE = { visibility: 'hidden', left: 0, top: 0 };

    function useAnchoredPanel(open) {
      const rootRef = React.useRef(null);
      const panelRef = React.useRef(null);
      const [pos, setPos] = React.useState(null);
      React.useEffect(() => {
        if (!open) {
          setPos(null);
          return undefined;
        }
        const measure = () => {
          const anchor = rootRef.current;
          const panel = panelRef.current;
          if (!anchor || !panel) return;
          const rect = anchor.getBoundingClientRect();
          const width = panel.offsetWidth;
          const height = panel.offsetHeight;
          const margin = 12;
          const gap = 8;
          let top = rect.top - gap - height;
          if (top < margin) top = Math.min(rect.bottom + gap, window.innerHeight - margin - height);
          top = Math.max(margin, top);
          let left = rect.right - width;
          left = Math.max(margin, Math.min(left, window.innerWidth - margin - width));
          setPos({ top: Math.round(top), left: Math.round(left) });
        };
        measure();
        window.addEventListener('resize', measure);
        window.addEventListener('scroll', measure, true);
        return () => {
          window.removeEventListener('resize', measure);
          window.removeEventListener('scroll', measure, true);
        };
      }, [open]);
      return { rootRef, panelRef, pos };
    }

    // ---- Components ----

    function phaseLabelKey(phase) {
      if (phase === 'focus') return 'pill.focus';
      if (phase === 'long') return 'pill.long';
      if (phase === 'break') return 'pill.break';
      return 'pill.idle';
    }

    const PomodoroPill = React.memo(function PomodoroPill({ sessionId, t }) {
      const s = React.useSyncExternalStore(subscribe, getSnapshot);
      const [open, setOpen] = React.useState(false);
      const { rootRef, panelRef, pos } = useAnchoredPanel(open);

      const remainingMs = s.running ? Math.max(0, s.endsAt - s.now) : s.remainingMs;
      const labelKey = phaseLabelKey(s.phase);
      const sessionMs = sessionId !== undefined ? sessionElapsed(sessionId) : 0;

      React.useEffect(() => {
        if (!open) return undefined;
        const onKey = (event) => {
          if (event.key === 'Escape') setOpen(false);
        };
        const onClick = (event) => {
          const root = rootRef.current;
          const panel = panelRef.current;
          if (root && root.contains(event.target)) return;
          if (panel && panel.contains(event.target)) return;
          setOpen(false);
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('click', onClick, true);
        return () => {
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('click', onClick, true);
        };
      }, [open, rootRef, panelRef]);

      const reading = t(labelKey) + ' ' + mmss(remainingMs);

      const panel = h('div', {
        ref: panelRef,
        className: 'pomo-panel',
        role: 'dialog',
        'aria-label': t('dialog.title'),
        style: pos ?? MEASURE_STYLE,
      }, [
        h('div', { key: 'title', className: 'pomo-title' }, [
          h('span', { key: 'label', className: 'pomo-titleLabel' }, [h(TomatoIcon, { key: 'icon' }), t('dialog.title')]),
        ]),
        h('div', { key: 'rule', className: 'pomo-titleRule', 'aria-hidden': true }),
        h('div', { key: 'big', className: 'pomo-big' }, [
          h('span', { key: 'time' }, mmss(remainingMs)),
          h('span', { key: 'phase', className: 'pomo-bigLabel' }, t(labelKey)),
        ]),
        h('dl', { key: 'details', className: 'pomo-details' }, [
          h('dt', { key: 'rounds-dt' }, t('dialog.rounds')),
          h('dd', { key: 'rounds-dd' }, String(s.focusCount)),
          h('dt', { key: 'focusTime-dt' }, t('dialog.focusTime')),
          h('dd', { key: 'focusTime-dd' }, minutesWords(s.focusMs)),
          h('dt', { key: 'sessionTime-dt' }, t('dialog.sessionTime')),
          h('dd', { key: 'sessionTime-dd' }, hms(sessionMs)),
        ]),
        s.phase === 'focus' && s.focusCount > 0 && s.focusCount % s.config.roundsPerLongBreak === s.config.roundsPerLongBreak - 1
          ? h('p', { key: 'note', className: 'pomo-note' }, t('dialog.nextIsLong'))
          : null,
        h('div', { key: 'actions', className: 'pomo-actions' }, [
          h('button', {
            key: 'run',
            type: 'button',
            className: 'pomo-btn',
            onClick: actions.toggleRun,
          }, s.running ? t('dialog.pause') : t('dialog.start')),
          h('button', {
            key: 'skip',
            type: 'button',
            className: 'pomo-btn',
            disabled: s.phase === 'idle',
            onClick: actions.skip,
          }, t('dialog.skip')),
          h('button', {
            key: 'reset',
            type: 'button',
            className: 'pomo-btn',
            onClick: actions.resetDay,
          }, t('dialog.reset')),
        ]),
      ]);
      const dialog = open ? reactDom.createPortal(panel, document.body) : null;

      return h(React.Fragment, null, [
        h('style', { key: 'css' }, CSS),
        h('span', { key: 'anchor', ref: rootRef, className: 'pomo-anchor', 'data-composer-pomodoro': 'pomodoro' }, [
          h('button', {
            key: 'pill',
            type: 'button',
            className: 'pomo-pill',
            'aria-haspopup': 'dialog',
            'aria-expanded': open,
            'aria-label': reading + ' — ' + t('dialog.title'),
            onClick: () => setOpen(!open),
          }, [
            h(TomatoIcon, { key: 'icon' }),
            h('span', { key: 'label', className: 'pomo-label' }, [
              h('span', { key: 'phase', className: 'pomo-phase' }, reading),
            ]),
            h('span', { key: 'sep', className: 'pomo-sep', 'aria-hidden': true }, '·'),
            h('span', { key: 'session', className: 'pomo-label' }, hms(sessionMs)),
          ]),
        ]),
        dialog,
      ]);
    });

    // ---- Settings rows in the General section ----

    function NumberField({ value, min, max, label, onCommit }) {
      const [text, setText] = React.useState(String(value));
      React.useEffect(() => {
        setText(String(value));
      }, [value]);
      const commitValue = () => {
        const n = Math.round(Number(text));
        onCommit(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : value);
      };
      return h('label', { className: 'pomo-ctl' }, [
        h('span', { key: 'label', className: 'pomo-ctlLabel' }, label),
        h('input', {
          key: 'input',
          type: 'number',
          className: 'pomo-num',
          min,
          max,
          value: text,
          onChange: (event) => setText(event.target.value),
          onBlur: commitValue,
          onKeyDown: (event) => {
            if (event.key === 'Enter') event.target.blur();
          },
        }),
      ]);
    }

    function CheckField({ checked, label, onCommit }) {
      return h('label', { className: 'pomo-ctl' }, [
        h('input', {
          key: 'input',
          type: 'checkbox',
          className: 'pomo-chk',
          checked: checked,
          onChange: (event) => onCommit(event.target.checked),
        }),
        h('span', { key: 'label', className: 'pomo-ctlLabel' }, label),
      ]);
    }

    function SettingsRow({ t, sectionKey, children }) {
      return h(React.Fragment, null, [
        h('style', { key: 'css' }, CSS),
        h('div', { key: 'row', className: 'pomo-srow' }, [
          h('div', { key: 'text', className: 'pomo-srowText' }, [
            h('div', { key: 'title', className: 'pomo-srowTitle' }, t(sectionKey + '.title')),
            h('div', { key: 'desc', className: 'pomo-srowDesc' }, t(sectionKey + '.desc')),
          ]),
          h('div', { key: 'ctl', className: 'pomo-srowCtl' }, children),
        ]),
      ]);
    }

    function DurationsRow(props) {
      const { usePomodoro, t, setFocusMinutes, setBreakMinutes, setLongBreakMinutes, setRoundsPerLongBreak } = props;
      const value = usePomodoro((v) => v) ?? {};
      return h(SettingsRow, { key: 'row', t, sectionKey: 'settings.durations' }, [
        h(NumberField, {
          key: 'focus',
          value: Math.round(Number(value.focusMinutes)) || 25,
          min: 1, max: 120,
          label: t('settings.durations.focus'),
          onCommit: setFocusMinutes,
        }),
        h(NumberField, {
          key: 'break',
          value: Math.round(Number(value.breakMinutes)) || 5,
          min: 1, max: 60,
          label: t('settings.durations.break'),
          onCommit: setBreakMinutes,
        }),
        h(NumberField, {
          key: 'long',
          value: Math.round(Number(value.longBreakMinutes)) || 15,
          min: 5, max: 60,
          label: t('settings.durations.long'),
          onCommit: setLongBreakMinutes,
        }),
        h(NumberField, {
          key: 'rounds',
          value: Math.round(Number(value.roundsPerLongBreak)) || 4,
          min: 2, max: 12,
          label: t('settings.durations.rounds'),
          onCommit: setRoundsPerLongBreak,
        }),
      ]);
    }

    function AutoStartRow(props) {
      const { usePomodoro, t, setAutoStart } = props;
      const value = usePomodoro((v) => v) ?? {};
      const current = ['all', 'break', 'off'].includes(value.autoStart) ? value.autoStart : 'all';
      return h(SettingsRow, { key: 'row', t, sectionKey: 'settings.auto' }, [
        h('select', {
          key: 'select',
          className: 'pomo-sel',
          value: current,
          onChange: (event) => setAutoStart(event.target.value),
        }, ['all', 'break', 'off'].map((mode) => h('option', { key: mode, value: mode }, t('settings.auto.' + mode)))),
      ]);
    }

    function SignalRow(props) {
      const { usePomodoro, t, setSound, setDesktopNotifications } = props;
      const value = usePomodoro((v) => v) ?? {};
      return h(SettingsRow, { key: 'row', t, sectionKey: 'settings.signal' }, [
        h(CheckField, {
          key: 'sound',
          checked: value.sound !== false,
          label: t('settings.signal.sound'),
          onCommit: setSound,
        }),
        h(CheckField, {
          key: 'desktop',
          checked: value.desktopNotifications === true,
          label: t('settings.signal.desktop'),
          onCommit: setDesktopNotifications,
        }),
      ]);
    }

    return {
      inject: ['slots', 'locale', 'configForms'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTS));

        // Notification texts follow the active locale.
        try {
          const snapshot = ctx.locale.getSnapshot();
          const id = String((snapshot && (snapshot.locale || snapshot.id || snapshot.current)) || '');
          notifyTexts = NOTIFICATION_TEXTS[id.startsWith('de') ? 'de' : 'en'];
        } catch {
          notifyTexts = NOTIFICATION_TEXTS.en;
        }

        // Poll the Host state machine once a second; the tick interpolates the countdown.
        ctx.effect(() => {
          const id = window.setInterval(() => {
            state = { ...state, now: Date.now() };
            notify();
            poll();
          }, 1000);
          poll();
          return () => window.clearInterval(id);
        });

        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
          name: 'conversation.composer.dock',
          id: 'pomodoro',
          order: 2,
          locale: NS,
          inject: (sessionId) => ({ sessionId }),
        }, PomodoroPill));

        // Settings rows appear only while the Host serves this entry's form.
        const form = ctx.configForms.get(ENTRY_ID);
        const setField = (field, value) => {
          form.set(field, value).catch(() => {});
        };
        const setDesktopNotifications = (on) => {
          setField('desktopNotifications', on);
          if (on && typeof window.Notification !== 'undefined' && window.Notification.permission === 'default') {
            window.Notification.requestPermission().catch(() => {});
          }
        };
        ctx.effect(() => ctx.configForms.whileServed([ENTRY_ID], () => {
          const settingsFace = {
            getSnapshot: () => form.getSnapshot().value ?? {},
            subscribe: (listener) => form.subscribe(listener),
          };
          const disposeDurations = ctx.slots.inject('settings.general.item', () => ctx.slots.register({
            name: 'settings.general.item',
            id: 'pomodoro-durations',
            order: 40,
            locale: NS,
            inject: () => ({
              hooks: { pomodoro: settingsFace },
              setFocusMinutes: (v) => setField('focusMinutes', v),
              setBreakMinutes: (v) => setField('breakMinutes', v),
              setLongBreakMinutes: (v) => setField('longBreakMinutes', v),
              setRoundsPerLongBreak: (v) => setField('roundsPerLongBreak', v),
            }),
          }, DurationsRow));
          const disposeAutoStart = ctx.slots.inject('settings.general.item', () => ctx.slots.register({
            name: 'settings.general.item',
            id: 'pomodoro-auto-start',
            order: 41,
            locale: NS,
            inject: () => ({
              hooks: { pomodoro: settingsFace },
              setAutoStart: (v) => setField('autoStart', v),
            }),
          }, AutoStartRow));
          const disposeSignal = ctx.slots.inject('settings.general.item', () => ctx.slots.register({
            name: 'settings.general.item',
            id: 'pomodoro-signal',
            order: 42,
            locale: NS,
            inject: () => ({
              hooks: { pomodoro: settingsFace },
              setSound: (v) => setField('sound', v),
              setDesktopNotifications: setDesktopNotifications,
            }),
          }, SignalRow));
          return () => {
            disposeDurations();
            disposeAutoStart();
            disposeSignal();
          };
        }));
      },
    };
  },
});
