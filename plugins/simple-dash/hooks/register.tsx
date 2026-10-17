import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren, SessionRateLimit, Timer } from 'claude-code'

import type { Accent, Act, Output, Quota, Turn } from '../types'
import {
  DOC_EXT,
  artifactIn,
  barCells,
  baseName,
  busyMs,
  detailOf,
  gainText,
  isCheckCommand,
  kindOf,
  lighten,
  nextPlan,
  pctOf,
  statusOf,
  toolName,
} from './core'
import { ACCENT_NAMES, STATUS, TIME_LABELS, UI, ago, langFrom, seconds, untilText } from './i18n'
import type { Lang } from './i18n'

const PANE = 'simple-dash'
const TITLE = 'Dashboard'
const MAKER_URL = 'https://github.com/LetsBeLikeSophie/My-Little-Mods'
const LOG_LINES = 6
const BAR = 16

const acts = atom({ plugin: 'simple-dash', key: 'acts' } as const, [])
const turn = atom({ plugin: 'simple-dash', key: 'turn' } as const, { isWorking: false, startedAt: 0, endedAt: null, ids: [] })
const outputs = atom({ plugin: 'simple-dash', key: 'outputs' } as const, [])
const spent = atom({ plugin: 'simple-dash', key: 'spent' } as const, {})
const quota = atom({ plugin: 'simple-dash', key: 'quota' } as const, { limits: [], contextPct: null })
const limitBase = atom({ plugin: 'simple-dash', key: 'limitBase' } as const, { five: null, week: null })
const plan = atom({ plugin: 'simple-dash', key: 'plan' } as const, { items: [], current: -1 })
const accent = atom({ plugin: 'simple-dash', key: 'accent' } as const, 'blue')
const theme = atom({ plugin: 'simple-dash', key: 'theme' } as const, 'dark')
const lang = atom({ plugin: 'simple-dash', key: 'lang' } as const, langFrom(Intl.DateTimeFormat().resolvedOptions().locale) ?? 'en')
const logOpen = atom({ plugin: 'simple-dash', key: 'logOpen' } as const, '')
const now = atom({ plugin: 'simple-dash', key: 'now' } as const, 0)

export const ACCENTS: { [K in Accent]: string } = {
  blue: '#3B82F6',
  green: '#10B981',
  purple: '#8B5CF6',
  orange: '#F59E0B',
  mono: '#9CA3AF',
}
const ACCENT_IDS = Object.keys(ACCENTS) as Accent[]

const THEMES = {
  dark: { BG: '#16181D', CARD: '#1F2229', FG: '#E8EAED', DIM: '#8B9099', EMPTY: '#2E323A', RED: '#F87171' },
  light: { BG: '#F6F7F9', CARD: '#FFFFFF', FG: '#1F2328', DIM: '#6B7280', EMPTY: '#E5E7EB', RED: '#DC2626' },
} as const

function isAccent(v: unknown): v is Accent {
  return typeof v === 'string' && (ACCENT_IDS as string[]).includes(v)
}

function quotaFrom(u: { rateLimits: readonly SessionRateLimit[]; context: { percent?: number } }): Quota {
  return {
    limits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt ?? null })),
    contextPct: u.context.percent ?? null,
  }
}

function clock(ms: number): string {
  const d = new Date(ms)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
}

/** One log line: time, result, tool, what it touched, how long. */
export function logLine(a: Act, lg: Lang, whole = false): string {
  const mark = a.endedAt === null ? '…' : a.isError ? '✗' : '✓'
  const took = a.endedAt === null ? '' : ` (${seconds(lg, a.endedAt - a.startedAt)})`
  const who = a.isSub ? ` ${UI[lg].ally}` : ''
  return `${clock(a.startedAt)} ${mark} ${toolName(a.tool)}${a.detail ? ` ${whole ? a.full || a.detail : a.detail}` : ''}${took}${who}`
}

