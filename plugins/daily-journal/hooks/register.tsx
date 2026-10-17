import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderChildren, SessionRateLimit, Timer } from 'claude-code'

import type { Act, Output, Quota, Turn } from '../types'
import {
  DOC_EXT,
  artifactIn,
  baseName,
  busyMs,
  detailOf,
  gainText,
  isCheckCommand,
  kindOf,
  nextPlan,
  pctOf,
  statusOf,
  toolName,
} from './core'
import { STATUS, TIME_LABELS, UI, ago, langFrom, seconds, untilText } from './i18n'
import type { Lang } from './i18n'
import { alert } from './alerts'
import { AlertsButton, Credit, LogLines, OpenButton } from './parts'
import { J, bandSvg, chipsSvg, greetingSvg, headingSvg, nowSvg, statsSvg } from './journal'

const PANE = 'daily-journal'
const TITLE = 'Journal'

const acts = atom({ plugin: 'daily-journal', key: 'acts' } as const, [])
const turn = atom({ plugin: 'daily-journal', key: 'turn' } as const, { isWorking: false, startedAt: 0, endedAt: null, ids: [] })
const outputs = atom({ plugin: 'daily-journal', key: 'outputs' } as const, [])
const spent = atom({ plugin: 'daily-journal', key: 'spent' } as const, {})
const quota = atom({ plugin: 'daily-journal', key: 'quota' } as const, { limits: [], contextPct: null })
const limitBase = atom({ plugin: 'daily-journal', key: 'limitBase' } as const, { five: null, week: null })
const plan = atom({ plugin: 'daily-journal', key: 'plan' } as const, { items: [], current: -1 })
const name = atom({ plugin: 'daily-journal', key: 'name' } as const, '')
const lang = atom({ plugin: 'daily-journal', key: 'lang' } as const, langFrom(Intl.DateTimeFormat().resolvedOptions().locale) ?? 'en')
const logOpen = atom({ plugin: 'daily-journal', key: 'logOpen' } as const, '')
const now = atom({ plugin: 'daily-journal', key: 'now' } as const, 0)
const approval = atom({ plugin: 'daily-journal', key: 'approval' } as const, null)
const alerts = atom({ plugin: 'daily-journal', key: 'alerts' } as const, true)
const life = atom({ plugin: 'daily-journal', key: 'life' } as const, { quests: 0, slain: 0, actions: 0 })

type Life = { quests: number; slain: number; actions: number }
const LONG_TURN_MS = 30_000
const APPROVAL_ALERT_MS = 4_000

/** The person's name for the greeting: what they set, else git's user.name. */
async function guessName($: EngineInterface): Promise<string> {
  const saved = await $.store.get('name')
  if (typeof saved === 'string' && saved) return saved
  const r = await $.process.run(['git', 'config', '--global', 'user.name'], { timeoutMs: 5000 }).catch(() => undefined)
  return r && r.exitCode === 0 ? r.stdout.trim().split(/\s+/)[0] ?? '' : ''
}

