# Shows one small Windows notification for a My Little Mods mod, then plays
# its sound. Run by the mod as:
#   powershell -NoProfile -ExecutionPolicy Bypass -File <mod>/scripts/notify.ps1
# Everything that changes comes in environment variables, never in the
# command line:
#   MLM_TITLE  the first line (what happened)
#   MLM_BODY   the second line
#   MLM_TAG    the small line at the bottom (the mod's name)
#   MLM_LOGO   file:/// address of the mod's round logo
#   MLM_WAV    path of the mod's sound; when set, the notification is silent
#              and this script plays the sound itself
# It reads nothing else and sends nothing anywhere.

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null

$doc = New-Object Windows.Data.Xml.Dom.XmlDocument
$doc.LoadXml('<toast><visual><binding template="ToastGeneric"><text/><text/></binding></visual></toast>')
$binding = $doc.GetElementsByTagName('binding').Item(0)
$lines = $doc.GetElementsByTagName('text')
$lines.Item(0).AppendChild($doc.CreateTextNode($env:MLM_TITLE)) | Out-Null
$lines.Item(1).AppendChild($doc.CreateTextNode($env:MLM_BODY)) | Out-Null

if ($env:MLM_TAG) {
  $tag = $doc.CreateElement('text')
  $tag.SetAttribute('placement', 'attribution')
  $tag.AppendChild($doc.CreateTextNode($env:MLM_TAG)) | Out-Null
  $binding.AppendChild($tag) | Out-Null
}
if ($env:MLM_LOGO) {
  $logo = $doc.CreateElement('image')
  $logo.SetAttribute('placement', 'appLogoOverride')
  $logo.SetAttribute('hint-crop', 'circle')
  $logo.SetAttribute('src', $env:MLM_LOGO)
  $binding.AppendChild($logo) | Out-Null
}
if ($env:MLM_WAV) {
  $quiet = $doc.CreateElement('audio')
  $quiet.SetAttribute('silent', 'true')
  $doc.DocumentElement.AppendChild($quiet) | Out-Null
}

# Shown under Windows PowerShell's own app identity.
$app = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($app).Show([Windows.UI.Notifications.ToastNotification]::new($doc))

if ($env:MLM_WAV) {
  $player = New-Object Media.SoundPlayer $env:MLM_WAV
  $player.PlaySync()
}
