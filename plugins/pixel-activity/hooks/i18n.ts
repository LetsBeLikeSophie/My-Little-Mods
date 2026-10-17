// Every word the panel shows, in Korean and English. The language follows the
// system: Windows' display language, else LANG / LC_ALL, else the runtime's.

import type { Job, Species } from '../types'
import type { Scene } from './camp'
import type { TimeKey } from './stats'

export type Lang = 'ko' | 'en'

/** `ko-KR`, `ko_KR.UTF-8`, `en-US` … to the language the panel speaks. */
export function langFrom(tag: string | undefined): Lang | undefined {
  if (!tag) return undefined
  const t = tag.trim().toLowerCase()
  if (!t || t === 'c' || t === 'posix') return undefined
  return t.startsWith('ko') ? 'ko' : 'en'
}

type SceneText = { pic: string; what: string; shout: string }

export const SCENES: { [L in Lang]: { [K in Scene]: SceneText } } = {
  ko: {
    thinking: { pic: '지도 앞에서 작전 짜기', what: '생각하는 중', shout: '흠… 어디부터 볼까' },
    read: { pic: '책 펴고 공부', what: '파일 읽는 중', shout: '음음, 그렇군…' },
    search: { pic: '횃불 들고 정찰', what: '찾아보는 중', shout: '어디 숨었지?' },
    edit: { pic: '무기 손질·수련', what: '코드 고치는 중', shout: '슥삭슥삭!' },
    write: { pic: '모루에서 새 장비 만들기', what: '새 파일 만드는 중', shout: '깡! 깡! 깡!' },
    bash: { pic: '주문 외우기', what: '명령 실행하는 중', shout: '주문 발동!' },
    web: { pic: '전령 새가 편지 가져옴', what: '웹 보는 중', shout: '편지가 왔다!' },
    agent: { pic: '동료가 합류', what: '에이전트에게 맡기는 중', shout: '도와줘, 동료!' },
    other: { pic: '도구 상자 나르기', what: '이것저것 하는 중', shout: '영차영차' },
    error: { pic: '한 대 맞고 어질어질', what: '방금 실패했어요', shout: '으악, 실패…' },
    done: { pic: '퀘스트 완료! 보물상자', what: '방금 끝났어요', shout: '퀘스트 완료!' },
    waiting: { pic: '모닥불 앞에서 쉬기', what: '내 차례 (기다리는 중)', shout: '다음 퀘스트는?' },
    sleeping: { pic: '모닥불 옆에서 낮잠', what: '한동안 쉬는 중', shout: 'zzZ…' },
    battle: { pic: '슬라임(버그)과 전투', what: '테스트·검사 돌리는 중', shout: '버그 발견! 덤벼라!' },
    slain: { pic: '슬라임 처치!', what: '테스트·검사 통과', shout: '버그 처치!' },
    approval: { pic: '손 들고 기다리기', what: '승인 기다리는 중', shout: '여기요! 확인해 주세요!' },
  },
  en: {
    thinking: { pic: 'Planning over the map', what: 'Thinking', shout: 'Hmm… where to start' },
    read: { pic: 'Studying a book', what: 'Reading a file', shout: 'I see, I see…' },
    search: { pic: 'Scouting with a torch', what: 'Searching', shout: 'Where is it?' },
    edit: { pic: 'Weapon practice', what: 'Editing code', shout: 'Swish swish!' },
    write: { pic: 'Forging new gear', what: 'Making a new file', shout: 'Clang! Clang!' },
    bash: { pic: 'Casting a spell', what: 'Running a command', shout: 'Spell cast!' },
    web: { pic: 'A messenger bird arrives', what: 'Browsing the web', shout: 'A letter came!' },
    agent: { pic: 'An ally joins', what: 'Handing off to an agent', shout: 'Help me, friend!' },
    other: { pic: 'Hauling the toolbox', what: 'Doing odd jobs', shout: 'Heave-ho' },
    error: { pic: 'Hit and dizzy', what: 'That just failed', shout: 'Ouch, missed…' },
    done: { pic: 'Quest complete! Treasure', what: 'Just finished', shout: 'Quest complete!' },
    waiting: { pic: 'Resting by the fire', what: 'Your turn', shout: 'Next quest?' },
    sleeping: { pic: 'Napping by the fire', what: 'Idle for a while', shout: 'zzZ…' },
    battle: { pic: 'Fighting a slime (bug)', what: 'Running tests and checks', shout: 'A bug! Have at you!' },
    slain: { pic: 'Slime defeated!', what: 'Tests and checks passed', shout: 'Bug slain!' },
    approval: { pic: 'Hand raised', what: 'Waiting for your approval', shout: 'Over here! Please check!' },
  },
}

