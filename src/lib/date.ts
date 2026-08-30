import type { Lang } from './types'

export const DAY_MS = 86_400_000

let LANG: Lang = 'cs'
export function setDateLang(lang: Lang) {
  LANG = lang
}
const locale = () => (LANG === 'cs' ? 'cs-CZ' : 'en-US')
export const dateLocale = () => locale()

const REL: Record<Lang, { today: string; tomorrow: string; yesterday: string }> = {
  cs: { today: 'Dnes', tomorrow: 'Zítra', yesterday: 'Včera' },
  en: { today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday' },
}
const AGO: Record<Lang, (s: string) => string> = {
  cs: (s) => `před ${s}`,
  en: (s) => `${s} ago`,
}
const JUST_NOW: Record<Lang, string> = { cs: 'právě teď', en: 'just now' }

export function startOfDay(d: Date | string): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function addDays(d: Date | string, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function isSameDay(a: Date | string, b: Date | string): boolean {
  const x = new Date(a)
  const y = new Date(b)
  return (
    x.getFullYear() === y.getFullYear() &&
    x.getMonth() === y.getMonth() &&
    x.getDate() === y.getDate()
  )
}

export function startOfWeek(d: Date | string, mondayFirst = true): Date {
  const x = startOfDay(d)
  const day = x.getDay()
  const diff = mondayFirst ? (day === 0 ? -6 : 1 - day) : -day
  return addDays(x, diff)
}

export function startOfMonth(d: Date | string): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

export function endOfMonth(d: Date | string): Date {
  const x = startOfMonth(d)
  x.setMonth(x.getMonth() + 1)
  return addDays(x, -1)
}

export function decimalHours(d: Date | string): number {
  const x = new Date(d)
  return x.getHours() + x.getMinutes() / 60
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function fmtWeekday(d: Date | string, style: 'long' | 'short' = 'long') {
  const s = new Date(d).toLocaleDateString(locale(), { weekday: style })
  return cap(s)
}

export function fmtMonth(d: Date | string, style: 'long' | 'short' = 'long') {
  const s = new Date(d).toLocaleDateString(locale(), { month: style })
  return cap(s.replace(/\.$/, ''))
}

export function fmtDayMonth(d: Date | string) {
  const x = new Date(d)
  return LANG === 'cs'
    ? `${x.getDate()}. ${fmtMonth(x, 'long').toLowerCase()}`
    : `${x.getDate()} ${fmtMonth(x, 'short')}`
}

/** "Wednesday, 27 August" / "středa 27. srpna" */
export function fmtLongDate(d: Date | string) {
  const x = new Date(d)
  return LANG === 'cs'
    ? `${fmtWeekday(x)} ${x.getDate()}. ${fmtMonth(x).toLowerCase()}`
    : `${fmtWeekday(x)}, ${x.getDate()} ${fmtMonth(x)}`
}

export function fmtTime(d: Date | string) {
  const x = new Date(d)
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
}

export function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return JUST_NOW[LANG]
  if (diff < 3_600_000) return AGO[LANG](`${Math.floor(diff / 60_000)} min`)
  if (diff < DAY_MS) return AGO[LANG](`${Math.floor(diff / 3_600_000)} h`)
  return AGO[LANG](`${Math.floor(diff / DAY_MS)} ${LANG === 'cs' ? 'dny' : 'd'}`)
}

/** friendly due label */
export function fmtDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null
  const due = new Date(iso)
  const now = new Date()
  const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0
  const time = hasTime ? ` ${fmtTime(due)}` : ''
  const overdue = due.getTime() < now.getTime()
  const rel = REL[LANG]
  let day: string
  if (isSameDay(due, now)) day = rel.today
  else if (isSameDay(due, addDays(now, 1))) day = rel.tomorrow
  else if (isSameDay(due, addDays(now, -1))) day = rel.yesterday
  else if (due.getFullYear() === now.getFullYear())
    day = `${fmtWeekday(due, 'short')} ${fmtDayMonth(due)}`
  else day = `${fmtDayMonth(due)} ${due.getFullYear()}`
  return { label: `${day}${time}`, overdue }
}

export function toLocalInput(d: Date | string) {
  const x = new Date(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}T${pad(x.getHours())}:${pad(x.getMinutes())}`
}

export function fromLocalInput(v: string): string {
  return new Date(v).toISOString()
}

export function overlaps(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return new Date(aStart) < new Date(bEnd) && new Date(bStart) < new Date(aEnd)
}
