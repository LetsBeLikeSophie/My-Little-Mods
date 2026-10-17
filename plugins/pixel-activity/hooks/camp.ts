// The RPG camp: a little adventurer acting out what Claude is doing.
// Drawn like My Little Sessions' office: filled rectangles on a small grid,
// scaled up. Each scene is a few frames that the SVG flips through.

import type { Job, Species } from '../types'

export type Scene =
  | 'thinking'
  | 'read'
  | 'search'
  | 'edit'
  | 'write'
  | 'bash'
  | 'web'
  | 'agent'
  | 'other'
  | 'error'
  | 'done'
  | 'waiting'
  | 'sleeping'
  | 'battle'
  | 'slain'
  | 'approval'

export type Sky = 'day' | 'dusk' | 'night'

const W = 176
const H = 112

// ── pen ───────────────────────────────────────────────────────────────────

type Pen = { R: (x: number, y: number, w: number, h: number, c: string) => void; out: () => string }

function pen(): Pen {
  let s = ''
  return {
    R(x, y, w, h, c) {
      if (w > 0 && h > 0) s += `<rect x="${Math.round(x)}" y="${Math.round(y)}" width="${w}" height="${h}" fill="${c}"/>`
    },
    out: () => s,
  }
}

function line(p: Pen, x0: number, y0: number, x1: number, y1: number, c: string, t = 1): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1)
  for (let i = 0; i <= n; i++) p.R(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, t, t, c)
}

/** Frames shown one after another, `step` seconds each, forever. */
// Scene motion runs slower than life: tools finish in a blink, the hero takes their time.
const TEMPO = 2

// While drawing a still (the legend's thumbnails), every animation shows its first frame.
let still = false

// When the scene's own motion starts: after the walk over, if there is one.
let introAt = 0

/**
 * Frames up to `idleFrom` play once, in order, then the frames from `idleFrom`
 * loop quietly: a thing that happens once (a bird landing, a fireball) is not
 * replayed from the start every second while the scene stays up.
 */
function play(frames: readonly string[], step: number, idleFrom: number, tempo = TEMPO): string {
  if (still) return frames[idleFrom] ?? frames[0] ?? ''
  const d = step * tempo
  const intro = frames
    .slice(0, idleFrom)
    .map((f, i) => `<g opacity="0"><set attributeName="opacity" to="1" begin="${(introAt + i * d).toFixed(2)}s" dur="${d.toFixed(2)}s"/>${f}</g>`)
    .join('')
  const idleAt = (introAt + idleFrom * d).toFixed(2)
  return intro + `<g opacity="0"><set attributeName="opacity" to="1" begin="${idleAt}s" fill="freeze"/>${cycle(frames.slice(idleFrom), step, tempo)}</g>`
}

function cycle(frames: readonly string[], step: number, tempo = TEMPO): string {
  if (still) return frames[0] ?? ''
  if (frames.length === 1) return frames[0]!
  const dur = (frames.length * step * tempo).toFixed(2)
  return frames
    .map((f, i) => {
      const vals = frames.map((_, j) => (j === i ? 'visible' : 'hidden')).join(';')
      return `<g visibility="${i === 0 ? 'visible' : 'hidden'}"><animate attributeName="visibility" values="${vals}" calcMode="discrete" dur="${dur}s" repeatCount="indefinite"/>${f}</g>`
    })
    .join('')
}

function frames(n: number, draw: (p: Pen, f: number) => void): string[] {
  return Array.from({ length: n }, (_, f) => {
    const p = pen()
    draw(p, f)
    return p.out()
  })
}

// ── species (skins from My Little Sessions) ───────────────────────────────

const EYE = '#1E1A20'
const PINK = '#EE9CB0'
const BLUSH = 'rgba(232,110,120,.5)'
const NOSE = '#2A2320'

type Skin = { fur: string; dark: string; light: string; hair?: string }

export const SPECIES: { [K in Species]: { emoji: string; skin: Skin } } = {
  human: { emoji: '🧑', skin: { fur: '#F2C9A0', dark: '#2B2233', light: '#F2C9A0', hair: '#2B2233' } },
  cat: { emoji: '🐱', skin: { fur: '#E89A3C', dark: '#B86A1E', light: '#FFF3E0' } },
  dog: { emoji: '🐶', skin: { fur: '#D9A55B', dark: '#9C6A2E', light: '#F7E7C8' } },
  bear: { emoji: '🐻', skin: { fur: '#8B5E3C', dark: '#5E3D25', light: '#D9B48C' } },
  rabbit: { emoji: '🐰', skin: { fur: '#F5F1EC', dark: '#D8CFC4', light: '#FFFFFF' } },
}
export const SPECIES_IDS = Object.keys(SPECIES) as Species[]

function ears(p: Pen, sp: Species, c: Skin, cx: number, hy: number): void {
  const R = p.R
  const x = cx - 7
  if (sp === 'cat') {
    R(x + 1, hy - 3, 2, 1, c.fur); R(x, hy - 2, 4, 1, c.fur); R(x, hy - 1, 5, 3, c.fur); R(x + 1, hy - 2, 2, 2, PINK)
    R(x + 11, hy - 3, 2, 1, c.fur); R(x + 10, hy - 2, 4, 1, c.fur); R(x + 9, hy - 1, 5, 3, c.fur); R(x + 11, hy - 2, 2, 2, PINK)
  }
  if (sp === 'bear') {
    R(x, hy - 2, 4, 5, c.fur); R(x + 1, hy - 3, 2, 1, c.fur); R(x + 10, hy - 2, 4, 5, c.fur); R(x + 11, hy - 3, 2, 1, c.fur)
    R(x + 1, hy - 1, 2, 2, c.light); R(x + 11, hy - 1, 2, 2, c.light)
  }
  if (sp === 'rabbit') {
    R(x + 2, hy - 9, 3, 11, c.fur); R(x + 3, hy - 8, 1, 7, PINK)
    R(x + 9, hy - 9, 3, 11, c.fur); R(x + 10, hy - 8, 1, 7, PINK)
  }
}

function face(p: Pen, sp: Species, c: Skin, cx: number, hy: number, o: { blink?: boolean; down?: boolean; mask?: boolean }): void {
  const R = p.R
  const x = cx - 7
  R(x + 2, hy, 10, 12, c.fur); R(x + 1, hy + 1, 12, 10, c.fur); R(x, hy + 2, 14, 8, c.fur)
  if (sp === 'human') {
    const hair = c.hair ?? c.dark
    R(x + 2, hy, 10, 1, hair); R(x + 1, hy + 1, 12, 1, hair); R(x, hy + 2, 14, 2, hair)
    R(x, hy + 4, 1, 3, hair); R(x + 13, hy + 4, 1, 3, hair); R(x + 1, hy + 4, 3, 1, hair)
    R(cx - 1, hy + 9, 2, 1, '#A85D52'); R(x + 1, hy + 8, 2, 1, BLUSH); R(x + 11, hy + 8, 2, 1, BLUSH)
  } else if (sp === 'cat') {
    R(cx - 1, hy, 2, 2, c.dark); R(cx - 4, hy, 1, 2, c.dark); R(cx + 3, hy, 1, 2, c.dark)
    R(cx - 3, hy + 8, 6, 3, c.light); R(cx - 1, hy + 8, 2, 1, PINK)
    R(x - 2, hy + 8, 2, 1, c.light); R(x + 14, hy + 8, 2, 1, c.light)
  } else if (sp === 'dog') {
    R(x - 1, hy + 1, 3, 8, c.dark); R(x, hy + 9, 2, 1, c.dark); R(x + 12, hy + 1, 3, 8, c.dark); R(x + 12, hy + 9, 2, 1, c.dark)
    R(cx - 3, hy + 7, 6, 5, c.light); R(cx - 1, hy + 7, 2, 2, NOSE)
  } else if (sp === 'bear') {
    R(cx - 3, hy + 7, 6, 4, c.light); R(cx - 1, hy + 7, 2, 1, NOSE); R(cx - 1, hy + 9, 2, 1, NOSE)
  } else if (sp === 'rabbit') {
    R(cx - 1, hy + 7, 2, 1, PINK); R(cx - 1, hy + 8, 1, 2, c.dark); R(x + 1, hy + 8, 2, 1, BLUSH); R(x + 11, hy + 8, 2, 1, BLUSH)
  }
  if (o.mask) R(x, hy + 4, 14, 3, '#2B2B35')
  const ey = hy + 5 + (o.down ? 1 : 0)
  const eye = o.mask ? '#F4F1EA' : EYE
  if (o.blink) { R(cx - 4, ey + 1, 2, 1, eye); R(cx + 2, ey + 1, 2, 1, eye) } else { R(cx - 4, ey, 2, 2, eye); R(cx + 2, ey, 2, 2, eye) }
}

// ── jobs ──────────────────────────────────────────────────────────────────

type JobLook = {
  emoji: string
  body: string
  trim: string
  legs: string
  boots: string
  magic: string
  isRobe?: boolean
}

