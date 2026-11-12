import z from '@deepseek-ai/schemastery';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Pomodoro durations, signals, and agent integration, editable in General settings. */
export const Config = z.object({
  focusMinutes: z.number().default(25).volatile(),
  breakMinutes: z.number().default(5).volatile(),
  longBreakMinutes: z.number().default(15).volatile(),
  roundsPerLongBreak: z.number().default(4).volatile(),
  autoStart: z.union(['all', 'break', 'off']).default('all').volatile(),
  sound: z.boolean().default(true).volatile(),
  desktopNotifications: z.boolean().default(false).volatile(),
  dailyGoal: z.number().default(8).volatile(),
  webhookUrl: z.string().default('').volatile(),
  agentHints: z.boolean().default(false).volatile(),
  agentContext: z.boolean().default(true).volatile(),
});

/** Services the Host half needs: the HTTP bridge to the page and the tool registry. */
export const inject = ['webServer', 'tools'];

const ROUTE = '/pomodoro-timer/api';
const CONTROL_ACTIONS = ['start', 'pause', 'skip', 'reset'];
const STORE_DIR = join(process.env.DSH_HOME || join(homedir(), '.dsh'), 'storages');
const STORE_FILE = join(STORE_DIR, 'einfachllm-pomodoro-timer.json');

const CONFIG_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    focusMinutes: { type: 'integer' },
    breakMinutes: { type: 'integer' },
    longBreakMinutes: { type: 'integer' },
    roundsPerLongBreak: { type: 'integer' },
    autoStart: { type: 'string', enum: ['all', 'break', 'off'] },
    sound: { type: 'boolean' },
    desktopNotifications: { type: 'boolean' },
    dailyGoal: { type: 'integer' },
    webhookUrl: { type: 'string' },
    agentHints: { type: 'boolean' },
    agentContext: { type: 'boolean' },
  },
  required: ['focusMinutes', 'breakMinutes', 'longBreakMinutes', 'roundsPerLongBreak', 'autoStart', 'sound', 'desktopNotifications', 'dailyGoal', 'webhookUrl', 'agentHints', 'agentContext'],
};

const DAY_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    day: { type: 'string' },
    focusCount: { type: 'integer' },
    focusMs: { type: 'integer' },
  },
  required: ['day', 'focusCount', 'focusMs'],
};

// Tool schemas are embedded in the compiled JSON-schema shape the tool registry
// validates against, so the bundle imports no DSH packages beyond schemastery:
// profile installs do not install peer dependencies.
const STATUS_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    phase: { type: 'string', description: 'Current phase.', enum: ['idle', 'focus', 'break', 'long'] },
    running: { type: 'boolean', description: 'Whether the countdown is running.' },
    endsAt: { type: 'number', description: 'Epoch milliseconds when the running phase ends; 0 when paused.' },
    remainingMs: { type: 'number', description: 'Remaining milliseconds of the current phase.' },
    focusCount: { type: 'integer', description: 'Completed focus rounds today.' },
    focusMs: { type: 'integer', description: 'Total focused milliseconds today.' },
    day: { type: 'string', description: 'Local day the counters belong to.' },
    goal: { type: 'integer', description: 'Daily focus-round goal.' },
    streak: { type: 'integer', description: 'Consecutive days with at least one focus round.' },
    history: { type: 'array', description: 'Past days, oldest first.', items: DAY_SCHEMA },
    lastCompletion: {
      type: 'object',
      additionalProperties: false,
      description: 'Most recent natural phase completion; id 0 means none.',
      properties: {
        id: { type: 'integer' },
        phase: { type: 'string', enum: ['focus', 'break', 'long'] },
        at: { type: 'number' },
      },
      required: ['id', 'phase', 'at'],
    },
    config: CONFIG_SCHEMA,
  },
  required: ['phase', 'running', 'endsAt', 'remainingMs', 'focusCount', 'focusMs', 'day', 'goal', 'streak', 'history', 'lastCompletion', 'config'],
};

const STATS_OUTPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    today: DAY_SCHEMA,
    goal: { type: 'integer' },
    streak: { type: 'integer' },
    totalFocusMs: { type: 'integer' },
    totalRounds: { type: 'integer' },
    history: { type: 'array', items: DAY_SCHEMA },
  },
  required: ['today', 'goal', 'streak', 'totalFocusMs', 'totalRounds', 'history'],
};

