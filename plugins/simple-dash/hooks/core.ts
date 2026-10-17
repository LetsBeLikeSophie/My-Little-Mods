// What the dashboard knows, worked out from tool calls and requests: the same
// bookkeeping as pixel-activity, without the pictures.

import type { Act, ActKind, Quota, Turn } from '../types'

export type Status = ActKind | 'check' | 'thinking' | 'error' | 'done' | 'waiting' | 'approval'

const DONE_MS = 8_000

/** The tools Claude reaches for, by name, in plain words. */
export function kindOf(tool: string): ActKind {
  if (/^(Read|NotebookRead)$/.test(tool)) return 'read'
  if (/^(Grep|Glob|ToolSearch|LS)$/.test(tool)) return 'search'
  if (/^(Edit|MultiEdit|NotebookEdit)$/.test(tool)) return 'edit'
  if (tool === 'Write') return 'write'
  if (/^(Bash|PowerShell|Monitor)$/.test(tool)) return 'bash'
  if (/^(WebFetch|WebSearch)$/.test(tool) || /^mcp__(Claude_Browser|claude-in-chrome)__/.test(tool)) return 'web'
  if (/^(Agent|Task|Workflow|SendMessage)$/.test(tool)) return 'agent'
  return 'other'
}

// A command that tests or checks the work.
const CHECK = /\b(test|tests|pytest|jest|vitest|mocha|tsc|lint|eslint|ruff|mypy|validate|check|build)\b/i

export function isCheckCommand(tool: string, command: unknown): boolean {
  return /^(Bash|PowerShell)$/.test(tool) && typeof command === 'string' && CHECK.test(command)
}

/** A tool's short display name: `mcp__x__navigate` reads as `navigate`. */
export function toolName(tool: string): string {
  return tool.startsWith('mcp__') ? (tool.split('__').pop() ?? tool) : tool
}

export function baseName(path: string): string {
  return path.split(/[\\/]/).filter(Boolean).pop() ?? path
}

export function detailOf(args: { [k: string]: unknown }, max = 40, whole = false): string {
  const pick = (k: string) => (typeof args[k] === 'string' ? (args[k] as string) : undefined)
  const path = pick('file_path') ?? pick('notebook_path') ?? pick('path')
  const text =
    (path && (whole ? path : baseName(path))) ??
    pick('description') ??
    pick('command') ??
    pick('pattern') ??
    pick('query') ??
    pick('url') ??
    pick('prompt') ??
    ''
  const line = text.replace(/\s+/g, ' ').trim()
  return line.length > max ? `${line.slice(0, max - 1)}…` : line
}

const ARTIFACT_URL = /https:\/\/claude\.ai\/[^\s"'<>)\]\\]*artifact[^\s"'<>)\]\\]*/

/** A link for a published artifact named in a tool's answer, if any. */
export function artifactIn(text: string): string | undefined {
  return ARTIFACT_URL.exec(text)?.[0]
}

export const DOC_EXT = /\.(md|markdown|html?|pdf|docx|pptx|xlsx|csv|png|jpe?g|gif|svg|txt)$/i

type Plan = { items: string[]; current: number }

/** The step in progress, after a task-list call (the app's update_plan or TodoWrite). */
export function nextPlan(prev: Plan, tool: string, args: { [k: string]: unknown }): Plan | undefined {
  type Item = { content?: unknown; status?: unknown; activeForm?: unknown }
  if (!/(update_plan|TodoWrite)$/.test(tool)) return undefined
  const list = (Array.isArray(args.items) ? args.items : Array.isArray(args.todos) ? args.todos : undefined) as Item[] | undefined
  if (list) return { items: list.map(i => String(i.activeForm ?? i.content ?? '')), current: list.findIndex(i => i.status === 'in_progress') }
  if (args.advance === true) {
    const current = prev.current + 1
    return { ...prev, current: current < prev.items.length ? current : -1 }
  }
  if (typeof args.start === 'number') return { ...prev, current: args.start - 1 }
  return undefined
}

/** What to say Claude is doing right now. */
export function statusOf(t: Turn, list: readonly Act[], at: number, isAsking = false): Status {
  if (isAsking) return 'approval'
  const live = [...list].reverse().find(a => a.endedAt === null)
  if (t.isWorking) {
    if (live) return live.isCheck ? 'check' : live.kind
    const last = list.filter(a => t.ids.includes(a.id)).pop()
    if (last?.isError && last.endedAt !== null && at - last.endedAt < 4_000) return 'error'
    return 'thinking'
  }
  if (t.endedAt !== null && at - t.endedAt < DONE_MS) return 'done'
  return 'waiting'
}

/** Wall time covered by calls (overlaps counted once), up to `at` for one still running. */
export function busyMs(acts: readonly { startedAt: number; endedAt: number | null }[], at: number): number {
  const spans = acts
    .map(a => [a.startedAt, a.endedAt ?? at] as const)
    .filter(([s, e]) => e > s)
    .sort((x, y) => x[0] - y[0])
  let total = 0
  let curS = -1
  let curE = -1
  for (const [s, e] of spans) {
    if (s > curE) {
      if (curE > curS) total += curE - curS
      curS = s
      curE = e
    } else if (e > curE) curE = e
  }
  if (curE > curS) total += curE - curS
  return total
}

export function pctOf(q: Quota, kind: string): number | null {
  return q.limits.find(l => l.kind === kind)?.percentUsed ?? null
}

/** How much a limit rose since `base`: "+3%", "+0.4%", or "". */
export function gainText(pct: number | null, base: number | null | undefined): string {
  if (pct === null || base === null || base === undefined) return ''
  const d = Math.round((pct - base) * 10) / 10
  return d > 0 ? `+${d >= 1 ? Math.round(d) : d}%` : ''
}

/** A text bar: how many of `width` cells are full, and how many of those are new since `base`. */
export function barCells(pct: number | null, base: number | null | undefined, width: number): { old: number; gained: number; empty: number } {
  const cells = (p: number) => Math.max(0, Math.min(width, Math.round((p / 100) * width)))
  const lit = pct === null ? 0 : cells(pct)
  let from = base === null || base === undefined ? lit : Math.min(lit, cells(base))
  if (gainText(pct, base) && from === lit && lit > 0) from = lit - 1
  return { old: from, gained: lit - from, empty: width - lit }
}

/** Mixes a hex color toward white by `t` (0..1), or toward black by a negative `t`. */
export function lighten(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16)
  // t > 0 mixes toward white, t < 0 toward black.
  const ch = (shift: number) => {
    const v = (n >> shift) & 255
    return Math.round(t >= 0 ? v + (255 - v) * t : v * (1 + t))
  }
  return `#${[16, 8, 0].map(s => ch(s).toString(16).padStart(2, '0')).join('')}`
}