export const JOBS: { [K in Job]: JobLook } = {
  warrior: { emoji: '⚔️', body: '#8E99A6', trim: '#B83A3A', legs: '#5B4636', boots: '#3A2A22', magic: '#FF8C42' },
  mage: { emoji: '🔮', body: '#6A4C9C', trim: '#E0B84A', legs: '#4B3A8C', boots: '#3A2A22', magic: '#7FDBFF', isRobe: true },
  hunter: { emoji: '🏹', body: '#4F7942', trim: '#3B5E31', legs: '#6B4E2E', boots: '#3A2A22', magic: '#9BE564' },
  rogue: { emoji: '🗡️', body: '#3A3A48', trim: '#7B3FA0', legs: '#2B2B35', boots: '#1E1E26', magic: '#C77DFF' },
  priest: { emoji: '✨', body: '#F2EFE6', trim: '#E0B84A', legs: '#D8D2C4', boots: '#8A7A5A', magic: '#FFE08A', isRobe: true },
}
export const JOB_IDS = Object.keys(JOBS) as Job[]

const STEEL = '#D7DDE4'
const GOLD = '#E0B84A'
const WOOD = '#8B5A2B'

/** The job's weapon in a hand at (hx, hy), held upright or pointing right. */
function weapon(p: Pen, job: Job, hx: number, hy: number, dir: 'up' | 'right'): void {
  const R = p.R
  const up = dir === 'up'
  switch (job) {
    case 'warrior':
      if (up) { R(hx, hy - 13, 2, 12, STEEL); R(hx, hy - 14, 1, 1, STEEL); R(hx - 2, hy - 1, 6, 1, GOLD); R(hx, hy, 2, 2, WOOD) }
      else { R(hx + 2, hy, 12, 2, STEEL); R(hx + 14, hy, 1, 1, STEEL); R(hx + 1, hy - 2, 1, 6, GOLD); R(hx - 1, hy, 2, 2, WOOD) }
      return
    case 'mage':
      if (up) { R(hx, hy - 14, 1, 20, WOOD); R(hx - 1, hy - 17, 3, 3, '#7FDBFF'); R(hx, hy - 16, 1, 1, '#FFFFFF') }
      else { R(hx - 4, hy, 18, 1, WOOD); R(hx + 14, hy - 1, 3, 3, '#7FDBFF') }
      return
    case 'hunter':
      if (up) { line(p, hx + 2, hy - 11, hx + 4, hy - 6, WOOD); line(p, hx + 4, hy - 6, hx + 4, hy + 2, WOOD); line(p, hx + 4, hy + 2, hx + 2, hy + 7, WOOD); R(hx + 1, hy - 11, 1, 18, '#EDE6DF') }
      else { R(hx + 2, hy, 11, 1, WOOD); R(hx + 13, hy - 1, 2, 3, STEEL); R(hx + 1, hy - 1, 2, 3, '#E86A5A') }
      return
    case 'rogue':
      if (up) { R(hx, hy - 5, 1, 4, STEEL); R(hx - 1, hy - 1, 3, 1, GOLD) }
      else { R(hx + 2, hy, 6, 1, STEEL); R(hx + 1, hy - 1, 1, 3, GOLD) }
      return
    case 'priest':
      if (up) { R(hx, hy - 12, 1, 18, GOLD); R(hx - 2, hy - 15, 5, 1, GOLD); R(hx, hy - 17, 1, 5, GOLD) }
      else { R(hx - 2, hy, 16, 1, GOLD); R(hx + 13, hy - 2, 1, 5, GOLD) }
      return
  }
}

/** Hat, helm or hood; ears go on top of it so animals keep them. */
function headgear(p: Pen, job: Job, cx: number, hy: number): boolean {
  const R = p.R
  const J = JOBS[job]
  switch (job) {
    case 'warrior':
      R(cx - 7, hy - 1, 14, 4, '#9AA5B1'); R(cx - 6, hy - 2, 12, 1, '#B9C2D0'); R(cx - 1, hy + 3, 2, 3, '#9AA5B1')
      R(cx - 9, hy - 3, 2, 3, '#F3E3C6'); R(cx + 7, hy - 3, 2, 3, '#F3E3C6'); R(cx - 10, hy - 5, 1, 2, '#F3E3C6'); R(cx + 9, hy - 5, 1, 2, '#F3E3C6')
      return true
    case 'mage':
      R(cx - 9, hy + 1, 18, 2, J.legs); R(cx - 5, hy - 2, 10, 3, J.legs); R(cx - 3, hy - 5, 7, 3, J.legs)
      R(cx - 1, hy - 8, 4, 3, J.legs); R(cx + 2, hy - 10, 2, 2, J.legs); R(cx - 5, hy, 10, 1, GOLD); R(cx, hy - 4, 1, 1, GOLD)
      return true
    case 'hunter':
      R(cx - 8, hy - 1, 16, 4, J.trim); R(cx - 8, hy + 3, 2, 7, J.trim); R(cx + 6, hy + 3, 2, 7, J.trim); R(cx - 3, hy - 2, 6, 1, J.trim)
      return false
    case 'rogue':
      R(cx - 7, hy, 14, 2, J.trim); R(cx + 7, hy + 1, 3, 1, J.trim); R(cx + 8, hy + 2, 2, 2, J.trim)
      return true
    case 'priest':
      R(cx - 6, hy + 1, 12, 1, GOLD); R(cx - 1, hy, 2, 2, '#FFFFFF')
      return true
  }
}

type Pose = {
  x: number
  fy: number
  sit?: boolean
  down?: boolean
  blink?: boolean
  l?: readonly [number, number]
  r?: readonly [number, number]
  weapon?: 'up' | 'right' | 'none'
}

function arm(p: Pen, sx: number, sy: number, hx: number, hy: number, sleeve: string, hand: string): void {
  line(p, sx, sy, hx, hy - 1, sleeve, 3)
  p.R(hx, hy, 3, 2, hand)
}

function figure(p: Pen, sp: Species, job: Job, o: Pose): void {
  const R = p.R
  const c = SPECIES[sp].skin
  const J = JOBS[job]
  const { x, fy } = o
  const hy = fy - 28 + (o.down ? 1 : 0)
  if (job === 'hunter') { R(x + 2, fy - 22, 3, 10, '#7A4E2D'); R(x + 2, fy - 24, 1, 2, STEEL); R(x + 4, fy - 24, 1, 2, STEEL) }
  if (sp === 'cat') { R(x - 8, fy - 10, 2, 5, c.fur); R(x - 9, fy - 13, 2, 4, c.dark) }
  if (sp === 'dog') R(x - 9, fy - 11, 3, 3, c.fur)
  // legs
  if (o.sit) {
    R(x - 5, fy - 6, 11, 3, J.isRobe ? J.body : J.legs); R(x + 5, fy - 6, 3, 5, J.boots)
  } else if (J.isRobe) {
    R(x - 6, fy - 9, 12, 7, J.body); R(x - 6, fy - 3, 12, 1, J.trim); R(x - 4, fy - 2, 3, 2, J.boots); R(x + 1, fy - 2, 3, 2, J.boots)
  } else {
    R(x - 4, fy - 6, 3, 4, J.legs); R(x + 1, fy - 6, 3, 4, J.legs); R(x - 4, fy - 2, 3, 2, J.boots); R(x + 1, fy - 2, 3, 2, J.boots)
  }
  // torso and what the job wears on it
  R(x - 5, fy - 16, 10, 10, J.body)
  if (job === 'warrior') { R(x - 2, fy - 16, 4, 9, J.trim); R(x - 8, fy - 17, 4, 3, '#B9C2D0'); R(x + 4, fy - 17, 4, 3, '#B9C2D0') }
  if (job === 'mage') { R(x - 3, fy - 16, 6, 1, J.trim); R(x - 5, fy - 9, 10, 1, J.trim) }
  if (job === 'hunter') line(p, x - 5, fy - 16, x + 4, fy - 8, '#7A4E2D')
  if (job === 'rogue') R(x - 5, fy - 17, 10, 2, J.trim)
  if (job === 'priest') { R(x - 1, fy - 16, 2, 10, J.trim); R(x - 3, fy - 13, 6, 1, J.trim) }
  if (!J.isRobe) R(x - 5, fy - 7, 10, 1, '#5A3A22')
  // arms
  const l = o.l ?? [x - 8, fy - 8]
  const r = o.r ?? [x + 6, fy - 8]
  arm(p, x - 6, fy - 15, l[0], l[1], J.body, c.fur)
  arm(p, x + 4, fy - 15, r[0], r[1], J.body, c.fur)
  // head
  face(p, sp, c, x, hy, { blink: o.blink, down: o.down, mask: job === 'rogue' })
  if (headgear(p, job, x, hy)) ears(p, sp, c, x, hy)
  if (o.weapon && o.weapon !== 'none') weapon(p, job, r[0] + 1, r[1], o.weapon)
}

// ── the camp ──────────────────────────────────────────────────────────────

const FIRE = { cx: 50, by: 86 }
const LOG = { x: 58, y: 82 }
const TABLE = { x: 84, y: 72 }
const WHEEL = { cx: 124, cy: 66, r: 10 }
const ANVIL = { x: 140, y: 76 }
const CHEST = { x: 160, y: 76 }

export function skyOf(hour: number): Sky {
  return hour >= 19.5 || hour < 5.5 ? 'night' : hour >= 17.5 || hour < 7 ? 'dusk' : 'day'
}

