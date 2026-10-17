// Every word the dashboard shows, in Korean and English (follows the system language).

import type { Accent } from '../types'
import type { Status } from './core'

export type Lang = 'ko' | 'en'

export function langFrom(tag: string | undefined): Lang | undefined {
  if (!tag) return undefined
  const t = tag.trim().toLowerCase()
  if (!t || t === 'c' || t === 'posix') return undefined
  return t.startsWith('ko') ? 'ko' : 'en'
}

export const STATUS: { [L in Lang]: { [K in Status]: string } } = {
  ko: {
    thinking: '생각하는 중',
    read: '파일 읽는 중',
    search: '찾아보는 중',
    edit: '코드 고치는 중',
    write: '새 파일 만드는 중',
    bash: '명령 실행하는 중',
    check: '테스트·검사 중',
    web: '웹 보는 중',
    agent: '에이전트에게 맡기는 중',
    other: '작업하는 중',
    error: '방금 실패했어요',
    done: '방금 끝났어요',
    waiting: '내 차례 (기다리는 중)',
  },
  en: {
    thinking: 'Thinking',
    read: 'Reading a file',
    search: 'Searching',
    edit: 'Editing code',
    write: 'Making a new file',
    bash: 'Running a command',
    check: 'Running tests and checks',
    web: 'Browsing the web',
    agent: 'Handing off to an agent',
    other: 'Working',
    error: 'That just failed',
    done: 'Just finished',
    waiting: 'Your turn',
  },
}

export const TIME_LABELS: { [L in Lang]: { [k: string]: string } } = {
  ko: { thinking: '생각', read: '읽기', search: '검색', edit: '고치기', write: '새 파일', bash: '명령', check: '테스트', web: '웹', agent: '에이전트', other: '기타' },
  en: { thinking: 'Think', read: 'Read', search: 'Search', edit: 'Edit', write: 'New file', bash: 'Command', check: 'Tests', web: 'Web', agent: 'Agent', other: 'Other' },
}

export const ACCENT_NAMES: { [L in Lang]: { [K in Accent]: string } } = {
  ko: { blue: '파랑', green: '초록', purple: '보라', orange: '주황', mono: '흑백' },
  en: { blue: 'Blue', green: 'Green', purple: 'Purple', orange: 'Orange', mono: 'Mono' },
}

export function seconds(lang: Lang, ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  if (lang === 'ko') return s < 60 ? `${s}초` : `${m}분 ${s % 60}초`
  return s < 60 ? `${s}s` : `${m}m ${s % 60}s`
}

export function untilText(lang: Lang, ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000))
  const d = Math.floor(m / 1440)
  const h = Math.floor((m % 1440) / 60)
  const mm = m % 60
  if (lang === 'ko') return d > 0 ? `${d}일 ${h}시간` : h > 0 ? `${h}시간 ${mm}분` : `${mm}분`
  return d > 0 ? `${d}d ${h}h` : h > 0 ? `${h}h ${mm}m` : `${mm}m`
}

export function ago(lang: Lang, ms: number): string {
  const m = Math.floor(ms / 60000)
  if (lang === 'ko') return m < 1 ? '방금' : m < 60 ? `${m}분 전` : `${Math.floor(m / 60)}시간 전`
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`
}

export const UI = {
  ko: {
    limits: '사용 한도',
    limitsNote: '밝은 부분 = 방금 요청이 쓴 양',
    five: '5시간',
    week: '주간',
    session: '세션',
    sessionNote: '세션이 다 차면 자동으로 압축돼요',
    compactSoon: '곧 압축',
    results: '결과물',
    resultsEmpty: '아티팩트나 문서를 만들면 여기에 생겨요',
    time: '시간 쓴 곳',
    timeEmpty: '조금 일하면 여기에 보여요',
    log: '로그',
    logEmpty: '아직 없어요',
    ally: '[에이전트]',
    step: '단계: ',
    light: '라이트',
    dark: '다크',
    madeBy: 'made by Sophie',
    command: '심플 대시보드 열기 (색: /dash blue|green|purple|orange|mono)',
    opened: '심플 대시보드를 열었어요.',
    colored: (name: string) => `색을 ${name}(으)로 바꿨어요.`,
  },
  en: {
    limits: 'Usage limits',
    limitsNote: 'bright part = what the last request used',
    five: '5-hour',
    week: 'Weekly',
    session: 'Session',
    sessionNote: 'The session compacts itself when full',
    compactSoon: 'compacting soon',
    results: 'Results',
    resultsEmpty: 'Artifacts and documents I make show up here',
    time: 'Where the time went',
    timeEmpty: 'Shows up once I have done some work',
    log: 'Log',
    logEmpty: 'Nothing yet',
    ally: '[agent]',
    step: 'Step: ',
    light: 'Light',
    dark: 'Dark',
    madeBy: 'made by Sophie',
    command: 'Open the simple dashboard (color: /dash blue|green|purple|orange|mono)',
    opened: 'Opened the simple dashboard.',
    colored: (name: string) => `Accent color is now ${name}.`,
  },
} as const
