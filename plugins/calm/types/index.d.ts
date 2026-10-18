export type ActKind = 'read' | 'search' | 'edit' | 'write' | 'bash' | 'web' | 'agent' | 'other'

export type Accent = 'blue' | 'green' | 'purple' | 'orange' | 'mono'

/** One tool call. */
export type Act = {
  id: string
  tool: string
  kind: ActKind
  detail: string
  full: string
  startedAt: number
  endedAt: number | null
  isError: boolean
  isSub: boolean
  isCheck: boolean
}

/** The main loop's current (or last) request. */
export type Turn = { isWorking: boolean; startedAt: number; endedAt: number | null; ids: string[] }

/** Something made for the person: a published artifact or a document file. */
export type Output = { href: string; title: string; kind: 'artifact' | 'file'; at: number }

export type Quota = {
  limits: { kind: string; percentUsed: number; resetsAt: string | null }[]
  contextPct: number | null
}

declare module 'claude-code' {
  interface PluginState {
    'my-little-calm': {
      acts: Act[]
      turn: Turn
      outputs: Output[]
      spent: { [kind: string]: number }
      quota: Quota
      limitBase: { five: number | null; week: number | null }
      plan: { items: string[]; current: number }
      accent: Accent
      theme: 'dark' | 'light'
      lang: 'ko' | 'en'
      logOpen: string
      approval: { id: string; tool: string; since: number } | null
      alerts: boolean
      life: { quests: number; slain: number; actions: number }
      now: number
    }
  }
}