function mountain(p: Pen, cx: number, base: number, h: number, col: string, snow?: string): void {
  for (let i = 0; i < h; i++) {
    const w = 2 + i * 2
    p.R(cx - w / 2, base - h + i, w, 1, i < 3 && snow ? snow : col)
  }
}

function backdrop(sky: Sky): string {
  const p = pen()
  const R = p.R
  const night = sky === 'night'
  const dusk = sky === 'dusk'
  // sky
  if (night) { R(0, 0, W, 52, '#101A33'); R(0, 30, W, 22, '#16224A') }
  else if (dusk) { R(0, 0, W, 52, '#8D86C9'); R(0, 18, W, 12, '#D98BA6'); R(0, 30, W, 22, '#F6B26B') }
  else { R(0, 0, W, 52, '#8FCDEE'); R(0, 32, W, 20, '#BDE4F5') }
  if (night) {
    for (let k = 0; k < 14; k++) R((k * 37 + 11) % W, (k * 13 + 3) % 30, 1, 1, '#DDE6FF')
    R(146, 6, 6, 8, '#F6EFC2'); R(145, 7, 8, 6, '#F6EFC2'); R(147, 8, 2, 2, '#DDD5A0')
  } else if (dusk) {
    R(20, 34, 10, 6, '#FFE08A'); R(18, 36, 14, 4, '#FFE08A')
  } else {
    R(146, 6, 8, 8, '#FFE08A'); R(145, 7, 10, 6, '#FFE08A'); R(148, 8, 4, 4, '#FFF3B0')
    R(30, 10, 16, 3, '#FFFFFF'); R(34, 8, 8, 3, '#FFFFFF'); R(96, 16, 14, 3, '#FFFFFF'); R(99, 14, 7, 3, '#FFFFFF')
  }
  // mountains and pines
  const mt = night ? '#0E1630' : dusk ? '#6B5B95' : '#7A8FA6'
  const mt2 = night ? '#131D3D' : dusk ? '#7D6AA6' : '#8FA3B8'
  mountain(p, 40, 50, 22, mt2, night ? undefined : '#F4F7F7')
  mountain(p, 120, 50, 28, mt, night ? undefined : '#F4F7F7')
  mountain(p, 168, 50, 18, mt2)
  const pine = night ? '#14263A' : '#3F7A55'
  for (let i = 0; i < 24; i++) {
    const tx = i * 8 - 2
    const th = 6 + ((i * 5) % 4)
    R(tx + 2, 52 - th, 2, th, pine); R(tx, 52 - th + 3, 6, th - 3, pine); R(tx + 1, 52 - th + 1, 4, 2, pine)
  }
  // ground
  R(0, 52, W, H - 52, night ? '#4E6B47' : '#8CBF6A')
  R(0, 52, W, 2, night ? '#45603F' : '#7DB05C')
  for (let i = 0; i < 12; i++) R((i * 29 + 7) % W, 58 + ((i * 11) % 24), 2, 1, night ? '#5B7A52' : '#9FD07A')
  R(0, 84, W, 8, night ? '#6B5A45' : '#C9A36B')
  // tent
  const canvas = night ? '#A99878' : '#E9D8A6'
  const shade = night ? '#857455' : '#CDB07A'
  for (let i = 0; i < 26; i++) {
    R(22 - i * 0.7, 56 + i, i * 1.4 + 2, 1, i % 2 ? canvas : canvas)
    R(22, 56 + i, i * 0.7 + 1, 1, shade)
  }
  for (let i = 0; i < 12; i++) R(21 - i * 0.35, 70 + i, i * 0.7 + 2, 1, '#5A4632')
  R(21, 50, 1, 7, WOOD); R(22, 50, 5, 3, '#C0392B')
  // log seat
  R(LOG.x, LOG.y, 18, 4, '#7A4E2D'); R(LOG.x, LOG.y, 18, 1, '#9C6B43'); R(LOG.x + 17, LOG.y, 2, 4, '#C9A36B')
  // map table
  R(TABLE.x, TABLE.y, 18, 3, '#9C6B43'); R(TABLE.x + 2, TABLE.y + 3, 2, 10, '#7A4E2D'); R(TABLE.x + 14, TABLE.y + 3, 2, 10, '#7A4E2D')
  R(TABLE.x + 2, TABLE.y - 2, 14, 2, '#F3E3C6'); R(TABLE.x + 10, TABLE.y - 2, 2, 1, '#C0392B'); R(TABLE.x + 5, TABLE.y - 1, 4, 1, '#B3A07E')
  // grindstone: a big wheel on a wooden frame
  const { cx: wx, cy: wy, r: wr } = WHEEL
  R(wx - wr - 1, wy - 1, 2, 22, '#7A4E2D'); R(wx + wr - 1, wy - 1, 2, 22, '#7A4E2D'); R(wx - wr - 2, wy + 18, wr * 2 + 4, 2, '#7A4E2D')
  disc(p, wx, wy, wr, '#5F646C'); disc(p, wx, wy, wr - 1, '#8A8F98'); disc(p, wx, wy, 2, '#5F646C')
  R(wx - wr - 4, wy - 1, 4, 2, '#7A4E2D'); R(wx - wr - 5, wy - 1, 2, 5, '#5A3A22')
  // anvil
  const { x: ax, y: ay } = ANVIL
  R(ax, ay, 14, 3, '#3E4450'); R(ax - 3, ay, 3, 2, '#3E4450'); R(ax + 4, ay + 3, 6, 4, '#3E4450'); R(ax + 2, ay + 7, 10, 3, '#3E4450'); R(ax, ay, 14, 1, '#5F6672')
  // chest
  const { x: kx, y: ky } = CHEST
  R(kx, ky, 12, 8, '#9C6B43'); R(kx, ky, 12, 3, '#B37D47'); R(kx, ky + 3, 12, 1, GOLD); R(kx + 5, ky + 3, 2, 2, GOLD)
  return p.out()
}

function campfire(lit: boolean): string {
  const { cx, by } = FIRE
  const base = pen()
  base.R(cx - 7, by - 2, 14, 2, '#8A8F98'); base.R(cx - 6, by - 4, 12, 2, '#6B4226'); base.R(cx - 4, by - 5, 8, 1, '#4D2F19')
  if (!lit) return base.out()
  const flames = frames(3, (p, f) => {
    const h = [0, 2, 1][f]!
    const k = [1, 0, 2][f]!
    p.R(cx - 4, by - 10 - h, 8, 6 + h, '#FF7B29')
    p.R(cx - 2, by - 13 - k, 4, 8 + k, '#FFB347')
    p.R(cx - 1, by - 9 - h, 2, 4, '#FFE08A')
    p.R(cx - 3 + f * 2, by - 16 - f * 2, 1, 1, '#FFD166')
  })
  return base.out() + cycle(flames, 0.15, 1)
}

function disc(p: Pen, cx: number, cy: number, r: number, c: string): void {
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.round(Math.sqrt(r * r - dy * dy))
    p.R(cx - w, cy + dy, w * 2 + 1, 1, c)
  }
}

function sparkle(p: Pen, x: number, y: number, c: string): void {
  p.R(x, y - 1, 1, 3, c); p.R(x - 1, y, 3, 1, c)
}

/** A round little red drop with a shine: cute, not gory. */
function drop(p: Pen, x: number, y: number): void {
  p.R(x, y, 2, 3, '#E03131'); p.R(x - 1, y + 1, 4, 2, '#E03131'); p.R(x, y + 1, 1, 1, '#FF9A9A')
}

/** The bug: a round purple slime. `squash` < 1 flattens it; `isOut` gives it X eyes. */
function slime(p: Pen, x: number, fy: number, squash: number, isOut: boolean): void {
  const R = p.R
  const h = Math.max(3, Math.round(10 * squash))
  const w = Math.round(14 + (1 - squash) * 6)
  R(x - w / 2 + 2, fy - h, w - 4, 1, '#9B6FD6')
  R(x - w / 2 + 1, fy - h + 1, w - 2, 1, '#B388EB')
  R(x - w / 2, fy - h + 2, w, h - 2, '#B388EB')
  R(x - w / 2 + 1, fy - 1, w - 2, 1, '#9B6FD6')
  R(x - w / 2 + 2, fy - h + 2, 2, 2, '#E8DAFF')
  const ey = fy - Math.max(2, Math.round(h * 0.55))
  if (isOut) {
    for (const ex of [x - 4, x + 2]) { R(ex, ey, 1, 1, EYE); R(ex + 2, ey, 1, 1, EYE); R(ex + 1, ey + 1, 1, 1, EYE); R(ex, ey + 2, 1, 1, EYE); R(ex + 2, ey + 2, 1, 1, EYE) }
  } else {
    R(x - 4, ey, 2, 2, EYE); R(x + 2, ey, 2, 2, EYE); R(x - 3, ey, 1, 1, '#FFFFFF'); R(x + 3, ey, 1, 1, '#FFFFFF')
    R(x - 1, ey + 3, 2, 1, '#6A4C9C')
  }
}

function bubble(p: Pen, x: number, y: number, w: number, h: number): void {
  p.R(x + 1, y, w - 2, h, '#FFFFFF'); p.R(x, y + 1, w, h - 2, '#FFFFFF')
}

// ── scenes ────────────────────────────────────────────────────────────────

