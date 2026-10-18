// The helpers that use the engine ($). The directory reads a mod's calls on
// $ only in the file that registers its hooks, so these live in register.tsx.
// The one program a mod runs is Windows PowerShell: a fixed one-line command,
// or the mod's own readable scripts/notify.ps1. What changes (a title, a file
// path) travels in environment variables, never in the command line.

const MAKER_URL = 'https://github.com/LetsBeLikeSophie/My-Little-Mods'

/** How a mod dresses its notification: its name and its small round logo (a path under the mod's folder). */
type AlertLook = { tag: string; logo?: string }

type Alert = { title: string; body: string; sound?: string; isNative: boolean; look?: AlertLook }

/** A file of the mod's as the file:/// address a Windows toast reads pictures from. */
function fileUrl($: EngineInterface, rel: string): string {
  return `file:///${`${$.plugin.root}/${rel}`.replace(/\\/g, '/')}`
}

/**
 * Getting the person's attention: an in-app toast always; then a small Windows
 * notification (what happened, with the mod's logo) and its sound, both by
 * the mod's scripts/notify.ps1, or the
 * engine's own notification and sound elsewhere.
 */
async function alert($: EngineInterface, a: Alert): Promise<void> {
  $.ui.toast(`${a.title} · ${a.body}`)
  if (!a.isNative) return
  if ((await $.env.get('OS')) !== 'Windows_NT') {
    await $.ui.notify(a.body, { title: a.title }).catch(() => undefined)
    if (a.sound) await $.audio.play({ asset: a.sound }).catch(() => undefined)
    return
  }
  await $.process.run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', `${$.plugin.root}/scripts/notify.ps1`], {
      env: {
        MLM_TITLE: a.title,
        MLM_BODY: a.body,
        MLM_TAG: a.look?.tag ?? '',
        MLM_LOGO: a.look?.logo ? fileUrl($, a.look.logo) : '',
        MLM_WAV: a.sound ? `${$.plugin.root}\\${a.sound.replace(/\//g, '\\')}` : '',
      },
      timeoutMs: 15_000,
    })
    .catch(() => undefined)
}

/**
 * Whether this mod's pane is the one on screen. Every mod may draw the band
 * above the prompt and ring an alert; only the mod whose pane is shown does.
 */
async function isPaneShown($: EngineInterface, id: string): Promise<boolean> {
  try {
    return (await $.ui.panes()).some(p => p.id === id && p.isShown)
  } catch {
    return false
  }
}

/** An alert from the mod on screen only, so several mods never ring at once. */
async function alertIfShown($: EngineInterface, id: string, a: Alert): Promise<void> {
  if (await isPaneShown($, id)) await alert($, a)
}

/** Opens a result: a link in the browser, a file in its own app (Windows). */
function openThing($: EngineInterface, target: string): void {
  void $.process.run(['powershell', '-NoProfile', '-Command', 'Start-Process -FilePath $env:MLM_OPEN'], { env: { MLM_OPEN: target }, timeoutMs: 15_000 }).catch(() => undefined)
}

/** A native Open button for a result. */
function OpenButton(E: Parts, $: EngineInterface, target: string, label: string, key: string) {
  const { Button } = E
  return (
    <Button key={key} variant="secondary" onPress={() => openThing($, target)}>
      {label}
    </Button>
  )
}

/** "made by Sophie" in the mod's quiet color, and a GitHub button to the repository. */
function Credit(E: Parts, $: EngineInterface, text: string, color: string) {
  const { Box, Text, Button } = E
  return (
    <Box flexDirection="row" gap="sm" alignItems="center">
      <Text size="footnote" color={color}>
        {text}
      </Text>
      <Button key="credit-link" variant="secondary" onPress={() => openThing($, MAKER_URL)}>
        GitHub
      </Button>
    </Box>
  )
}