const CONTROL_PARAMETERS_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', description: 'Timer action: start, pause, skip, or reset.', enum: CONTROL_ACTIONS },
  },
  required: ['action'],
};

const jsonOutput = (schema) => ({ schema, render: (_a, v) => [{ type: 'text', text: JSON.stringify(v) }] });

function dayKey(now = Date.now()) {
  const d = new Date(now);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Host half: owns the Pomodoro state machine, persistence, the page bridge, and the agent tools. */
export function apply(ctx, config) {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });

  const clampMinutes = (raw, fb, min, max) => {
    const n = Math.round(Number(raw));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fb;
  };
  const durations = () => ({
    focusMs: clampMinutes(config.focusMinutes.get(), 25, 1, 120) * 60000,
    breakMs: clampMinutes(config.breakMinutes.get(), 5, 1, 60) * 60000,
    longMs: clampMinutes(config.longBreakMinutes.get(), 15, 5, 60) * 60000,
    roundsPerLong: clampMinutes(config.roundsPerLongBreak.get(), 4, 2, 12),
  });
  const autoStart = () => (['all', 'break', 'off'].includes(config.autoStart.get()) ? config.autoStart.get() : 'all');
  const goal = () => clampMinutes(config.dailyGoal.get(), 8, 1, 24);
  const durMs = (phase, d) => (phase === 'focus' ? d.focusMs : phase === 'long' ? d.longMs : d.breakMs);
  const nextPhaseAfter = (phase, focusCount, d) => (phase !== 'focus' ? 'focus' : focusCount > 0 && focusCount % d.roundsPerLong === 0 ? 'long' : 'break');

  const state = {
    day: dayKey(),
    phase: 'idle',
    running: false,
    endsAt: 0,
    remainingMs: durations().focusMs,
    focusCount: 0,
    focusMs: 0,
    history: [],
    completionSeq: 0,
    lastCompletion: { id: 0, phase: 'focus', at: 0 },
  };

  // ---- Persistence: plugin-owned JSON under $DSH_HOME/storages, atomic write ----
  let saveQueued = false;
  function persist() {
    if (saveQueued) return;
    saveQueued = true;
    setTimeout(async () => {
      saveQueued = false;
      try {
        await mkdir(STORE_DIR, { recursive: true });
        const tmp = STORE_FILE + '.' + process.pid + '.tmp';
        await writeFile(tmp, JSON.stringify(state));
        await rename(tmp, STORE_FILE);
      } catch { /* storage unavailable: keep in-memory state */ }
    }, 150);
  }
  async function restore() {
    try {
      const saved = JSON.parse(await readFile(STORE_FILE, 'utf8'));
      if (saved && typeof saved === 'object') {
        for (const k of ['day', 'phase', 'running', 'endsAt', 'remainingMs', 'focusCount', 'focusMs', 'completionSeq']) {
          if (k in saved) state[k] = saved[k];
        }
        if (Array.isArray(saved.history)) state.history = saved.history.slice(-30);
        if (saved.lastCompletion && typeof saved.lastCompletion === 'object') state.lastCompletion = saved.lastCompletion;
      }
    } catch { /* first run: defaults */ }
  }

  function streak() {
    const days = new Set(state.history.filter((h) => h.focusCount > 0).map((h) => h.day));
    if (state.focusCount > 0) days.add(state.day);
    let n = 0;
    const cursor = new Date();
    if (!days.has(dayKey(cursor.getTime()))) cursor.setDate(cursor.getDate() - 1);
    while (days.has(dayKey(cursor.getTime()))) { n++; cursor.setDate(cursor.getDate() - 1); }
    return n;
  }

  let lastAgent = null;

  function onComplete(completedPhase, nextPhase) {
    state.completionSeq += 1;
    state.lastCompletion = { id: state.completionSeq, phase: completedPhase, at: Date.now() };
    persist();
    const url = String(config.webhookUrl.get() || '').trim();
    if (url && /^https?:\/\//.test(url)) {
      try {
        fetch(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ event: 'phase_complete', completedPhase, nextPhase, focusCount: state.focusCount, focusMs: state.focusMs, at: state.lastCompletion.at }),
          signal: AbortSignal.timeout(5000),
        }).catch(() => {});
      } catch { /* webhook is best-effort */ }
    }
    if (config.agentHints.get() === true && completedPhase === 'focus' && lastAgent) {
      try {
        lastAgent.inject({ content: [{ type: 'text', text: 'Pomodoro: the user just finished a focus round and a break is starting. Briefly suggest they step away; do not start new long work until they return.' }] });
      } catch { /* agent hint is best-effort */ }
    }
  }

  /** Lazy state machine: advances through due phase completions up to `now`. */
  function advance(now) {
    const today = dayKey(now);
    if (state.day !== today) {
      if (state.focusCount > 0 || state.focusMs > 0) {
        state.history = [...state.history, { day: state.day, focusCount: state.focusCount, focusMs: state.focusMs }].slice(-30);
      }
      Object.assign(state, { day: today, phase: 'idle', running: false, endsAt: 0, remainingMs: durations().focusMs, focusCount: 0, focusMs: 0 });
      persist();
      return;
    }
    if (!state.running) return;
    const d = durations();
    let guard = 0;
    let changed = false;
    while (state.endsAt <= now && guard++ < 64) {
      let focusCount = state.focusCount;
      let focusMs = state.focusMs;
      const completed = state.phase;
      if (completed === 'focus') { focusCount += 1; focusMs += d.focusMs; }
      const phase = nextPhaseAfter(completed, focusCount, d);
      const keepRunning = autoStart() === 'all' || (autoStart() === 'break' && phase !== 'focus');
      Object.assign(state, { phase, running: keepRunning, endsAt: keepRunning ? state.endsAt + durMs(phase, d) : 0, remainingMs: durMs(phase, d), focusCount, focusMs });
      changed = true;
      onComplete(completed, phase);
      if (!keepRunning) break;
    }
    if (state.running) state.remainingMs = Math.max(0, state.endsAt - now);
    if (changed) persist();
  }

  function effectiveConfig() {
    const d = durations();
    return {
      focusMinutes: Math.round(d.focusMs / 60000),
      breakMinutes: Math.round(d.breakMs / 60000),
      longBreakMinutes: Math.round(d.longMs / 60000),
      roundsPerLongBreak: d.roundsPerLong,
      autoStart: autoStart(),
      sound: config.sound.get() !== false,
      desktopNotifications: config.desktopNotifications.get() === true,
      dailyGoal: goal(),
      webhookUrl: String(config.webhookUrl.get() || ''),
      agentHints: config.agentHints.get() === true,
      agentContext: config.agentContext.get() !== false,
    };
  }

  function status() {
    advance(Date.now());
    const now = Date.now();
    return {
      phase: state.phase,
      running: state.running,
      endsAt: state.endsAt,
      remainingMs: state.running ? Math.max(0, state.endsAt - now) : state.remainingMs,
      focusCount: state.focusCount,
      focusMs: state.focusMs,
      day: state.day,
      goal: goal(),
      streak: streak(),
      history: state.history,
      lastCompletion: state.lastCompletion,
      config: effectiveConfig(),
    };
  }

  function stats() {
    advance(Date.now());
    const today = { day: state.day, focusCount: state.focusCount, focusMs: state.focusMs };
    const all = [...state.history, today];
    return {
      today,
      goal: goal(),
      streak: streak(),
      totalFocusMs: all.reduce((a, h) => a + h.focusMs, 0),
      totalRounds: all.reduce((a, h) => a + h.focusCount, 0),
      history: state.history,
    };
  }

  function control(action) {
    const now = Date.now();
    advance(now);
    const d = durations();
    if (action === 'start') {
      if (!state.running) {
        const phase = state.phase === 'idle' ? 'focus' : state.phase;
        const remainingMs = state.phase === 'idle' ? d.focusMs : (state.remainingMs || durMs(phase, d));
        Object.assign(state, { phase, running: true, endsAt: now + remainingMs, remainingMs });
      }
    } else if (action === 'pause') {
      if (state.running) Object.assign(state, { running: false, endsAt: 0, remainingMs: Math.max(0, state.endsAt - now) });
    } else if (action === 'skip') {
      if (state.phase !== 'idle') {
        const phase = nextPhaseAfter(state.phase, state.focusCount, d);
        const keepRunning = state.running;
        Object.assign(state, { phase, running: keepRunning, endsAt: keepRunning ? now + durMs(phase, d) : 0, remainingMs: durMs(phase, d) });
      }
    } else if (action === 'reset') {
      Object.assign(state, { phase: 'idle', running: false, endsAt: 0, remainingMs: d.focusMs, focusCount: 0, focusMs: 0 });
    }
    persist();
    return status();
  }

  // ---- Per-agent focus context (Tier 2): the model knows the user is focusing ----
  const agentContextDisposers = new Map();
  ctx.on('agent/created', ({ agent }) => {
    try {
      const sp = agent.ctx && agent.ctx.systemPrompt;
      if (!sp || typeof sp.context !== 'function') return;
      const dispose = sp.context({
        name: 'pomodoro:focus',
        order: 60,
        required: false,
        text: () => {
          if (config.agentContext.get() === false) return '';
          advance(Date.now());
          if (!state.running || state.phase !== 'focus') return '';
          const mins = Math.ceil((state.endsAt - Date.now()) / 60000);
          return `The user is in a Pomodoro focus phase with about ${mins} minute(s) left. Prefer concise answers and avoid unnecessary interruptions or new long tasks until the phase ends.`;
        },
      });
      agentContextDisposers.set(agent, dispose);
    } catch { /* optional integration */ }
  });
  ctx.on('agent/disposed', ({ agent }) => {
    const dispose = agentContextDisposers.get(agent);
    if (dispose) { try { dispose(); } catch {} agentContextDisposers.delete(agent); }
  });
  ctx.effect(() => () => { for (const d of agentContextDisposers.values()) { try { d(); } catch {} } agentContextDisposers.clear(); });

  // ---- HTTP bridge for the page pill ----
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: ROUTE,
    handler: async (req, res) => {
      const respond = (code, payload) => {
        if (res.headersSent) return;
        res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
        res.end(JSON.stringify(payload));
      };
      try {
        if (req.method === 'GET' || req.method === 'HEAD') return respond(200, status());
        if (req.method === 'POST') {
          const body = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on('data', (c) => chunks.push(c));
            req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            req.on('error', reject);
          });
          let action = 'status';
          try {
            const parsed = JSON.parse(body || '{}');
            if (parsed && typeof parsed.action === 'string' && CONTROL_ACTIONS.includes(parsed.action)) action = parsed.action;
          } catch { /* malformed body reads status */ }
          return respond(200, CONTROL_ACTIONS.includes(action) ? control(action) : status());
        }
        respond(405, { error: 'method not allowed' });
      } catch (error) {
        respond(500, { error: String((error && error.message) || error) });
      }
    },
  }));

  // ---- Agent tools: same state machine as the page ----
  ctx.effect(() => ctx.tools.register({
    name: 'pomodoro_status',
    description: "Read the current state of the user's Pomodoro focus timer: phase, running state, remaining milliseconds, today's focus rounds and focus time, daily goal, streak, and recent history.",
    parameters: { type: 'object', properties: {} },
    output: jsonOutput(STATUS_OUTPUT_SCHEMA),
    isConcurrencySafe: () => true,
    async execute(args, exec) { if (exec && exec.agent) lastAgent = exec.agent; return status(); },
  }));

  ctx.effect(() => ctx.tools.register({
    name: 'pomodoro_control',
    description: "Control the user's Pomodoro focus timer. start begins or resumes the countdown; pause freezes it; skip jumps to the next phase without counting the current one; reset clears today's rounds and focus time.",
    parameters: CONTROL_PARAMETERS_SCHEMA,
    output: jsonOutput(STATUS_OUTPUT_SCHEMA),
    async execute(args, exec) {
      if (exec && exec.agent) lastAgent = exec.agent;
      if (!args || !CONTROL_ACTIONS.includes(args.action)) throw new Error('pomodoro_control requires action: start | pause | skip | reset');
      return control(args.action);
    },
  }));

  ctx.effect(() => ctx.tools.register({
    name: 'pomodoro_stats',
    description: "Read the user's Pomodoro focus statistics: today's rounds and focus time, the daily goal, the current streak, and per-day history (up to 30 days) with totals.",
    parameters: { type: 'object', properties: {} },
    output: jsonOutput(STATS_OUTPUT_SCHEMA),
    isConcurrencySafe: () => true,
    async execute() { return stats(); },
  }));

  // Restore persisted state once the fiber is live.
  restore();
}