type Ctx = { sp: Species; job: Job; ally: Job }

function scene(kind: Scene, k: Ctx): { layers: string; fire: boolean } {
  const fig = (p: Pen, o: Pose) => figure(p, k.sp, k.job, o)
  const magic = JOBS[k.job].magic
  switch (kind) {
    case 'thinking': {
      // A longer loop so a long think doesn't look stuck: study the map, rub
      // the chin, pace a step, and now and then a light bulb.
      const fs = frames(10, (p, f) => {
        const pace = [0, 0, 0, 0, 3, 6, 3, 0, 0, 0][f]!
        const x = 108 + pace
        const fy = 86
        const onMap = f <= 1 || f === 9
        const chin = f === 2 || f === 3 || f === 7
        fig(p, {
          x,
          fy: fy - (pace === 3 ? 1 : 0),
          blink: f === 3,
          down: onMap,
          l: onMap ? [TABLE.x + 13, TABLE.y - 3] : [x - 8, fy - 8],
          r: chin ? [x + 1, fy - 18] : [x + 6, fy - 8],
        })
        if (f === 8 || f === 9) {
          const bx = x + 5
          const by = fy - 42
          p.R(bx, by, 5, 5, '#FFE08A'); p.R(bx - 1, by + 1, 7, 3, '#FFE08A'); p.R(bx + 1, by + 5, 3, 2, '#B9C2D0')
          p.R(bx + 1, by + 1, 1, 1, '#FFFFFF'); p.R(bx - 3, by - 1, 1, 1, '#FFF3B0'); p.R(bx + 7, by - 1, 1, 1, '#FFF3B0'); p.R(bx + 2, by - 3, 1, 1, '#FFF3B0')
        }
      })
      return { layers: cycle(fs, 0.45), fire: true }
    }
    case 'read': {
      const fs = frames(4, (p, f) => {
        const x = LOG.x + 8
        const fy = LOG.y + 2
        fig(p, { x, fy, sit: true, down: true, l: [x - 6, fy - 13], r: [x + 4, fy - 13] })
        p.R(x - 7, fy - 17, 14, 6, '#FFFFFF'); p.R(x - 7, fy - 11, 14, 1, JOBS[k.job].trim); p.R(x, fy - 17, 1, 6, '#C8C2B4')
        for (let i = 0; i < 3; i++) { p.R(x - 6, fy - 16 + i * 2, 5, 1, '#B3A07E'); p.R(x + 2, fy - 16 + i * 2, 4, 1, '#B3A07E') }
        if (f === 2) p.R(x + 1, fy - 19, 6, 7, '#F4F1EA')
        if (k.job === 'mage' || k.job === 'priest') sparkle(p, x - 4 + f * 3, fy - 21 - (f % 2) * 2, magic)
      })
      return { layers: cycle(fs, 0.35), fire: true }
    }
    case 'search': {
      // Stands in one spot and sweeps the torch around, looking.
      const hands: readonly (readonly [number, number])[] = [[-10, -24], [-12, -21], [-10, -24], [-8, -27]]
      const fs = frames(4, (p, f) => {
        const x = 104
        const fy = 86
        const [hx, hy] = hands[f]!
        fig(p, { x, fy, blink: f === 2, l: [x + hx, fy + hy], r: [x + 6, fy - 8], weapon: 'none' })
        p.R(x + hx, fy + hy, 2, 8, WOOD)
        const t = f % 2
        p.R(x + hx - 1, fy + hy - 5 - t, 4, 5 + t, '#FF7B29'); p.R(x + hx, fy + hy - 4 - t, 2, 3, '#FFE08A')
      })
      return { layers: cycle(fs, 0.3), fire: true }
    }
    case 'edit': {
      // Weapon care, each class its own way: the warrior drills, the hunter
      // shoots at a target, the casters practise until the staff glows, the
      // rogue hones a dagger on the grindstone.
      if (k.job === 'warrior') {
        const fs = frames(4, (p, f) => {
          const x = 98
          const fy = 86
          const hands: readonly (readonly [number, number])[] = [[x + 5, fy - 26], [x + 9, fy - 20], [x + 8, fy - 13], [x + 5, fy - 20]]
          const h = hands[f]!
          fig(p, { x: x + (f === 2 ? 2 : 0), fy, l: [x - 8, fy - 8], r: h, weapon: f === 2 ? 'right' : 'up' })
          if (f === 1) { line(p, x + 10, fy - 38, x + 22, fy - 28, '#FFFFFF'); line(p, x + 12, fy - 38, x + 24, fy - 27, 'rgba(255,255,255,.5)') }
          if (f === 2) { line(p, x + 16, fy - 26, x + 26, fy - 14, '#FFFFFF'); sparkle(p, x + 26, fy - 14, '#FFF3B0') }
        })
        return { layers: cycle(fs, 0.22), fire: true }
      }
      if (k.job === 'hunter') {
        const tx = 152
        const ty = 70
        const fs = frames(6, (p, f) => {
          const x = 98
          const fy = 86
          disc(p, tx, ty, 7, '#7A4E2D'); disc(p, tx, ty, 6, '#F4F1EA'); disc(p, tx, ty, 4, '#E03131'); disc(p, tx, ty, 2, '#F4F1EA'); p.R(tx, ty, 1, 1, '#E03131')
          p.R(tx - 1, ty + 7, 2, 9, '#7A4E2D')
          const drawn = f <= 1
          fig(p, { x, fy, l: [x - 6, fy - 15], r: [x + 9, fy - 15], weapon: 'none' })
          weapon(p, 'hunter', x + 10, fy - 15, 'up')
          if (drawn) { p.R(x + 4 - f, fy - 15, 10, 1, WOOD); p.R(x + 14 - f, fy - 16, 2, 3, STEEL) }
          const ax = [0, 0, 118, 132, 146, 146][f]!
          if (ax) { p.R(ax - 8, ty, 9, 1, WOOD); p.R(ax + 1, ty - 1, 2, 3, STEEL); p.R(ax - 9, ty - 1, 2, 3, '#E86A5A') }
          if (f >= 4) { p.R(tx - 6, ty - 5, 2, 1, '#FFF3B0'); p.R(tx + 3, ty - 6, 1, 2, '#FFF3B0') }
        })
        return { layers: cycle(fs, 0.22), fire: true }
      }
      if (k.job === 'mage' || k.job === 'priest') {
        const fs = frames(6, (p, f) => {
          const x = 100
          const fy = 86
          fig(p, { x, fy, l: [x - 8, fy - 8], r: [x + 6, fy - 20], weapon: 'up' })
          const ox = x + 8
          const oy = fy - 37
          const ring = [3, 5, 7, 9, 7, 5][f]!
          for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4 + f * 0.4
            p.R(ox + Math.round(Math.cos(a) * ring), oy + Math.round(Math.sin(a) * ring), 1, 1, i % 2 ? magic : '#FFFFFF')
          }
          p.R(ox - 2, oy - 2, 5, 5, magic); p.R(ox - 1, oy - 1, 3, 3, '#FFFFFF')
          for (let i = 0; i < 3; i++) sparkle(p, x - 10 + i * 10, fy - 30 - ((f + i * 2) % 6) * 3, i === 1 ? '#FFFFFF' : magic)
        })
        return { layers: cycle(fs, 0.2), fire: true }
      }
      const { cx, cy, r } = WHEEL
      const fs = frames(4, (p, f) => {
        const x = 104
        const fy = 86
        fig(p, { x, fy, down: true, l: [x + 4, cy - r - 2], r: [x + 7, cy - r - 2], weapon: 'none' })
        weapon(p, k.job, x + 8, cy - r - 2, 'right')
        // the wheel turns: two spokes stepping round, a notch on the rim racing ahead
        const a = (f * Math.PI) / 4
        for (const b of [a, a + Math.PI / 2]) line(p, cx - Math.round(Math.cos(b) * (r - 2)), cy - Math.round(Math.sin(b) * (r - 2)), cx + Math.round(Math.cos(b) * (r - 2)), cy + Math.round(Math.sin(b) * (r - 2)), '#5F646C')
        const n = (f * Math.PI) / 2
        p.R(cx + Math.round(Math.cos(n) * (r - 1)) - 1, cy + Math.round(Math.sin(n) * (r - 1)) - 1, 2, 2, '#D7DDE4')
        p.R(cx - r - 5, cy - 1 + (f % 2 ? 2 : -1), 2, 2, '#5A3A22')
        // sparks fly off where the blade meets the stone
        const sx = cx - 2
        const sy = cy - r - 2
        const sparks: readonly (readonly [number, number])[] = [[-3, -3], [-6, -5], [-9, -4], [-5, -9], [-2, -7], [-8, -10]]
        for (let i = 0; i < 3; i++) {
          const [dx, dy] = sparks[(f + i * 2) % sparks.length]!
          p.R(sx + dx, sy + dy, 2, 2, i === 0 ? '#FFF3B0' : '#FFB347')
        }
      })
      return { layers: cycle(fs, 0.12), fire: true }
    }
    case 'write': {
      const fs = frames(4, (p, f) => {
        const x = 134
        const fy = 88
        const down = f >= 2
        const hand: readonly [number, number] = down ? [x + 8, fy - 15] : [x + 5, fy - 27]
        fig(p, { x, fy, down, l: [x - 8, fy - 8], r: hand })
        p.R(ANVIL.x + 5, ANVIL.y - 2, 6, 2, '#FF9F43'); p.R(ANVIL.x + 6, ANVIL.y - 2, 3, 1, '#FFE08A')
        const [hx, hy] = hand
        if (down) { p.R(hx + 1, hy - 4, 1, 5, WOOD); p.R(hx - 1, hy - 6, 5, 3, '#5F6672') }
        else { p.R(hx + 1, hy - 4, 1, 5, WOOD); p.R(hx - 1, hy - 7, 5, 3, '#5F6672') }
        if (f === 2) { sparkle(p, ANVIL.x + 3, ANVIL.y - 6, '#FFD166'); sparkle(p, ANVIL.x + 12, ANVIL.y - 5, '#FFB347') }
        if (f === 3) { p.R(ANVIL.x + 1, ANVIL.y - 9, 1, 1, '#FFD166'); p.R(ANVIL.x + 14, ANVIL.y - 8, 1, 1, '#FFD166') }
      })
      return { layers: cycle(fs, 0.16), fire: true }
    }
    case 'bash':
      return { layers: classBash(k, fig), fire: true }
    case 'web': {
      const path: readonly (readonly [number, number])[] = [[178, 16], [166, 22], [154, 28], [142, 34], [132, 40], [122, 46], [113, 52]]
      const bird = (p: Pen, bx: number, by: number, flap: number, perched = false) => {
        p.R(bx, by, 5, 3, '#F4F7F7'); p.R(bx - 1, by + 1, 1, 1, '#F08C00'); p.R(bx + 1, by + 1, 1, 1, EYE)
        if (perched) { p.R(bx + 2, by + 1, 3, 2, '#C4D2D0'); p.R(bx + 1, by + 3, 1, 1, '#F08C00'); p.R(bx + 3, by + 3, 1, 1, '#F08C00') }
        else p.R(bx + 2, by + flap, 3, 2, '#C4D2D0')
        p.R(bx + 5, by + 1, 2, 1, '#C4D2D0')
      }
      const x = 104
      const fy = 86
      const letter = (p: Pen, lx: number, ly: number) => { p.R(lx, ly, 7, 8, '#F3E3C6'); p.R(lx + 1, ly + 2, 5, 1, '#B3A07E'); p.R(lx + 1, ly + 4, 4, 1, '#B3A07E'); p.R(lx + 1, ly + 6, 5, 1, '#B3A07E') }
      const fs = frames(10, (p, f) => {
        if (f < 7) {
          // flying in: the hero looks up and holds out a hand at the end
          fig(p, { x, fy, l: [x - 8, fy - 8], r: f >= 5 ? [x + 8, fy - 22] : [x + 6, fy - 8] })
          const [bx, by] = path[f]!
          bird(p, bx, by, f % 2 ? -2 : 1)
          p.R(bx - 2, by + 3, 3, 2, '#F3E3C6')
        } else if (f === 7) {
          // landed on the table, the letter taken
          fig(p, { x, fy, l: [x - 8, fy - 8], r: [x + 8, fy - 22] })
          bird(p, TABLE.x + 12, TABLE.y - 5, 0, true)
          letter(p, x + 7, fy - 31)
          sparkle(p, x + 14, fy - 34, '#FFF3B0')
        } else {
          // reading it, the bird hopping on the table
          fig(p, { x, fy, down: true, blink: f === 9, l: [x - 3, fy - 18], r: [x + 4, fy - 18] })
          letter(p, x - 3, fy - 24)
          bird(p, TABLE.x + 12 + (f === 9 ? 1 : 0), TABLE.y - 5 - (f === 9 ? 1 : 0), 0, true)
        }
      })
      return { layers: play(fs, 0.35, 8), fire: true }
    }
    case 'agent': {
      // The ally walks in once and stays; then both raise their weapons.
      const fy = 86
      const allyX = 134
      const ally = frames(2, (p, f) => figure(p, k.sp, k.ally, { x: allyX, fy: fy - f, weapon: 'up', r: [allyX + 6, fy - 16 - f * 6] }))
      const me = frames(2, (p, f) => fig(p, { x: 110, fy, weapon: 'up', r: [116, f ? fy - 24 : fy - 16] }))
      const walkIn = still ? cycle(ally, 0.3) :
        `<g><animateTransform attributeName="transform" type="translate" from="${168 - allyX} 0" to="0 0" dur="1.4s" fill="freeze"/>` +
        `${cycle(ally, 0.3)}</g>`
      return { layers: cycle(me, 0.4) + walkIn, fire: true }
    }
    case 'other': {
      // Lifts the crate of tools up and down in place.
      const fs = frames(4, (p, f) => {
        const x = 98
        const lift = [0, 2, 3, 1][f]!
        const fy = 86
        fig(p, { x, fy, down: lift === 0, l: [x - 7, fy - 17 - lift], r: [x + 5, fy - 17 - lift] })
        const cy = fy - 22 - lift
        p.R(x - 7, cy, 14, 9, '#B37D47'); p.R(x - 7, cy, 14, 1, '#DBA868'); p.R(x - 7, cy + 4, 14, 1, '#7F532B')
        p.R(x - 4, cy - 3, 1, 3, STEEL); p.R(x + 1, cy - 4, 2, 4, WOOD); p.R(x + 4, cy - 2, 1, 2, STEEL)
      })
      return { layers: cycle(fs, 0.25), fire: true }
    }
    case 'error': {
      const offs = [0, 1, 0, -1]
      const fs = frames(4, (p, f) => {
        const x = 104 + offs[f]!
        const fy = 86
        const hy = fy - 28
        fig(p, { x, fy, down: true, blink: true, l: [x - 4, hy + 2], r: [x + 6, fy - 8] })
        const star = (a: number) => sparkle(p, x + Math.round(Math.cos(a) * 9), hy - 2 + Math.round(Math.sin(a) * 3), '#FFD166')
        star(f * 1.6); star(f * 1.6 + 3.1)
        bubble(p, x + 9, hy - 14, 11, 10)
        for (let i = 0; i < 5; i++) { p.R(x + 12 + i, hy - 12 + i, 1, 1, '#E03131'); p.R(x + 16 - i, hy - 12 + i, 1, 1, '#E03131') }
      })
      return { layers: cycle(fs, 0.2), fire: true }
    }
    case 'done': {
      const ys = [86, 82, 80, 84]
      const fs = frames(4, (p, f) => {
        const x = 146
        const fy = ys[f]!
        const { x: kx, y: ky } = CHEST
        p.R(kx, ky - 7, 12, 4, '#B37D47'); p.R(kx, ky - 3, 12, 1, GOLD); p.R(kx + 1, ky - 1, 10, 2, '#FFD166')
        sparkle(p, kx + 3 + f, ky - 10 - f, '#FFD166'); sparkle(p, kx + 9 - f, ky - 13 + (f % 2), '#FFF3B0')
        fig(p, { x, fy, l: [x - 9, fy - 30], r: [x + 6, fy - 30], weapon: 'up' })
        for (let i = 0; i < 3; i++) sparkle(p, x - 12 + i * 12, fy - 46 + ((f + i) % 3) * 2, i === 1 ? JOBS[k.job].magic : '#FFD166')
        classVictory(k, f, p, x, fy)
      })
      return { layers: cycle(fs, 0.18), fire: true }
    }
    case 'waiting':
      return { layers: classRest(k, fig), fire: true }
    case 'battle':
      return { layers: classBattle(k, fig), fire: true }
    case 'slain': {
      const fs = frames(3, (p, f) => {
        const x = 100
        const fy = 88 - (f === 1 ? 3 : 0)
        const mx = 124
        slime(p, mx, 88, 0.35, true)
        drop(p, mx - 9, 86); drop(p, mx + 8, 87); drop(p, mx + 2, 84)
        const cy = 74 - f * 3
        p.R(mx - 1, cy, 4, 4, '#FFD166'); p.R(mx, cy + 1, 2, 2, '#F2A93B'); sparkle(p, mx + 6, cy - 2 + f, '#FFF3B0')
        fig(p, { x, fy, l: [x - 9, fy - 30], r: [x + 6, fy - 30], weapon: 'up' })
      })
      return { layers: cycle(fs, 0.3), fire: true }
    }
    case 'approval': {
      // Waiting on the person: a hand up high and a blinking "!".
      const fs = frames(2, (p, f) => {
        const x = 104
        const fy = 86
        fig(p, { x, fy, l: [x - 8, fy - 8], r: [x + 6, fy - 34 - f] })
        if (f === 0) { p.R(x + 12, fy - 48, 2, 6, '#E03131'); p.R(x + 12, fy - 40, 2, 2, '#E03131') }
      })
      return { layers: cycle(fs, 0.35), fire: true }
    }
    case 'sleeping': {
      const fs = frames(3, (p, f) => {
        const x = LOG.x + 8
        const fy = LOG.y + 3
        fig(p, { x, fy, sit: true, down: true, blink: true, l: [x - 6, fy - 9], r: [x + 4, fy - 9] })
        const z = (zx: number, zy: number, n: number) => {
          p.R(zx, zy, n, 1, '#FFFFFF'); p.R(zx, zy + n - 1, n, 1, '#FFFFFF')
          for (let i = 1; i < n - 1; i++) p.R(zx + n - 1 - i, zy + i, 1, 1, '#FFFFFF')
        }
        z(x + 8, fy - 36 - f * 2, 3)
        if (f >= 1) z(x + 12, fy - 44 - f, 4)
        if (f >= 2) z(x + 17, fy - 52, 5)
      })
      return { layers: cycle(fs, 0.7), fire: false }
    }
  }
}

