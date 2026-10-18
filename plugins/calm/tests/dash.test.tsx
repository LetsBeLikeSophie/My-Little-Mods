import { expect, mock, test } from 'claude-code/testing'

import { barCells, busyMs, gainText, isCheckCommand, kindOf, lighten, nextPlan, statusOf } from '../hooks/core'
import { langFrom } from '../hooks/i18n'

const PANE = {
  component: 'Pane',
  requestId: 'calm',
  props: {
    title: 'Dashboard',
    isFocused: false,
    bodyColumns: 40,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 80 },
    view: {},
  },
} as const

test('tools and requests read as plain status', async () => {
  expect(kindOf('Edit')).toBe('edit')
  expect(kindOf('mcp__Claude_Browser__navigate')).toBe('web')
  expect(isCheckCommand('Bash', 'npm test')).toBe(true)
  const idle = { isWorking: false, startedAt: 0, endedAt: null, ids: [] }
  expect(statusOf(idle, [], 0)).toBe('waiting')
  expect(statusOf({ ...idle, isWorking: true, startedAt: 1 }, [], 2)).toBe('thinking')
  expect(statusOf({ ...idle, startedAt: 1, endedAt: 10 }, [], 12)).toBe('done')
  const live = { id: 'a', tool: 'Bash', kind: 'bash', detail: '', full: '', startedAt: 1, endedAt: null, isError: false, isSub: false, isCheck: true } as const
  expect(statusOf({ ...idle, isWorking: true, startedAt: 1, ids: ['a'] }, [live], 2)).toBe('check')
  expect(nextPlan({ items: [], current: -1 }, 'TodoWrite', { todos: [{ content: 'a', status: 'in_progress' }] })).toEqual({ items: ['a'], current: 0 })
  expect(busyMs([{ startedAt: 0, endedAt: 10 }, { startedAt: 5, endedAt: 20 }], 30)).toBe(20)
  expect(langFrom('ko-KR')).toBe('ko')
})

test('limit bars show the gain since the request began', async () => {
  expect(gainText(45, 42)).toBe('+3%')
  expect(barCells(50, 25, 16)).toEqual({ old: 4, gained: 4, empty: 8 })
  expect(barCells(45.3, 45, 16).gained).toBe(1)
  expect(barCells(null, null, 16)).toEqual({ old: 0, gained: 0, empty: 16 })
  expect(lighten('#000000', 0.5)).toBe('#808080')
})

test('the dashboard draws on terminal and desktop', async ($, on) => {
  on('tool.call', () => ({ result: { type: 'create' } }))
  await $.tool.call({ tool: 'Write', file_path: 'C:\\work\\report.md', content: '# hi' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'my-little-calm', surface, ...PANE })
    expect(await ui.find({ text: /report\.md/ })).toBeDefined()
    await ui.unmount()
  }
})

test('picking an accent color sticks', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'my-little-calm', surface: 'desktop', ...PANE })
  await ui.press({ key: 'accent-green' })
  expect(await ui.find({ key: 'accent-green' })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /made by Sophie/ })).toBeDefined()
  await ui.unmount()
})

const BAND = {
  plugin: 'my-little-calm',
  component: 'AbovePrompt' as const,
  props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 60, scroll: { offset: 0, bodyRows: 4 }, view: {} },
}

test('a one-line band above the prompt says what is going on', async ($, on) => {
  on('ui.panes', () => ({ value: [{ id: 'calm', title: '', isShown: true, isFocused: false, isPlaced: true }] }))
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  await $.tool.call({ tool: 'Bash', command: 'echo hi' })
  const term = await $.ui.mount({
    plugin: 'my-little-calm',
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

test('a pending approval is the status', async () => {
  const idle = { isWorking: true, startedAt: 1, endedAt: null, ids: [] }
  expect(statusOf(idle, [], 2, true)).toBe('approval')
})

test('the log shows the newest action on top', async ($, on) => {
  mock.store(on)
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  await $.tool.call({ tool: 'Bash', command: 'echo first' })
  await $.tool.call({ tool: 'Bash', command: 'echo second' })
  const ui = await $.ui.mount({ plugin: 'my-little-calm', surface: 'desktop', ...PANE })
  const lines = (await ui.findAll({ type: 'Text', text: /echo (first|second)/ })).map(x => x.text)
  const logLines = lines.filter(t => /✓/.test(t))
  expect(logLines[0]).toContain('second')
  expect(logLines[1]).toContain('first')
  await ui.unmount()
})

test('the band is left to the mod whose pane is on screen', async ($, on) => {
  on('ui.panes', () => ({ value: [{ id: 'calm', title: '', isShown: false, isFocused: false, isPlaced: true }] }))
  on('ui.render', { component: 'AbovePrompt' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>the engine's own</Text>
  })
  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect((await ui.findAll({ type: 'Svg' })).length).toBe(0)
  expect(await ui.find({ type: 'Text', text: /the engine's own/ })).toBeDefined()
  await ui.unmount()
})

test('a small mark joins the footer mode labels', async ($, on) => {
  on('ui.panes', () => ({ value: [{ id: 'calm', title: '', isShown: true, isFocused: false, isPlaced: true }] }))
  let modes: readonly string[] = []
  on('ui.render', { component: 'SessionMode' }, ($, e) => {
    modes = e.props.modes
    const { Text } = $.ui.resolve(e)
    return <Text>{modes.join(' & ')}</Text>
  })
  const ui = await $.ui.mount({ plugin: 'my-little-calm', surface: 'desktop', component: 'SessionMode', props: { modes: ['auto'] } })
  expect(modes[0]).toBe('auto')
  expect(modes[1]).toMatch(/Calm/)
  await ui.unmount()
})