export const JOB_NAMES: { [L in Lang]: { [K in Job]: string } } = {
  ko: { warrior: '전사', mage: '마법사', hunter: '사냥꾼', rogue: '도적', priest: '사제' },
  en: { warrior: 'Warrior', mage: 'Mage', hunter: 'Hunter', rogue: 'Rogue', priest: 'Priest' },
}

export const SPECIES_NAMES: { [L in Lang]: { [K in Species]: string } } = {
  ko: { human: '사람', cat: '고양이', dog: '강아지', bear: '곰', rabbit: '토끼' },
  en: { human: 'Human', cat: 'Cat', dog: 'Dog', bear: 'Bear', rabbit: 'Rabbit' },
}

export const THINK_LINES: { [L in Lang]: readonly string[] } = {
  ko: ['흠… 어디부터 볼까', '작전을 짜는 중…', '마나를 모으는 중…', '좋은 수가 있을까?', '지도를 다시 보자…'],
  en: ['Hmm… where to start', 'Drawing up a plan…', 'Gathering mana…', 'Is there a better way?', 'Checking the map again…'],
}

type JobScene = 'edit' | 'bash' | 'battle' | 'waiting' | 'done'

/** Each class's own moves: these replace the shared words for those scenes. */
export const BY_JOB: { [L in Lang]: { [K in Job]: { [S in JobScene]: { pic: string; shout: string } } } } = {
  ko: {
    warrior: {
      edit: { pic: '검술 수련', shout: '얍! 얍!' },
      bash: { pic: '전투의 함성', shout: '으랏차차!' },
      battle: { pic: '돌진해서 베기', shout: '돌격!' },
      waiting: { pic: '칼 닦으며 쉬기', shout: '다음 전투는?' },
      done: { pic: '칼 높이 들고 승리', shout: '승리다!' },
    },
    mage: {
      edit: { pic: '지팡이로 마법 연습', shout: '집중…!' },
      bash: { pic: '화염구 발사', shout: '화염구!' },
      battle: { pic: '화염구로 슬라임 공격', shout: '불타라!' },
      waiting: { pic: '책이랑 찻잔 띄워 놓고 쉬기', shout: '차 한 잔 할까…' },
      done: { pic: '불꽃놀이', shout: '펑! 펑!' },
    },
    hunter: {
      edit: { pic: '과녁에 활 쏘기', shout: '명중!' },
      bash: { pic: '조명탄 쏘아 올리기', shout: '신호 발사!' },
      battle: { pic: '화살 연사 + 늑대 펫 공격', shout: '물어, 늑대야!' },
      waiting: { pic: '늑대 펫이랑 낮잠', shout: '쉿, 늑대 자는 중' },
      done: { pic: '늑대랑 같이 폴짝', shout: '잘했어, 늑대야!' },
    },
    rogue: {
      edit: { pic: '숫돌에 단검 갈기', shout: '슥삭슥삭!' },
      bash: { pic: '연막탄 펑!', shout: '사라져 볼까' },
      battle: { pic: '은신 후 뒤에서 기습', shout: '등 뒤를 조심해' },
      waiting: { pic: '단검 저글링', shout: '심심한데…' },
      done: { pic: '금화 주머니 챙기기', shout: '짤랑짤랑~' },
    },
    priest: {
      edit: { pic: '지팡이로 빛 모으기', shout: '빛이여…!' },
      bash: { pic: '빛의 기둥', shout: '축복을!' },
      battle: { pic: '하늘에서 신성한 일격', shout: '정화하라!' },
      waiting: { pic: '모닥불 앞에서 기도', shout: '평화롭다…' },
      done: { pic: '후광 + 하트', shout: '모두 무사해요!' },
    },
  },
  en: {
    warrior: {
      edit: { pic: 'Sword drills', shout: 'Hyah! Hyah!' },
      bash: { pic: 'Battle Shout', shout: 'For glory!' },
      battle: { pic: 'Charge and slash', shout: 'Charge!' },
      waiting: { pic: 'Wiping the sword clean', shout: 'Next battle?' },
      done: { pic: 'Sword raised in victory', shout: 'Victory!' },
    },
    mage: {
      edit: { pic: 'Practising with the staff', shout: 'Focus…!' },
      bash: { pic: 'Fireball', shout: 'Fireball!' },
      battle: { pic: 'Fireball at the slime', shout: 'Burn!' },
      waiting: { pic: 'Book and teacup afloat', shout: 'Tea, perhaps…' },
      done: { pic: 'Fireworks', shout: 'Boom! Boom!' },
    },
    hunter: {
      edit: { pic: 'Shooting at a target', shout: 'Bullseye!' },
      bash: { pic: 'Firing a flare', shout: 'Signal up!' },
      battle: { pic: 'Arrow volley + wolf pet', shout: 'Get it, boy!' },
      waiting: { pic: 'Napping with the wolf', shout: 'Shh, wolf is asleep' },
      done: { pic: 'Hopping with the wolf', shout: 'Good boy!' },
    },
    rogue: {
      edit: { pic: 'Honing a dagger', shout: 'Shhk shhk!' },
      bash: { pic: 'Smoke bomb!', shout: 'Now you see me…' },
      battle: { pic: 'Vanish, strike from behind', shout: 'Behind you' },
      waiting: { pic: 'Juggling a dagger', shout: 'So bored…' },
      done: { pic: 'Pocketing the gold', shout: 'Jingle jingle~' },
    },
    priest: {
      edit: { pic: 'Gathering light', shout: 'Let there be light!' },
      bash: { pic: 'Pillar of light', shout: 'Blessings!' },
      battle: { pic: 'Holy Smite from above', shout: 'Be cleansed!' },
      waiting: { pic: 'Praying by the fire', shout: 'So peaceful…' },
      done: { pic: 'Halo and hearts', shout: 'Everyone is safe!' },
    },
  },
}