// ── each class's own moves ────────────────────────────────────────────────
// Command, battle, rest and victory each look different by class, so picking
// one has a flavour of its own.

/** The hunter's wolf: lying down asleep, or standing (two leg frames). */
function wolf(p: Pen, x: number, fy: number, f: number, pose: 'stand' | 'sleep' | 'pounce'): void {
  const R = p.R
  const fur = '#8E99A6'
  const dark = '#5E6873'
  if (pose === 'sleep') {
    R(x - 6, fy - 4, 12, 4, fur); R(x + 4, fy - 6, 5, 4, fur); R(x + 5, fy - 7, 1, 1, dark); R(x + 7, fy - 7, 1, 1, dark)
    R(x + 6, fy - 4, 2, 1, dark); R(x - 8, fy - 3 - (f % 2), 3, 2, fur); R(x - 4, fy - 4, 6, 1, '#B9C2D0')
    return
  }
  const lift = pose === 'pounce' ? 3 : 0
  const y = fy - lift
  R(x - 6, y - 7, 11, 4, fur); R(x + 3, y - 10, 6, 5, fur); R(x + 9, y - 8, 2, 2, fur); R(x + 10, y - 8, 1, 1, EYE)
  R(x + 4, y - 12, 1, 2, dark); R(x + 7, y - 12, 1, 2, dark); R(x + 6, y - 9, 1, 1, EYE)
  R(x - 9, y - 9 + (f % 2), 3, 2, fur)
  const a = f % 2 ? 1 : 0
  R(x - 5 + a, y - 3, 1, 3, dark); R(x - 2 - a, y - 3, 1, 3, dark); R(x + 2 + a, y - 3, 1, 3, dark); R(x + 4 - a, y - 3, 1, 3, dark)
}

