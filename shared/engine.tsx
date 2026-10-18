// The helpers that use the engine ($). The directory reads a mod's calls on
// $ only in the file that registers its hooks, so these live in register.tsx.
// The one program a mod runs is Windows PowerShell, with fixed scripts written
// in each call; what changes (a title, a file path) travels in environment
// variables, never in the command line.

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
 * notification (what happened, with the mod's logo) and its sound in one
 * PowerShell run, or the
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
  await $.process.run(['powershell', '-NoProfile', '-Command', '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null; [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null; $d = New-Object Windows.Data.Xml.Dom.XmlDocument; $d.LoadXml("<toast><visual></visual></toast>"); $b = $d.CreateElement("binding"); $b.SetAttribute("template", "ToastGeneric"); $d.GetElementsByTagName("visual").Item(0).AppendChild($b) | Out-Null; $t1 = $d.CreateElement("text"); $t1.AppendChild($d.CreateTextNode($env:MLM_TITLE)) | Out-Null; $b.AppendChild($t1) | Out-Null; $t2 = $d.CreateElement("text"); $t2.AppendChild($d.CreateTextNode($env:MLM_BODY)) | Out-Null; $b.AppendChild($t2) | Out-Null; if ($env:MLM_TAG) { $e = $d.CreateElement("text"); $e.SetAttribute("placement", "attribution"); $e.AppendChild($d.CreateTextNode($env:MLM_TAG)) | Out-Null; $b.AppendChild($e) | Out-Null }; if ($env:MLM_LOGO) { $e = $d.CreateElement("image"); $e.SetAttribute("placement", "appLogoOverride"); $e.SetAttribute("hint-crop", "circle"); $e.SetAttribute("src", $env:MLM_LOGO); $b.AppendChild($e) | Out-Null }; if ($env:MLM_WAV) { $e = $d.CreateElement("audio"); $e.SetAttribute("silent", "true"); $d.DocumentElement.AppendChild($e) | Out-Null }; $s = [string][char]92; $app = "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}" + $s + "WindowsPowerShell" + $s + "v1.0" + $s + "powershell.exe"; [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($d)); if ($env:MLM_WAV) { (New-Object Media.SoundPlayer $env:MLM_WAV).PlaySync() }'], {
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
