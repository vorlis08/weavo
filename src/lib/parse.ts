import { addDays, startOfDay } from './date'

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

export interface ParsedWhen {
  start: Date
  end?: Date
  allDay: boolean
  /** the substring that produced this, for stripping from the title */
  match: string
}

export interface ParseResult {
  title: string
  projectName?: string
  contactNames: string[]
  when: ParsedWhen | null
}

function nextWeekday(from: Date, target: number, forceNext = false): Date {
  const d = startOfDay(from)
  let delta = (target - d.getDay() + 7) % 7
  if (delta === 0 && forceNext) delta = 7
  if (delta === 0 && !forceNext && from.getHours() >= 18) delta = 7
  return addDays(d, delta)
}

function parseClock(text: string): { h: number; m: number; raw: string } | null {
  // 14:30 / 2:30pm / 2pm / 2 pm
  const m =
    text.match(/\b(\d{1,2}):(\d{2})\s?(am|pm)?\b/i) ||
    text.match(/\b(\d{1,2})\s?(am|pm)\b/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] && /^\d{2}$/.test(m[2]) ? parseInt(m[2], 10) : 0
  const ap = (m[3] || m[2] || '').toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23) return null
  return { h, m: min, raw: m[0] }
}

function parseDay(text: string, now: Date): { date: Date; raw: string } | null {
  const lower = text.toLowerCase()

  let m = lower.match(/\b(today|tonight)\b/)
  if (m) return { date: startOfDay(now), raw: m[0] }

  m = lower.match(/\b(tomorrow|tmrw|tmw)\b/)
  if (m) return { date: addDays(startOfDay(now), 1), raw: m[0] }

  m = lower.match(/\b(?:in)\s+(\d+)\s+(day|days|week|weeks)\b/)
  if (m) {
    const n = parseInt(m[1], 10) * (m[2].startsWith('week') ? 7 : 1)
    return { date: addDays(startOfDay(now), n), raw: m[0] }
  }

  m = lower.match(/\b(next\s+)?(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/)
  if (m) {
    const idx = WEEKDAYS.findIndex((w) => w.startsWith(m![2]))
    if (idx >= 0) return { date: nextWeekday(now, idx, !!m[1]), raw: m[0] }
  }

  // "25 aug" | "aug 25" | "25 august"
  m = lower.match(
    /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/,
  )
  if (m) {
    const mo = MONTHS.findIndex((x) => x.startsWith(m![2]))
    return { date: resolveMonthDay(now, mo, parseInt(m[1], 10)), raw: m[0] }
  }
  m = lower.match(
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/,
  )
  if (m) {
    const mo = MONTHS.findIndex((x) => x.startsWith(m![1]))
    return { date: resolveMonthDay(now, mo, parseInt(m[2], 10)), raw: m[0] }
  }

  // 25/8 or 25.8.
  m = lower.match(/\b(\d{1,2})[./](\d{1,2})[./]?\b/)
  if (m) {
    const day = parseInt(m[1], 10)
    const mo = parseInt(m[2], 10) - 1
    if (mo >= 0 && mo < 12 && day >= 1 && day <= 31)
      return { date: resolveMonthDay(now, mo, day), raw: m[0] }
  }

  return null
}

function resolveMonthDay(now: Date, month: number, day: number): Date {
  let year = now.getFullYear()
  const candidate = new Date(year, month, day)
  if (candidate.getTime() < startOfDay(now).getTime() - 86_400_000) year += 1
  return new Date(year, month, day)
}

export function parseCapture(input: string, now = new Date()): ParseResult {
  let text = input
  let projectName: string | undefined
  const contactNames: string[] = []

  text = text.replace(/(^|\s)#([\p{L}\p{N}_-]+)/u, (_all, sp, name) => {
    if (!projectName) projectName = name
    return sp
  })
  text = text.replace(/(^|\s)@([\p{L}][\p{L}\p{N}_'-]*(?:\s+[\p{L}][\p{L}\p{N}_'-]*)?)/gu, (_all, sp, name) => {
    contactNames.push(name.trim())
    return sp
  })

  // "in 90 min" / "in 2 hours"
  let when: ParsedWhen | null = null
  const rel = text.toLowerCase().match(/\bin\s+(\d+)\s+(min|mins|minutes|h|hr|hrs|hour|hours)\b/)
  if (rel) {
    const n = parseInt(rel[1], 10)
    const ms = /^m/.test(rel[2]) ? n * 60_000 : n * 3_600_000
    const start = new Date(now.getTime() + ms)
    start.setSeconds(0, 0)
    when = { start, end: new Date(start.getTime() + 3_600_000), allDay: false, match: rel[0] }
    text = text.replace(new RegExp(escapeRe(rel[0]), 'i'), ' ')
  }

  if (!when) {
    const day = parseDay(text, now)
    const range = text.match(
      /\b(\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\s?[-–]\s?(\d{1,2}(?::\d{2})?\s?(?:am|pm)?)\b/i,
    )
    const clock = !range ? parseClock(text) : null

    if (day || range || clock) {
      const base = day ? day.date : startOfDay(now)
      let start = new Date(base)
      let end: Date | undefined
      let allDay = true

      if (range) {
        const a = parseClock(range[1]) || parseClock(range[1] + 'pm')
        const b = parseClock(range[2]) || parseClock(range[2] + 'pm')
        if (a) {
          start.setHours(a.h, a.m, 0, 0)
          allDay = false
        }
        if (b) end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), b.h, b.m)
        text = text.replace(new RegExp(escapeRe(range[0]), 'i'), ' ')
      } else if (clock) {
        start.setHours(clock.h, clock.m, 0, 0)
        end = new Date(start.getTime() + 3_600_000)
        allDay = false
        text = text.replace(new RegExp(escapeRe(clock.raw), 'i'), ' ')
      }

      // if only a day was given and it's already passed today, keep it (user intent)
      if (day) text = text.replace(new RegExp(escapeRe(day.raw), 'i'), ' ')

      if (allDay && !day) {
        // a bare time in the past today -> still today
      }

      when = {
        start,
        end,
        allDay,
        match: [day?.raw, range?.[0], clock?.raw].filter(Boolean).join(' '),
      }
    }
  }

  const title = text
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([,.;:])/g, '$1')
    .trim()
    .replace(/\b(at|on|by|for)\s*$/i, '')
    .trim()

  return { title: title || input.trim(), projectName, contactNames, when }
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
