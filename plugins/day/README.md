# 🌼 My Little Day

**English** · [한국어](README.ko.md)

A warm journal in Claude Code's side pane: a hello by name, a "now" card that wears the sky of the hour (dawn, day, sunset or night) with a small sun or moon, pastel cards for your usage limits, and pill charts of where the time went.

One of three [My Little Mods](https://github.com/LetsBeLikeSophie/My-Little-Mods) for Claude Code (RPG, Calm and Day). They show the same things, each in its own style.

## Install

```
/plugin marketplace add LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install my-little-day@my-little-mods
```

Start a new session afterwards. To remove it: `/plugin uninstall my-little-day@my-little-mods`; Claude Code removes its stored settings with it.

## Use

- Open with `/log-day`. Set the name it greets with `/log-day name Sophie`; until then it just says hello.
- 🌙/☀️ switches light and dark, 🔔 turns alerts on or off.

## What it shows

- **Now:** the task, the tool and file in use, how long it has taken, and a clear sign when Claude waits for your approval
- **Usage limits:** the 5-hour and weekly limits, what the last request added, and when they reset
- **Session memory:** how full the conversation is (Claude Code compacts it by itself when full)
- **Where the time went**, **results** (documents and artifacts, with Open buttons), a **log** (newest on top) and **all-time totals**
- **Around the prompt:** a slim line above it and a small mark at the right of the footer, while this mod's pane is on screen

## What it runs, decides and stores

Everything stays on your computer. The mod sends nothing over the network and reads no credentials.

- **One program, Windows PowerShell, always with a fixed script.** What changes (a title, a file path) is passed in environment variables, never in the command line. It runs PowerShell for three things:
  - **Alerts:** when Claude waits for your approval, or finishes a request that took 30 seconds or more, it shows a Windows notification with this mod's pictures (`images/`) and plays one of its sounds (`sounds/`). Turn alerts off with the 🔔 button; then only the in-app toast shows. On macOS and Linux it uses Claude Code's own notification and sound instead.
  - **Language:** once per session, `(Get-UICulture).Name` picks Korean or English. Elsewhere it reads `LANG` / `LC_ALL`.
  - **Opening a result:** the Open button and the GitHub button run `Start-Process` on that file or link.
- **Hooks, and what they decide:** it watches tool calls, requests and usage to draw the pane; it never changes or blocks a tool call. On `tool.check` it passes the engine's own decision on unchanged, and only notes when that decision is to ask you, to show "waiting for approval" and ring the alert. It also draws the pane, the line above the prompt, a mark in the footer, and adds one command.
- **What it writes:** only Claude Code's own plugin store for this mod: its settings (theme, alerts and the like), its all-time totals, and whether its pane was open, so a new session reopens it. No files of yours are written.

## License

MIT, by Sophie.