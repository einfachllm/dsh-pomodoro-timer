# Changelog

All notable changes to `@einfachllm/dsh-pomodoro-timer` are documented here.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.4.0] — 2026-11-13

### Added
- UI in eight languages — English, German, Chinese, Russian, Japanese, Spanish, French, and Portuguese — following the app language switch.
- Flat-key locale registration so dialog, pill, and settings labels resolve correctly.

### Note
- This is the first npm release containing the 1.2.2–1.3.0 work below: those two versions were tagged but never published to npm.

## [1.3.0] — 2026-11-12 (git tag only, never published to npm)

### Added
- Persistent tracking: completed rounds, focus time, history, and streak survive harness restarts (stored under `$DSH_HOME/storages`) and are shared across open tabs.
- Goals & streaks: configurable daily goal and a last-7-days bar chart in the dialog.
- Agent integration: optional focus context for the model (opt-out) and a break hint when a round ends (opt-in); webhook POST on natural phase completion.
- Chinese UI.
- Screenshot gallery and docs polish.
- CI: publish to npm on `v*` tags (requires an `NPM_TOKEN` secret).

### Changed
- Adopted the kawaii tomato mascot with detail tiers, phase moods, and progress ring.

## [1.2.2] — 2026-11-12 (git tag only, never published to npm)

### Changed
- README badge header (npm / downloads / Node / DSH / license) and `engines.node` requirement.

## [1.2.1] — 2026-11-12

### Changed
- Dropped the `dsh-tools` dependency for slim-profile compatibility.
- Added the plugin market index (Discover, format 1).

## [1.2.0] — 2026-11-12

### Added
- Initial release: Pomodoro focus timer bundle for DeepSeek Harness — composer dock pill, focus dialog with progress ring, configurable durations in General settings, phase-change beep/notification/toast, and the `pomodoro_status`, `pomodoro_control`, and `pomodoro_stats` agent tools.
