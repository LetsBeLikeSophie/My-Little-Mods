# 🍃 My Little Calm

**English** · [한국어](README.ko.md)

A quiet dashboard in Claude Code's side pane: a status card with a thin line icon, your usage limits as three thin rings, serif titles, and one soft accent color of your choice washing the whole pane.

One of three [My Little Mods](https://github.com/LetsBeLikeSophie/My-Little-Mods) for Claude Code (RPG, Calm and Day). They show the same things, each in its own style.

## Install

```
/plugin marketplace add LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install my-little-calm@my-little-mods
```

Start a new session afterwards. To remove it: `/plugin uninstall my-little-calm@my-little-mods`.

## Use

- Open with `/log-calm`. Pick the accent with 🔵🟢🟣🟠⚪ or `/log-calm green` (blue, green, purple, orange, mono).
- ☾/☀ switches dark and light, 🔔 turns alerts on or off.

## What it shows

- **Now:** the task, the tool and file in use, how long it has taken, and a clear sign when Claude waits for your approval
- **Usage limits:** the 5-hour and weekly limits, what the last request added, and when they reset
- **Session memory:** how full the conversation is (Claude Code compacts it by itself when full)
- **Where the time went**, **results** (documents and artifacts, with Open buttons), a **log** (newest on top) and **all-time totals**
- **Around the prompt:** a slim line above it and a small mark at the right of the footer, while this mod's pane is on screen

## What it runs and stores

Everything stays on your computer. The mod sends nothing over the network.

- **Windows notifications and sounds:** when Claude waits for your approval or finishes a long request, it runs `powershell` to show a Windows notification (with this mod's pictures) and play one of its bundled sounds. Turn alerts off with the 🔔 button.
- **Language:** on Windows it runs `powershell Get-UICulture` once per session to pick Korean or English; elsewhere it reads `LANG` / `LC_ALL`.
- **Opening results:** the Open button runs `explorer.exe` with the result's file path or link.
- **Last mod opened:** it writes `{"last": "<mod>"}` to `~/.claude/my-little-mods.json`, so a new session reopens only the mod you used last.
- **Settings and totals** are kept in Claude Code's own plugin store.

## License

MIT, by Sophie.