// The journal look: warm cream, a sunny "now" card with a little face, pastel
// pill chips for the usage limits, and a big number beside rounded pill bars.

import type { Status } from './core'

const FONT = "'Noto Sans KR','Segoe UI Variable Display','Segoe UI','Malgun Gothic','Apple SD Gothic Neo',sans-serif"
const W = 320
// Cards span the full width, edge to edge like the app's own boxes, with this corner and inset.
const R = 12
const PAD = 16

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

function text(x: number, y: number, size: number, weight: number, fill: string, t: string, anchor = 'start'): string {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}" font-family="${FONT}">${esc(t)}</text>`
}

/** A card's title, as a thin strip of its own. */
export function headingSvg(title: string): string {
  return svg(22, text(0, 16, 15, 700, J.ink, title))
}

function svg(h: number, body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${h * 2}" viewBox="0 0 ${W} ${h}">${body}</svg>`
}

/** Greeting, the date, and a round avatar with the person's initial. */
export function greetingSvg(hello: string, date: string, initial: string): string {
  const H = 72
  return svg(
    H,
    text(0, 34, 24, 700, J.ink, clip(hello, 24, W - 80)) +
      text(0, 58, 13, 400, J.soft, date) +
      `<defs><linearGradient id="av" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#FFB15C"/><stop offset="1" stop-color="${J.orange}"/></linearGradient></defs>` +
      `<circle cx="${W - 24}" cy="34" r="24" fill="url(#av)"/>` +
      text(W - 24, 42, 20, 700, '#FFFFFF', initial, 'middle'),
  )
}

/** A little face for each mood: a sun at work, a cloud thinking, a moon resting … */
function mascot(status: Status, cx: number, cy: number): string {
  const face = (y: number, happy: boolean) =>
    `<circle cx="${cx - 7}" cy="${y}" r="2.2" fill="${J.ink}"/><circle cx="${cx + 7}" cy="${y}" r="2.2" fill="${J.ink}"/>` +
    (happy
      ? `<path d="M${cx - 5} ${y + 6} Q${cx} ${y + 10} ${cx + 5} ${y + 6}" stroke="${J.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`
      : `<path d="M${cx - 4} ${y + 9} Q${cx} ${y + 6} ${cx + 4} ${y + 9}" stroke="${J.ink}" stroke-width="2" fill="none" stroke-linecap="round"/>`) +
    `<circle cx="${cx - 12}" cy="${y + 5}" r="3" fill="#FF8A80" opacity=".55"/><circle cx="${cx + 12}" cy="${y + 5}" r="3" fill="#FF8A80" opacity=".55"/>`
  if (status === 'approval') {
    // waving for attention: the sun raises a hand, a little "!" beside it
    return (
      `<circle cx="${cx}" cy="${cy}" r="24" fill="${J.sunDeep}"/>` +
      face(cy - 2, true) +
      `<path d="M${cx + 20} ${cy - 6} Q${cx + 30} ${cy - 18} ${cx + 30} ${cy - 30}" stroke="${J.sunDeep}" stroke-width="6" fill="none" stroke-linecap="round"/>` +
      `<circle cx="${cx + 30}" cy="${cy - 34}" r="7" fill="${J.sunDeep}"/>` +
      `<path d="M${cx + 40} ${cy - 44} q4 4 0 10 M${cx + 22} ${cy - 46} q-4 4 0 10" stroke="#FFFFFF" stroke-width="2.5" fill="none" stroke-linecap="round"/>` +
      `<rect x="${cx - 40}" y="${cy - 46}" width="22" height="22" rx="11" fill="#FFFFFF"/>` +
      text(cx - 29, cy - 29, 15, 800, '#E0533D', '!', 'middle')
    )
  }
  if (status === 'waiting' || status === 'done') {
    // resting: a crescent moon
    return (
      `<circle cx="${cx}" cy="${cy}" r="24" fill="#FFE7A3"/>` +
      `<circle cx="${cx + 12}" cy="${cy - 9}" r="20" fill="${J.sun}"/>` +
      face(cy + 2, true) +
      (status === 'done' ? `<path d="M${cx + 26} ${cy - 22} l3 7 7 1 -5 5 1 7 -6 -3 -6 3 1 -7 -5 -5 7 -1 z" fill="#FFFFFF"/>` : '')
    )
  }
  if (status === 'thinking' || status === 'error') {
    const rain = status === 'error'
      ? [0, 1, 2].map(i => `<path d="M${cx - 10 + i * 10} ${cy + 22} v8" stroke="#5B8DEF" stroke-width="3" stroke-linecap="round"/>`).join('')
      : `<circle cx="${cx + 26}" cy="${cy - 20}" r="3" fill="#FFFFFF"/><circle cx="${cx + 33}" cy="${cy - 28}" r="4.5" fill="#FFFFFF"/>`
    return (
      `<path d="M${cx - 24} ${cy + 16} q-12 0 -12 -12 q0 -12 14 -12 q2 -14 20 -14 q16 0 20 12 q16 -2 18 12 q2 14 -12 14 z" fill="#FFFFFF"/>` +
      face(cy, !rain) +
      rain
    )
  }
  // at work: a sun with rays
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4
    const x0 = cx + Math.cos(a) * 30
    const y0 = cy + Math.sin(a) * 30
    const x1 = cx + Math.cos(a) * 38
    const y1 = cy + Math.sin(a) * 38
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} L${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${J.sunDeep}" stroke-width="3.5" stroke-linecap="round"/>`
  }).join('')
  return rays + `<circle cx="${cx}" cy="${cy}" r="24" fill="${J.sunDeep}"/>` + face(cy - 2, true)
}

