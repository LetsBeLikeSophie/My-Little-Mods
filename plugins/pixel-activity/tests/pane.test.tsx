import { expect, mock, test } from 'claude-code/testing'

import { artifactIn, detailOf, isBattleCommand, kindOf, levelOf, lineFor, nextPlan, sceneFor, schedule, toolName, xpOf } from '../hooks/register'
import { busyMs, statsSvg } from '../hooks/stats'
import { gainText, hudSvg } from '../hooks/hud'
import { JOB_IDS, SCENE_IDS, SPECIES_IDS, campSvg, thumbSvg } from '../hooks/camp'
import { JOB_BLURB, langFrom, picFor } from '../hooks/i18n'
const importI18n = async () => ({ JOB_BLURB, picFor })
import { PIXEL_FONT } from '../hooks/font'
import type { Scene } from '../hooks/camp'

const PANE = {
  component: 'Pane',
  requestId: 'pixel-activity',
  props: {
    title: 'Adventure Log',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 80 },
    view: {},
  },
} as const

test('tools sort into kinds and read plainly', async () => {
  expect(kindOf('Read')).toBe('read')
  expect(kindOf('Grep')).toBe('search')
  expect(kindOf('Edit')).toBe('edit')
  expect(kindOf('PowerShell')).toBe('bash')
  expect(kindOf('mcp__Claude_Browser__navigate')).toBe('web')
  expect(kindOf('Agent')).toBe('agent')
  expect(kindOf('Mystery')).toBe('other')
  expect(toolName('mcp__Claude_Browser__navigate')).toBe('navigate')
  expect(detailOf({ file_path: 'C:\\a\\b\\note.ts' })).toBe('note.ts')
  expect(artifactIn('published: https://claude.ai/code/artifact/abc-123 ok')).toBe(
    'https://claude.ai/code/artifact/abc-123',
  )
})

test('the scene follows the turn', async () => {
  const idle = { isWorking: false, startedAt: 0, endedAt: null, ids: [] }
  expect(sceneFor(idle, [], 0)).toBe('waiting')
  expect(sceneFor({ ...idle, isWorking: true, startedAt: 1 }, [], 2)).toBe('thinking')
  const live = { id: 'a', tool: 'Edit', kind: 'edit', detail: '', startedAt: 1, endedAt: null, isError: false, isSub: false, isBattle: false, full: '' } as const
  expect(sceneFor({ ...idle, isWorking: true, startedAt: 1, ids: ['a'] }, [live], 2)).toBe('edit')
  expect(sceneFor({ ...idle, startedAt: 1, endedAt: 10 }, [], 12)).toBe('done')
  expect(sceneFor({ ...idle, startedAt: 1, endedAt: 10 }, [], 60_000)).toBe('waiting')
  expect(sceneFor({ ...idle, startedAt: 1, endedAt: 10 }, [], 10 * 60_000)).toBe('sleeping')
})

test('every scene, class and species draws within the Svg limit', async () => {
  for (const scene of SCENE_IDS) {
    for (const job of JOB_IDS) {
      for (const sp of SPECIES_IDS) {
        const svg = campSvg(sp, job, scene, 'night', { say: 'Pondering…' }, PIXEL_FONT, 'read')
        expect(svg.startsWith('<svg')).toBe(true)
        expect(svg.length).toBeLessThan(131072)
      }
    }
  }
})

test('the pane says what just ran and links a new document', async ($, on) => {
  on('tool.call', () => ({ result: { type: 'create' } }))
  await $.tool.call({ tool: 'Write', file_path: 'C:\\work\\report.md', content: '# hi' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'pixel-activity', surface, ...PANE })
    expect(await ui.find({ text: /report\.md/ })).toBeDefined()
    await ui.unmount()
  }
})

test('picking a class and species redraws the hero', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'pixel-activity', surface: 'desktop', ...PANE })
  await ui.press({ key: 'toggle-picker' })
  await ui.press({ key: 'job-mage' })
  await ui.press({ key: 'sp-rabbit' })
  await ui.press({ key: 'toggle-legend' })
  expect(await ui.find({ text: /지팡이로 마법 연습|Practising with the staff/ })).toBeDefined()
  await ui.unmount()
})

test('a test command is a fight, and passing it slays the slime', async () => {
  expect(isBattleCommand('Bash', 'npm test')).toBe(true)
  expect(isBattleCommand('PowerShell', 'npx tsc -p .')).toBe(true)
  expect(isBattleCommand('Bash', 'ls -la')).toBe(false)
  const fight = { id: 'b', tool: 'Bash', kind: 'bash', detail: '', startedAt: 1, endedAt: null, isError: false, isSub: false, isBattle: true, full: '' } as const
  const turn = { isWorking: true, startedAt: 1, endedAt: null, ids: ['b'] }
  expect(sceneFor(turn, [fight], 2)).toBe('battle')
  expect(sceneFor(turn, [{ ...fight, endedAt: 3 }], 4)).toBe('slain')
  expect(sceneFor(turn, [{ ...fight, endedAt: 3, isError: true }], 4)).toBe('error')
})