/** "10월 17일 금요일 · 오후" / "Fri, Oct 17 · Afternoon". */
function dateLine(lg: Lang, at: number): string {
  const d = new Date(at)
  const h = d.getHours()
  const part = lg === 'ko'
    ? h < 12 ? '오전' : h < 18 ? '오후' : '저녁'
    : h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening'
  const day = d.toLocaleDateString(lg === 'ko' ? 'ko-KR' : 'en-US', lg === 'ko' ? { month: 'long', day: 'numeric', weekday: 'long' } : { weekday: 'short', month: 'short', day: 'numeric' })
  return `${day} · ${part}`
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
    await $.command.register({ name: 'day', description: `${UI.ko.command} / ${UI.en.command}` })
    void guessName($).then(n => update($, name, () => n)).catch(() => undefined)
    const savedAlerts = await $.store.get('alerts')
    if (typeof savedAlerts === 'boolean') await update($, alerts, () => savedAlerts)
    const savedLife = (await $.store.get('life')) as Life | undefined
    if (savedLife && typeof savedLife.quests === 'number') await update($, life, () => savedLife)
    await update($, approval, () => null)
    void $.session.usage().then(u => update($, quota, () => quotaFrom(u))).catch(() => undefined)
    ticker?.cancel()
    ticker = $.clock.every(1000, () => void update($, now, () => Date.now()))
    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'day' }, async ($, e) => {
    const lg = await read($, lang)
    const m = /^name\s+(.+)$/i.exec(e.args.trim())
    const who = m?.[1]?.trim().slice(0, 24) ?? ''
    if (who) {
      await update($, name, () => who)
      await $.store.set('name', who)
    }
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: who ? UI[lg].named(who) : UI[lg].opened }
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
        void alert($, { title: UI[lg].doneTitle, body: UI[lg].doneBody(seconds(lg, end - t.startedAt)), sound: 'sounds/done.wav', isNative: await read($, alerts) })
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
          await alert($, { title: UI[lg].approvalTitle, body: UI[lg].approvalBody(toolName(e.tool)), sound: 'sounds/attention.wav', isNative: await read($, alerts) })
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
  // with the pane closed. Plain text in the app's own colors, a sunny dot in front.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    const list = await read($, acts)
    const t = await read($, turn)
    const lg = await read($, lang)
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
      const { Svg } = $.ui.resolve(e)
      return <Svg source={bandSvg({ status, what: STATUS[lg][status], detail, limits })} alt={[STATUS[lg][status], detail, limits].filter(Boolean).join(' · ')} />
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" gap={1}>
        <Text>
          <Text color={J.sunDeep}>●</Text> {STATUS[lg][status]}
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
    const who = await read($, name)
    const lg = await read($, lang)
    const opened = await read($, logOpen)
    const lifeNow = await read($, life)
    const isAlerting = await read($, alerts)
    const tick = await read($, now)
    const L = UI[lg]
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
    const PASTELS = [J.pink, J.lilac, J.mint] as const
    // Every card alike: white, the same small corner and the same inset on all four sides; the title in serif.
    const card = (key: string, title: string, children: RenderChildren) => (
      <Box key={key} flexDirection="column" gap="sm" padding="md" backgroundColor={J.card} borderStyle="round" borderColor={J.card}>
        {title && <Svg source={headingSvg(title)} alt={title} />}
        {children}
      </Box>
    )
    const chip = (kind: 'five_hour' | 'seven_day', tone: 'pink' | 'lilac') => {
      const q = qt.limits.find(l => l.kind === kind)
      const reset = q?.resetsAt ? Date.parse(q.resetsAt) - at : NaN
      const pct = q ? q.percentUsed : null
      return {
        title: kind === 'five_hour' ? L.five : L.week,
        value: pct === null ? '–' : `${Math.round(pct)}%`,
        tag: gainText(pct, kind === 'five_hour' ? base.five : base.week),
        note: Number.isFinite(reset) ? `↻ ${untilText(lg, reset)}` : '',
        tone,
      }
    }
    const mainActs = list.filter(a => !a.isSub).length
    const pills = timeRows.slice(0, 4).map(([k, ms]) => ({ label: TIME_LABELS[lg][k] ?? k, pct: Math.round((ms / timeTotal) * 100) }))
    const isResting = status === 'waiting' || status === 'done'

    return (
      <Box flexDirection="column" gap="sm" padding="md" backgroundColor={J.cream} minHeight="100%" flexGrow={1}>
        <Svg source={greetingSvg(L.hello(who), dateLine(lg, at), (who[0] ?? '☺').toUpperCase())} alt={L.hello(who)} />
        <Svg
          source={nowSvg({
            status,
            label: status === 'approval' ? L.askNow : t.isWorking ? L.now : L.last,
            title: STATUS[lg][status],
            detail: sub || (isResting ? L.restLine : ''),
            tag: t.startedAt ? (t.isWorking ? L.tagTyping(seconds(lg, elapsed)) : seconds(lg, elapsed)) : '',
          })}
          alt={`${STATUS[lg][status]} ${sub}`}
        />
        <Svg
          source={chipsSvg([
            chip('five_hour', 'pink'),
            chip('seven_day', 'lilac'),
            { title: L.session, value: qt.contextPct === null ? '–' : `${Math.round(qt.contextPct)}%`, tag: '', note: (qt.contextPct ?? 0) >= 80 ? L.compactSoon : L.compactNote, tone: 'mint' },
          ])}
          alt={L.limits}
        />
        <Svg source={statsSvg(String(mainActs), L.statsCaption, L.statsTitle, pills, L.timeEmpty)} alt={`${L.statsTitle}: ${pills.map(x => `${x.label} ${x.pct}%`).join(', ')}`} />

        {card(
          'results',
          L.results,
          made.length === 0 ? (
            <Text size="footnote" color={J.soft}>
              {L.resultsEmpty}
            </Text>
          ) : (
            <Box flexDirection="column" gap="xs">
              {made.slice(0, 4).map((o, i) => (
                /* One thin pastel strip per result: title, when and kind on a single line. */
                <Box
                  key={o.href}
                  flexDirection="row"
                  gap="sm"
                  alignItems="center"
                  paddingX="sm"
                  backgroundColor={PASTELS[i % PASTELS.length]}
                  borderStyle="round"
                  borderColor={PASTELS[i % PASTELS.length]}
                >
                  <Box flexGrow={1} flexShrink={1}>
                    <Text size="footnote" weight="semibold" color={J.ink} wrap="truncate-end">
                      {o.title}
                    </Text>
                  </Box>
                  <Text size="footnote" color={J.soft}>
                    {ago(lg, at - o.at)} · {o.kind === 'artifact' ? (lg === 'ko' ? '아티팩트' : 'Artifact') : lg === 'ko' ? '파일' : 'File'}
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
          LogLines(E, list, Boolean(opened), () => update($, logOpen, (v: string) => (v ? '' : 'all')), { ink: J.ink, soft: J.soft, error: '#C0392B' }, { empty: L.logEmpty, more: L.logMore, less: L.logLess, ally: L.ally, seconds: (ms: number) => seconds(lg, ms) }),
        )}

        {card(
          'totals',
          L.totals,
          <Text size="footnote" color={J.ink}>
            {L.totalsLine(lifeNow.quests, lifeNow.slain, lifeNow.actions)}
          </Text>,
        )}

        {/* A soft sticker strip: the bell and the maker, like a note at the page's foot. */}
        <Box flexDirection="row" gap="sm" alignItems="center" flexWrap="wrap" padding="md" backgroundColor={J.card} borderStyle="round" borderColor={J.card}>
          <Text color={J.sunDeep}>✿</Text>
          {AlertsButton(E, isAlerting, { on: '🔔', off: '🔕' }, async () => {
              const next = !isAlerting
              await update($, alerts, () => next)
              await $.store.set('alerts', next)
            })}
          {Credit(E, $, L.madeBy, J.soft)}
        </Box>
      </Box>
    )
  })
}
