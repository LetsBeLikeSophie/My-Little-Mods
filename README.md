# My Little Mods

**English** · [한국어](README.ko.md)

Three small mods for Claude Code's side pane. All three show the same things (what Claude is doing, usage limits, where the time went, results and a log), each in its own style. They show what Claude is doing right now, how much of your usage limits is left, and what it made. From the maker of [My Little Sessions](https://github.com/LetsBeLikeSophie/My-Little-Sessions).

| Mod | Looks like |
| --- | --- |
| **pixel-activity** (Adventure Log) | A pixel-art RPG camp: your chosen hero acts out each tool Claude uses |
| **simple-dash** | Calm: airy white cards on a soft tint, thin rings and light type, in an accent color you pick |
| **daily-journal** | Warm: cream background, a sunny "now" card with a little face, pastel chips and pill charts |

Install any one, or several.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install pixel-activity --marketplace LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install simple-dash --marketplace LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install daily-journal --marketplace LetsBeLikeSophie/My-Little-Mods
```

The first time, answer `y` to `Add marketplace?`, then pick the user scope.

From a shell:

```bash
claude plugin install pixel-activity --marketplace LetsBeLikeSophie/My-Little-Mods
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins → Add marketplace** with `LetsBeLikeSophie/My-Little-Mods`, then **Add plugin**.

## pixel-activity (Adventure Log)

- **Work as pictures:** reading a file is studying a book, editing code is weapon practice, a command is a spell, tests are a slime (bug) hunt. The legend lists them all.
- **5 classes × 5 species:** warrior, mage, hunter, rogue, priest / human, cat, dog, bear, rabbit. Each class moves its own way.
- **Usage-limit HUD:** the 5-hour and weekly limits as XP bars; what the last request used glows.
- **Results, time spent and a log:** links to documents and artifacts, a thinking-vs-work chart, one-line log entries.
- The sky follows the real time of day. Light and dark themes; Korean or English by system language.
- **Alerts:** when Claude waits for your approval the hero raises a hand, and after a few seconds a Windows notification and a sound follow; a request that ran 30s or more pings when done. Toggle with the 🔔 button.
- **Level & XP:** finished requests, slain bugs and actions add up across sessions.
- Open with `/pixel` · change hero with `/pixel mage cat`

## simple-dash

- A status card with a thin line icon, the usage limits as three thin rings (the glowing part = what the last request used), where the time went, results and a log.
- Accent colors: blue, green, purple, orange, mono. Light and dark.
- Alerts for approvals and long requests (toggle), and all-time totals.
- Open with `/dash` · change color with `/dash green`

## daily-journal

- A greeting with your name, a sunny "now" card whose little face changes with the status, the limits as pastel chips, a big number beside pill bars of where the time went, results as pastel cards, and a log.
- Open with `/journal` · set your name with `/journal name Sophie` (otherwise your git name)

## Good to know

- Mods (hooks modules) are an early-access Claude Code feature and may change between versions.
- Usage limits show on subscription plans (Pro/Max), after the first reply.
- Everything stays on your computer. Result links open in your browser or the file's app (Windows).

## License

Code: [MIT](LICENSE). The pixel font [Galmuri11](https://github.com/quiple/galmuri) bundled in pixel-activity is under the SIL Open Font License 1.1 ([OFL-Galmuri.txt](plugins/pixel-activity/OFL-Galmuri.txt)).

made by Sophie