test('a finished action lingers before thinking shows again', async () => {
  const done = { id: 'a', tool: 'Read', kind: 'read', detail: '', startedAt: 1, endedAt: 2, isError: false, isSub: false, isBattle: false, full: '' } as const
  const turn = { isWorking: true, startedAt: 1, endedAt: null, ids: ['a'] }
  expect(sceneFor(turn, [done], 3_000)).toBe('read')
  expect(sceneFor(turn, [done], 9_000)).toBe('thinking')
})

test('the thinking bubble says the step in progress', async () => {
  const empty = { items: [], current: -1 }
  const p1 = nextPlan(empty, 'mcp__ccd_turn__update_plan', { items: [{ content: '지도 그리기', status: 'in_progress' }, { content: '몬스터 잡기', status: 'pending' }] })
  expect(p1).toEqual({ items: ['지도 그리기', '몬스터 잡기'], current: 0 })
  expect(nextPlan(p1!, 'mcp__ccd_turn__update_plan', { advance: true })).toEqual({ items: ['지도 그리기', '몬스터 잡기'], current: 1 })
  expect(nextPlan(empty, 'Read', { file_path: 'x' })).toBeUndefined()
  expect(lineFor('ko', 'thinking', 'mage', 0, '몬스터 잡기')).toBe('몬스터 잡기…')
  expect(lineFor('en', 'thinking', 'mage', 5, '', { word: 'Pondering', at: 0 })).toBe('Pondering…')
  expect(lineFor('ko', 'edit', 'hunter', 0, '')).toBe('명중!')
  expect(lineFor('en', 'edit', 'hunter', 0, '')).toBe('Bullseye!')
})

test('the theme button flips between dark and light', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'pixel-activity', surface: 'desktop', ...PANE })
  expect(await ui.find({ key: 'toggle-theme', text: /☀/ })).toBeDefined()
  await ui.press({ key: 'toggle-theme' })
  expect(await ui.find({ key: 'toggle-theme', text: /☾/ })).toBeDefined()
  await ui.unmount()
})

test('the language follows the system tag', async () => {
  expect(langFrom('ko-KR')).toBe('ko')
  expect(langFrom('ko_KR.UTF-8')).toBe('ko')
  expect(langFrom('en-US')).toBe('en')
  expect(langFrom('C')).toBeUndefined()
  expect(langFrom(undefined)).toBeUndefined()
})

test('a scene change walks the hero over and pans the camera', async () => {
  const text = { say: 's' }
  const walked = campSvg('cat', 'warrior', 'write', 'day', text, '', 'read')
  expect(walked).toContain('attributeName="viewBox"')
  expect(walked).toContain('type="translate"')
  expect(campSvg('cat', 'warrior', 'write', 'day', text)).not.toContain('attributeName="viewBox"')
})

test('a scene plays out before the next one takes over', async () => {
  const say = (s: string) => s
  const a = schedule(undefined, 'read', 0, say)
  expect(a.scene).toBe('read')
  // read → edit right away: still reading
  expect(schedule(a, 'edit', 1_000, say).scene).toBe('read')
  // after the stay, edit comes in, walked from read
  const b = schedule(a, 'edit', 5_000, say)
  expect(b).toMatchObject({ scene: 'edit', from: 'read', since: 5_000 })
  // the walk counts before the stay starts
  expect(schedule(b, 'bash', 9_000, say).scene).toBe('edit')
  expect(schedule(b, 'bash', 12_000, say).scene).toBe('bash')
})

test('time spent counts overlapping calls once and charts it', async () => {
  expect(busyMs([{ startedAt: 0, endedAt: 10 }, { startedAt: 5, endedAt: 20 }, { startedAt: 30, endedAt: 40 }], 50)).toBe(30)
  expect(busyMs([{ startedAt: 0, endedAt: null }], 7)).toBe(7)
  const svg = statsSvg({ thinking: 60_000, edit: 20_000, read: 100 }, k => k, ms => `${ms / 1000}s`, '', { fg: '#000', dim: '#888' })
  expect(svg).toContain('thinking')
  expect(svg).toContain('75%')
  expect(svg).not.toContain('>read<')
})

test('each class has its own moves', async () => {
  const { picFor, JOB_BLURB } = await importI18n()
  const pics = JOB_IDS.map(j => picFor('ko', 'bash', j))
  expect(new Set(pics).size).toBe(JOB_IDS.length)
  for (const j of JOB_IDS) expect(JOB_BLURB.en[j].length).toBeGreaterThan(10)
  for (const j of JOB_IDS) {
    const a = campSvg('bear', j, 'battle', 'day', { say: 'x' })
    const b = campSvg('bear', j, 'waiting', 'day', { say: 'x' })
    expect(a).not.toBe(b)
  }
})