export type NowCard = { status: Status; title: string; detail: string; tag: string; label: string }

/** The sunny card: what is happening now, with a mascot on the right. */
export function nowSvg(d: NowCard): string {
  const H = 150
  const room = W - 130
  return svg(
    H,
    `<rect x="0" y="0" width="${W}" height="${H}" rx="${R}" fill="${J.sun}"/>` +
      // soft hills along the bottom
      `<path d="M0 ${H - 34} Q70 ${H - 58} 140 ${H - 38} T${W} ${H - 40} V${H - R} Q${W} ${H} ${W - R} ${H} H${R} Q0 ${H} 0 ${H - R} Z" fill="#F5B53A" opacity=".55"/>` +
      text(PAD, 34, 12.5, 600, '#7A5A12', d.label) +
      text(PAD, 66, 22, 700, J.ink, clip(d.title, 22, room)) +
      (d.detail ? text(PAD, 90, 12.5, 400, '#5E4A1E', clip(d.detail, 12.5, room)) : '') +
      (d.tag
        ? `<rect x="${PAD}" y="${H - 38}" width="${Math.max(54, widthOf(d.tag, 12) + 22)}" height="24" rx="12" fill="#FFFFFF"/>` +
          text(PAD + 11, H - 21, 12, 600, J.ink, d.tag)
        : '') +
      mascot(d.status, W - 56, 62),
  )
}

export type Chip = { title: string; value: string; tag: string; note: string; tone: 'pink' | 'lilac' | 'mint' }

/** The usage limits as three pastel cards, each with a white pill tag. */
export function chipsSvg(chips: readonly Chip[]): string {
  const H = 104
  const gap = 8
  const w = (W - gap * (chips.length - 1)) / chips.length
  const tones = { pink: [J.pink, J.pinkInk], lilac: [J.lilac, J.lilacInk], mint: [J.mint, J.mintInk] } as const
  let body = ''
  chips.forEach((c, i) => {
    const x = i * (w + gap)
    const [bg, ink] = tones[c.tone]
    body += `<rect x="${x}" y="0" width="${w}" height="${H}" rx="${R}" fill="${bg}"/>`
    body += text(x + 14, 26, 12.5, 600, J.ink, c.title)
    body += text(x + 14, 56, 26, 700, J.ink, c.value)
    if (c.tag) {
      const tw = widthOf(c.tag, 11) + 16
      body += `<rect x="${x + 12}" y="${H - 34}" width="${tw}" height="20" rx="10" fill="#FFFFFF"/>` + text(x + 20, H - 20, 11, 700, ink, c.tag)
    } else if (c.note) {
      body += text(x + 14, H - 20, 11, 400, J.soft, clip(c.note, 11, w - 24))
    }
  })
  return svg(H, body)
}

export type Pill = { label: string; pct: number }

/** A big number with its caption, beside up to four rounded pill bars. */
export function statsSvg(big: string, caption: string, title: string, pills: readonly Pill[], empty = ''): string {
  const H = 206
  let body = `<rect x="0" y="0" width="${W}" height="${H}" rx="${R}" fill="${J.card}"/>`
  body += text(PAD, 36, 15, 700, J.ink, title)
  body += text(PAD, 104, 48, 800, J.ink, big)
  body += text(PAD, 128, 12, 400, J.soft, caption)
  const n = Math.max(1, pills.length)
  const area = W - 150 - 20
  const pw = Math.min(30, (area - (n - 1) * 8) / n)
  const top = 30
  const bottom = 172
  pills.forEach((p, i) => {
    const x = 150 + i * (pw + 8)
    const h = Math.max(pw, ((bottom - top) * p.pct) / 100)
    body += `<rect x="${x}" y="${top}" width="${pw}" height="${bottom - top}" rx="${pw / 2}" fill="${J.line}"/>`
    body += `<rect x="${x}" y="${bottom - h}" width="${pw}" height="${h}" rx="${pw / 2}" fill="${J.bars[i % J.bars.length]}"/>`
    body += text(x + pw / 2, bottom - 10, 10, 700, '#FFFFFF', `${p.pct}%`, 'middle')
    body += text(x + pw / 2, bottom + 20, 11, 400, J.ink, clip(p.label, 11, pw + 14), 'middle')
  })
  if (pills.length === 0) body += text(150, 104, 12, 400, J.soft, clip(empty, 12, W - 170))
  return svg(H, body)
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