/** One line about each class for the picker: what makes it fun to pick. */
export const JOB_BLURB: { [L in Lang]: { [K in Job]: string } } = {
  ko: {
    warrior: '돌진하고 베는 근접 전투. 함성 한 번이면 기세가 오른다.',
    mage: '화염구 한 방! 쉴 때는 책과 찻잔이 둥둥 떠다닌다.',
    hunter: '늑대 펫이 늘 함께한다. 화살과 늑대가 같이 싸운다.',
    rogue: '연막탄과 은신. 적의 등 뒤에서 나타난다.',
    priest: '하늘에서 내리는 빛. 기도하고, 모두를 지킨다.',
  },
  en: {
    warrior: 'Charges in and slashes. One shout and spirits rise.',
    mage: 'Fireballs! At rest, a book and a teacup float around.',
    hunter: 'Never without the wolf pet: arrows and fangs together.',
    rogue: 'Smoke bombs and stealth. Shows up behind the enemy.',
    priest: 'Light from the sky. Prays, and keeps everyone safe.',
  },
}

function byJob(lang: Lang, scene: Scene, job: Job): { pic: string; shout: string } | undefined {
  return scene === 'edit' || scene === 'bash' || scene === 'battle' || scene === 'waiting' || scene === 'done'
    ? BY_JOB[lang][job][scene]
    : undefined
}

export function picFor(lang: Lang, scene: Scene, job: Job): string {
  return byJob(lang, scene, job)?.pic ?? SCENES[lang][scene].pic
}

export function shoutFor(lang: Lang, scene: Scene, job: Job): string {
  return byJob(lang, scene, job)?.shout ?? SCENES[lang][scene].shout
}

export function seconds(lang: Lang, ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  if (lang === 'ko') return s < 60 ? `${s}초` : `${m}분 ${s % 60}초`
  return s < 60 ? `${s}s` : `${m}m ${s % 60}s`
}

/** How long until a reset: 2시간 13분 / 2h 13m, or days past a day. */
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

export const TIME_LABELS: { [L in Lang]: { [K in TimeKey]: string } } = {
  ko: { thinking: '생각', read: '읽기', search: '검색', edit: '고치기', write: '새 파일', bash: '명령', battle: '테스트', web: '웹', agent: '에이전트', other: '기타' },
  en: { thinking: 'Think', read: 'Read', search: 'Search', edit: 'Edit', write: 'New file', bash: 'Command', battle: 'Tests', web: 'Web', agent: 'Agent', other: 'Other' },
}

