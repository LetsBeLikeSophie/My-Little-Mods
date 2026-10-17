import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit, Timer } from 'claude-code'

import type { Act, ActKind, Job, Output, Species, Turn } from '../types'
import { JOBS, JOB_IDS, SPECIES, SPECIES_IDS, barSvg, campSvg, skyOf, thumbSvg, walkSeconds } from './camp'
import { busyMs, statsSvg } from './stats'
import { hudSvg } from './hud'
import type { Scene } from './camp'
import { PIXEL_FONT } from './font'
import { JOB_BLURB, JOB_NAMES, SCENES, SPECIES_NAMES, THINK_LINES, TIME_LABELS, UI, ago, untilText, langFrom, picFor, seconds, shoutFor } from './i18n'
import type { Lang } from './i18n'

const PANE = 'pixel-activity'
const MAKER_URL = 'https://github.com/LetsBeLikeSophie'
const TITLE = 'Adventure Log'

const acts = atom({ plugin: 'pixel-activity', key: 'acts' } as const, [])
const turn = atom({ plugin: 'pixel-activity', key: 'turn' } as const, {
  isWorking: false,
  startedAt: 0,
  endedAt: null,
  ids: [],
})
const counts = atom({ plugin: 'pixel-activity', key: 'counts' } as const, {})
const files = atom({ plugin: 'pixel-activity', key: 'files' } as const, [])
const outputs = atom({ plugin: 'pixel-activity', key: 'outputs' } as const, [])
const species = atom({ plugin: 'pixel-activity', key: 'species' } as const, 'cat')
const job = atom({ plugin: 'pixel-activity', key: 'job' } as const, 'warrior')
const show = atom({ plugin: 'pixel-activity', key: 'show' } as const, { legend: false, picker: false })
const plan = atom({ plugin: 'pixel-activity', key: 'plan' } as const, { items: [], current: -1 })
const theme = atom({ plugin: 'pixel-activity', key: 'theme' } as const, 'dark')
const lang = atom({ plugin: 'pixel-activity', key: 'lang' } as const, langFrom(Intl.DateTimeFormat().resolvedOptions().locale) ?? 'en')
const spent = atom({ plugin: 'pixel-activity', key: 'spent' } as const, {})
const logOpen = atom({ plugin: 'pixel-activity', key: 'logOpen' } as const, '')
const limitBase = atom({ plugin: 'pixel-activity', key: 'limitBase' } as const, { five: null, week: null })
const quota = atom({ plugin: 'pixel-activity', key: 'quota' } as const, { limits: [], contextPct: null, usd: null })
const now = atom({ plugin: 'pixel-activity', key: 'now' } as const, 0)

// A quest-log look, in two themes: dark slate or light parchment.
type Theme = 'dark' | 'light'

export const THEMES: { [K in Theme]: { BG: string; CARD: string; FG: string; DIM: string; GOLD: string; RED: string; BAR: string } } = {
  dark: { BG: '#1C1A24', CARD: '#2A2633', FG: '#F2E8D5', DIM: '#A89F8E', GOLD: '#E0B84A', RED: '#FF6B6B', BAR: '#1C1A24' },
  light: { BG: '#F3EBDD', CARD: '#FFF8EC', FG: '#3A3226', DIM: '#7A6E5D', GOLD: '#A66A1E', RED: '#C0392B', BAR: '#FFF8EC' },
}

const DONE_MS = 8_000
const LINGER_MS = 6_000

// A command that tests or checks the work: a fight with a bug.
const BATTLE = /\b(test|tests|pytest|jest|vitest|mocha|tsc|lint|eslint|ruff|mypy|validate|check|build)\b/i

export function isBattleCommand(tool: string, command: unknown): boolean {
  return /^(Bash|PowerShell)$/.test(tool) && typeof command === 'string' && BATTLE.test(command)
}
const NAP_MS = 5 * 60_000