/** Dots on a circle: a ring of light or a shockwave. */
function ring(p: Pen, cx: number, cy: number, r: number, c: string, n = 12): void {
  for (let i = 0; i < n; i++) {
    const a = (i * Math.PI * 2) / n
    p.R(cx + Math.round(Math.cos(a) * r), cy + Math.round(Math.sin(a) * r * 0.8), 1, 1, c)
  }
}

function puff(p: Pen, x: number, y: number, r: number): void {
  disc(p, x, y, r, '#B9C2D0'); disc(p, x - 1, y - 1, Math.max(1, r - 2), '#E4E9EE')
}

function fireball(p: Pen, x: number, y: number): void {
  disc(p, x, y, 3, '#FF7B29'); disc(p, x, y, 2, '#FFB347'); p.R(x - 1, y - 1, 2, 2, '#FFF3B0')
  p.R(x - 6, y - 1, 3, 2, '#FF7B29'); p.R(x - 9, y, 2, 1, '#FFB347')
}

function heart(p: Pen, x: number, y: number, c: string): void {
  p.R(x, y, 2, 1, c); p.R(x + 3, y, 2, 1, c); p.R(x - 1, y + 1, 7, 2, c); p.R(x, y + 3, 5, 1, c); p.R(x + 1, y + 4, 3, 1, c); p.R(x + 2, y + 5, 1, 1, c)
}

type Fig = (p: Pen, o: Pose) => void

function classBash(k: Ctx, fig: Fig): string {
  const x = 100
  const fy = 86
  switch (k.job) {
    case 'warrior': {
      // Battle Shout: arms up, a shockwave rolling out
      const fs = frames(4, (p, f) => {
        fig(p, { x, fy, l: [x - 9, fy - 26], r: [x + 6, fy - 24], weapon: 'up' })
        ring(p, x, fy - 18, 6 + f * 5, f % 2 ? '#FF8C42' : '#FFD166', 14)
        if (f >= 1) ring(p, x, fy - 18, 2 + f * 4, '#FFFFFF', 10)
      })
      return cycle(fs, 0.2)
    }
    case 'mage': {
      // Fireball: charge, fly, burst once; then the staff hums with what is left
      const fs = frames(9, (p, f) => {
        fig(p, { x, fy, l: [x + 7, fy - 20], r: [x + 6, fy - 22], weapon: 'up' })
        if (f <= 1) { disc(p, x + 10, fy - 20, 1 + f, '#FFB347'); sparkle(p, x + 10, fy - 24 - f, '#FFF3B0') }
        if (f >= 2 && f <= 5) fireball(p, x + 12 + (f - 1) * 9, fy - 20 + (f - 1))
        if (f === 6) { disc(p, x + 50, fy - 15, 6, '#FF7B29'); disc(p, x + 50, fy - 15, 4, '#FFE08A'); sparkle(p, x + 43, fy - 23, '#FFD166'); sparkle(p, x + 57, fy - 21, '#FFD166') }
        if (f >= 7) {
          p.R(x + 48 + (f % 2), fy - 22 - (f - 7) * 2, 2, 2, 'rgba(180,180,190,.7)')
          sparkle(p, x + 8, fy - 41 - (f % 2), f % 2 ? '#7FDBFF' : '#FFFFFF')
        }
      })
      return play(fs, 0.18, 7)
    }
    case 'hunter': {
      // Flare: aim, rise, burst once; then the green light drifts in the sky
      const fs = frames(9, (p, f) => {
        fig(p, { x, fy, l: [x + 3, fy - 26], r: [x + 6, fy - 22], weapon: 'none' })
        weapon(p, 'hunter', x + 4, fy - 30, 'up')
        if (f === 0) { p.R(x + 8, fy - 38, 1, 6, WOOD); p.R(x + 7, fy - 39, 3, 2, '#9BE564') }
        if (f >= 1 && f <= 4) { p.R(x + 8, fy - 38 - f * 7, 1, 5, WOOD); p.R(x + 7, fy - 39 - f * 7, 3, 2, '#9BE564'); p.R(x + 8, fy - 32 - f * 7, 1, 2, 'rgba(155,229,100,.5)') }
        if (f === 5) { ring(p, x + 8, 32, 7, '#9BE564', 14); ring(p, x + 8, 32, 4, '#FFFFFF', 8); sparkle(p, x + 8, 32, '#E8FFD1') }
        if (f === 6) { ring(p, x + 8, 32, 9, 'rgba(155,229,100,.7)', 16); sparkle(p, x + 8, 33, '#9BE564') }
        if (f >= 7) { const y = 33 + (f - 7); sparkle(p, x + 8 + (f % 2), y, '#9BE564'); p.R(x + 4, y + 3, 1, 1, '#E8FFD1'); p.R(x + 12, y + 2, 1, 1, '#E8FFD1') }
      })
      return play(fs, 0.2, 7)
    }
    case 'rogue': {
      // Smoke bomb: puff, vanish, reappear once; then wisps clear around a smug rogue
      const fs = frames(8, (p, f) => {
        if (f === 0 || f >= 5) fig(p, { x, fy, blink: f === 7, l: [x - 8, fy - 8], r: [x + 6, fy - 18], weapon: 'up' })
        if (f === 0) p.R(x + 6, fy - 22, 3, 3, '#3A3A48')
        if (f >= 1 && f <= 4) {
          const r = 3 + Math.min(f, 3)
          puff(p, x - 4, fy - 8, r); puff(p, x + 5, fy - 12, r - 1); puff(p, x, fy - 20, r)
          if (f === 2) for (let i = 0; i < 3; i++) p.R(x - 10 + i * 9, fy - 30 - i * 2, 1, 1, '#C77DFF')
        }
        if (f === 5) { puff(p, x - 9, fy - 4, 2); puff(p, x + 10, fy - 6, 2) }
        if (f >= 6) { p.R(x - 10, fy - 6 - (f - 6) * 2, 2, 1, 'rgba(185,194,208,.6)'); p.R(x + 10, fy - 9 - (f - 6) * 2, 2, 1, 'rgba(185,194,208,.6)') }
      })
      return play(fs, 0.22, 6)
    }
    case 'priest': {
      // Pillar of light pouring down on the priest
      const fs = frames(4, (p, f) => {
        const w = 10 + (f % 2) * 4
        p.R(x - w / 2, 26, w, fy - 26, 'rgba(255,240,170,.35)')
        p.R(x - 2, 26, 4, fy - 26, 'rgba(255,255,230,.45)')
        fig(p, { x, fy, l: [x - 9, fy - 28], r: [x + 6, fy - 28], weapon: 'none' })
        for (let i = 0; i < 3; i++) sparkle(p, x - 8 + i * 8, fy - 8 - ((f + i * 2) % 4) * 7, '#FFE08A')
      })
      return cycle(fs, 0.22)
    }
  }
}

