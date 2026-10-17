// UI parts every mod draws the same way, in its own colors: the log (newest
// line on top), an Open button, the alerts switch and the maker's line.
// Shared by all mods (see scripts/sync-shared.mjs).
//
// A desktop Button is the app's own native button and ignores colors inside
// it, so colored words are plain Text beside a Button, never inside one.

import type { ElementTable, EngineInterface } from 'claude-code'

import { alert } from './alerts'
import type { Alert } from './alerts'
import { logLine } from './core'

export type Parts = Pick<ElementTable<'desktop'>, 'Box' | 'Text' | 'Button'>

export const MAKER_URL = 'https://github.com/LetsBeLikeSophie/My-Little-Mods'

/** Opens a link in the browser, or a file in its own app (Windows). */
export function openThing($: EngineInterface, target: string): void {
  void $.process.run(['explorer.exe', target])
}

type LogAct = { id: string; tool: string; detail: string; full: string; startedAt: number; endedAt: number | null; isError: boolean; isSub: boolean }

export type LogLook = { ink: string; soft: string; error: string }
export type LogWords = { empty: string; more: string; less: string; ally: string; seconds: (ms: number) => string }

/**
 * The last `count` actions, newest on top: one line each, cut with "…", and
 * the whole lines once opened. The live one is drawn in full ink, a failure in
 * the error color, the rest soft.
 */
export function LogLines(E: Parts, acts: readonly LogAct[], isOpen: boolean, onToggle: () => unknown, look: LogLook, words: LogWords, count = 6) {
  const { Box, Text, Button } = E
  const lines = acts.slice(-count).reverse()
  if (lines.length === 0) {
    return (
      <Text mono size="footnote" color={look.soft}>
        {words.empty}
      </Text>
    )
  }
  return (
    <Box flexDirection="column">
      {lines.map(a => (
        <Text
          key={`log-${a.id}`}
          mono
          size="footnote"
          wrap={isOpen ? 'wrap' : 'truncate-end'}
          color={a.isError ? look.error : a.endedAt === null ? look.ink : look.soft}
        >
          {logLine(a, isOpen, words)}
        </Text>
      ))}
      <Button key="log-toggle" variant="secondary" onPress={onToggle}>
        {isOpen ? words.less : words.more}
      </Button>
    </Box>
  )
}

/** A native Open button for a result: a URL in the browser, a file in its app. */
export function OpenButton(E: Parts, $: EngineInterface, target: string, label: string, key: string) {
  const { Button } = E
  return (
    <Button key={key} variant="secondary" onPress={() => openThing($, target)}>
      {label}
    </Button>
  )
}

/** The alerts switch: on, the native notification and sound; off, the in-app toast alone. */
export function AlertsButton(E: Parts, isOn: boolean, words: { on: string; off: string }, onPress: () => unknown) {
  const { Button } = E
  return (
    <Button key="toggle-alerts" variant="secondary" onPress={onPress}>
      {isOn ? words.on : words.off}
    </Button>
  )
}

/** "made by Sophie" in the mod's quiet color, and a GitHub button to the repository. */
export function Credit(E: Parts, $: EngineInterface, text: string, color: string) {
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

/**
 * Whether this mod's pane is the one on screen. Every mod may draw the band
 * above the prompt, and the first one drawn would win; so only the mod whose
 * pane is shown draws it, and the others pass.
 */
export async function isPaneShown($: EngineInterface, id: string): Promise<boolean> {
  try {
    return (await $.ui.panes()).some(p => p.id === id && p.isShown)
  } catch {
    return false
  }
}

/** An alert from the mod on screen only, so three mods never ring at once. */
export async function alertIfShown($: EngineInterface, id: string, a: Alert): Promise<void> {
  if (await isPaneShown($, id)) await alert($, a)
}

// Which mod was opened last, shared by all of them in one small file, so a
// new session opens that one pane alone instead of every installed mod's.
async function lastFile($: EngineInterface): Promise<string | null> {
  const home = (await $.env.get('USERPROFILE')) || (await $.env.get('HOME'))
  return home ? `${home}/.claude/my-little-mods.json` : null
}

/** Notes that this mod's command just opened it. */
export async function rememberLast($: EngineInterface, id: string): Promise<void> {
  const path = await lastFile($)
  if (path) await $.fs.write(path, JSON.stringify({ last: id })).catch(() => undefined)
}

/** Whether this mod was the last one opened by its command. */
export async function wasLast($: EngineInterface, id: string): Promise<boolean> {
  const path = await lastFile($)
  if (!path) return false
  try {
    return (JSON.parse(await $.fs.read(path)) as { last?: string }).last === id
  } catch {
    return false
  }
}