const DOC_EXT = /\.(md|markdown|html?|pdf|docx|pptx|xlsx|csv|png|jpe?g|gif|svg|txt)$/i
const ARTIFACT_URL = /https:\/\/claude\.ai\/[^\s"'<>)\]\\]*artifact[^\s"'<>)\]\\]*/

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

const KIND_EMOJI: { [K in ActKind]: string } = {
  read: '📖',
  search: '🔦',
  edit: '🗡️',
  write: '🔨',
  bash: '✨',
  web: '🕊️',
  agent: '🤝',
  other: '📦',
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

/** A link for a published artifact named in a tool's answer, if any. */
export function artifactIn(text: string): string | undefined {
  return ARTIFACT_URL.exec(text)?.[0]
}


type Plan = { items: string[]; current: number }

/** The step in progress, after a task-list call (the app's update_plan or TodoWrite). */
export function nextPlan(prev: Plan, tool: string, args: { [k: string]: unknown }): Plan | undefined {
  type Item = { content?: unknown; status?: unknown; activeForm?: unknown }
  const list = (Array.isArray(args.items) ? args.items : Array.isArray(args.todos) ? args.todos : undefined) as Item[] | undefined
  if (!/(update_plan|TodoWrite)$/.test(tool)) return undefined
  if (list) {
    const items = list.map(i => String(i.activeForm ?? i.content ?? ''))
    return { items, current: list.findIndex(i => i.status === 'in_progress') }
  }
  if (args.advance === true) {
    const current = prev.current + 1
    return { ...prev, current: current < prev.items.length ? current : -1 }
  }
  if (typeof args.start === 'number') return { ...prev, current: args.start - 1 }
  return undefined
}

/** Which picture to draw, from the turn and the calls in it. */
export function sceneFor(t: Turn, list: readonly Act[], at: number): Scene {
  const live = [...list].reverse().find(a => a.endedAt === null)
  if (t.isWorking) {
    if (live) return live.isBattle ? 'battle' : live.kind
    // A tool often finishes in a blink: keep its picture up a little longer.
    const last = list.filter(a => t.ids.includes(a.id)).pop()
    if (last && last.endedAt !== null && at - last.endedAt < LINGER_MS) {
      if (last.isError) return 'error'
      return last.isBattle ? 'slain' : last.kind
    }
    return 'thinking'
  }
  if (t.endedAt === null) return 'waiting'
  if (at - t.endedAt < DONE_MS) return 'done'
  return at - t.endedAt > NAP_MS ? 'sleeping' : 'waiting'
}

const LOG_LINES = 6

/** The legend, in three groups: work, tests, downtime. */
const LEGEND_GROUPS: readonly (readonly ['groupWork' | 'groupFight' | 'groupRest', readonly Scene[]])[] = [
  ['groupWork', ['thinking', 'read', 'search', 'edit', 'write', 'bash', 'web', 'agent', 'other']],
  ['groupFight', ['battle', 'slain', 'error']],
  ['groupRest', ['done', 'waiting', 'sleeping']],
]

function clock(ms: number): string {
  const d = new Date(ms)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
}

/** One log line, oldest first like a debug log: time, result, tool, what it touched. */
export function logLine(a: Act, lg: Lang = 'ko', whole = false): string {
  const mark = a.endedAt === null ? '…' : a.isError ? '✗' : '✓'
  const took = a.endedAt === null ? '' : ` (${seconds(lg, a.endedAt - a.startedAt)})`
  const who = a.isSub ? ` ${UI[lg].ally}` : ''
  return `${clock(a.startedAt)} ${mark} ${toolName(a.tool)}${a.detail ? ` ${whole ? a.full || a.detail : a.detail}` : ''}${took}${who}`
}

function isSpecies(v: unknown): v is Species {
  return typeof v === 'string' && (SPECIES_IDS as string[]).includes(v)
}

function isJob(v: unknown): v is Job {
  return typeof v === 'string' && (JOB_IDS as string[]).includes(v)
}

let ticker: Timer | undefined

// The spinner's word ("Pondering", or on the desktop what the step is doing),
// kept as the engine draws it so the hero can say it while thinking.
let spinner: { word: string; at: number } | undefined

/** The hero's line: while thinking, the spinner's words or the step in progress; else the scene's shout. */
export function lineFor(lg: Lang, scene: Scene, job: Job, at: number, step: string, word?: { word: string; at: number }): string {
  if (scene !== 'thinking') return shoutFor(lg, scene, job)
  if (word && at - word.at < 10_000 && word.word && word.word !== 'Working') return `${word.word.replace(/…$/, '')}…`
  if (step) return `${step}…`
  const lines = THINK_LINES[lg]
  return lines[Math.floor(at / 6000) % lines.length]!
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

type Quota = { limits: { kind: string; percentUsed: number; resetsAt: string | null }[]; contextPct: number | null; usd: number | null }

export function pctOf(q: Quota, kind: string): number | null {
  return q.limits.find(l => l.kind === kind)?.percentUsed ?? null
}

function quotaFrom(u: { rateLimits: readonly SessionRateLimit[]; context: { percent?: number }; cost?: { usd: number } }): Quota {
  return {
    limits: u.rateLimits.map(r => ({ kind: r.kind, percentUsed: r.percentUsed, resetsAt: r.resetsAt ?? null })),
    contextPct: u.context.percent ?? null,
    usd: u.cost?.usd ?? null,
  }
}

// What the picture shows. A new scene waits until the current one has played
// for a while, so the hero finishes what they started instead of flickering
// between tools that each take a blink; the latest wanted scene goes next.
type Shown = { scene: Scene; from?: Scene; since: number; say: string; sayAt: number }
let shown: Shown | undefined

const STAY_MS = 4_500
const SAY_EVERY_MS = 8_000

/** The scene to show at `at`, given the one wanted now and the one on screen. */
export function schedule(cur: Shown | undefined, want: Scene, at: number, say: (s: Scene) => string): Shown {
  if (!cur) return { scene: want, since: at, say: say(want), sayAt: at }
  const arrived = cur.since + (cur.from ? walkSeconds(cur.from, cur.scene) * 1000 : 0)
  if (want !== cur.scene && at - arrived >= STAY_MS) return { scene: want, from: cur.scene, since: at, say: say(want), sayAt: at }
  // While thinking, the bubble may change now and then, once the hero has arrived.
  if (want === cur.scene && cur.scene === 'thinking' && at >= arrived && at - cur.sayAt >= SAY_EVERY_MS) {
    const next = say(want)
    if (next !== cur.say) return { ...cur, say: next, sayAt: at }
  }
  return cur
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    void systemLang($)
      .then(found => (found ? update($, lang, () => found) : undefined))
      .catch(() => undefined)
    await $.command.register({ name: 'pixel', description: `${UI.ko.command} / ${UI.en.command}` })
    const savedSp = await $.store.get('species')
    const savedJob = await $.store.get('job')
    if (isSpecies(savedSp)) await update($, species, () => savedSp)
    if (isJob(savedJob)) await update($, job, () => savedJob)
    const savedTheme = await $.store.get('theme')
    if (savedTheme === 'dark' || savedTheme === 'light') await update($, theme, () => savedTheme)
    void $.session.usage().then(u => update($, quota, () => quotaFrom(u))).catch(() => undefined)
    ticker?.cancel()
    ticker = $.clock.every(1000, () => void update($, now, () => Date.now()))
    void $.ui.open({ id: PANE, title: TITLE })

    return next(e)
  })

  on('command.run', { command: 'pixel' }, async ($, e) => {
    const words = e.args.trim().split(/\s+/).filter(Boolean)
    const lg = await read($, lang)
    const said: string[] = []
    for (const w of words) {
      if (isJob(w)) { await update($, job, () => w); await $.store.set('job', w); said.push(JOB_NAMES[lg][w]) }
      if (isSpecies(w)) { await update($, species, () => w); await $.store.set('species', w); said.push(SPECIES_NAMES[lg][w]) }
    }
    await $.ui.open({ id: PANE, title: TITLE })

    return { text: said.length > 0 ? UI[lg].changed(said.join(' ')) : UI[lg].opened }
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      const t = Date.now()
      await update($, turn, () => ({ isWorking: true, startedAt: t, endedAt: null, ids: [] }))
      // Where the usage limits stand now: what this request adds is measured from here.
      void $.session
        .usage()
        .then(async u => {
          const q = quotaFrom(u)
          await update($, quota, () => q)
          await update($, limitBase, () => ({ five: pctOf(q, 'five_hour'), week: pctOf(q, 'seven_day') }))
        })
        .catch(() => undefined)
      await update($, now, () => t)
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    if (e.agentId === undefined) {
      const end = Date.now()
      const t = await read($, turn)
      const list = await read($, acts)
      // Thinking is the turn's time when no tool of the main loop was running.
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
      isBattle: isBattleCommand(e.tool, args.command),
    }
    await update($, acts, (list: Act[]) => [...list, act].slice(-200))
    await update($, counts, (c: { [k: string]: number }) => ({ ...c, [act.kind]: (c[act.kind] ?? 0) + 1 }))
    if (e.agentId === undefined) {
      await update($, turn, (t: Turn) => ({ ...t, ids: [...t.ids, act.id].slice(-60) }))
    }
    const p0 = await read($, plan)
    const p1 = nextPlan(p0, e.tool, args)
    if (p1) await update($, plan, () => p1)
    const path = typeof args.file_path === 'string' ? args.file_path : undefined
    if (path && (act.kind === 'edit' || act.kind === 'write')) {
      await update($, files, (list: string[]) => [path, ...list.filter(p => p !== path)].slice(0, 8))
    }

    const ran = await next(e)
    const isError = ran.deny !== undefined || ran.isError === true
    if (e.agentId === undefined) {
      const key = act.isBattle ? 'battle' : act.kind
      const took = Date.now() - act.startedAt
      await update($, spent, (m: { [k: string]: number }) => ({ ...m, [key]: (m[key] ?? 0) + took }))
    }
    await update($, acts, (list: Act[]) =>
      list.map(one => (one.id === act.id ? { ...one, endedAt: Date.now(), isError } : one)),
    )

    if (!isError) {
      const made: Output[] = []
      const said = `${ran.text ?? ''} ${JSON.stringify(ran.result ?? '').slice(0, 20000)}`
      const url = artifactIn(said)
      if (url) {
        const title = typeof args.title === 'string' ? args.title : path ? baseName(path) : UI[await read($, lang)].artifact
        made.push({ href: url, title, kind: 'artifact', at: Date.now() })
      } else if (path && (act.kind === 'edit' || act.kind === 'write') && DOC_EXT.test(path)) {
        made.push({ href: path, title: baseName(path), kind: 'file', at: Date.now() })
      }
      if (made.length > 0) {
        await update($, outputs, (list: Output[]) =>
          [...made, ...list.filter(o => !made.some(m => m.href === o.href))].slice(0, 6),
        )
      }
    }

    return ran
  }).catch(($, e, next) => next(e)) // bookkeeping never blocks a tool

  // Usage limits, context and cost, pushed by the engine whenever one moves.
  on('session.measure', async ($, e, next) => {
    await update($, quota, () => quotaFrom(e))
    return next(e)
  })

  on('ui.render', { component: 'Spinner' }, ($, e, next) => {
    spinner = { word: e.props.message ?? e.props.word, at: Date.now() }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const list = await read($, acts)
    const t = await read($, turn)
    const made = await read($, outputs)
    const sp = await read($, species)
    const jb = await read($, job)
    const tick = await read($, now)
    const sh = await read($, show)
    const th = await read($, theme)
    const { BG, CARD, FG, DIM, GOLD, RED, BAR } = THEMES[th]
    const pl = await read($, plan)
    const step = pl.current >= 0 ? (pl.items[pl.current] ?? '') : ''
    const lg = await read($, lang)
    const L = UI[lg]
    const used = await read($, spent)
    const opened = await read($, logOpen)
    const base = await read($, limitBase)
    const qt = await read($, quota)

    const at = Math.max(tick, Date.now())
    const hour = new Date(at).getHours() + new Date(at).getMinutes() / 60
    const want = sceneFor(t, list, at)
    shown = schedule(shown, want, at, s => lineFor(lg, s, jb, at, step, spinner))
    const scene = shown.scene
    const walking = shown.from && at < shown.since + walkSeconds(shown.from, scene) * 1000 ? shown.from : undefined
    const info = SCENES[lg][scene]
    const hero = `${SPECIES_NAMES[lg][sp]} ${JOB_NAMES[lg][jb]}`
    const turnActs = list.filter(a => t.ids.includes(a.id))
    const live = [...list].reverse().find(a => a.endedAt === null)
    const log = list.slice(-LOG_LINES)
    const elapsed = t.startedAt ? (t.isWorking ? at : (t.endedAt ?? t.startedAt)) - t.startedAt : 0

    const now1 = live ? `${toolName(live.tool)}${live.detail ? ` · ${live.detail}` : ''}${live.isSub ? ` ${L.ally}` : ''}` : ''
    const timing = t.startedAt
      ? t.isWorking
        ? L.working(seconds(lg, elapsed), turnActs.length)
        : L.finished(seconds(lg, elapsed), turnActs.length)
      : L.noQuest

    if (e.surface === 'terminal') {
      const { Box, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          <Text bold>
            {JOBS[jb].emoji} {hero}: {info.what}
          </Text>
          <Text dimColor>{picFor(lg, scene, jb)}</Text>
          {now1 && <Text>{now1}</Text>}
          <Text dimColor>{timing}</Text>
          {made.length > 0 && <Text bold>{L.results}</Text>}
          {made.map(o => (
            <Text key={o.href}>
              {o.title} {o.href}
            </Text>
          ))}
        </Box>
      )
    }

    const { Box, Text, Svg, Button } = $.ui.resolve(e)
    const heading = (text: string) => (
      <Text weight="semibold" color={GOLD}>
        {text}
      </Text>
    )
    const toggle = (key: 'legend' | 'picker') => () =>
      update($, show, (s: { legend: boolean; picker: boolean }) => ({ ...s, [key]: !s[key] }))

    return (
      <Box flexDirection="column" gap={1} padding={1} backgroundColor={BG}>
        <Svg
          source={campSvg(
            sp,
            jb,
            scene,
            skyOf(hour),
            { say: shown.say },
            PIXEL_FONT,
            walking,
          )}
          alt={`${hero}: ${picFor(lg, scene, jb)}, ${info.what}`}
        />
        <Svg
          source={barSvg(
            SCENES[lg][want].what,
            now1 || (want === 'thinking' && step ? `${L.step}${step}` : ''),
            PIXEL_FONT,
            { bg: BAR, fg: FG, accent: GOLD },
          )}
          alt={SCENES[lg][want].what}
        />
        <Text tabular color={DIM}>
          {timing}
        </Text>
        <Svg
          source={hudSvg(
            [
              {
                title: L.limitsTitle,
                bars: (['five_hour', 'seven_day'] as const).map(kind => {
                  const q = qt.limits.find(l => l.kind === kind)
                  const reset = q?.resetsAt ? Date.parse(q.resetsAt) - at : NaN
                  const isFive = kind === 'five_hour'
                  return {
                    icon: isFive ? ('heart' as const) : ('star' as const),
                    label: isFive ? L.hp : L.xp,
                    pct: q ? q.percentUsed : null,
                    base: isFive ? base.five : base.week,
                    color: isFive ? '#E03131' : GOLD,
                    glow: isFive ? '#FF9A9A' : '#FFF3B0',
                    right: Number.isFinite(reset) ? `↻ ${untilText(lg, reset)}` : '',
                  }
                }),
              },
              {
                title: L.sessionTitle,
                bars: [
                  {
                    icon: 'drop' as const,
                    label: L.mp,
                    pct: qt.contextPct,
                    color: '#4DA8FF',
                    right: (qt.contextPct ?? 0) >= 80 ? L.compactSoon : '',
                  },
                ],
              },
            ],
            PIXEL_FONT,
            { fg: FG, dim: DIM, head: GOLD, empty: th === 'dark' ? '#3A3646' : '#E4DCCB' },
          )}
          alt={`${L.hp} ${qt.limits.find(l => l.kind === 'five_hour')?.percentUsed ?? '–'}% · ${L.xp} ${qt.limits.find(l => l.kind === 'seven_day')?.percentUsed ?? '–'}%`}
        />

        <Box flexDirection="column" padding={1} backgroundColor={CARD}>
          {heading(L.timeSpent)}
          {Object.values(used).some(ms => ms >= 500) ? (
            <Svg
              source={statsSvg(used, k => TIME_LABELS[lg][k], ms => seconds(lg, ms), PIXEL_FONT, { fg: FG, dim: DIM })}
              alt={L.timeSpent}
            />
          ) : (
            <Text color={DIM}>{L.timeEmpty}</Text>
          )}
        </Box>

        <Box flexDirection="column" padding={1} backgroundColor={CARD}>
          {heading(L.results)}
          {made.length === 0 ? (
            <Text color={DIM}>{L.resultsEmpty}</Text>
          ) : (
            made.slice(0, 4).map((o, i) => (
              <Box key={o.href} flexDirection="row" gap={1}>
                <Text color={i === 0 ? GOLD : DIM}>{o.kind === 'artifact' ? '🔗' : '📄'}</Text>
                {/* A Link can't take the theme's color (blue is lost on dark), so a plain
                    Button opens it: a URL in the browser, a file in its own app. */}
                <Button key={`open-${i}`} plain onPress={() => void $.process.run(['explorer.exe', o.href])}>
                  <Text color={i === 0 ? GOLD : FG} underline>
                    {o.title}
                  </Text>
                </Button>
                <Text color={DIM}>
                  {i === 0 ? L.latest : ''}
                  {ago(lg, at - o.at)}
                </Text>
              </Box>
            ))
          )}
        </Box>

        <Box flexDirection="column" padding={1} backgroundColor={CARD}>
          {heading(L.log)}
          {log.length === 0 && (
            <Text mono color={DIM}>
              {L.logEmpty}
            </Text>
          )}
          {log.map(a => (
            <Button
              key={`log-${a.id}`}
              plain
              onPress={() => update($, logOpen, (v: string) => (v === a.id ? '' : a.id))}
            >
              <Text
                mono
                size="footnote"
                wrap={opened === a.id ? 'wrap' : 'truncate-end'}
                color={a.isError ? RED : a.endedAt === null ? FG : DIM}
              >
                {logLine(a, lg, opened === a.id)}
              </Text>
            </Button>
          ))}
        </Box>

        <Box flexDirection="row" gap={1}>
          <Button key="toggle-legend" variant="secondary" onPress={toggle('legend')}>
            {sh.legend ? L.legendClose : L.legendOpen}
          </Button>
          <Button
            key="toggle-theme"
            variant="secondary"
            onPress={async () => {
              const next = th === 'dark' ? 'light' : 'dark'
              await update($, theme, () => next)
              await $.store.set('theme', next)
            }}
          >
            {th === 'dark' ? L.light : L.dark}
          </Button>
          <Button key="toggle-picker" variant="secondary" onPress={toggle('picker')}>
            {sh.picker ? L.pickerClose : L.pickerOpen}
          </Button>
        </Box>

        {sh.legend && (
          <Box flexDirection="column" gap={1} padding={1} backgroundColor={CARD}>
            {LEGEND_GROUPS.map(([group, scenes]) => (
              <Box key={`legend-${group}`} flexDirection="column">
                {heading(L[group])}
                {scenes.map(k => (
                  <Box key={`legend-${k}`} flexDirection="row" gap={1} alignItems="center">
                    <Text color={GOLD}>{k === scene ? '▶' : '  '}</Text>
                    <Svg source={thumbSvg(sp, jb, k)} alt={picFor(lg, k, jb)} width={64} height={50} />
                    <Box flexDirection="column">
                      <Text weight={k === scene ? 'bold' : 'regular'} color={k === scene ? GOLD : FG}>
                        {SCENES[lg][k].what}
                      </Text>
                      <Text size="footnote" color={DIM}>
                        {picFor(lg, k, jb)}
                      </Text>
                    </Box>
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        )}

        {sh.picker && (
          <Box flexDirection="column" gap={1} padding={1} backgroundColor={CARD}>
            {heading(L.jobs)}
            <Box flexDirection="row" gap={1} flexWrap="wrap">
              {JOB_IDS.map(id => (
                <Button
                  key={`job-${id}`}
                  variant={id === jb ? 'primary' : 'secondary'}
                  onPress={async () => {
                    await update($, job, () => id)
                    await $.store.set('job', id)
                  }}
                >
                  {JOBS[id].emoji} {JOB_NAMES[lg][id]}
                </Button>
              ))}
            </Box>
            <Text color={FG}>
              {JOBS[jb].emoji} {JOB_BLURB[lg][jb]}
            </Text>
            {heading(L.species)}
            <Box flexDirection="row" gap={1} flexWrap="wrap">
              {SPECIES_IDS.map(id => (
                <Button
                  key={`sp-${id}`}
                  variant={id === sp ? 'primary' : 'secondary'}
                  onPress={async () => {
                    await update($, species, () => id)
                    await $.store.set('species', id)
                  }}
                >
                  {SPECIES[id].emoji} {SPECIES_NAMES[lg][id]}
                </Button>
              ))}
            </Box>
          </Box>
        )}
        <Button key="credit" plain onPress={() => void $.process.run(['explorer.exe', MAKER_URL])}>
          <Text size="footnote" color={DIM} underline>
            {L.madeBy}
          </Text>
        </Button>
      </Box>
    )
  })
}
