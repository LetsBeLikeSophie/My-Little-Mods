// Where the time went: a small pixel bar chart of thinking and each kind of work.

export type TimeKey =
  | 'thinking'
  | 'read'
  | 'search'
  | 'edit'
  | 'write'
  | 'bash'
  | 'battle'
  | 'web'
  | 'agent'
  | 'other'

export { busyMs } from './core'

export const TIME_COLOR: { [K in TimeKey]: string } = {
  thinking: '#9B8AE0',
  read: '#4DA8FF',
  search: '#F2A93B',
  edit: '#FF77A8',
  write: '#E07A5F',
  bash: '#3FBFA8',
  battle: '#E03131',
  web: '#2B8FD6',
  agent: '#B388EB',
  other: '#A89F8E',
}



function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** The chart: one row per kind with time spent, longest first. */
export function statsSvg(
  spent: { readonly [k: string]: number },
  label: (k: TimeKey) => string,
  time: (ms: number) => string,
  font: string,
  colors: { fg: string; dim: string },
): string {
  const rows = (Object.keys(TIME_COLOR) as TimeKey[])
    .map(k => [k, spent[k] ?? 0] as const)
    .filter(([, ms]) => ms >= 500)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
  const total = rows.reduce((n, [, ms]) => n + ms, 0) || 1
  const max = Math.max(1, ...rows.map(([, ms]) => ms))
  const W = 112
  const rowH = 10
  const labelW = 34
  const room = W - labelW - 44
  const H = Math.max(rowH, rows.length * rowH) + 2
  const style = `<style>${font ? `@font-face{font-family:px;src:url(${font}) format('woff')}` : ''}text{font-family:px,'Galmuri11',monospace}</style>`
  let body = ''
  rows.forEach(([k, ms], i) => {
    const y = i * rowH + 1
    const blocks = Math.max(1, Math.round((ms / max) * (room / 3)))
    body += `<text x="1" y="${y + 7}" font-size="6.5" fill="${colors.fg}">${esc(label(k))}</text>`
    for (let b = 0; b < blocks; b++) body += `<rect x="${labelW + b * 3}" y="${y + 2}" width="2" height="6" fill="${TIME_COLOR[k]}"/>`
    const pct = Math.round((ms / total) * 100)
    body += `<text x="${labelW + blocks * 3 + 2}" y="${y + 7}" font-size="5.5" fill="${colors.dim}">${esc(time(ms))} ${pct}%</text>`
  })
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 4}" height="${H * 4}" viewBox="0 0 ${W} ${H}" shape-rendering="crispEdges">${style}${body}</svg>`
}
