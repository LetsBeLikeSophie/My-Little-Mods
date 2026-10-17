export type ActKind =
  | 'read'
  | 'search'
  | 'edit'
  | 'write'
  | 'bash'
  | 'web'
  | 'agent'
  | 'other'

export type Species = 'human' | 'cat' | 'dog' | 'bear' | 'rabbit'
export type Job = 'warrior' | 'mage' | 'hunter' | 'rogue' | 'priest'

/** One tool call, as the pane draws it. */
export type Act = {
  id: string
  tool: string
  kind: ActKind
  detail: string
  /** The same, uncut (up to a few hundred characters), for an opened log line. */
  full: string
  startedAt: number
  endedAt: number | null
  isError: boolean
  isSub: boolean
  isBattle: boolean
}

/** The main loop's current (or last) turn. */
export type Turn = {
  isWorking: boolean
  startedAt: number
  endedAt: number | null
  ids: string[]
}

/** Something made for the person: a published artifact or a document file. */
export type Output = {
  href: string
  title: string
  kind: 'artifact' | 'file'
  at: number
}

declare module 'claude-code' {
  interface PluginState {
    'pixel-activity': {
      acts: Act[]
      turn: Turn
      counts: { [kind: string]: number }
      files: string[]
      outputs: Output[]
      species: Species
      job: Job
      show: { legend: boolean; picker: boolean }
      plan: { items: string[]; current: number }
      theme: 'dark' | 'light'
      lang: 'ko' | 'en'
      spent: { [kind: string]: number }
      logOpen: string
      limitBase: { five: number | null; week: number | null }
      quota: {
        limits: { kind: string; percentUsed: number; resetsAt: string | null }[]
        contextPct: number | null
        usd: number | null
      }
      now: number
    }
  }
}
