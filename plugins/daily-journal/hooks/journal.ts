// The journal look: warm cream, a sunny "now" card with a little face, pastel
// pill chips for the usage limits, and a big number beside rounded pill bars.

import type { Status } from './core'

const FONT = "'Noto Sans KR','Segoe UI Variable Display','Segoe UI','Malgun Gothic','Apple SD Gothic Neo',sans-serif"
const W = 320

export const J = {
  cream: '#F1EEE9',
  card: '#FFFFFF',
  ink: '#2B2620',
  soft: '#8C857B',
  line: '#ECE7E0',
  sun: '#FFC94A',
  sunDeep: '#F7A928',
  orange: '#F28C38',
  pink: '#F6D6CF',
  pinkInk: '#C2546B',
  lilac: '#DDD7FB',
  lilacInk: '#6F55D6',
  mint: '#D6EBD2',
  mintInk: '#4F8A45',
  bars: ['#FDBA2C', '#7A4234', '#8BA236', '#7A7363'],
} as const

/** The paper the journal is drawn on: its ground, cards, ink and pastels, light or dark. The sunny card keeps its own colors. */
export type Paper = {
  cream: string
  card: string
  ink: string
  soft: string
  line: string
  pink: string
  lilac: string
  mint: string
  butter: string
  tagBg: string
}

export const PAPERS: { light: Paper; dark: Paper } = {
  light: { cream: J.cream, card: J.card, ink: J.ink, soft: J.soft, line: J.line, pink: J.pink, lilac: J.lilac, mint: J.mint, butter: '#FFF1C9', tagBg: '#FFFFFF' },
  dark: { cream: '#1E1B17', card: '#2A2620', ink: '#F3ECE2', soft: '#A89F92', line: '#3A342D', pink: '#4A3236', lilac: '#37335A', mint: '#2E4430', butter: '#3D3420', tagBg: '#1E1B17' },
}

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function widthOf(t: string, size: number): number {
  let w = 0
  for (const ch of t) w += /[ᄀ-ᇿ㄰-㆏가-힣]/.test(ch) ? size * 0.95 : size * 0.58
  return w
}

function clip(t: string, size: number, room: number): string {
  if (widthOf(t, size) <= room) return t
  let out = ''
  for (const ch of t) {
    if (widthOf(`${out}${ch}…`, size) > room) break
    out += ch
  }
  return `${out}…`
}

/** The largest size up to `max` (and no smaller than 14) at which `t` fits in `room`. */
function fit(t: string, max: number, room: number): number {
  const w = widthOf(t, max)
  return w <= room ? max : Math.max(14, Math.floor((max * room) / w))
}

function text(x: number, y: number, size: number, weight: number, fill: string, t: string, anchor = 'start'): string {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="${FONT}">${esc(t)}</text>`
}


function svg(h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${h * 2}" viewBox="0 0 ${W} ${h}">${body}</svg>`
}

/** Greeting, the date, and a round avatar with the person's initial. */
export function greetingSvg(hello: string, who: string, date: string, initial: string, pp: Paper = PAPERS.light): string {
  // The hello on its own small line and the name big beneath it, shrunk to fit, so neither is cut.
  const H = 78
  const room = W - 70
  const size = fit(who, 24, room)
  return svg(
    H,
    text(0, 16, 13, 600, pp.soft, hello) +
      (who ? text(0, 44, size, 800, pp.ink, clip(who, size, room)) : '') +
      text(0, who ? 66 : 44, 12, 400, pp.soft, date) +
      `<defs><linearGradient id="av" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB15C"/><stop offset="1" stop-color="${J.orange}"/></linearGradient></defs>` +
      `<circle cx="${W - 24}" cy="36" r="24" fill="url(#av)"/>` +
      text(W - 24, 44, 20, 700, '#FFFFFF', initial, 'middle'),
  )
}








export type BandData = { status: Status; what: string; detail: string; limits: string }

