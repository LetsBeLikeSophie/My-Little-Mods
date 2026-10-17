// Getting the person's attention: an in-app toast always; then a native
// notification and a sound. The engine's own notify and audio reach no one
// from the Windows desktop app (no terminal, no player), so on Windows both go
// through PowerShell: a Windows toast and System.Media.SoundPlayer.

import type { EngineInterface } from 'claude-code'

// Text reaches the script through environment variables, never through the
// command line, so a tool name or title can't break out of the string.
const TOAST_PS = [
  '[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null',
  '$t = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)',
  "$x = $t.GetElementsByTagName('text')",
  '$x.Item(0).AppendChild($t.CreateTextNode($env:MLM_TITLE)) | Out-Null',
  '$x.Item(1).AppendChild($t.CreateTextNode($env:MLM_BODY)) | Out-Null',
  "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe').Show([Windows.UI.Notifications.ToastNotification]::new($t))",
].join('; ')

const SOUND_PS = '(New-Object Media.SoundPlayer $env:MLM_WAV).PlaySync()'

export type Alert = { title: string; body: string; sound?: string; isNative: boolean }

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
      .run(['powershell', '-NoProfile', '-Command', TOAST_PS], { env: { MLM_TITLE: a.title, MLM_BODY: a.body }, timeoutMs: 15_000 })
      .catch(() => undefined)
  }
  if (a.sound) {
    const wav = `${$.plugin.root}\\${a.sound.replace(/\//g, '\\')}`
    await $.process.run(['powershell', '-NoProfile', '-Command', SOUND_PS], { env: { MLM_WAV: wav }, timeoutMs: 15_000 }).catch(() => undefined)
  }
}
