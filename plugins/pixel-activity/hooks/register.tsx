import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, SessionRateLimit, Timer } from 'claude-code'

import type { Act, ActKind, Job, Output, Species, Turn } from '../types'
import { JOBS, JOB_IDS, SPECIES, SPECIES_IDS, barSvg, campSvg, skyOf, thumbSvg, walkSeconds } from './camp'
import { busyMs, statsSvg } from './stats'
import { bandSvg, gainText, hudSvg } from './hud'
import { DOC_EXT, artifactIn, baseName, detailOf, isCheckCommand, kindOf, nextPlan, pctOf, toolName } from './core'
import { AlertsButton, Credit, LogLines, OpenButton, alertIfShown, isPaneShown, rememberLast, wasLast } from './parts'
import type { Scene } from './camp'
import { PIXEL_FONT } from './font'
import { JOB_BLURB, JOB_NAMES, SCENES, SPECIES_NAMES, THINK_LINES, TIME_LABELS, UI, ago, untilText, langFrom, picFor, seconds, shoutFor } from './i18n'
import type { Lang } from './i18n'

const PANE = 'pixel-activity'
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
const approval = atom({ plugin: 'pixel-activity', key: 'approval' } as const, null)
const alerts = atom({ plugin: 'pixel-activity', key: 'alerts' } as const, true)
const life = atom({ plugin: 'pixel-activity', key: 'life' } as const, { quests: 0, slain: 0, actions: 0 })
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


const NAP_MS = 5 * 60_000

// The shared ones, under the names this mod's tests and hooks use.
export { artifactIn, detailOf, kindOf, nextPlan, toolName } from './core'
/** A command that tests or checks the work: a fight with a bug. */
export const isBattleCommand = isCheckCommand


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








/** Which picture to draw, from the turn and the calls in it. */
type Life = { quests: number; slain: number; actions: number }

const LONG_TURN_MS = 30_000
const APPROVAL_ALERT_MS = 4_000

/** XP from everything done so far: a finished request 10, a slain bug 5, any action 1. */
export function xpOf(l: Life): number {
  return l.quests * 10 + l.slain * 5 + l.actions
}

/** The level an amount of XP reaches; each level asks 25 more than the one before (50, 75, 100 …). */
export function levelOf(xp: number): { level: number; into: number; need: number } {
  let level = 1
  let need = 50
  let left = xp
  while (left >= need) {
    left -= need
    level += 1
    need += 25
  }
  return { level, into: left, need }
}