/** The line above the prompt as a sunny pill with a tiny face at the front. */
export function bandSvg(d: BandData): string {
  // Wide and thin, to sit across the prompt's width as one slim line.
  const BW = 640
  const H = 20
  const rightW = widthOf(d.limits, 10.5) + 18
  const room = BW - 30 - rightW - 14
  const cx = 11
  const cy = H / 2
  const face =
    `<circle cx="${cx}" cy="${cy}" r="7" fill="${d.status === 'approval' ? '#E0533D' : J.sunDeep}"/>` +
    `<circle cx="${cx - 2.3}" cy="${cy - 1}" r="0.9" fill="${J.ink}"/><circle cx="${cx + 2.3}" cy="${cy - 1}" r="0.9" fill="${J.ink}"/>` +
    `<path d="M${cx - 2} ${cy + 1.8} Q${cx} ${cy + 3.4} ${cx + 2} ${cy + 1.8}" stroke="${J.ink}" stroke-width="0.9" fill="none" stroke-linecap="round"/>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${BW * 2}" height="${H * 2}" viewBox="0 0 ${BW} ${H}">` +
    `<rect x="0.5" y="0.5" width="${BW - 1}" height="${H - 1}" rx="${(H - 1) / 2}" fill="${J.sun}"/>` +
    face +
    text(24, 14, 11, 600, J.ink, clip(`${d.what}${d.detail ? ` · ${d.detail}` : ''}`, 11, room)) +
    `<rect x="${BW - rightW - 3}" y="3" width="${rightW}" height="${H - 6}" rx="${(H - 6) / 2}" fill="#FFFFFF"/>` +
    text(BW - 3 - rightW / 2, 13.8, 10.5, 600, J.ink, d.limits, 'middle') +
    `</svg>`
  )
}

// ─── The pictures inside the cards. Each is drawn with no background or inset
// of its own: the app's card around it gives every card the same padding. ───

/** A tiny flat icon before a card title: filled shapes only, no outlines. */
export type IconKind = 'star' | 'note' | 'flower' | 'clock'

function icon(kind: IconKind, x: number, y: number): string {
  if (kind === 'star') {
    const pts = Array.from({ length: 10 }, (_, i) => {
      const a = -Math.PI / 2 + (i * Math.PI) / 5
      const r = i % 2 ? 3 : 7
      return `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`
    }).join(' ')
    return `<polygon points="${pts}" fill="${J.sunDeep}"/>`
  }
  if (kind === 'note') {
    // a little notebook: a pink cover with a paler page
    return `<rect x="${x - 6}" y="${y - 7}" width="12" height="14" rx="2.5" fill="#F29BA8"/><rect x="${x - 2}" y="${y - 7}" width="8" height="14" rx="2" fill="#F6C3CB"/>`
  }
  if (kind === 'clock') {
    // a lilac clock face with two white hands
    return `<circle cx="${x}" cy="${y}" r="7" fill="#B3A6F2"/><rect x="${x - 0.9}" y="${y - 4.5}" width="1.8" height="5.2" rx=".9" fill="#FFFFFF"/><rect x="${x - 0.9}" y="${y - 0.9}" width="4.2" height="1.8" rx=".9" fill="#FFFFFF"/>`
  }
  // a five-petal flower
  let f = ''
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5
    f += `<circle cx="${(x + Math.cos(a) * 4).toFixed(1)}" cy="${(y + Math.sin(a) * 4).toFixed(1)}" r="3.4" fill="#8CC9A0"/>`
  }
  return f + `<circle cx="${x}" cy="${y}" r="2.6" fill="${J.sun}"/>`
}

/** A card's title, with its little icon before it. */
export function headingSvg(title: string, pp: Paper = PAPERS.light, kind?: IconKind): string {
  return kind ? svg(22, icon(kind, 7, 11) + text(20, 16, 15, 700, pp.ink, title)) : svg(22, text(0, 16, 15, 700, pp.ink, title))
}

/** The sky of the hour: dawn, day, sunset or night. */
export type SkyKind = 'dawn' | 'day' | 'sunset' | 'night'
export type Sky = { kind: SkyKind; bg: string; ink: string; soft: string; tagBg: string }

export function skyOf(hour: number): Sky {
  if (hour >= 5 && hour < 8) return { kind: 'dawn', bg: '#F6D9E4', ink: '#3A2A3E', soft: '#7C6378', tagBg: '#FFFFFF' }
  if (hour >= 8 && hour < 17) return { kind: 'day', bg: J.sun, ink: J.ink, soft: '#6E5520', tagBg: '#FFFFFF' }
  if (hour >= 17 && hour < 20) return { kind: 'sunset', bg: '#FFB27A', ink: '#3B2316', soft: '#7A4A2E', tagBg: '#FFF1E6' }
  return { kind: 'night', bg: '#2E3566', ink: '#F3F0FF', soft: '#B7B9DE', tagBg: '#454C85' }
}

