# My Little Mods

**English** · [한국어](README.ko.md)

Two small mods for Claude Code's side pane. They show what Claude is doing right now, how much of your usage limits is left, and what it made. From the maker of [My Little Sessions](https://github.com/LetsBeLikeSophie/My-Little-Sessions).

| Mod | Looks like |
| --- | --- |
| **pixel-activity** (Adventure Log) | A pixel-art RPG camp: your chosen hero acts out each tool Claude uses |
| **simple-dash** | A no-pictures dashboard: just the information, in an accent color you pick |

Install either one, or both.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install pixel-activity --marketplace LetsBeLikeSophie/My-Little-Mods
```

```
/plugin install simple-dash --marketplace LetsBeLikeSophie/My-Little-Mods
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
- Open with `/pixel` · change hero with `/pixel mage cat`

## simple-dash

- What Claude is doing, usage limits (bright part = what the last request used), results, time spent and a log, as text and bars.
- Accent colors: blue, green, purple, orange, mono. Light and dark.
- Open with `/dash` · change color with `/dash green`

## Good to know

- Mods (hooks modules) are an early-access Claude Code feature and may change between versions.
- Usage limits show on subscription plans (Pro/Max), after the first reply.
- Everything stays on your computer. Result links open in your browser or the file's app (Windows).

## License

Code: [MIT](LICENSE). The pixel font [Galmuri11](https://github.com/quiple/galmuri) bundled in pixel-activity is under the SIL Open Font License 1.1 ([OFL-Galmuri.txt](plugins/pixel-activity/OFL-Galmuri.txt)).

made by Sophie
