// Copied from shared/alerts.ts by scripts/sync-shared.mjs: edit that file, not this one.
// Getting the person's attention: an in-app toast always; then a native
// notification and a sound. The engine's own notify and audio reach no one
// from the Windows desktop app (no terminal, no player), so on Windows both go
// through PowerShell: a Windows toast and System.Media.SoundPlayer.

import type { EngineInterface } from 'claude-code'

// Text reaches the script through environment variables, never through the
// command line, so a tool name or title can't break out of the string.
const TOAST_PS = [
  '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
  '[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null',
  '$d = New-Object Windows.Data.Xml.Dom.XmlDocument',
  `$d.LoadXml('<toast><visual><binding template="ToastGeneric"><text/><text/></binding></visual></toast>')`,
  "$b = $d.GetElementsByTagName('binding').Item(0)",
  "$x = $d.GetElementsByTagName('text')",
  '$x.Item(0).AppendChild($d.CreateTextNode($env:MLM_TITLE)) | Out-Null',
  '$x.Item(1).AppendChild($d.CreateTextNode($env:MLM_BODY)) | Out-Null',
  // the mod's name as the small attribution line, its round logo and its wide picture
  "if ($env:MLM_TAG) { $e = $d.CreateElement('text'); $e.SetAttribute('placement', 'attribution'); $e.AppendChild($d.CreateTextNode($env:MLM_TAG)) | Out-Null; $b.AppendChild($e) | Out-Null }",
  "if ($env:MLM_LOGO) { $e = $d.CreateElement('image'); $e.SetAttribute('placement', 'appLogoOverride'); $e.SetAttribute('hint-crop', 'circle'); $e.SetAttribute('src', $env:MLM_LOGO); $b.AppendChild($e) | Out-Null }",
  "if ($env:MLM_HERO) { $e = $d.CreateElement('image'); $e.SetAttribute('placement', 'hero'); $e.SetAttribute('src', $env:MLM_HERO); $b.AppendChild($e) | Out-Null }",
  // our own sound plays beside it, so the toast keeps quiet
  "if ($env:MLM_SILENT) { $e = $d.CreateElement('audio'); $e.SetAttribute('silent', 'true'); $d.DocumentElement.AppendChild($e) | Out-Null }",
  "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($d))",
].join('; ')

const SOUND_PS = '(New-Object Media.SoundPlayer $env:MLM_WAV).PlaySync()'

/** How a mod dresses its notification: its name, and pictures shipped with it (paths under the mod's folder). */
export type AlertLook = { tag: string; logo?: string; hero?: string }

export type Alert = { title: string; body: string; sound?: string; isNative: boolean; look?: AlertLook }

/** A file of the mod's as the file:/// address a Windows toast reads pictures from. */
function fileUrl($: EngineInterface, rel: string): string {
  return `file:///${`${$.plugin.root}/${rel}`.replace(/\\/g, '/')}`
}

export async function alert($: EngineInterface, a: Alert): Promise<void> {
  $.ui.toast(`${a.title} · ${a.body}`)
  if (!a.isNative) return
  const isWindows = (await $.env.get('OS')) === 'Windows_NT'
  if (!isWindows) {
    await $.ui.notify(a.body, { title: a.title }).catch(() => undefined)
    if (a.sound) await $.audio.play({ asset: a.sound }).catch(() => undefined)
    return
  }
  const sent = await $.ui.notify(a.body, { title: a.title }).catch(() => undefined)
  if (!sent?.isSent) {
    await $.process
      .run(['powershell', '-NoProfile', '-Command', TOAST_PS], {
        env: {
          MLM_TITLE: a.title,
          MLM_BODY: a.body,
          MLM_TAG: a.look?.tag ?? '',
          MLM_LOGO: a.look?.logo ? fileUrl($, a.look.logo) : '',
          MLM_HERO: a.look?.hero ? fileUrl($, a.look.hero) : '',
          MLM_SILENT: a.sound ? '1' : '',
        },
        timeoutMs: 15_000,
      })
      .catch(() => undefined)
  }
  if (a.sound) {
    const wav = `${$.plugin.root}\\${a.sound.replace(/\//g, '\\')}`
    await $.process.run(['powershell', '-NoProfile', '-Command', SOUND_PS], { env: { MLM_WAV: wav }, timeoutMs: 15_000 }).catch(() => undefined)
  }
}
