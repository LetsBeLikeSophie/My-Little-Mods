import { expect, mock, test } from 'claude-code/testing'

import { busyMs, gainText, isCheckCommand, kindOf, nextPlan, statusOf } from '../hooks/core'
import { langFrom } from '../hooks/i18n'

const PANE = {
  component: 'Pane',
  requestId: 'daily-journal',
  props: {
    title: 'Journal',
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
})

test('the dashboard draws on terminal and desktop', async ($, on) => {
  on('tool.call', () => ({ result: { type: 'create' } }))
  await $.tool.call({ tool: 'Write', file_path: 'C:\\work\\report.md', content: '# hi' })
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'daily-journal', surface, ...PANE })
    expect(await ui.find({ text: /report\.md/ })).toBeDefined()
    await ui.unmount()
  }
})

test('the journal pane draws with its credit', async ($, on) => {
  mock.store(on)
  const ui = await $.ui.mount({ plugin: 'daily-journal', surface: 'desktop', ...PANE })
  expect(await ui.find({ type: 'Text', text: /made by Sophie/ })).toBeDefined()
  await ui.unmount()
})

test('a one-line band above the prompt says what is going on', async ($, on) => {
  on('tool.call', () => ({ result: { stdout: '', stderr: '', interrupted: false } }))
  await $.tool.call({ tool: 'Bash', command: 'echo hi' })
  const ui = await $.ui.mount({
    plugin: 'daily-journal',
    surface: 'desktop',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 4, bodyColumns: 60, scroll: { offset: 0, bodyRows: 4 }, view: {} },
  })
  expect((await ui.findAll({ type: 'Text' })).length).toBeGreaterThan(0)
  await ui.unmount()
})

test('a pending approval is the status', async () => {
  const idle = { isWorking: true, startedAt: 1, endedAt: null, ids: [] }
  expect(statusOf(idle, [], 2, true)).toBe('approval')
})
