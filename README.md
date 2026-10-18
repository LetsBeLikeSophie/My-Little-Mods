# My Little Mods

**English** · [한국어](README.ko.md)

Three small mods for Claude Code that show what Claude is doing, each in its own style. From the maker of [My Little Sessions](https://github.com/LetsBeLikeSophie/My-Little-Sessions).

| Mod | Command | Looks like |
| --- | --- | --- |
| **RPG** | `/log-rpg` | A pixel-art camp: your chosen hero acts out each tool Claude uses |
| **Calm** | `/log-calm` | A quiet dashboard: white cards on a soft tint, thin rings, serif titles, one accent color |
| **Day** | `/log-day` | A warm journal: the sky of the hour, pastel limit cards, pill charts |

All three show the same things:

- **Now:** the task, the tool and file, the time it has taken, and a clear sign when Claude waits for your approval
- **Usage limits:** the 5-hour and weekly limits, with what the last request added, and when they reset
- **Session memory:** how full the conversation is (it compacts by itself when full)
- **Where the time went**, **results** (documents and artifacts, with Open buttons), a **log** (newest on top) and **all-time totals**
- **Alerts:** a Windows notification in the mod's own look and a sound, when Claude needs your approval or finishes a long request (🔔 to turn off)
- **Around the prompt:** a slim line above it, and a small mark at the right of the footer

## Install

This repository is public, so anyone can install from it. In Claude Code (terminal), first add the marketplace once:

```
/plugin marketplace add LetsBeLikeSophie/My-Little-Mods
```

then install the mods you want:

```
/plugin install rpg@my-little-mods
```

```
/plugin install calm@my-little-mods
```

```
/plugin install day@my-little-mods
```

Or in one line from a shell:

```bash
claude plugin install day --marketplace LetsBeLikeSophie/My-Little-Mods
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins → Add marketplace** with `LetsBeLikeSophie/My-Little-Mods`, then **Add plugin**.

Start a new session afterwards, then open a mod with its command.

## Uninstall

At the prompt (swap `rpg` for `calm` or `day`):

```
/plugin uninstall rpg@my-little-mods
```

From a shell:

```bash
claude plugin uninstall rpg@my-little-mods
```

To drop the marketplace too: `/plugin marketplace remove my-little-mods`. In the desktop app: **+** next to the prompt box → **Plugins**.

A tiny file, `~/.claude/my-little-mods.json` (which mod you opened last), may stay behind; delete it if you like.

## Using them

- A mod opens with its command. A new session reopens only the mod you opened last.
- With several installed, the line above the prompt, the footer mark and the alerts come from the mod whose pane is on screen, so they never pile up.
- Korean or English, following the system language.

### RPG — `/log-rpg`

- Work as pictures: reading is studying a book, editing is weapon practice, a command is a spell, tests are a bug hunt. 📜 opens the legend.
- 5 classes × 5 species, each class moving its own way. Change with the class button or `/log-rpg mage cat`.
- The limits as XP bars, levels and XP that add up across sessions, a sky that follows the real time of day.
- Light and dark (☾/☀).

### Calm — `/log-calm`

- A status card with a thin line icon, the limits as three thin rings, serif headlines and numbers.
- Pick the accent with 🔵🟢🟣🟠⚪ (or `/log-calm green`); the whole pane takes a soft tint of it. Light and dark.

### Day — `/log-day`

- A greeting with your name: `/log-day name Sophie` (otherwise your git name).
- The "now" card wears the sky of the hour: dawn, day, sunset or night, with a small sun or moon.
- Pastel limit cards, a big number beside pill charts, results as pastel strips. Light and dark (🌙/☀️).

## Good to know

- Mods (hooks modules) are an early-access Claude Code feature and may change between versions.
- Usage limits show on subscription plans (Pro/Max), after the first reply.
- Everything stays on your computer. Result links open in your browser or the file's app (Windows).

## Developing

Code all mods share lives in `shared/` (bookkeeping in `core.ts`, alerts in `alerts.ts`, the log, buttons and pane helpers in `parts.tsx`). Each mod is installed on its own, so it carries a copy in its `hooks/` folder. Edit the file in `shared/`, then copy it out:

```bash
node scripts/sync-shared.mjs
```

`node scripts/sync-shared.mjs --check` fails if a copy is out of date. The notification pictures are drawn by `python scripts/alert-art.py plugins`.

## License

Code: [MIT](LICENSE). The pixel font [Galmuri11](https://github.com/quiple/galmuri) bundled in RPG is under the SIL Open Font License 1.1 ([OFL-Galmuri.txt](plugins/rpg/OFL-Galmuri.txt)).

made by Sophie