function classBattle(k: Ctx, fig: Fig): string {
  const fy = 88
  const mx = 124
  const hit = (p: Pen, x = mx) => { drop(p, x - 2, fy - 16); drop(p, x + 5, fy - 14); drop(p, x + 9, fy - 9) }
  switch (k.job) {
    case 'warrior': {
      // Charge and slash
      const fs = frames(4, (p, f) => {
        const lunge = f === 1 || f === 2
        const x = 98 + (lunge ? 5 : 0)
        slime(p, mx + (f === 3 ? 1 : 0), fy - (f === 3 ? 3 : 0), f === 2 ? 0.6 : 1, false)
        if (lunge) { fig(p, { x, fy, l: [x - 8, fy - 8], r: [x + 7, fy - 14], weapon: 'right' }); p.R(x - 10, fy - 2, 3, 1, '#C9A36B'); p.R(x - 14, fy - 3, 2, 1, '#C9A36B') }
        else fig(p, { x, fy, l: [x - 8, fy - 8], r: [x + 6, fy - 20], weapon: 'up' })
        if (f === 2) { sparkle(p, mx - 6, fy - 12, '#FFFFFF'); hit(p) }
        if (f === 3) { drop(p, mx + 2, fy - 20); drop(p, mx + 10, fy - 4) }
      })
      return cycle(fs, 0.18)
    }
    case 'mage': {
      // A fireball right into the slime
      const fs = frames(4, (p, f) => {
        const x = 96
        slime(p, mx, fy, f === 3 ? 0.6 : 1, false)
        fig(p, { x, fy, l: [x + 7, fy - 20], r: [x + 6, fy - 22], weapon: 'up' })
        if (f === 1) fireball(p, x + 14, fy - 14)
        if (f === 2) fireball(p, mx - 10, fy - 9)
        if (f === 3) { disc(p, mx, fy - 6, 4, '#FFB347'); sparkle(p, mx - 6, fy - 14, '#FFD166'); hit(p) }
      })
      return cycle(fs, 0.18)
    }
    case 'hunter': {
      // Arrows from afar while the wolf pounces
      const fs = frames(4, (p, f) => {
        const x = 92
        slime(p, mx + 4, fy - (f === 2 ? 2 : 0), f === 3 ? 0.6 : 1, false)
        fig(p, { x, fy, l: [x - 6, fy - 15], r: [x + 9, fy - 15], weapon: 'none' })
        weapon(p, 'hunter', x + 10, fy - 15, 'up')
        if (f === 1 || f === 2) { const ax = 108 + f * 6; p.R(ax - 7, fy - 15, 8, 1, WOOD); p.R(ax + 1, fy - 16, 2, 3, STEEL) }
        wolf(p, 110 + (f >= 2 ? 3 : 0), fy, f, f >= 2 ? 'pounce' : 'stand')
        if (f === 3) hit(p, mx + 4)
      })
      return cycle(fs, 0.2)
    }
    case 'rogue': {
      // Vanish in smoke, strike from behind
      const fs = frames(4, (p, f) => {
        slime(p, mx, fy, f === 3 ? 0.6 : 1, false)
        if (f === 0) fig(p, { x: 98, fy, l: [90, fy - 8], r: [104, fy - 18], weapon: 'up' })
        if (f === 1) { puff(p, 96, fy - 10, 5); puff(p, 101, fy - 18, 4) }
        if (f >= 2) fig(p, { x: 140, fy, l: [132, fy - 14], r: [133, fy - 16], weapon: 'none' })
        if (f >= 2) { p.R(126, fy - 16, 6, 1, STEEL); p.R(131, fy - 17, 1, 3, GOLD) }
        if (f === 2) puff(p, 142, fy - 30, 3)
        if (f === 3) { sparkle(p, mx + 6, fy - 12, '#C77DFF'); hit(p) }
      })
      return cycle(fs, 0.22)
    }
    case 'priest': {
      // Holy Smite from the sky
      const fs = frames(4, (p, f) => {
        const x = 98
        slime(p, mx, fy, f === 2 ? 0.6 : 1, false)
        fig(p, { x, fy, l: [x - 9, fy - 28], r: [x + 6, fy - 28], weapon: 'none' })
        if (f === 1 || f === 2) { p.R(mx - 3, 26, 6, fy - 30, 'rgba(255,240,170,.55)'); p.R(mx - 1, 26, 2, fy - 30, '#FFF8D6') }
        if (f === 2) { sparkle(p, mx - 7, fy - 12, '#FFE08A'); hit(p) }
        if (f === 0) sparkle(p, x, fy - 44, '#FFE08A')
      })
      return cycle(fs, 0.2)
    }
  }
}

function classRest(k: Ctx, fig: Fig): string {
  const x = LOG.x + 8
  const fy = LOG.y + 2
  switch (k.job) {
    case 'warrior': {
      // Wiping the sword clean across the knees
      const fs = frames(4, (p, f) => {
        fig(p, { x, fy, sit: true, down: true, l: [x - 4 + f * 2, fy - 12], r: [x + 6, fy - 11] })
        p.R(x - 9, fy - 11, 18, 2, STEEL); p.R(x + 9, fy - 11, 1, 1, STEEL); p.R(x - 11, fy - 12, 2, 4, GOLD)
        p.R(x - 5 + f * 2, fy - 13, 3, 2, '#F4F1EA')
        if (f === 3) sparkle(p, x + 8, fy - 15, '#FFFFFF')
      })
      return cycle(fs, 0.4)
    }
    case 'mage': {
      // A book and a teacup float in slow circles
      const fs = frames(4, (p, f) => {
        fig(p, { x, fy, sit: true, blink: f === 2, l: [x - 8, fy - 14], r: [x + 6, fy - 8] })
        const a = (f * Math.PI) / 2
        const bx = x - 4 + Math.round(Math.cos(a) * 9)
        const by = fy - 32 + Math.round(Math.sin(a) * 3)
        p.R(bx, by, 6, 4, '#6A4C9C'); p.R(bx + 1, by + 1, 4, 2, '#FFFFFF')
        const cx = x - 4 + Math.round(Math.cos(a + Math.PI) * 9)
        const cy = fy - 32 + Math.round(Math.sin(a + Math.PI) * 3)
        p.R(cx, cy, 4, 3, '#F4F1EA'); p.R(cx + 4, cy + 1, 1, 1, '#F4F1EA'); p.R(cx + 1, cy - 2 - (f % 2), 1, 2, 'rgba(255,255,255,.7)')
        sparkle(p, x - 10, fy - 16, '#7FDBFF')
      })
      return cycle(fs, 0.5)
    }
    case 'hunter': {
      // Dozing with the wolf curled up by the fire
      const fs = frames(2, (p, f) => {
        fig(p, { x, fy, sit: true, blink: true, l: [x - 8, fy - 8], r: [x + 9, fy - 7] })
        wolf(p, x + 16, fy + 2, f, 'sleep')
      })
      return cycle(fs, 0.8)
    }
    case 'rogue': {
      // Tossing a dagger and catching it
      const ys = [0, 8, 12, 8]
      const fs = frames(4, (p, f) => {
        const up = ys[f]!
        fig(p, { x, fy, sit: true, l: [x - 8, fy - 8], r: [x + 6, fy - 16 - (f === 0 ? 0 : 2)] })
        const dy = fy - 20 - up
        if (f % 2) { p.R(x + 6, dy, 1, 4, STEEL); p.R(x + 5, dy + 4, 3, 1, GOLD) }
        else { p.R(x + 4, dy + 2, 4, 1, STEEL); p.R(x + 8, dy + 1, 1, 3, GOLD) }
      })
      return cycle(fs, 0.3)
    }
    case 'priest': {
      // Praying, a soft halo coming and going
      const fs = frames(4, (p, f) => {
        fig(p, { x, fy, sit: true, down: true, blink: true, l: [x - 1, fy - 18], r: [x + 1, fy - 18] })
        const glow = f === 1 || f === 2
        p.R(x - 5, fy - 32, 10, 1, glow ? '#FFE08A' : 'rgba(255,224,138,.5)'); p.R(x - 6, fy - 31, 1, 1, '#FFE08A'); p.R(x + 5, fy - 31, 1, 1, '#FFE08A')
        if (glow) sparkle(p, x + 8, fy - 26 - f, '#FFF3B0')
      })
      return cycle(fs, 0.5)
    }
  }
}

/** A flourish added to the treasure-chest victory, one per class. */
function classVictory(k: Ctx, f: number, p: Pen, x: number, fy: number): void {
  switch (k.job) {
    case 'warrior':
      ring(p, x, fy - 18, 8 + f * 3, '#FFD166', 12)
      return
    case 'mage': {
      const bursts: readonly (readonly [number, number, string])[] = [[x - 18, 34, '#FF77A8'], [x + 4, 30, '#7FDBFF'], [x - 6, 38, '#FFD166'], [x + 14, 36, '#9BE564']]
      const [bx, by, c] = bursts[f % bursts.length]!
      ring(p, bx, by, 4, c, 10); ring(p, bx, by, 2, '#FFFFFF', 6)
      return
    }
    case 'hunter':
      wolf(p, x - 16, fy + (f % 2 ? -3 : 0), f, 'stand')
      return
    case 'rogue':
      p.R(x - 16, fy - 8, 6, 6, '#7A4E2D'); p.R(x - 15, fy - 9, 4, 1, GOLD)
      p.R(x - 12, fy - 18 - f * 3, 2, 2, '#FFD166'); p.R(x - 16, fy - 14 - ((f + 2) % 4) * 3, 2, 2, '#F2A93B')
      return
    case 'priest':
      p.R(x - 5, fy - 47, 10, 1, '#FFE08A'); p.R(x - 6, fy - 46, 1, 1, '#FFE08A'); p.R(x + 5, fy - 46, 1, 1, '#FFE08A')
      heart(p, x - 18, fy - 30 - f * 2, '#FF77A8'); heart(p, x + 12, fy - 26 - ((f + 2) % 4) * 2, '#FF9EBB')
      return
  }
}

