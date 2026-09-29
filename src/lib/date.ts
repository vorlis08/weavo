import type { Lang } from './types'

export const DAY_MS = 86_400_000

let LANG: Lang = 'cs'
export function setDateLang(lang: Lang) {
  LANG = lang
}
const locale = () => (LANG === 'cs' ? 'cs-CZ' : 'en-US')
export const dateLocale = () => locale()

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

/** "27. srpna" / "27 Aug" — with a day, Czech months take the genitive */
export function fmtDayMonth(d: Date | string) {
  const x = new Date(d)
  return LANG === 'cs'
    ? x.toLocaleDateString('cs-CZ', { day: 'numeric', month: 'long' })
    : `${x.getDate()} ${fmtMonth(x, 'short')}`
}

/** "Středa 27. srpna" / "Wednesday, 27 August" */
export function fmtLongDate(d: Date | string) {
  const x = new Date(d)
  return LANG === 'cs'
    ? cap(x.toLocaleDateString('cs-CZ', { weekday: 'long', day: 'numeric', month: 'long' }))
    : `${fmtWeekday(x)}, ${x.getDate()} ${fmtMonth(x)}`
}

/** compact date for lists: "pá 25. 9." / "Fri 25 Sep" */
export function fmtShort(d: Date | string) {
  const x = new Date(d)
  if (LANG === 'cs') {
    const wd = x.toLocaleDateString('cs-CZ', { weekday: 'short' }).replace(/\.$/, '').toLowerCase()
    return `${wd} ${x.getDate()}. ${x.getMonth() + 1}.`
  }
  return `${x.toLocaleDateString('en-US', { weekday: 'short' })} ${x.getDate()} ${fmtMonth(x, 'short')}`
}

/** whole days from today to the date (negative = past) */
export function daysUntil(d: Date | string, now = new Date()) {
  return Math.round((startOfDay(d).getTime() - startOfDay(now).getTime()) / DAY_MS)
}

const REL_LOWER: Record<Lang, [string, string, string]> = {
  cs: ['dnes', 'zítra', 'včera'],
  en: ['today', 'tomorrow', 'yesterday'],
}

/** "dnes" / "zítra" / "včera", otherwise the compact date */
export function fmtRelDay(d: Date | string, now = new Date()) {
  const n = daysUntil(d, now)
  const [today, tomorrow, yesterday] = REL_LOWER[LANG]
  return n === 0 ? today : n === 1 ? tomorrow : n === -1 ? yesterday : fmtShort(d)
}

function czPlural(n: number, forms: [string, string, string]) {
  return n === 1 ? forms[0] : n >= 2 && n <= 4 ? forms[1] : forms[2]
}

/** "za 12 dní" / "in 12 days", "před 3 dny" / "3 days ago" */
export function fmtCountdown(d: Date | string, now = new Date()) {
  const n = daysUntil(d, now)
  const [today, tomorrow, yesterday] = REL_LOWER[LANG]
  if (n === 0) return today
  if (n === 1) return tomorrow
  if (n === -1) return yesterday
  if (LANG === 'cs')
    return n > 0 ? `za ${n} ${czPlural(n, ['den', 'dny', 'dní'])}` : `před ${-n} dny`
  return n > 0 ? `in ${n} days` : `${-n} days ago`
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
  const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0
  return {
    label: `${fmtRelDay(due)}${hasTime ? ` ${fmtTime(due)}` : ''}`,
    overdue: due.getTime() < Date.now(),
  }
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
