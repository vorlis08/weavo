import { DAY_MS, addDays, startOfDay } from './date'
import type { Item, RepeatFreq, RepeatRule, Space, WeavoData } from './types'

/** a day as a whole number, immune to DST shifts */
const dayIndex = (d: Date) => Math.round(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS)
const mondayIndex = (d: Date) => dayIndex(d) - ((d.getDay() + 6) % 7)
const daysInMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()

export const REPEAT_FREQS: RepeatFreq[] = ['daily', 'weekdays', 'weekly', 'monthly', 'yearly']

export function makeRule(freq: RepeatFreq, extra: Partial<RepeatRule> = {}): RepeatRule {
  return { freq, interval: 1, ...extra }
}

export function sameRule(a?: RepeatRule, b?: RepeatRule) {
  if (!a || !b) return !a && !b
  return (
    a.freq === b.freq &&
    (a.interval || 1) === (b.interval || 1) &&
    (a.until ?? '') === (b.until ?? '') &&
    (a.days ?? []).join() === (b.days ?? []).join()
  )
}

/** older data stored 'daily' | 'weekly' | 'monthly' | 'none' as a plain string */
export function legacyRule(raw: unknown): RepeatRule | undefined {
  if (!raw || raw === 'none') return undefined
  if (typeof raw === 'string') {
    return raw === 'daily' || raw === 'weekly' || raw === 'monthly' ? makeRule(raw) : undefined
  }
  const r = raw as RepeatRule
  return r.freq ? { ...r, interval: Math.max(1, r.interval || 1) } : undefined
}

/** does the series that starts on `anchor` have an occurrence on `day`? */
export function ruleMatches(rule: RepeatRule, anchor: Date, day: Date): boolean {
  const a = dayIndex(anchor)
  const n = dayIndex(day)
  if (n < a) return false
  if (n === a) return true
  if (rule.until && n > dayIndex(new Date(rule.until))) return false
  const step = Math.max(1, rule.interval || 1)
  switch (rule.freq) {
    case 'daily':
      return (n - a) % step === 0
    case 'weekdays':
      return day.getDay() >= 1 && day.getDay() <= 5
    case 'weekly': {
      const days = rule.days?.length ? rule.days : [anchor.getDay()]
      if (!days.includes(day.getDay())) return false
      return ((mondayIndex(day) - mondayIndex(anchor)) / 7) % step === 0
    }
    case 'monthly': {
      const months = (day.getFullYear() - anchor.getFullYear()) * 12 + day.getMonth() - anchor.getMonth()
      return months % step === 0 && day.getDate() === Math.min(anchor.getDate(), daysInMonth(day))
    }
    case 'yearly': {
      const years = day.getFullYear() - anchor.getFullYear()
      return (
        years % step === 0 &&
        day.getMonth() === anchor.getMonth() &&
        day.getDate() === Math.min(anchor.getDate(), daysInMonth(day))
      )
    }
  }
}

const withTimeOf = (day: Date, like: Date) =>
  new Date(day.getFullYear(), day.getMonth(), day.getDate(), like.getHours(), like.getMinutes(), like.getSeconds())

/**
 * The next occurrence after `due` (and after today, so a task finished late
 * skips the days it missed), keeping the time of day. Undefined when the rule
 * has ended.
 */
export function nextOccurrence(due: string, rule: RepeatRule, ref = new Date()): string | undefined {
  const anchor = startOfDay(due)
  const later = dayIndex(anchor) > dayIndex(ref) ? anchor : startOfDay(ref)
  for (let i = 1; i <= 1500; i++) {
    const d = addDays(later, i)
    if (rule.until && dayIndex(d) > dayIndex(new Date(rule.until))) return undefined
    if (ruleMatches(rule, anchor, d)) return withTimeOf(d, new Date(due)).toISOString()
  }
  return undefined
}

/**
 * The occurrences of one event that start on a day within [from, to], as
 * copies of the event with shifted start/end. A plain event yields itself.
 */
export function expandEvent(item: Item, from: Date, to: Date): Item[] {
  if (!item.start) return []
  const start = new Date(item.start)
  const first = startOfDay(from)
  if (!item.repeat) {
    return startOfDay(start) >= first && start <= to ? [item] : []
  }
  const anchor = startOfDay(start)
  const lo = anchor > first ? anchor : first
  const duration = item.end ? new Date(item.end).getTime() - start.getTime() : 0
  const out: Item[] = []
  let guard = 0
  for (let d = lo; d <= to && guard < 900; d = addDays(d, 1), guard++) {
    if (!ruleMatches(item.repeat, anchor, d)) continue
    const s = withTimeOf(d, start)
    out.push({
      ...item,
      start: s.toISOString(),
      end: item.end ? new Date(s.getTime() + duration).toISOString() : undefined,
    })
  }
  return out
}

/** every event (repeats expanded) that starts on a day within [from, to], earliest first */
export function eventsBetween(data: WeavoData, from: Date, to: Date, space?: Space): Item[] {
  const out: Item[] = []
  for (const it of Object.values(data.items)) {
    if (it.kind !== 'event' || !it.start || (space && it.space !== space)) continue
    out.push(...expandEvent(it, from, to))
  }
  return out.sort((a, b) => (a.start! < b.start! ? -1 : a.start! > b.start! ? 1 : 0))
}

/** the events of a single day */
export function eventsOn(data: WeavoData, day: Date, space?: Space): Item[] {
  const end = new Date(day)
  end.setHours(23, 59, 59, 999)
  return eventsBetween(data, day, end, space)
}