test('the legend shows a still of every scene', async ($, on) => {
  mock.store(on)
  for (const scene of SCENE_IDS) {
    const svg = thumbSvg('cat', 'hunter', scene)
    expect(svg).not.toContain('<animate')
    expect(svg.length).toBeLessThan(131072)
  }
  const ui = await $.ui.mount({ plugin: 'pixel-activity', surface: 'desktop', ...PANE })
  await ui.press({ key: 'toggle-legend' })
  expect((await ui.findAll({ type: 'Svg' })).length).toBeGreaterThan(SCENE_IDS.length)
  await ui.unmount()
})

test('one-time actions play once, then settle into an idle loop', async () => {
  const web = campSvg('cat', 'mage', 'web', 'day', { say: 'x' })
  expect(web).toContain('<set attributeName="opacity" to="1" begin="0.00s"')
  expect(web).toContain('fill="freeze"')
  const walked = campSvg('cat', 'mage', 'web', 'day', { say: 'x' }, '', 'read')
  expect(walked).not.toContain('begin="0.00s" dur=')
})

test('a log line opens to its whole text on a click', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  const long = 'npx some-really-long-command --with --many --flags --that --go --on --and --on --past --the --edge'
  await $.tool.call({ tool: 'Bash', command: long })
  const ui = await $.ui.mount({ plugin: 'pixel-activity', surface: 'desktop', ...PANE })
  const line = await ui.find({ type: 'Text', text: /some-really-long/ })
  expect(line?.text).not.toContain('--edge')
  await ui.press({ key: 'log-toggle' })
  expect((await ui.find({ type: 'Text', text: /some-really-long/ }))?.text).toContain('--edge')
  await ui.unmount()
})

test('a request shows what it used of the limits, XP-style', async () => {
  expect(gainText(45, 42)).toBe('+3%')
  expect(gainText(42.4, 42)).toBe('+0.4%')
  expect(gainText(42, 42)).toBe('')
  expect(gainText(42, null)).toBe('')
  const svg = hudSvg(
    [{ title: 'limits', bars: [{ icon: 'heart', label: '5h', pct: 50, base: 25, color: '#E03131', glow: '#FF9A9A', right: '' }] }],
    '',
    { fg: '#000', dim: '#888', empty: '#eee', head: '#a60' },
  )
  expect(svg).toContain('#FF9A9A')
  expect(svg).toContain('+25%')
  expect(svg).not.toContain('tokens')
})

test('the maker credit is a button to the GitHub page', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'pixel-activity', surface: 'desktop', ...PANE })
  expect(await ui.find({ type: 'Text', text: /made by Sophie/ })).toBeDefined()
  expect(await ui.find({ key: 'credit-link' })).toBeDefined()
  await ui.unmount()
})

const BAND = {
  plugin: 'pixel-activity',
  component: 'AbovePrompt' as const,
  props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 60, scroll: { offset: 0, bodyRows: 4 }, view: {} },
}

test('a one-line band above the prompt says what is going on', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  await $.tool.call({ tool: 'Bash', command: 'echo hi' })
  const term = await $.ui.mount({
    plugin: 'pixel-activity',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 60, scroll: { offset: 0, bodyRows: 4 }, view: {} },
  })
  expect((await term.findAll({ type: 'Text' })).length).toBeGreaterThan(0)
  await term.unmount()
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.findAll({ type: 'Svg' })).length).toBe(1)
  await ui.unmount()
})

test('a pending approval raises a hand at once', async () => {
  const idle = { isWorking: true, startedAt: 1, endedAt: null, ids: [] }
  expect(sceneFor(idle, [], 2, true)).toBe('approval')
  const say = (x: string) => x
  const reading = schedule(undefined, 'read', 0, say)
  expect(schedule(reading, 'approval', 100, say).scene).toBe('approval')
})

test('XP adds up to levels that each ask a little more', async () => {
  expect(xpOf({ quests: 3, slain: 2, actions: 7 })).toBe(47)
  expect(levelOf(0)).toEqual({ level: 1, into: 0, need: 50 })
  expect(levelOf(50)).toEqual({ level: 2, into: 0, need: 75 })
  expect(levelOf(130)).toEqual({ level: 3, into: 5, need: 100 })
})

test('an ask from the engine shows as waiting for approval', async ($, on) => {
  on('tool.check', () => ({ decision: 'ask' }))
  const v = await $.tool.check({ tool: 'Bash', input: { command: 'rm -rf build' }, tool_use_id: 't1' })
  expect(v.decision).toBe('ask')
  const ui = await $.ui.mount({
    plugin: 'pixel-activity',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: true, maxRows: 4, bodyColumns: 60, scroll: { offset: 0, bodyRows: 4 }, view: {} },
  })
  expect(await ui.find({ type: 'Text', text: /승인 기다리는 중|Waiting for your approval/ })).toBeDefined()
  await ui.unmount()
})
