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
import { AlertsButton, Credit, LogLines, OpenButton, alertIfShown, isPaneShown, rememberLast, wasLast } from './parts'
import { bandSvg, headingSvg, ringsSvg, statusSvg, timeSvg } from './calm'
import type { Palette } from './calm'

const PANE = 'calm'
const TITLE = 'Calm'
const BAR = 16

const acts = atom({ plugin: 'calm', key: 'acts' } as const, [])
const turn = atom({ plugin: 'calm', key: 'turn' } as const, { isWorking: false, startedAt: 0, endedAt: null, ids: [] })
const outputs = atom({ plugin: 'calm', key: 'outputs' } as const, [])
const spent = atom({ plugin: 'calm', key: 'spent' } as const, {})
const quota = atom({ plugin: 'calm', key: 'quota' } as const, { limits: [], contextPct: null })
const limitBase = atom({ plugin: 'calm', key: 'limitBase' } as const, { five: null, week: null })
const plan = atom({ plugin: 'calm', key: 'plan' } as const, { items: [], current: -1 })
const accent = atom({ plugin: 'calm', key: 'accent' } as const, 'blue')
const theme = atom({ plugin: 'calm', key: 'theme' } as const, 'dark')
const lang = atom({ plugin: 'calm', key: 'lang' } as const, langFrom(Intl.DateTimeFormat().resolvedOptions().locale) ?? 'en')
const logOpen = atom({ plugin: 'calm', key: 'logOpen' } as const, '')
const now = atom({ plugin: 'calm', key: 'now' } as const, 0)
const approval = atom({ plugin: 'calm', key: 'approval' } as const, null)
const alerts = atom({ plugin: 'calm', key: 'alerts' } as const, true)
const life = atom({ plugin: 'calm', key: 'life' } as const, { quests: 0, slain: 0, actions: 0 })

type Life = { quests: number; slain: number; actions: number }
const LONG_TURN_MS = 30_000
const APPROVAL_ALERT_MS = 4_000

// Soft, airy accents: one per dashboard, on its circle, rings and bars.
export const ACCENTS: { [K in Accent]: string } = {
  blue: '#8FA2F2',
  green: '#78C2A0',
  purple: '#B39BF3',
  orange: '#F2AE72',
  mono: '#A3A8B4',
}
const ACCENT_IDS = Object.keys(ACCENTS) as Accent[]
/** The notification dressed in the chosen color: its leaf logo and soft rings. */
async function calmLook($: EngineInterface) {
  const ac = await read($, accent)
  return { tag: '🍃 Calm', logo: `images/logo-${ac}.png`, hero: `images/hero-${ac}.png` }
}

// Colored emoji keep their color inside the app's native buttons.
const SWATCH: { [K in Accent]: string } = { blue: '🔵', green: '🟢', purple: '🟣', orange: '🟠', mono: '⚪' }

