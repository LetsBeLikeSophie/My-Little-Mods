// The HUD under the picture: the usage limits as XP-style bars (the blocks the
// last request filled glow, with its +%), and the session's context window.

import { gainText } from './core'

export { gainText }

export type HudBar = {
  icon: 'heart' | 'star' | 'drop'
  label: string
  pct: number | null
  /** Where the bar stood when the current or last request began; the blocks past it glow. */
  base?: number | null
  color: string
  /** The color of the blocks gained since `base`. */
  glow?: string
  right: string
}

export type HudSection = { title: string; bars: readonly HudBar[] }

/** A 5-pixel icon, drawn in the bar's color (emoji turn black or blank in some fonts). */
function icon(kind: HudBar['icon'], x: number, y: number, c: string): string {
  const px = (dx: number, dy: number, w = 1, h = 1) => `<rect x="${x + dx}" y="${y + dy}" width="${w}" height="${h}" fill="${c}"/>`
  if (kind === 'heart') return px(0, 0, 2) + px(3, 0, 2) + px(0, 1, 5, 2) + px(1, 3, 3) + px(2, 4)
  if (kind === 'star') return px(2, 0) + px(1, 1, 3) + px(0, 2, 5) + px(1, 3, 3) + px(0, 4) + px(4, 4)
  return px(2, 0) + px(1, 1, 3) + px(0, 2, 5, 2) + px(1, 4, 3)
}

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}


/** Groups of bars, each under a heading that says what full means for them. */
export function hudSvg(sections: readonly HudSection[], font: string, colors: { fg: string; dim: string; empty: string; head: string }): string {
  const W = 112
  const rowH = 10
  const headH = 7
  const labelW = 24
  const blocks = 10
  const blockW = 2
  const gap = 0.6
  const style = `<style>${font ? `@font-face{font-family:px;src:url(${font}) format('woff')}` : ''}text{font-family:px,'Galmuri11',monospace}</style>`
  let body = ''
  let y = 0
  for (const sec of sections) {
    body += `<text x="0.5" y="${y + 5}" font-size="4.8" fill="${colors.head}">${esc(sec.title)}</text>`
    y += headH
    for (const b of sec.bars) {
      body += icon(b.icon, 0.5, y + 1.5, b.color)
      body += `<text x="7" y="${y + 6.5}" font-size="5.5" fill="${colors.fg}">${esc(b.label)}</text>`
      const toBlocks = (p: number) => Math.max(0, Math.min(blocks, Math.round((p / 100) * blocks)))
      const lit = b.pct === null ? 0 : toBlocks(b.pct)
      let from = b.base === null || b.base === undefined ? lit : Math.min(lit, toBlocks(b.base))
      // Any gain at all lights at least one block, as XP does.
      if (gainText(b.pct, b.base) && from === lit && lit > 0) from = lit - 1
      for (let k = 0; k < blocks; k++) {
        const fill = k < from ? b.color : k < lit ? (b.glow ?? b.color) : colors.empty
        body += `<rect x="${(labelW + k * (blockW + gap)).toFixed(1)}" y="${y + 1.5}" width="${blockW}" height="5" fill="${fill}"/>`
      }
      const barEnd = labelW + blocks * (blockW + gap)
      const pct = b.pct === null ? '–' : `${Math.round(b.pct)}%`
      body += `<text x="${barEnd + 1.5}" y="${y + 6.5}" font-size="5.5" fill="${colors.fg}">${pct}</text>`
      const gain = gainText(b.pct, b.base)
      if (gain) body += `<text x="${barEnd + 14}" y="${y + 6.5}" font-size="5" fill="${b.glow ?? b.color}">${esc(gain)}</text>`
      if (b.right) body += `<text x="${W - 0.5}" y="${y + 6.5}" font-size="4.5" fill="${colors.dim}" text-anchor="end">${esc(b.right)}</text>`
      y += rowH
    }
    y += 1
  }
  const H = y + 2
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 4}" height="${H * 4}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${style}${body}</svg>`
}

export type BandData = { emoji: string; what: string; detail: string; five: number | null; fiveGain: string; week: number | null }

/** The line above the prompt as a tiny quest bar: dark slate, gold rim, pixel type. */
export function bandSvg(d: BandData, font: string): string {
  // Wide and thin, to sit across the prompt's width as one slim line.
  const W = 640
  const H = 20
  const style = `<style>${font ? `@font-face{font-family:px;src:url(${font}) format('woff')}` : ''}text{font-family:px,'Galmuri11',monospace}</style>`
  const right =
    (d.five === null ? '' : `${Math.round(d.five)}%${d.fiveGain ? ` ${d.fiveGain}` : ''}`) + (d.week === null ? '' : `   ${Math.round(d.week)}%`)
  const rightW = right.length * 6.2 + (d.five === null ? 0 : 10) + (d.week === null ? 0 : 10)
  const left = `${d.what}${d.detail ? ` · ${d.detail}` : ''}`
  const room = W - 30 - rightW - 18
  let cut = left
  while (cut.length > 1 && [...cut].reduce((n, ch) => n + (/[\uac00-\ud7a3]/.test(ch) ? 10 : 6.2), 0) > room) cut = cut.slice(0, -1)
  if (cut !== left) cut = `${cut.slice(0, -1)}…`
  let body = `<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="3" fill="#1C1A24" stroke="#E0B84A"/>`
  body += `<text x="7" y="14.5" font-size="11">${esc(d.emoji)}</text>`
  body += `<text x="23" y="14" font-size="10" fill="#F2E8D5">${esc(cut)}</text>`
  let x = W - 8 - rightW
  if (d.five !== null) {
    body += icon('heart', x, 7, '#E03131')
    x += 9
    body += `<text x="${x}" y="14" font-size="10" fill="#F2E8D5">${Math.round(d.five)}%</text>`
    x += `${Math.round(d.five)}%`.length * 6.2 + 6
    if (d.fiveGain) {
      body += `<text x="${x}" y="14" font-size="9" fill="#FF9A9A">${esc(d.fiveGain)}</text>`
      x += d.fiveGain.length * 5.6 + 6
    }
  }
  if (d.week !== null) {
    body += icon('star', x + 4, 7, '#E0B84A')
    body += `<text x="${x + 13}" y="14" font-size="10" fill="#F2E8D5">${Math.round(d.week)}%</text>`
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 2}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${style}${body}</svg>`
}