/** Where each scene's hero stands, so the speech bubble sits over their head. */
const SPEAKER: { [K in Scene]: number } = {
  thinking: 110, read: 66, search: 104, edit: 100, write: 134, bash: 100, web: 104, agent: 110,
  other: 98, error: 104, done: 146, waiting: 66, sleeping: 66, battle: 98, slain: 100, approval: 104,
}

// The view: a camera on the part of the camp where the hero is working, so the
// hero and the text stay big in a narrow side panel; a status bar under it.
const VIEW_W = 112
const VIEW_Y = 26
const BAR_Y = 92

/** Where the camera looks: the hero, and whatever they are aiming at. */
function focusOf(kind: Scene, job: Job): number {
  if (kind === 'edit' && job === 'hunter') return 122
  if (kind === 'battle' || kind === 'slain') return 112
  if (kind === 'agent') return 126
  return SPEAKER[kind]
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

/** Rough width of `text` at font size `size` in Galmuri: Hangul full, Latin about half. */
export function textWidth(text: string, size: number): number {
  let w = 0
  for (const ch of text) w += /[\u1100-\u11ff\u3130-\u318f\uac00-\ud7a3]/.test(ch) ? size : size * 0.55
  return w
}

function fit(text: string, size: number, room: number): string {
  if (textWidth(text, size) <= room) return text
  let out = ''
  for (const ch of text) {
    if (textWidth(`${out}${ch}…`, size) > room) break
    out += ch
  }
  return `${out}…`
}

export type SceneText = { say: string }

/** The status line under the picture, in the same pixel type; its own image so text changes never restart the scene. */
export function barSvg(title: string, sub: string, font: string, colors: BarColors): string {
  const w = VIEW_W
  const h = sub ? 18 : 12
  const style = `<style>${font ? `@font-face{font-family:px;src:url(${font}) format('woff')}` : ''}text{font-family:px,'Galmuri11',monospace}</style>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 4}" height="${h * 4}" viewBox="0 0 ${w} ${h}">` +
    style +
    `<rect x="0" y="0" width="${w}" height="${h}" fill="${colors.bg}"/><rect x="0" y="0" width="${w}" height="1" fill="${colors.accent}"/>` +
    `<text x="3" y="9" font-size="7" fill="${colors.fg}">${esc(fit(title, 7, w - 6))}</text>` +
    (sub ? `<text x="3" y="15.5" font-size="5.5" fill="${colors.accent}">${esc(fit(sub, 5.5, w - 6))}</text>` : '') +
    `</svg>`
  )
}

/** How long the hero walks between two scenes' spots, in seconds (0: no walk). */
export function walkSeconds(from: Scene, to: Scene): number {
  const dx = Math.abs(SPEAKER[to] - SPEAKER[from])
  return from === to || dx < 6 ? 0 : Math.min(1.6, Math.max(0.6, dx / 45))
}

/** The whole camp with the adventurer doing `kind` and a speech bubble. */
export type BarColors = { bg: string; fg: string; accent: string }

export function campSvg(
  sp: Species,
  job: Job,
  kind: Scene,
  sky: Sky,
  text: SceneText,
  font = '',
  from?: Scene,
): string {
  const ally = JOB_IDS[(JOB_IDS.indexOf(job) + 1) % JOB_IDS.length]!
  introAt = from && from !== kind ? walkSeconds(from, kind) : 0
  const { layers, fire } = scene(kind, { sp, job, ally })
  introAt = 0
  const night = sky === 'night'
  const shade = night ? `<rect x="0" y="0" width="${W}" height="${H}" fill="rgba(12,18,44,.35)"/>` : ''
  const glow = fire && night
    ? `<rect x="${FIRE.cx - 16}" y="${FIRE.by - 22}" width="32" height="24" fill="rgba(255,170,80,.18)"/>`
    : ''

  const camAt = (k: Scene) => Math.max(0, Math.min(W - VIEW_W, Math.round(focusOf(k, job) - VIEW_W / 2)))
  const vx = camAt(kind)
  const VIEW = { x: vx, y: VIEW_Y, w: VIEW_W, h: BAR_Y - VIEW_Y }
  const move = from && from !== kind ? walkBetween(sp, job, from, kind) : undefined
  const fromVx = from ? camAt(from) : vx

  // speech bubble over the hero's head
  const say = fit(text.say, 9, VIEW_W - 12)
  const bw = Math.ceil(textWidth(say, 9)) + 8
  const hx = SPEAKER[kind]
  const bx = Math.max(VIEW.x + 2, Math.min(VIEW.x + VIEW.w - bw - 2, hx - bw / 2))
  const by = 29
  const tail = Math.max(bx + 3, Math.min(bx + bw - 6, hx - 1))
  const speech = say
    ? `<rect x="${bx + 1}" y="${by}" width="${bw - 2}" height="13" fill="#FFFFFF"/><rect x="${bx}" y="${by + 1}" width="${bw}" height="11" fill="#FFFFFF"/>` +
      `<rect x="${tail}" y="${by + 13}" width="3" height="2" fill="#FFFFFF"/><rect x="${tail + 1}" y="${by + 15}" width="1" height="1" fill="#FFFFFF"/>` +
      `<text x="${bx + 4}" y="${by + 10}" font-size="9" fill="#2A2320">${esc(say)}</text>`
    : ''

  const style = `<style>${font ? `@font-face{font-family:px;src:url(${font}) format('woff')}` : ''}text{font-family:px,'Galmuri11',monospace;shape-rendering:auto}</style>`
  const vb = (x: number) => `${x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`
  const T = move?.seconds ?? 0
  const later = (body: string) => (T ? `<g opacity="0"><set attributeName="opacity" to="1" begin="${T}s" fill="freeze"/>${body}</g>` : body)
  const pan = T && fromVx !== vx ? `<animate attributeName="viewBox" from="${vb(fromVx)}" to="${vb(vx)}" dur="${T}s" fill="freeze"/>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW.w * 4}" height="${VIEW.h * 4}" viewBox="${vb(vx)}" shape-rendering="crispEdges">` +
    pan +
    style +
    backdrop(sky) +
    (move?.layer ?? '') +
    later(layers) +
    shade +
    glow +
    campfire(fire) +
    later(speech) +
    `</svg>`
  )
}

/** The hero walking from one scene's spot to the next: a layer gone once they arrive. */
function walkBetween(sp: Species, job: Job, from: Scene, to: Scene): { layer: string; seconds: number } | undefined {
  const x0 = SPEAKER[from]
  const x1 = SPEAKER[to]
  const dx = x1 - x0
  const seconds = walkSeconds(from, to)
  if (!seconds) return undefined
  const steps = frames(2, (p, f) => {
    const fy = 86 - f
    figure(p, sp, job, { x: x0, fy, l: [x0 - 8 + (f ? 2 : -1), fy - 9], r: [x0 + 6 + (f ? -1 : 2), fy - 9] })
  })
  const layer =
    `<g><animateTransform attributeName="transform" type="translate" from="0 0" to="${dx} 0" dur="${seconds}s" fill="freeze"/>` +
    `<set attributeName="opacity" to="0" begin="${seconds}s" fill="freeze"/>${cycle(steps, 0.14, 1)}</g>`
  return { layer, seconds }
}

const thumbs = new Map<string, string>()

/** A small still of one scene, cropped to the hero, for the picture legend. */
export function thumbSvg(sp: Species, job: Job, kind: Scene): string {
  const key = `${sp}/${job}/${kind}`
  const hit = thumbs.get(key)
  if (hit) return hit
  const ally = JOB_IDS[(JOB_IDS.indexOf(job) + 1) % JOB_IDS.length]!
  still = true
  try {
    const { layers, fire } = scene(kind, { sp, job, ally })
    const w = 64
    const x = Math.max(0, Math.min(W - w, Math.round(focusOf(kind, job) - w / 2)))
    const out =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w * 2}" height="${50 * 2}" viewBox="${x} 40 ${w} 50" shape-rendering="crispEdges">` +
      backdrop('day') + layers + campfire(fire) + `</svg>`
    thumbs.set(key, out)
    return out
  } finally {
    still = false
  }
}

/** The adventurer alone, for the picker buttons' preview. */
export function portraitSvg(sp: Species, job: Job): string {
  const p = pen()
  figure(p, sp, job, { x: 16, fy: 40, weapon: 'up', r: [22, 24] })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="84" viewBox="0 0 32 42" shape-rendering="crispEdges">${p.out()}</svg>`
}

/** Every scene, in the order the legend lists them. */
export const SCENE_IDS: readonly Scene[] = [
  'thinking', 'read', 'search', 'edit', 'write', 'bash', 'web', 'agent', 'other',
  'battle', 'slain', 'error', 'approval', 'done', 'waiting', 'sleeping',
]
