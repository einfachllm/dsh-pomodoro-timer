import z from '@deepseek-ai/schemastery';

/** Pomodoro durations and signals, editable in the General settings section. */
export const Config = z.object({
  focusMinutes: z.number().default(25).volatile(),
  breakMinutes: z.number().default(5).volatile(),
  longBreakMinutes: z.number().default(15).volatile(),
  roundsPerLongBreak: z.number().default(4).volatile(),
  autoStart: z.union(['all', 'break', 'off']).default('all').volatile(),
  sound: z.boolean().default(true).volatile(),
  desktopNotifications: z.boolean().default(false).volatile(),
});

/** Services the Host half needs: the HTTP bridge to the page and the tool registry. */
export const inject = ['webServer', 'tools'];

const ROUTE = '/pomodoro-timer/api';
const CONTROL_ACTIONS = ['start', 'pause', 'skip', 'reset'];

export // Tool schemas are embedded in the compiled JSON-schema shape the tool registry
// validates against, so the bundle imports no DSH packages beyond schemastery:
// profile installs do not install peer dependencies, and every DSH package this
// bundle previously pulled in (dsh-tools) carries a peer chain the profile
// deliberately keeps slim.
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
    config: {
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
      },
      required: ['focusMinutes', 'breakMinutes', 'longBreakMinutes', 'roundsPerLongBreak', 'autoStart', 'sound', 'desktopNotifications'],
    },
  },
  required: ['phase', 'running', 'endsAt', 'remainingMs', 'focusCount', 'focusMs', 'day', 'config'],
};

const CONTROL_PARAMETERS_SCHEMA = {
  type: 'object',
  properties: {
    action: {
      type: 'string',
      description: 'Timer action: start, pause, skip, or reset.',
      enum: CONTROL_ACTIONS,
    },
  },
  required: ['action'],
};

const textOutput = {
  schema: STATUS_OUTPUT_SCHEMA,
  render: (_args, value) => [{ type: 'text', text: JSON.stringify(value) }],
};