/** The system's display language: Windows' own setting, else LANG / LC_ALL. */
async function systemLang($: EngineInterface): Promise<Lang | undefined> {
  if ((await $.env.get('OS')) === 'Windows_NT') {
    const r = await $.process.run(['powershell', '-NoProfile', '-Command', '(Get-UICulture).Name'], { timeoutMs: 8000 })
    const found = langFrom(r.stdout)
    if (r.exitCode === 0 && found) return found
  }
  return langFrom(await $.env.get('LC_ALL')) ?? langFrom(await $.env.get('LANG'))
}

let ticker: Timer | undefined

// The spinner's own words, so "thinking" can say what it is thinking about.
let spinner: { word: string; at: number } | undefined

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    void systemLang($)
      .then(found => (found ? update($, lang, () => found) : undefined))
      .catch(() => undefined)
    await $.command.register({ name: 'dash', description: `${UI.ko.command} / ${UI.en.command}` })
    const savedAccent = await $.store.get('accent')
    if (isAccent(savedAccent)) await update($, accent, () => savedAccent)
    const savedTheme = await $.store.get('theme')
    if (savedTheme === 'dark' || savedTheme === 'light') await update($, theme, () => savedTheme)
    void $.session.usage().then(u => update($, quota, () => quotaFrom(u))).catch(() => undefined)
    ticker?.cancel()
    ticker = $.clock.every(1000, () => void update($, now, () => Date.now()))
    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'dash' }, async ($, e) => {
    const lg = await read($, lang)
    const want = e.args.trim()
    if (isAccent(want)) {
      await update($, accent, () => want)
      await $.store.set('accent', want)
    }
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: isAccent(want) ? UI[lg].colored(ACCENT_NAMES[lg][want]) : UI[lg].opened }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      const t = Date.now()
      await update($, turn, () => ({ isWorking: true, startedAt: t, endedAt: null, ids: [] }))
      await update($, now, () => t)
      // Where the usage limits stand now: what this request adds is measured from here.
      void $.session
        .usage()
        .then(async u => {
          const q = quotaFrom(u)
          await update($, quota, () => q)
          await update($, limitBase, () => ({ five: pctOf(q, 'five_hour'), week: pctOf(q, 'seven_day') }))
        })
        .catch(() => undefined)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) {
      const end = Date.now()
      const t = await read($, turn)
      const list = await read($, acts)
      const tools = busyMs(list.filter(a => t.ids.includes(a.id)), end)
      const think = t.startedAt ? Math.max(0, end - t.startedAt - tools) : 0
      await update($, spent, (m: { [k: string]: number }) => ({ ...m, thinking: (m.thinking ?? 0) + think }))
      await update($, turn, (x: Turn) => ({ ...x, isWorking: false, endedAt: end }))
      void $.session.usage().then(u => update($, quota, () => quotaFrom(u))).catch(() => undefined)
    }

    return done
  })

  on('tool.call', async ($, e, next) => {
    const args = e as unknown as { [k: string]: unknown }
    const act: Act = {
      id: e.tool_use_id,
      tool: e.tool,
      kind: kindOf(e.tool),
      detail: detailOf(args),
      full: detailOf(args, 400, true),
      startedAt: Date.now(),
      endedAt: null,
      isError: false,
      isSub: e.agentId !== undefined,
      isCheck: isCheckCommand(e.tool, args.command),
    }
    await update($, acts, (list: Act[]) => [...list, act].slice(-200))
    if (e.agentId === undefined) await update($, turn, (t: Turn) => ({ ...t, ids: [...t.ids, act.id].slice(-60) }))
    const p1 = nextPlan(await read($, plan), e.tool, args)
    if (p1) await update($, plan, () => p1)
    const path = typeof args.file_path === 'string' ? args.file_path : undefined

    const ran = await next(e)
    const isError = ran.deny !== undefined || ran.isError === true
    if (e.agentId === undefined) {
      const key = act.isCheck ? 'check' : act.kind
      const took = Date.now() - act.startedAt
      await update($, spent, (m: { [k: string]: number }) => ({ ...m, [key]: (m[key] ?? 0) + took }))
    }
    await update($, acts, (list: Act[]) => list.map(one => (one.id === act.id ? { ...one, endedAt: Date.now(), isError } : one)))

    if (!isError) {
      const made: Output[] = []
      const url = artifactIn(`${ran.text ?? ''} ${JSON.stringify(ran.result ?? '').slice(0, 20000)}`)
      if (url) {
        const title = typeof args.title === 'string' ? args.title : path ? baseName(path) : 'Artifact'
        made.push({ href: url, title, kind: 'artifact', at: Date.now() })
      } else if (path && (act.kind === 'edit' || act.kind === 'write') && DOC_EXT.test(path)) {
        made.push({ href: path, title: baseName(path), kind: 'file', at: Date.now() })
      }
      if (made.length > 0) {
        await update($, outputs, (list: Output[]) => [...made, ...list.filter(o => !made.some(m => m.href === o.href))].slice(0, 6))
      }
    }

    return ran
  }).catch(($, e, next) => next(e)) // bookkeeping never blocks a tool

  on('session.measure', async ($, e, next) => {
    await update($, quota, () => quotaFrom(e))
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, ($, e, next) => {
    spinner = { word: e.props.message ?? e.props.word, at: Date.now() }
    return next(e)
  })

  // One line above the prompt: the status and the usage limits, so it still shows
  // with the pane closed. Plain text in the app's own colors, the accent on the dot.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const list = await read($, acts)
    const t = await read($, turn)
    const lg = await read($, lang)
    const ac = await read($, accent)
    const qt = await read($, quota)
    const base = await read($, limitBase)
    const at = Math.max(await read($, now), Date.now())
    const status = statusOf(t, list, at)
    const live = [...list].reverse().find(a => a.endedAt === null)
    const five = pctOf(qt, 'five_hour')
    const week = pctOf(qt, 'seven_day')
    const fiveGain = gainText(five, base.five)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" gap={1}>
        <Text>
          <Text color={ac === 'mono' ? undefined : ACCENTS[ac]}>●</Text> {STATUS[lg][status]}
        </Text>
        {live && (
          <Text dimColor wrap="truncate-end">
            · {toolName(live.tool)}
            {live.detail ? ` ${live.detail}` : ''}
          </Text>
        )}
        {five !== null && (
          <Text dimColor>
            {UI[lg].five} {Math.round(five)}%{fiveGain ? ` ${fiveGain}` : ''}
          </Text>
        )}
        {week !== null && (
          <Text dimColor>
            {UI[lg].week} {Math.round(week)}%
          </Text>
        )}
      </Box>
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, acts)
    const t = await read($, turn)
    const made = await read($, outputs)
    const used = await read($, spent)
    const qt = await read($, quota)
    const base = await read($, limitBase)
    const pl = await read($, plan)
    const ac = await read($, accent)
    const th = await read($, theme)
    const lg = await read($, lang)
    const opened = await read($, logOpen)
    const tick = await read($, now)
    const L = UI[lg]
    const { BG, CARD, FG, DIM, EMPTY, RED } = THEMES[th]
    const A = ac === 'mono' ? FG : ACCENTS[ac]
    const GLOW = ac === 'mono' ? DIM : lighten(ACCENTS[ac], 0.45)

    const at = Math.max(tick, Date.now())
    const status = statusOf(t, list, at)
    const live = [...list].reverse().find(a => a.endedAt === null)
    const step = pl.current >= 0 ? (pl.items[pl.current] ?? '') : ''
    const thinkingWord = spinner && at - spinner.at < 10_000 && spinner.word !== 'Working' ? spinner.word : ''
    const sub = live
      ? `${toolName(live.tool)}${live.detail ? ` · ${live.detail}` : ''}${live.isSub ? ` ${L.ally}` : ''}`
      : status === 'thinking'
        ? (thinkingWord ? `${thinkingWord}…` : step ? `${L.step}${step}` : '')
        : ''
    const elapsed = t.startedAt ? (t.isWorking ? at : (t.endedAt ?? t.startedAt)) - t.startedAt : 0
    const log = list.slice(-LOG_LINES)
    const timeRows = Object.entries(used).filter(([, ms]) => ms >= 500).sort((x, y) => y[1] - x[1]).slice(0, 6)
    const timeTotal = timeRows.reduce((n, [, ms]) => n + ms, 0) || 1
    const timeMax = Math.max(1, ...timeRows.map(([, ms]) => ms))

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Text bold>● {STATUS[lg][status]}</Text>
          {sub && <Text dimColor>{sub}</Text>}
          {made.map(o => (
            <Text key={o.href}>
              {o.title} {o.href}
            </Text>
          ))}
        </Box>
      )
    }

    const { Box, Text, Button } = $.ui.resolve(e)
    const card = (key: string, title: string, children: RenderChildren, note?: string) => (
      <Box key={key} flexDirection="column" gap="sm" padding="md" backgroundColor={CARD}>
        <Box flexDirection="row" gap={1}>
          <Text size="footnote" weight="semibold" color={DIM}>
            {title}
          </Text>
          {note && (
            <Text size="footnote" color={DIM}>
              · {note}
            </Text>
          )}
        </Box>
        {children}
      </Box>
    )
    const bar = (key: string, label: string, pct: number | null, b: number | null | undefined, right: string) => {
      const c = barCells(pct, b, BAR)
      const gain = gainText(pct, b)
      return (
        <Box key={key} flexDirection="row" gap={1}>
          <Text mono color={FG}>
            {label.padEnd(lg === 'ko' ? 3 : 7)}
          </Text>
          <Box flexDirection="row">
            <Text mono color={A}>
              {'━'.repeat(c.old)}
            </Text>
            <Text mono color={GLOW}>
              {'━'.repeat(c.gained)}
            </Text>
            <Text mono color={EMPTY}>
              {'━'.repeat(c.empty)}
            </Text>
          </Box>
          <Text mono tabular color={FG}>
            {pct === null ? ' –' : `${String(Math.round(pct)).padStart(3)}%`}
          </Text>
          {gain && (
            <Text mono color={GLOW}>
              {gain}
            </Text>
          )}
          {right && (
            <Text size="footnote" color={DIM}>
              {right}
            </Text>
          )}
        </Box>
      )
    }
    const limitRow = (kind: 'five_hour' | 'seven_day') => {
      const q = qt.limits.find(l => l.kind === kind)
      const reset = q?.resetsAt ? Date.parse(q.resetsAt) - at : NaN
      return bar(
        kind,
        kind === 'five_hour' ? L.five : L.week,
        q ? q.percentUsed : null,
        kind === 'five_hour' ? base.five : base.week,
        Number.isFinite(reset) ? `↻ ${untilText(lg, reset)}` : '',
      )
    }

    return (
      <Box flexDirection="column" gap="md" padding="md" backgroundColor={BG}>
        <Box flexDirection="column" gap="xs" padding="md" backgroundColor={CARD}>
          <Box flexDirection="row" justifyContent="space-between">
            <Text weight="bold" size="heading" color={status === 'error' ? RED : FG}>
              <Text color={A}>● </Text>
              {STATUS[lg][status]}
            </Text>
            <Text mono tabular color={DIM}>
              {t.startedAt ? seconds(lg, elapsed) : ''}
            </Text>
          </Box>
          {sub && (
            <Text mono size="footnote" color={DIM} wrap="truncate-end">
              {sub}
            </Text>
          )}
        </Box>

        {card(
          'limits',
          L.limits,
          <Box flexDirection="column">
            {limitRow('five_hour')}
            {limitRow('seven_day')}
            {bar('session', L.session, qt.contextPct, undefined, (qt.contextPct ?? 0) >= 80 ? L.compactSoon : '')}
            <Text size="footnote" color={DIM}>
              {L.sessionNote}
            </Text>
          </Box>,
          L.limitsNote,
        )}

        {card(
          'results',
          L.results,
          made.length === 0 ? (
            <Text size="footnote" color={DIM}>
              {L.resultsEmpty}
            </Text>
          ) : (
            <Box flexDirection="column">
              {made.slice(0, 4).map((o, i) => (
                <Box key={o.href} flexDirection="row" gap="sm" alignItems="center">
                  {/* A desktop Button is native and ignores the color inside it: themed text plus an Open button. */}
                  <Text color={i === 0 ? A : FG} wrap="truncate-end">
                    {o.title}
                  </Text>
                  <Text size="footnote" color={DIM}>
                    {ago(lg, at - o.at)}
                  </Text>
                  <Button key={`open-${i}`} variant="secondary" onPress={() => void $.process.run(['explorer.exe', o.href])}>
                    {L.open}
                  </Button>
                </Box>
              ))}
            </Box>
          ),
        )}

        {card(
          'time',
          L.time,
          timeRows.length === 0 ? (
            <Text size="footnote" color={DIM}>
              {L.timeEmpty}
            </Text>
          ) : (
            <Box flexDirection="column">
              {timeRows.map(([k, ms]) => (
                <Box key={`time-${k}`} flexDirection="row" gap={1}>
                  <Text mono color={FG}>
                    {(TIME_LABELS[lg][k] ?? k).padEnd(lg === 'ko' ? 4 : 8)}
                  </Text>
                  <Text mono color={A}>
                    {'█'.repeat(Math.max(1, Math.round((ms / timeMax) * 10)))}
                  </Text>
                  <Text mono tabular size="footnote" color={DIM}>
                    {seconds(lg, ms)} · {Math.round((ms / timeTotal) * 100)}%
                  </Text>
                </Box>
              ))}
            </Box>
          ),
        )}

        {card(
          'log',
          L.log,
          log.length === 0 ? (
            <Text size="footnote" color={DIM}>
              {L.logEmpty}
            </Text>
          ) : (
            <Box flexDirection="column">
              {log.map(a => (
                <Text
                  key={`log-${a.id}`}
                  mono
                  size="footnote"
                  wrap={opened ? 'wrap' : 'truncate-end'}
                  color={a.isError ? RED : a.endedAt === null ? FG : DIM}
                >
                  {logLine(a, lg, Boolean(opened))}
                </Text>
              ))}
              <Button key="log-toggle" variant="secondary" onPress={() => update($, logOpen, (v: string) => (v ? '' : 'all'))}>
                {opened ? L.logLess : L.logMore}
              </Button>
            </Box>
          ),
        )}

        <Box flexDirection="row" gap="sm" flexWrap="wrap" alignItems="center">
          {ACCENT_IDS.map(id => (
            <Box key={`accent-row-${id}`} flexDirection="row" gap="xs" alignItems="center">
              <Text color={id === 'mono' ? FG : ACCENTS[id]}>{id === ac ? '◉' : '●'}</Text>
              <Button
                key={`accent-${id}`}
                variant={id === ac ? 'primary' : 'secondary'}
                onPress={async () => {
                  await update($, accent, () => id)
                  await $.store.set('accent', id)
                }}
              >
                {ACCENT_NAMES[lg][id]}
              </Button>
            </Box>
          ))}
          <Button
            key="toggle-theme"
            variant="secondary"
            onPress={async () => {
              const next = th === 'dark' ? 'light' : 'dark'
              await update($, theme, () => next)
              await $.store.set('theme', next)
            }}
          >
            {th === 'dark' ? `☀ ${L.light}` : `☾ ${L.dark}`}
          </Button>
        </Box>

        <Box flexDirection="row" gap="sm" alignItems="center">
          <Text key="credit" size="footnote" color={DIM}>
            {L.madeBy}
          </Text>
          <Button key="credit-link" variant="secondary" onPress={() => void $.process.run(['explorer.exe', MAKER_URL])}>
            GitHub
          </Button>
        </Box>
      </Box>
    )
  })
}
