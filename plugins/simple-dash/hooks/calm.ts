// The calm look: airy white rounded cards on a soft tint, thin light type, thin
// line icons with one filled accent circle. Two pieces: a status card, and the
// usage limits as three thin rings.

import type { Status } from './core'

const FONT = "'Segoe UI Variable Display','Segoe UI','Malgun Gothic','Apple SD Gothic Neo',sans-serif"
const W = 320

export type Palette = { card: string; ink: string; soft: string; track: string; accent: string; glow: string; rim: string }

function esc(t: string): string {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Rough text width at `size`: Hangul full-width, Latin about half. */
function widthOf(t: string, size: number): number {
  let w = 0
  for (const ch of t) w += /[ᄀ-ᇿ㄰-㆏가-힣]/.test(ch) ? size * 0.95 : size * 0.56
  return w
}

function fitSize(t: string, max: number, room: number): number {
  const w = widthOf(t, max)
  return w <= room ? max : Math.max(13, Math.floor((max * room) / w))
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

/** Line icons on a 100×100 grid, stroked; the accent circle is drawn separately. */
const ICONS: { [K in Status]: string } = {
  thinking: 'M22 66 Q10 66 10 54 Q10 42 24 42 Q26 26 44 26 Q60 26 64 40 Q80 38 84 52 Q86 66 72 66 Z M36 80 h.1 M50 80 h.1 M64 80 h.1',
  read: 'M50 30 Q36 22 16 24 V74 Q36 72 50 80 Q64 72 84 74 V24 Q64 22 50 30 Z M50 30 V80',
  search: 'M44 22 A22 22 0 1 0 44.1 22 Z M60 60 L80 80',
  edit: 'M70 18 L82 30 L40 72 L24 76 L28 60 Z M62 26 L74 38',
  write: 'M28 14 H58 L74 30 V86 H28 Z M58 14 V30 H74 M51 46 V70 M39 58 H63',
  bash: 'M14 22 H86 V78 H14 Z M28 42 L40 52 L28 62 M48 62 H66',
  check: 'M50 14 L80 26 V48 Q80 72 50 86 Q20 72 20 48 V26 Z M36 50 L46 60 L66 38',
  web: 'M50 16 A34 34 0 1 0 50.1 16 Z M16 50 H84 M50 16 Q32 50 50 84 M50 16 Q68 50 50 84',
  agent: 'M36 26 A12 12 0 1 0 36.1 26 Z M14 78 Q14 54 36 54 Q58 54 58 78 M66 30 A10 10 0 1 0 66.1 30 Z M62 52 Q86 50 86 74',
  other: 'M50 16 V34 M50 66 V84 M16 50 H34 M66 50 H84 M26 26 L38 38 M62 62 L74 74 M74 26 L62 38 M38 62 L26 74',
  error: 'M22 58 Q10 58 10 46 Q10 34 24 34 Q26 18 44 18 Q60 18 64 32 Q80 30 84 44 Q86 58 72 58 Z M34 68 V84 M46 68 V76 M58 68 V90 M70 68 V78',
  done: 'M50 16 A34 34 0 1 0 50.1 16 Z M34 50 L46 62 L68 38',
  waiting: 'M22 40 H66 V64 Q66 80 50 80 H38 Q22 80 22 64 Z M66 46 Q80 46 80 56 Q80 66 66 64 M34 20 Q38 26 34 32 M46 18 Q50 24 46 30',
  approval: 'M30 70 Q30 40 50 40 Q70 40 70 70 L76 78 H24 Z M44 84 Q50 90 56 84 M50 30 V40',
}

/** Where the accent circle sits behind each icon (cx, cy, r on the same grid). */
const DOT: { [K in Status]: readonly [number, number, number] } = {
  thinking: [70, 34, 20],
  read: [74, 26, 18],
  search: [44, 44, 16],
  edit: [72, 26, 16],
  write: [72, 72, 18],
  bash: [74, 24, 16],
  check: [70, 30, 18],
  web: [64, 36, 20],
  agent: [70, 32, 16],
  other: [50, 50, 14],
  error: [72, 24, 18],
  done: [66, 36, 22],
  waiting: [72, 30, 16],
  approval: [68, 36, 18],
}

export type StatusCard = { status: Status; label: string; headline: string; detail: string }

/** The status card: the icon on the left, what is happening on the right. */
export function statusSvg(d: StatusCard, p: Palette): string {
  const H = 112
  const s = 0.66
  const [cx, cy, r] = DOT[d.status]
  const room = W - 112 - 24
  const size = fitSize(d.headline, 24, room)
  // Waiting on the person: the card takes the accent's glow and an accent ring, and the label speaks up.
  const isAsking = d.status === 'approval'
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">` +
    `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="26" fill="${isAsking ? p.glow : p.card}" stroke="${p.rim}" stroke-width="${isAsking ? 3 : 1.5}"` +
    `/>` +
    `<g transform="translate(26 ${(H - 100 * s) / 2}) scale(${s})">` +
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${p.accent}"/>` +
    `<path d="${ICONS[d.status]}" fill="none" stroke="${p.ink}" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</g>` +
    text(112, 38, 12, isAsking ? 700 : 400, isAsking ? p.ink : p.soft, clip(d.label, 12, room)) +
    text(112, 42 + size, size, 300, p.ink, clip(d.headline, size, room)) +
    (d.detail ? text(112, 86, 11.5, 400, p.soft, clip(d.detail, 11.5, room)) : '') +
    `</svg>`
  )
}

export type Ring = { label: string; pct: number | null; base?: number | null; gain?: string; note: string }

/** An arc of a ring from `a0` to `a1` (fractions of a turn, from the top, clockwise). */
function arc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  if (a1 - a0 >= 0.999) return `M${cx} ${cy - r} A${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r}`
  const pt = (a: number) => [cx + r * Math.sin(a * 2 * Math.PI), cy - r * Math.cos(a * 2 * Math.PI)] as const
  const [x0, y0] = pt(a0)
  const [x1, y1] = pt(a1)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${r} ${r} 0 ${a1 - a0 > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

/** Three thin rings in their own small cards: the part since `base` glows. */
export function ringsSvg(rings: readonly Ring[], p: Palette): string {
  const H = 138
  const gap = 8
  const w = (W - 8 - gap * (rings.length - 1)) / rings.length
  let body = ''
  rings.forEach((g, i) => {
    const x = 4 + i * (w + gap)
    const cx = x + w / 2
    const cy = 54
    const r = 28
    const now = g.pct === null ? 0 : Math.max(0, Math.min(1, g.pct / 100))
    const was = g.base === null || g.base === undefined ? now : Math.max(0, Math.min(now, g.base / 100))
    body += `<rect x="${x}" y="4" width="${w}" height="${H - 8}" rx="24" fill="${p.card}" stroke="${p.rim}" stroke-width="1.5"/>`
    body += `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${p.track}" stroke-width="4"/>`
    if (was > 0) body += `<path d="${arc(cx, cy, r, 0, was)}" fill="none" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>`
    if (now > was) body += `<path d="${arc(cx, cy, r, was, now)}" fill="none" stroke="${p.glow}" stroke-width="4" stroke-linecap="round"/>`
    body += text(cx, cy + (g.gain ? 4 : 7), 20, 300, p.ink, g.pct === null ? '–' : `${Math.round(g.pct)}%`, 'middle')
    if (g.gain) body += text(cx, cy + 18, 10.5, 600, p.accent, g.gain, 'middle')
    body += text(cx, 108, 12.5, 400, p.ink, g.label, 'middle')
    if (g.note) body += text(cx, 124, 10.5, 400, p.soft, clip(g.note, 10.5, w - 12), 'middle')
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">${body}</svg>`
}

export type TimeRow = { label: string; ms: number; text: string }

/** Where the time went: a card of thin rounded bars, longest first. */
export function timeSvg(title: string, rows: readonly TimeRow[], p: Palette, empty = ''): string {
  const rowH = 24
  const H = 52 + Math.max(1, rows.length) * rowH + 12
  const max = Math.max(1, ...rows.map(r => r.ms))
  const labelW = 64
  const barMax = W - 32 - labelW - 92
  let body = `<rect x="4" y="4" width="${W - 8}" height="${H - 8}" rx="24" fill="${p.card}" stroke="${p.rim}" stroke-width="1.5"/>`
  body += text(22, 36, 13, 600, p.ink, title)
  if (rows.length === 0) body += text(22, 64, 12, 400, p.soft, empty)
  rows.forEach((r, i) => {
    const y = 52 + i * rowH
    const w = Math.max(6, (r.ms / max) * barMax)
    body += text(22, y + 12, 12.5, 400, p.ink, r.label)
    body += `<rect x="${22 + labelW}" y="${y + 4}" width="${barMax}" height="8" rx="4" fill="${p.track}"/>`
    body += `<rect x="${22 + labelW}" y="${y + 4}" width="${w.toFixed(1)}" height="8" rx="4" fill="${i === 0 ? p.accent : p.glow}"/>`
    body += text(W - 22, y + 12, 11, 400, p.soft, r.text, 'end')
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}">${body}</svg>`
}
