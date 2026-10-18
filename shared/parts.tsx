// UI parts every mod draws the same way, in its own colors: the log (newest
// line on top) and the alerts switch. Shared by all mods (see
// scripts/sync-shared.mjs); the parts that use the engine are in engine.tsx.
//
// A desktop Button is the app's own native button and ignores colors inside
// it, so colored words are plain Text beside a Button, never inside one.

import type { ElementTable } from 'claude-code'

import { logLine } from './core'

export type Parts = Pick<ElementTable<'desktop'>, 'Box' | 'Text' | 'Button'>

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

/** The alerts switch: on, the native notification and sound; off, the in-app toast alone. */
export function AlertsButton(E: Parts, isOn: boolean, words: { on: string; off: string }, onPress: () => unknown) {
  const { Button } = E
  return (
    <Button key="toggle-alerts" variant="secondary" onPress={onPress}>
      {isOn ? words.on : words.off}
    </Button>
  )
}
