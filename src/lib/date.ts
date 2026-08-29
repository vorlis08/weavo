export const DAY_MS = 86_400_000

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

/** Monday (or Sunday) that starts the week containing `d` */
export function startOfWeek(d: Date | string, mondayFirst = true): Date {
  const x = startOfDay(d)
  const day = x.getDay() // 0 Sun … 6 Sat
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

const WD_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const MO_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function fmtWeekday(d: Date | string, style: 'long' | 'short' = 'long') {
  const n = new Date(d).getDay()
  return style === 'long' ? WD_LONG[n] : WD_LONG[n].slice(0, 3)
}

export function fmtMonth(d: Date | string, style: 'long' | 'short' = 'long') {
  const n = new Date(d).getMonth()
  return style === 'long' ? MO_LONG[n] : MO_LONG[n].slice(0, 3)
}

export function fmtDayMonth(d: Date | string) {
  const x = new Date(d)
  return `${x.getDate()} ${fmtMonth(x, 'short')}`
}

/** "Wednesday, 27 August" */
export function fmtLongDate(d: Date | string) {
  const x = new Date(d)
  return `${fmtWeekday(x)}, ${x.getDate()} ${fmtMonth(x)}`
}

export function fmtTime(d: Date | string) {
  const x = new Date(d)
  return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`
}

/** relative label for the past: "2h", "3d", "just now" */
export function fmtAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`
  if (diff < DAY_MS) return `${Math.floor(diff / 3_600_000)}h`
  return `${Math.floor(diff / DAY_MS)}d`
}

/** friendly due label: "Today 14:00", "Tomorrow", "Fri 29 Aug", "Overdue · Mon" */
export function fmtDue(iso?: string): { label: string; overdue: boolean } | null {
  if (!iso) return null
  const due = new Date(iso)
  const now = new Date()
  const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0
  const time = hasTime ? ` ${fmtTime(due)}` : ''
  const overdue = due.getTime() < now.getTime()
  let day: string
  if (isSameDay(due, now)) day = 'Today'
  else if (isSameDay(due, addDays(now, 1))) day = 'Tomorrow'
  else if (isSameDay(due, addDays(now, -1))) day = 'Yesterday'
  else if (due.getFullYear() === now.getFullYear())
    day = `${fmtWeekday(due, 'short')} ${fmtDayMonth(due)}`
  else day = `${fmtDayMonth(due)} ${due.getFullYear()}`
  return { label: `${day}${time}`, overdue }
}

/** turn a Date into the value a <input type="datetime-local"> expects */
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
