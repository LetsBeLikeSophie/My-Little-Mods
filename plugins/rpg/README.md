# ⚔️ My Little RPG

**English** · [한국어](README.ko.md)

A pixel-art camp in Claude Code's side pane: your chosen hero acts out what Claude is doing. Reading is studying a book, editing is weapon practice, a command is a spell, and tests are a bug hunt. Finish a request and the hero finds a glowing treasure chest.

One of three [My Little Mods](https://github.com/LetsBeLikeSophie/My-Little-Mods) for Claude Code (RPG, Calm and Day). They show the same things, each in its own style.

## Install

```
/plugin marketplace add LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install my-little-rpg@my-little-mods
```

Start a new session afterwards. To remove it: `/plugin uninstall my-little-rpg@my-little-mods`; Claude Code removes its stored settings with it.

## Use

- Open with `/log-rpg`. Pick a class and species with the class button or `/log-rpg mage cat` (warrior, mage, hunter, rogue, priest / human, cat, dog, bear, rabbit).
- 📜 opens the legend of scenes, ☾/☀ switches dark and light, 🔔 turns alerts on or off.
- Levels and XP add up across sessions; the sky follows the real time of day.

## What it shows

- **Now:** the task, the tool and file in use, how long it has taken, and a clear sign when Claude waits for your approval
- **Usage limits:** the 5-hour and weekly limits, what the last request added, and when they reset
- **Session memory:** how full the conversation is (Claude Code compacts it by itself when full)
- **Where the time went**, **results** (documents and artifacts, with Open buttons), a **log** (newest on top) and **all-time totals**
- **Around the prompt:** a slim line above it and a small mark at the right of the footer, while this mod's pane is on screen

## What it runs, decides and stores

Everything stays on your computer. The mod sends nothing over the network and reads no credentials.

- **One program, Windows PowerShell, always with a fixed script.** What changes (a title, a file path) is passed in environment variables, never in the command line. It runs PowerShell for three things:
  - **Alerts:** when Claude waits for your approval, or finishes a request that took 30 seconds or more, it shows a small Windows notification saying what happened, with this mod's logo (`images/`), and plays one of its sounds (`sounds/`). Turn alerts off with the 🔔 button; then only the in-app toast shows. On macOS and Linux it uses Claude Code's own notification and sound instead.
  - **Language:** once per session, `(Get-UICulture).Name` picks Korean or English. Elsewhere it reads `LANG` / `LC_ALL`.
  - **Opening a result:** the Open button and the GitHub button run `Start-Process` on that file or link.
- **Hooks, and what they decide:** it watches tool calls, requests and usage to draw the pane; it never changes or blocks a tool call. On `tool.check` it passes the engine's own decision on unchanged, and only notes when that decision is to ask you, to show "waiting for approval" and ring the alert. It also draws the pane, the line above the prompt, a mark in the footer, and adds one command.
- **What it writes:** only Claude Code's own plugin store for this mod: its settings (theme, alerts and the like), its all-time totals, and whether its pane was open, so a new session reopens it. No files of yours are written.

## License

MIT, by Sophie.
The pixel font [Galmuri11](https://github.com/quiple/galmuri) is bundled under the SIL Open Font License 1.1 ([OFL-Galmuri.txt](OFL-Galmuri.txt)).