/** The panel's own words. */
export const UI = {
  ko: {
    results: '🎁 결과물',
    timeSpent: '⏱ 시간 쓴 곳 (이번 세션)',
    timeEmpty: '조금 일하면 여기에 그래프가 생겨요',
    resultsEmpty: '아티팩트나 문서를 만들면 여기에 링크가 생겨요',
    latest: '최신 · ',
    log: '📜 로그',
    logEmpty: '아직 없어요',
    ally: '[동료]',
    step: '단계: ',
    legendOpen: '🗺 그림 설명',
    legendClose: '🗺 그림 설명 닫기',
    light: '☀️ 라이트',
    dark: '🌙 다크',
    pickerOpen: '🧙 캐릭터 바꾸기',
    pickerClose: '🧙 닫기',
    jobs: '직업',
    species: '종족',
    madeBy: 'made by Sophie',
    open: '열기',
    alertsOn: '🔔 알림 켬',
    alertsOff: '🔕 알림 끔',
    approvalTitle: '✋ 승인이 필요해요',
    approvalBody: (tool: string) => `${tool} 실행을 허락해 주세요`,
    doneTitle: '🏁 퀘스트 완료!',
    doneBody: (t: string) => `${t} 걸린 작업이 끝났어요`,
    levelUpTitle: '🎉 레벨 업!',
    level: (n: number, into: number, need: number) => `🏅 Lv ${n} · ${into}/${need} XP`,
    record: (q: number, s: number, a: number) => `퀘스트 ${q.toLocaleString()} · 버그 처치 ${s.toLocaleString()} · 행동 ${a.toLocaleString()}`,
    logMore: '전체 보기',
    logLess: '접기',
    hp: '5시간',
    xp: '주간',
    mp: '세션',
    limitsTitle: '사용 한도 · 밝은 칸 = 방금 요청이 쓴 양',
    sessionTitle: '세션 기억 · 다 차면 자동 압축',
    compactSoon: '곧 압축',
    resetIn: (t: string) => `${t} 후 리셋`,
    noLimits: '한도 정보는 첫 응답 뒤에 보여요',
    groupWork: '일할 때',
    groupFight: '테스트·검사',
    groupRest: '쉬는 시간',
    legendNow: '지금',
    artifact: '아티팩트',
    working: (t: string, n: number) => `⏱ ${t}째 · 이번 퀘스트에서 행동 ${n}번`,
    finished: (t: string, n: number) => `🏁 지난 퀘스트: ${t}, 행동 ${n}번`,
    noQuest: '아직 받은 퀘스트가 없어요',
    command: '모험 일지 패널 열기 (직업/종족: /pixel mage, /pixel cat …)',
    opened: '모험 일지를 열었어요.',
    changed: (names: string) => `캐릭터를 ${names}(으)로 바꿨어요.`,
  },
  en: {
    results: '🎁 Results',
    timeSpent: '⏱ Where the time went (this session)',
    timeEmpty: 'A chart shows up here once I have done some work',
    resultsEmpty: 'Artifacts and documents I make show up here as links',
    latest: 'latest · ',
    log: '📜 Log',
    logEmpty: 'Nothing yet',
    ally: '[ally]',
    step: 'Step: ',
    legendOpen: '🗺 Legend',
    legendClose: '🗺 Close legend',
    light: '☀️ Light',
    dark: '🌙 Dark',
    pickerOpen: '🧙 Character',
    pickerClose: '🧙 Close',
    jobs: 'Class',
    species: 'Species',
    madeBy: 'made by Sophie',
    open: 'Open',
    alertsOn: '🔔 Alerts on',
    alertsOff: '🔕 Alerts off',
    approvalTitle: '✋ Approval needed',
    approvalBody: (tool: string) => `Please allow ${tool} to run`,
    doneTitle: '🏁 Quest complete!',
    doneBody: (t: string) => `A ${t} task just finished`,
    levelUpTitle: '🎉 Level up!',
    level: (n: number, into: number, need: number) => `🏅 Lv ${n} · ${into}/${need} XP`,
    record: (q: number, s: number, a: number) => `Quests ${q.toLocaleString()} · Bugs slain ${s.toLocaleString()} · Actions ${a.toLocaleString()}`,
    logMore: 'Show all',
    logLess: 'Collapse',
    hp: '5-hour',
    xp: 'Weekly',
    mp: 'Session',
    limitsTitle: 'Usage limits · bright blocks = what the last request used',
    sessionTitle: 'Session memory · full means auto-compact',
    compactSoon: 'compacting soon',
    resetIn: (t: string) => `resets in ${t}`,
    noLimits: 'Usage limits show up after the first reply',
    groupWork: 'Working',
    groupFight: 'Tests and checks',
    groupRest: 'Downtime',
    legendNow: 'now',
    artifact: 'Artifact',
    working: (t: string, n: number) => `⏱ ${t} in · ${n} actions this quest`,
    finished: (t: string, n: number) => `🏁 Last quest: ${t}, ${n} actions`,
    noQuest: 'No quest yet',
    command: 'Open the adventure log pane (class/species: /pixel mage, /pixel cat …)',
    opened: 'Opened the adventure log.',
    changed: (names: string) => `Your hero is now: ${names}.`,
  },
} as const