const THEMES = {
  dark: { BG: '#141620', CARD: '#1F2330', FG: '#E8EAF0', DIM: '#8E95A6', EMPTY: '#2C3142', RED: '#F28B8B' },
  light: { BG: '#EEF0F8', CARD: '#FFFFFF', FG: '#2B2D33', DIM: '#8A8F9C', EMPTY: '#EEF0F7', RED: '#D9534F' },
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
    await $.command.register({ name: 'calm', description: `${UI.ko.command} / ${UI.en.command}` })
    const savedAccent = await $.store.get('accent')
    if (isAccent(savedAccent)) await update($, accent, () => savedAccent)
    const savedTheme = await $.store.get('theme')
    if (savedTheme === 'dark' || savedTheme === 'light') await update($, theme, () => savedTheme)
    const savedAlerts = await $.store.get('alerts')
    if (typeof savedAlerts === 'boolean') await update($, alerts, () => savedAlerts)
    const savedLife = (await $.store.get('life')) as Life | undefined
    if (savedLife && typeof savedLife.quests === 'number') await update($, life, () => savedLife)
    await update($, approval, () => null)
    void $.session.usage().then(u => update($, quota, () => quotaFrom(u))).catch(() => undefined)
    ticker?.cancel()
    ticker = $.clock.every(1000, () => void update($, now, () => Date.now()))
    // Open by command; a new session reopens only the mod that was used last.
    if (await wasLast($, PANE)) void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'calm' }, async ($, e) => {
    const lg = await read($, lang)
    const want = e.args.trim()
    if (isAccent(want)) {
      await update($, accent, () => want)
      await $.store.set('accent', want)
    }
    await $.ui.open({ id: PANE, title: TITLE })
    await rememberLast($, PANE)

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
      await update($, approval, () => null)
      const l = await update($, life, (x: Life) => ({ ...x, quests: x.quests + 1 }))
      await $.store.set('life', l)
      if (t.startedAt && end - t.startedAt >= LONG_TURN_MS) {
        const lg = await read($, lang)
        void alertIfShown($, PANE, { look: await calmLook($), title: UI[lg].doneTitle, body: UI[lg].doneBody(seconds(lg, end - t.startedAt)), sound: 'sounds/done.wav', isNative: await read($, alerts) })
      }
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
    if ((await read($, approval))?.id === act.id) await update($, approval, () => null)
    if (e.agentId === undefined) {
      const l = await update($, life, (x: Life) => ({ ...x, actions: x.actions + 1, slain: x.slain + (act.isCheck && !isError ? 1 : 0) }))
      await $.store.set('life', l)
    }
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

  // The engine is about to ask the person whether a call may run: say so, and
  // if they haven't answered after a few seconds, get their attention.
  on('tool.check', async ($, e, next) => {
    const verdict = await next(e)
    if (verdict.decision === 'ask' && e.agentId === undefined) {
      const id = e.tool_use_id ?? `${e.tool}-${Date.now()}`
      await update($, approval, () => ({ id, tool: e.tool, since: Date.now() }))
      $.clock.after(APPROVAL_ALERT_MS, () => {
        void (async () => {
          const still = await read($, approval)
          if (still?.id !== id) return
          const lg = await read($, lang)
          await alertIfShown($, PANE, { look: await calmLook($), title: UI[lg].approvalTitle, body: UI[lg].approvalBody(toolName(e.tool)), sound: 'sounds/attention.wav', isNative: await read($, alerts) })
        })()
      })
    }
    return verdict
  }).catch(($, e, next) => next(e))

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
  // A small mark of this mod beside the footer's mode labels, while its pane is on screen.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    if (!(await isPaneShown($, PANE))) return next(e)
    const label = `${SWATCH[await read($, accent)]} Calm`
    return next({ ...e, props: { ...e.props, modes: [...e.props.modes, label] } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    // Only the mod whose pane is on screen draws the band; the others pass it on.
    if (!(await isPaneShown($, PANE))) return next(e)
    const list = await read($, acts)
    const t = await read($, turn)
    const lg = await read($, lang)
    const ac = await read($, accent)
    const qt = await read($, quota)
    const base = await read($, limitBase)
    const at = Math.max(await read($, now), Date.now())
    const status = statusOf(t, list, at, (await read($, approval)) !== null)
    const live = [...list].reverse().find(a => a.endedAt === null)
    const five = pctOf(qt, 'five_hour')
    const week = pctOf(qt, 'seven_day')
    const fiveGain = gainText(five, base.five)
    if (e.surface === 'desktop') {
    const limits = [five === null ? '' : `${UI[lg].five} ${Math.round(five)}%${fiveGain ? ` ${fiveGain}` : ''}`, week === null ? '' : `${UI[lg].week} ${Math.round(week)}%`]
      .filter(Boolean)
      .join('  ')
    const detail = live ? `${toolName(live.tool)}${live.detail ? ` ${live.detail}` : ''}` : ''
      const th = await read($, theme)
      const { CARD, FG, DIM, EMPTY } = THEMES[th]
      const A = ACCENTS[ac]
      const pal: Palette = { card: CARD, ink: FG, soft: DIM, track: EMPTY, accent: A, glow: th === 'dark' ? lighten(A, -0.45) : lighten(A, 0.55), rim: A }
      const { Svg } = $.ui.resolve(e)
      return <Svg source={bandSvg({ what: STATUS[lg][status], detail, limits }, pal, status === 'approval')} alt={[STATUS[lg][status], detail, limits].filter(Boolean).join(' · ')} />
    }
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
    const lifeNow = await read($, life)
    const isAlerting = await read($, alerts)
    const tick = await read($, now)
    const L = UI[lg]
    const { CARD, FG, DIM, EMPTY, RED } = THEMES[th]
    const A = ACCENTS[ac]
    const pal: Palette = {
      card: CARD,
      ink: FG,
      soft: DIM,
      track: EMPTY,
      accent: A,
      glow: th === 'dark' ? lighten(A, -0.45) : lighten(A, 0.55),
      rim: A,
    }
    // The theme color washes the whole ground; the cards sit on it, plain and borderless.
    const TINT = th === 'dark' ? lighten(A, -0.84) : lighten(A, 0.8)

    const at = Math.max(tick, Date.now())
    const status = statusOf(t, list, at, (await read($, approval)) !== null)
    const live = [...list].reverse().find(a => a.endedAt === null)
    const step = pl.current >= 0 ? (pl.items[pl.current] ?? '') : ''
    const thinkingWord = spinner && at - spinner.at < 10_000 && spinner.word !== 'Working' ? spinner.word : ''
    const sub = live
      ? `${toolName(live.tool)}${live.detail ? ` · ${live.detail}` : ''}${live.isSub ? ` ${L.ally}` : ''}`
      : status === 'thinking'
        ? (thinkingWord ? `${thinkingWord}…` : step ? `${L.step}${step}` : '')
        : ''
    const elapsed = t.startedAt ? (t.isWorking ? at : (t.endedAt ?? t.startedAt)) - t.startedAt : 0
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

    const E = $.ui.resolve(e)
    const { Box, Text, Button, Svg } = E
    const card = (key: string, title: string, children: RenderChildren) => (
      <Box key={key} flexDirection="column" gap="sm" padding="md" backgroundColor={CARD} borderStyle="round" borderColor={CARD}>
        <Svg source={headingSvg(title, pal)} alt={title} />
        {children}
      </Box>
    )
    const ring = (kind: 'five_hour' | 'seven_day') => {
      const q = qt.limits.find(l => l.kind === kind)
      const reset = q?.resetsAt ? Date.parse(q.resetsAt) - at : NaN
      const pct = q ? q.percentUsed : null
      const b = kind === 'five_hour' ? base.five : base.week
      return {
        label: kind === 'five_hour' ? L.five : L.week,
        pct,
        base: b,
        gain: gainText(pct, b),
        note: Number.isFinite(reset) ? `↻ ${untilText(lg, reset)}` : '',
      }
    }
    const label =
      status === 'approval'
        ? L.askNow
        : t.startedAt && t.isWorking
          ? `${L.now} · ${seconds(lg, elapsed)}`
          : t.startedAt
            ? `${L.last} · ${seconds(lg, elapsed)}`
            : L.now

    return (
      <Box flexDirection="column" gap="sm" padding="md" backgroundColor={TINT} minHeight={e.surface === 'desktop' ? e.props.scroll.bodyRows : undefined} flexGrow={1}>
        <Svg source={statusSvg({ status, label, headline: STATUS[lg][status], detail: sub }, pal)} alt={`${STATUS[lg][status]} ${sub}`} />
        <Svg
          source={ringsSvg(
            [ring('five_hour'), ring('seven_day'), { label: L.session, pct: qt.contextPct, note: (qt.contextPct ?? 0) >= 80 ? L.compactSoon : L.compactNote }],
            pal,
          )}
          alt={L.limits}
        />
        <Svg
          source={timeSvg(
            L.time,
            timeRows.slice(0, 5).map(([k, ms]) => ({ label: TIME_LABELS[lg][k] ?? k, ms, text: `${seconds(lg, ms)} · ${Math.round((ms / timeTotal) * 100)}%` })),
            pal,
            L.timeEmpty,
          )}
          alt={L.time}
        />

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
                  {OpenButton(E, $, o.href, L.open, `open-${i}`)}
                </Box>
              ))}
            </Box>
          ),
        )}

        {card(
          'log',
          L.log,
          LogLines(E, list, Boolean(opened), () => update($, logOpen, (v: string) => (v ? '' : 'all')), { ink: FG, soft: DIM, error: RED }, { empty: L.logEmpty, more: L.logMore, less: L.logLess, ally: L.ally, seconds: (ms: number) => seconds(lg, ms) }),
        )}

        {card(
          'totals',
          L.totals,
          <Text mono size="footnote" color={FG}>
            {L.totalsLine(lifeNow.quests, lifeNow.slain, lifeNow.actions)}
          </Text>,
        )}

        {/* Quiet settings on a card like the others: color buttons, glyph buttons, then the maker. */}
        <Box flexDirection="row" gap="sm" flexWrap="wrap" alignItems="center" padding="md" backgroundColor={CARD} borderStyle="round" borderColor={CARD}>
          {/* One button per color, the emoji drawn in that color: a tap picks it. */}
          {ACCENT_IDS.map(id => (
            <Button
              key={`accent-${id}`}
              variant={id === ac ? 'primary' : 'secondary'}
              onPress={async () => {
                await update($, accent, () => id)
                await $.store.set('accent', id)
              }}
            >
              {SWATCH[id]}
            </Button>
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
            {th === 'dark' ? '☀' : '☾'}
          </Button>
          {AlertsButton(E, isAlerting, { on: '🔔', off: '🔕' }, async () => {
            const next = !isAlerting
            await update($, alerts, () => next)
            await $.store.set('alerts', next)
          })}
          {Credit(E, $, L.madeBy, DIM)}
        </Box>
      </Box>
    )
  })
}