function dayKey(now = Date.now()) {
  const d = new Date(now);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

/** Host half: owns the Pomodoro state machine, the page bridge, and the agent tools. */
export function apply(ctx, config) {
  ctx.inject(['settings'], (child) => {
    child.effect(() => child.settings.configure({ auto: false }, ctx.fiber));
  });

  function clampMinutes(raw, fallback, min, max) {
    const n = Math.round(Number(raw));
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
  }

  function durations() {
    return {
      focusMs: clampMinutes(config.focusMinutes.get(), 25, 1, 120) * 60 * 1000,
      breakMs: clampMinutes(config.breakMinutes.get(), 5, 1, 60) * 60 * 1000,
      longMs: clampMinutes(config.longBreakMinutes.get(), 15, 5, 60) * 60 * 1000,
      roundsPerLong: clampMinutes(config.roundsPerLongBreak.get(), 4, 2, 12),
    };
  }

  function autoStart() {
    const value = config.autoStart.get();
    return ['all', 'break', 'off'].includes(value) ? value : 'all';
  }

  function durMs(phase, d) {
    return phase === 'focus' ? d.focusMs : phase === 'long' ? d.longMs : d.breakMs;
  }

  function nextPhaseAfter(phase, focusCount, d) {
    if (phase !== 'focus') return 'focus';
    return focusCount > 0 && focusCount % d.roundsPerLong === 0 ? 'long' : 'break';
  }

  const state = {
    day: dayKey(),
    phase: 'idle',
    running: false,
    endsAt: 0,
    remainingMs: durations().focusMs,
    focusCount: 0,
    focusMs: 0,
  };

  /** Lazy state machine: advances through due phase completions up to `now`. */
  function advance(now) {
    const today = dayKey(now);
    if (state.day !== today) {
      Object.assign(state, {
        day: today,
        phase: 'idle',
        running: false,
        endsAt: 0,
        remainingMs: durations().focusMs,
        focusCount: 0,
        focusMs: 0,
      });
      return;
    }
    if (!state.running) return;
    const d = durations();
    let guard = 0;
    while (state.endsAt <= now && guard++ < 64) {
      let focusCount = state.focusCount;
      let focusMs = state.focusMs;
      if (state.phase === 'focus') {
        focusCount += 1;
        focusMs += d.focusMs;
      }
      const phase = nextPhaseAfter(state.phase, focusCount, d);
      const keepRunning = autoStart() === 'all' || (autoStart() === 'break' && phase !== 'focus');
      if (!keepRunning) {
        Object.assign(state, { phase, running: false, endsAt: 0, remainingMs: durMs(phase, d), focusCount, focusMs });
        return;
      }
      Object.assign(state, { phase, running: true, endsAt: state.endsAt + durMs(phase, d), remainingMs: durMs(phase, d), focusCount, focusMs });
    }
    state.remainingMs = Math.max(0, state.endsAt - now);
  }

  /** Current state plus the effective configuration, for the page and the tools. */
  function status() {
    advance(Date.now());
    const now = Date.now();
    const d = durations();
    return {
      phase: state.phase,
      running: state.running,
      endsAt: state.endsAt,
      remainingMs: state.running ? Math.max(0, state.endsAt - now) : state.remainingMs,
      focusCount: state.focusCount,
      focusMs: state.focusMs,
      day: state.day,
      config: {
        focusMinutes: Math.round(d.focusMs / 60000),
        breakMinutes: Math.round(d.breakMs / 60000),
        longBreakMinutes: Math.round(d.longMs / 60000),
        roundsPerLongBreak: d.roundsPerLong,
        autoStart: autoStart(),
        sound: config.sound.get() !== false,
        desktopNotifications: config.desktopNotifications.get() === true,
      },
    };
  }

  /** One control action; the page buttons and the agent tool share this path. */
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
      if (state.running) {
        Object.assign(state, { running: false, endsAt: 0, remainingMs: Math.max(0, state.endsAt - now) });
      }
    } else if (action === 'skip') {
      if (state.phase !== 'idle') {
        const phase = nextPhaseAfter(state.phase, state.focusCount, d);
        const keepRunning = state.running;
        Object.assign(state, { phase, running: keepRunning, endsAt: keepRunning ? now + durMs(phase, d) : 0, remainingMs: durMs(phase, d) });
      }
    } else if (action === 'reset') {
      Object.assign(state, { phase: 'idle', running: false, endsAt: 0, remainingMs: d.focusMs, focusCount: 0, focusMs: 0 });
    }
    return status();
  }

  // HTTP bridge for the page pill: GET reads, POST controls. Unauthenticated by design;
  // the route only moves a focus timer.
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
        if (req.method === 'GET' || req.method === 'HEAD') {
          return respond(200, status());
        }
        if (req.method === 'POST') {
          const body = await new Promise((resolve, reject) => {
            const chunks = [];
            req.on('data', (chunk) => chunks.push(chunk));
            req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
            req.on('error', reject);
          });
          let action = 'status';
          try {
            const parsed = JSON.parse(body || '{}');
            if (parsed && typeof parsed.action === 'string' && CONTROL_ACTIONS.includes(parsed.action)) {
              action = parsed.action;
            }
          } catch {
            /* malformed body reads status */
          }
          return respond(200, CONTROL_ACTIONS.includes(action) ? control(action) : status());
        }
        respond(405, { error: 'method not allowed' });
      } catch (error) {
        respond(500, { error: String((error && error.message) || error) });
      }
    },
  }));

  // Agent visibility and shared control: both tools run the exact same state machine.
  ctx.effect(() => ctx.tools.register({
    name: 'pomodoro_status',
    description: "Read the current state of the user's Pomodoro focus timer: phase (idle/focus/break/long), whether it is running, remaining milliseconds, and today's completed focus rounds and total focus time.",
    parameters: { type: 'object', properties: {} },
    output: textOutput,
    isConcurrencySafe: () => true,
    async execute() {
      return status();
    },
  }));

  ctx.effect(() => ctx.tools.register({
    name: 'pomodoro_control',
    description: "Control the user's Pomodoro focus timer. start begins or resumes the countdown (a fresh timer starts a focus phase); pause freezes it; skip jumps to the next phase without counting the current one; reset clears today's rounds and focus time.",
    parameters: CONTROL_PARAMETERS_SCHEMA,
    output: textOutput,
    async execute(args) {
      if (!args || !CONTROL_ACTIONS.includes(args.action)) {
        throw new Error('pomodoro_control requires action: start | pause | skip | reset');
      }
      return control(args.action);
    },
  }));
}