/** A calm little face: two dots and a smile. */
function face(cx: number, cy: number, c: string): string {
  return (
    `<circle cx="${cx - 5}" cy="${cy}" r="1.8" fill="${c}"/><circle cx="${cx + 5}" cy="${cy}" r="1.8" fill="${c}"/>` +
    `<path d="M${cx - 4} ${cy + 5} Q${cx} ${cy + 8} ${cx + 4} ${cy + 5}" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
  )
}

/** The sun or moon of the hour, flat and simple. */
function skyBody(kind: SkyKind, cx: number, cy: number): string {
  if (kind === 'night') {
    const stars = ([[-28, -14, 1.6], [22, -20, 1.2], [-30, 12, 1.1], [26, 14, 1.5]] as const)
      .map(([dx, dy, r]) => `<circle cx="${cx + dx}" cy="${cy + dy}" r="${r}" fill="#FFFFFF" opacity=".8"/>`)
      .join('')
    // a crescent: the moon with the night sky bitten out of it, the face on what is left
    return stars + `<circle cx="${cx}" cy="${cy}" r="17" fill="#FFE7A3"/><circle cx="${cx + 9}" cy="${cy - 7}" r="14" fill="#2E3566"/>` + face(cx - 6, cy + 3, '#2B2620')
  }
  if (kind === 'dawn' || kind === 'sunset') {
    // half a sun resting on the horizon
    const c = kind === 'dawn' ? '#FF9EB5' : '#F2703A'
    const hy = cy + 10
    return (
      `<path d="M${cx - 19} ${hy} A19 19 0 0 1 ${cx + 19} ${hy} Z" fill="${c}"/>` +
      `<rect x="${cx - 30}" y="${hy + 2}" width="60" height="3" rx="1.5" fill="${c}" opacity=".55"/>` +
      face(cx, hy - 9, '#3B2316')
    )
  }
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    return `<circle cx="${(cx + Math.cos(a) * 24).toFixed(1)}" cy="${(cy + Math.sin(a) * 24).toFixed(1)}" r="2.6" fill="${J.sunDeep}"/>`
  }).join('')
  return rays + `<circle cx="${cx}" cy="${cy}" r="17" fill="${J.sunDeep}"/>` + face(cx, cy - 2, '#2B2620')
}

export type NowCard = { status: Status; title: string; detail: string; tag: string; label: string }

/** What is happening now, on the sky of the hour; the sun or moon at the right. */
export function nowSvg(d: NowCard, sky: Sky): string {
  const H = 78
  const room = W - 76
  const tagW = Math.max(48, widthOf(d.tag, 11) + 18)
  const ask =
    d.status === 'approval'
      ? `<circle cx="${W - 12}" cy="10" r="9" fill="#E0533D"/>` + text(W - 12, 14.5, 12, 800, '#FFFFFF', '!', 'middle')
      : ''
  return svg(
    H,
    text(0, 13, 12, 600, sky.soft, d.label) +
      text(0, 38, fit(d.title, 21, room), 700, sky.ink, clip(d.title, fit(d.title, 21, room), room)) +
      (d.detail ? text(0, 58, 12, 400, sky.soft, clip(d.detail, 12, room)) : '') +
      (d.tag
        ? `<rect x="${W - tagW}" y="${H - 20}" width="${tagW}" height="20" rx="10" fill="${sky.tagBg}"/>` +
          text(W - tagW / 2, H - 6, 11, 600, sky.ink, d.tag, 'middle')
        : '') +
      skyBody(sky.kind, W - 34, 30) +
      ask,
  )
}

export type Pill = { label: string; pct: number }

/** A big number with its caption, beside up to four rounded pill bars. */
export function statsSvg(big: string, caption: string, pills: readonly Pill[], empty = '', pp: Paper = PAPERS.light): string {
  const H = 150
  let body = text(0, 58, 46, 800, pp.ink, big)
  body += text(0, 82, 12, 400, pp.soft, caption)
  const n = Math.max(1, pills.length)
  const left = 136
  const area = W - left
  const pw = Math.min(30, (area - (n - 1) * 8) / n)
  const top = 4
  const bottom = 124
  pills.forEach((p, i) => {
    const x = left + i * (pw + 8)
    const h = Math.max(pw, ((bottom - top) * p.pct) / 100)
    body += `<rect x="${x}" y="${top}" width="${pw}" height="${bottom - top}" rx="${pw / 2}" fill="${pp.line}"/>`
    body += `<rect x="${x}" y="${bottom - h}" width="${pw}" height="${h}" rx="${pw / 2}" fill="${J.bars[i % J.bars.length]}"/>`
    body += text(x + pw / 2, bottom - 10, 10, 700, '#FFFFFF', `${p.pct}%`, 'middle')
    body += text(x + pw / 2, bottom + 20, 11, 400, pp.ink, clip(p.label, 11, pw + 14), 'middle')
  })
  if (pills.length === 0) body += text(left, 62, 12, 400, pp.soft, clip(empty, 12, W - left))
  return svg(H, body)
}
