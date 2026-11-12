<div align="center">

<h1>🍅 dsh-pomodoro-timer</h1>

<p>A Pomodoro focus timer for the DeepSeek Harness Web UI — daily tracking, phase-change signals, and agent tools.</p>

<p>
  <strong>English</strong> · <a href="#deutsch">Deutsch</a>
</p>

<p>
  <a href="https://www.npmjs.com/package/@einfachllm/dsh-pomodoro-timer"><img alt="npm version" src="https://img.shields.io/npm/v/@einfachllm/dsh-pomodoro-timer.svg?logo=npm"></a>
  <a href="https://www.npmjs.com/package/@einfachllm/dsh-pomodoro-timer"><img alt="npm downloads" src="https://img.shields.io/npm/d18m/@einfachllm/dsh-pomodoro-timer.svg"></a>
  <a href="https://www.npmjs.com/package/@einfachllm/dsh-pomodoro-timer"><img alt="Node.js version" src="https://img.shields.io/node/v/@einfachllm/dsh-pomodoro-timer.svg?logo=node.js"></a>
  <a href="https://github.com/deepseek-ai/deepseek-harness"><img alt="DSH rc releases" src="https://img.shields.io/badge/DSH-rc%20releases-4B8BF5"></a>
  <a href="https://github.com/einfachllm/dsh-pomodoro-timer/blob/main/LICENSE"><img alt="MIT license" src="https://img.shields.io/npm/l/@einfachllm/dsh-pomodoro-timer.svg"></a>
</p>

</div>

A [DeepSeek Harness](https://github.com/deepseek-ai) bundle that adds a Pomodoro focus timer to the web composer dock: a tomato pill under the chat input, Pomodoro tracking, configurable durations in the General settings, phase-change signals, and two agent tools so your assistant can read and control the timer.

## Features

- **Composer dock pill** — phase and remaining time next to the shipped session statistics; click opens the timer dialog (Start/Pause, Skip phase, Reset day, today's focus rounds and focus time, session running time).
- **Pomodoro cycle** — 25 min focus → 5 min break, long break (15 min) after every 4th completed round; phases auto-continue or pause per setting.
- **Tracking** — completed focus rounds and total focus time per day, owned by the Host so it survives page reloads and is shared across open tabs.
- **Settings** (General section): focus/break/long-break minutes, rounds before a long break, automatic phase start, beep and desktop notification on phase change (en + de UI).
- **Agent tools** — `pomodoro_status` reads phase, running state, remaining time, and today's tracking; `pomodoro_control` performs `start` / `pause` / `skip` / `reset`. UI buttons and tools run the same state machine.

## Requirements

- DeepSeek Harness (DSH) with a profile, web GUI; Node.js ≥ 24.9 (matches the harness).
- The bundle needs no build step and no install scripts.

## Install

Ask your DSH agent to install it, or use the profile's plugin manager:

```
install_bundle: "@einfachllm/dsh-pomodoro-timer@1.2.0"
```

After installation, reload the web page — the tomato pill appears under the composer next to the session statistics.

## Configuration

Settings → General → Pomodoro lengths / Start phases automatically / Phase-change signal.

## Tools

| Tool | Purpose |
|---|---|
| `pomodoro_status` | Read phase (`idle`/`focus`/`break`/`long`), running state, remaining ms, today's focus rounds and focus time. |
| `pomodoro_control` | `start`, `pause`, `skip` (jump to the next phase without counting), `reset` (clear today's tracking). |

The timer state lives in the Host process memory; a harness restart returns it to `idle`.

## Deutsch

Ein DeepSeek-Harness-Bundle mit Pomodoro-Fokus-Timer im Composer-Dock: Tomaten-Pill unterm Eingabefeld, Pomodoro-Tracking (Runden und Fokuszeit pro Tag), einstellbare Längen in den allgemeinen Einstellungen, Signalton/Desktop-Benachrichtigung beim Phasenwechsel sowie zwei Agent-Tools (`pomodoro_status`, `pomodoro_control`), mit denen der Assistent den Timer lesen und steuern kann.

Installation über den Plugin-Manager des Profils (npm-Spec `@einfachllm/dsh-pomodoro-timer@1.2.0`), danach die Weboberfläche neu laden. Einstellungen → Allgemein → Pomodoro-Zeilen.

## License

[MIT](./LICENSE)
