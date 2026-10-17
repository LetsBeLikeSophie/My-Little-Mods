import { expect, mock, test } from 'claude-code/testing'

import { barCells, busyMs, gainText, isCheckCommand, kindOf, lighten, nextPlan, statusOf } from '../hooks/core'
import { langFrom } from '../hooks/i18n'

const PANE = {
  component: 'Pane',
  requestId: 'simple-dash',
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
    const ui = await $.ui.mount({ plugin: 'simple-dash', surface, ...PANE })
    expect(await ui.find({ text: /report\.md/ })).toBeDefined()
    await ui.unmount()
  }
})

test('picking an accent color sticks', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'simple-dash', surface: 'desktop', ...PANE })
  await ui.press({ key: 'accent-green' })
  expect((await ui.findAll({ type: 'Text', text: /◉/ })).length).toBe(1)
  expect(await ui.find({ type: 'Text', text: /made by Sophie/ })).toBeDefined()
  await ui.unmount()
})
