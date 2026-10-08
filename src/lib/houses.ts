import type { House, Visit } from './types'

export const pad = (n: number) => String(n).padStart(2, '0')
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
export const parseKey = (k: string) => new Date(`${k}T12:00:00`)
export const visitId = (houseId: string, date: string) => `${houseId}:${date}`

/** start of the first cleaning on or after the house's start date */
export function firstCleaning(h: Pick<House, 'startDate' | 'weekdays' | 'time'>): Date {
  const [hh, mm] = h.time.split(':').map(Number)
  const d = parseKey(h.startDate)
  for (let i = 0; i < 8; i++) {
    if (h.weekdays.includes(d.getDay())) break
    d.setDate(d.getDate() + 1)
  }
  d.setHours(hh || 0, mm || 0, 0, 0)
  return d
}

/** all cleaning days (YYYY-MM-DD) from the start date up to `until`, honoring the end date */
export function cleaningDays(h: House, until: Date): string[] {
  const out: string[] = []
  const cap = h.endDate && parseKey(h.endDate) < until ? parseKey(h.endDate) : until
  const d = parseKey(h.startDate)
  for (let guard = 0; d <= cap && guard < 3700; guard++, d.setDate(d.getDate() + 1)) {
    if (h.weekdays.includes(d.getDay())) out.push(dateKey(d))
  }
  return out
}

/** the next cleaning day today or later, if the house is still running */
export function nextCleaningDay(h: House, from = new Date()): string | undefined {
  const horizon = new Date(from)
  horizon.setDate(horizon.getDate() + 14)
  return cleaningDays({ ...h, endDate: h.endDate }, horizon).find((k) => k >= dateKey(from))
}

export const isEnded = (h: House, now = new Date()) => !!h.endDate && h.endDate < dateKey(now)

/** 1 → solid red, 10 → faint green; the lower the rating the louder the tint */
export function ratingStyle(r?: number): { background: string; borderColor: string } {
  if (!r) return { background: 'transparent', borderColor: 'var(--color-line)' }
  const hue = Math.round(((r - 1) / 9) * 125)
  const alpha = 0.1 + ((10 - r) / 9) * 0.72
  return { background: `hsl(${hue} 80% 45% / ${alpha.toFixed(2)})`, borderColor: `hsl(${hue} 80% 50% / ${Math.min(1, alpha + 0.25).toFixed(2)})` }
}

export function averageRating(visits: Visit[]): number | undefined {
  const rated = visits.filter((v) => v.rating)
  return rated.length ? rated.reduce((s, v) => s + v.rating!, 0) / rated.length : undefined
}

/** past cleaning days that have no record yet (nothing logged, or the photos have not arrived) */
export function openDays(h: House, visits: Record<string, Visit>, now = new Date()): string[] {
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  return cleaningDays(h, now)
    .filter((k) => k <= dateKey(now))
    .filter((k) => {
      const v = visits[visitId(h.id, k)]
      return !v || !v.rating || !v.photosReceived
    })
}