/** Which picture to draw, from the turn and the calls in it; a pending approval comes first. */
export function sceneFor(t: Turn, list: readonly Act[], at: number, isAsking = false): Scene {
  if (isAsking) return 'approval'
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


/** The legend, in three groups: work, tests, downtime. */
const LEGEND_GROUPS: readonly (readonly ['groupWork' | 'groupFight' | 'groupRest', readonly Scene[]])[] = [
  ['groupWork', ['thinking', 'read', 'search', 'edit', 'write', 'bash', 'web', 'agent', 'other', 'approval']],
  ['groupFight', ['battle', 'slain', 'error']],
  ['groupRest', ['done', 'waiting', 'sleeping']],
]



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
  // Asking for approval doesn't wait its turn: the hand goes up at once.
  if (want === 'approval' && cur.scene !== 'approval') return { scene: want, from: cur.scene, since: at, say: say(want), sayAt: at }
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
    await $.command.register({ name: 'rpg', description: `${UI.ko.command} / ${UI.en.command}` })
    const savedSp = await $.store.get('species')
    const savedJob = await $.store.get('job')
    if (isSpecies(savedSp)) await update($, species, () => savedSp)
    if (isJob(savedJob)) await update($, job, () => savedJob)
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

  on('command.run', { command: 'rpg' }, async ($, e) => {
    const words = e.args.trim().split(/\s+/).filter(Boolean)
    const lg = await read($, lang)
    const said: string[] = []
    for (const w of words) {
      if (isJob(w)) { await update($, job, () => w); await $.store.set('job', w); said.push(JOB_NAMES[lg][w]) }
      if (isSpecies(w)) { await update($, species, () => w); await $.store.set('species', w); said.push(SPECIES_NAMES[lg][w]) }
    }
    await $.ui.open({ id: PANE, title: TITLE })
    await rememberLast($, PANE)

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
      await update($, approval, () => null)
      const before = levelOf(xpOf(await read($, life))).level
      const l = await update($, life, (x: Life) => ({ ...x, quests: x.quests + 1 }))
      await $.store.set('life', l)
      const after = levelOf(xpOf(l)).level
      const lg = await read($, lang)
      const isNative = await read($, alerts)
      if (after > before) {
        void alertIfShown($, PANE, { look: { tag: '⚔ Adventure Log', logo: 'images/logo.png', hero: 'images/hero.png' }, title: UI[lg].levelUpTitle, body: `Lv ${after}`, sound: 'sounds/levelup.wav', isNative })
      } else if (t.startedAt && end - t.startedAt >= LONG_TURN_MS) {
        void alertIfShown($, PANE, { look: { tag: '⚔ Adventure Log', logo: 'images/logo.png', hero: 'images/hero.png' }, title: UI[lg].doneTitle, body: UI[lg].doneBody(seconds(lg, end - t.startedAt)), sound: 'sounds/levelup.wav', isNative })
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
    if ((await read($, approval))?.id === act.id) await update($, approval, () => null)
    if (e.agentId === undefined) {
      const l = await update($, life, (x: Life) => ({ ...x, actions: x.actions + 1, slain: x.slain + (act.isBattle && !isError ? 1 : 0) }))
      await $.store.set('life', l)
    }
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
  // The engine is about to ask the person whether a call may run: raise a hand,
  // and if they haven't answered after a few seconds, get their attention.
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
          await alertIfShown($, PANE, { look: { tag: '⚔ Adventure Log', logo: 'images/logo.png', hero: 'images/hero.png' }, title: UI[lg].approvalTitle, body: UI[lg].approvalBody(toolName(e.tool)), sound: 'sounds/attention.wav', isNative: await read($, alerts) })
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

  // One line above the prompt: what the hero is doing and the usage limits, so it
  // still shows with the pane closed. Plain text in the app's own colors.
  // A small mark of this mod beside the footer's mode labels, while its pane is on screen.
  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    if (!(await isPaneShown($, PANE))) return next(e)
    const jb = await read($, job)
    const lv = levelOf(xpOf(await read($, life))).level
    const label = `${JOBS[jb].emoji} Lv ${lv}`
    return next({ ...e, props: { ...e.props, modes: [...e.props.modes, label] } })
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    // Only the mod whose pane is on screen draws the band; the others pass it on.
    if (!(await isPaneShown($, PANE))) return next(e)
    const list = await read($, acts)
    const t = await read($, turn)
    const jb = await read($, job)
    const lg = await read($, lang)
    const qt = await read($, quota)
    const base = await read($, limitBase)
    const at = Math.max(await read($, now), Date.now())
    const want = sceneFor(t, list, at, (await read($, approval)) !== null)
    const live = [...list].reverse().find(a => a.endedAt === null)
    const five = qt.limits.find(l => l.kind === 'five_hour')?.percentUsed ?? null
    const week = qt.limits.find(l => l.kind === 'seven_day')?.percentUsed ?? null
    const fiveGain = gainText(five, base.five)
    const what = SCENES[lg][want].what
    const detail = live ? `${toolName(live.tool)}${live.detail ? ` ${live.detail}` : ''}` : ''
    if (e.surface === 'desktop') {
      const { Svg } = $.ui.resolve(e)
      return (
        <Svg
          source={bandSvg({ emoji: JOBS[jb].emoji, what, detail, five, fiveGain, week }, PIXEL_FONT)}
          alt={[what, detail, five === null ? '' : `♥ ${Math.round(five)}%`, week === null ? '' : `★ ${Math.round(week)}%`].filter(Boolean).join(' · ')}
        />
      )
    }
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box flexDirection="row" gap={1}>
        <Text>
          {JOBS[jb].emoji} {what}
        </Text>
        {live && (
          <Text dimColor wrap="truncate-end">
            · {toolName(live.tool)}
            {live.detail ? ` ${live.detail}` : ''}
          </Text>
        )}
        {five !== null && <Text color="#E03131">♥ {Math.round(five)}%</Text>}
        {fiveGain && <Text dimColor>{fiveGain}</Text>}
        {week !== null && <Text color="#E0B84A">★ {Math.round(week)}%</Text>}
      </Box>
    )
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
    const lifeNow = await read($, life)
    const isAlerting = await read($, alerts)
    const base = await read($, limitBase)
    const qt = await read($, quota)

    const at = Math.max(tick, Date.now())
    const hour = new Date(at).getHours() + new Date(at).getMinutes() / 60
    const want = sceneFor(t, list, at, (await read($, approval)) !== null)
    shown = schedule(shown, want, at, s => lineFor(lg, s, jb, at, step, spinner))
    const scene = shown.scene
    const walking = shown.from && at < shown.since + walkSeconds(shown.from, scene) * 1000 ? shown.from : undefined
    const info = SCENES[lg][scene]
    const hero = `${SPECIES_NAMES[lg][sp]} ${JOB_NAMES[lg][jb]}`
    const turnActs = list.filter(a => t.ids.includes(a.id))
    const live = [...list].reverse().find(a => a.endedAt === null)
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

    const E = $.ui.resolve(e)
    const { Box, Text, Svg, Button } = E
    const heading = (text: string) => (
      <Text weight="semibold" color={GOLD}>
        {text}
      </Text>
    )
    const toggle = (key: 'legend' | 'picker') => () =>
      update($, show, (s: { legend: boolean; picker: boolean }) => ({ ...s, [key]: !s[key] }))

    return (
      <Box flexDirection="column" gap="md" padding="md" backgroundColor={BG} minHeight={e.surface === 'desktop' ? e.props.scroll.bodyRows : undefined} flexGrow={1}>
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
        <Box flexDirection="row" gap="sm" flexWrap="wrap">
          <Text tabular color={DIM}>
            {timing}
          </Text>
          <Text tabular color={GOLD}>
            {(() => {
              const lv = levelOf(xpOf(lifeNow))
              return L.level(lv.level, lv.into, lv.need)
            })()}
          </Text>
          <Text tabular size="footnote" color={DIM}>
            {L.record(lifeNow.quests, lifeNow.slain, lifeNow.actions)}
          </Text>
        </Box>
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

        <Box flexDirection="column" gap="sm" padding="md" backgroundColor={CARD}>
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

        <Box flexDirection="column" gap="sm" padding="md" backgroundColor={CARD}>
          {heading(L.results)}
          {made.length === 0 ? (
            <Text color={DIM}>{L.resultsEmpty}</Text>
          ) : (
            made.slice(0, 4).map((o, i) => (
              <Box key={o.href} flexDirection="row" gap="sm" alignItems="center">
                <Text color={i === 0 ? GOLD : DIM}>{o.kind === 'artifact' ? '🔗' : '📄'}</Text>
                {/* The desktop draws a Button as its own native button and ignores the
                    color inside, so the title is plain themed text beside an Open button. */}
                <Text color={i === 0 ? GOLD : FG} wrap="truncate-end">
                  {o.title}
                </Text>
                <Text size="footnote" color={DIM}>
                  {i === 0 ? L.latest : ''}
                  {ago(lg, at - o.at)}
                </Text>
                {OpenButton(E, $, o.href, L.open, `open-${i}`)}
              </Box>
            ))
          )}
        </Box>

        <Box flexDirection="column" gap="sm" padding="md" backgroundColor={CARD}>
          {heading(L.log)}
          {LogLines(E, list, Boolean(opened), () => update($, logOpen, (v: string) => (v ? '' : 'all')), { ink: FG, soft: DIM, error: RED }, { empty: L.logEmpty, more: L.logMore, less: L.logLess, ally: L.ally, seconds: (ms: number) => seconds(lg, ms) })}
        </Box>

        {/* The camp menu: gold-lettered glyph buttons on one dark strip, the maker at its end. */}
        <Box flexDirection="row" gap="sm" flexWrap="wrap" alignItems="center" paddingX="md" paddingY="xs" backgroundColor={CARD} borderStyle="round" borderColor={GOLD}>
          <Text color={GOLD} weight="bold">
            {L.menu}
          </Text>
          <Button key="toggle-picker" variant={sh.picker ? 'primary' : 'secondary'} onPress={toggle('picker')}>
            {JOBS[jb].emoji}
          </Button>
          <Button key="toggle-legend" variant={sh.legend ? 'primary' : 'secondary'} onPress={toggle('legend')}>
            📜
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
            {th === 'dark' ? '☀' : '☾'}
          </Button>
          {AlertsButton(E, isAlerting, { on: '🔔', off: '🔕' }, async () => {
            const next = !isAlerting
            await update($, alerts, () => next)
            await $.store.set('alerts', next)
          })}
          {Credit(E, $, L.madeBy, DIM)}
        </Box>

        {sh.legend && (
          <Box flexDirection="column" gap="sm" padding="md" backgroundColor={CARD}>
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
          <Box flexDirection="column" gap="sm" padding="md" backgroundColor={CARD}>
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
      </Box>
    )
  })
}
