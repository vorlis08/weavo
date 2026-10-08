import type { RepeatFreq, RepeatRule, Space } from './types'
import { addDays, startOfDay } from './date'

const EN_WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const EN_MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
]

/** Czech weekday stems, index 0 = Sunday … 6 = Saturday */
const CS_WEEKDAY_STEMS = ['neděl|nedel', 'pond', 'úter|uter', 'střed|stred', 'čtvrt|ctvrt', 'pát|pat', 'sobot']
/** Czech month names (genitive, as used in dates), index 0 = January */
const CS_MONTH_STEMS = [
  'led', 'únor|unor', 'břez|brez', 'dub', 'květ|kvet', 'červn|cervn',
  'červenc|cervenc', 'srp', 'září|zari', 'říj|rij', 'listopad', 'prosin',
]
const CS_TIME_WORDS: Record<string, number> = {
  ráno: 8, rano: 8, dopoledne: 10, poledne: 12,
  odpoledne: 15, večer: 19, vecer: 19, 'v noci': 23,
}

export interface ParsedWhen {
  start: Date
  end?: Date
  allDay: boolean
  match: string
}

export interface ParseResult {
  title: string
  /** the first #word that is not a space keyword */
  projectName?: string
  /** every #word that is not a space keyword — resolved against tags, then projects */
  hashes: string[]
  /** #práce / #work, #osobní / #personal */
  space?: Space
  /** a standalone "!" marks the task as burning */
  flame: boolean
  contactNames: string[]
  when: ParsedWhen | null
  /** "každý týden", "daily", "každý pátek", "každé 2 týdny"… */
  repeat?: RepeatRule
}

const SPACE_WORDS: Record<string, Space> = {
  práce: 'work', prace: 'work', pracovní: 'work', pracovni: 'work', work: 'work',
  osobní: 'personal', osobni: 'personal', personal: 'personal',
  andulka: 'andulka',
}

function nextWeekday(from: Date, target: number, forceNext = false): Date {
  const d = startOfDay(from)
  let delta = (target - d.getDay() + 7) % 7
  if (delta === 0 && forceNext) delta = 7
  if (delta === 0 && !forceNext && from.getHours() >= 18) delta = 7
  return addDays(d, delta)
}

function resolveMonthDay(now: Date, month: number, day: number): Date {
  let year = now.getFullYear()
  const candidate = new Date(year, month, day)
  if (candidate.getTime() < startOfDay(now).getTime() - 86_400_000) year += 1
  return new Date(year, month, day)
}

function parseClock(text: string): { h: number; m: number; raw: string } | null {
  const lower = text.toLowerCase()

  // named times (cs)
  for (const [word, hour] of Object.entries(CS_TIME_WORDS)) {
    const re = new RegExp(`\\b${word}\\b`, 'i')
    const m = lower.match(re)
    if (m) return { h: hour, m: 0, raw: m[0] }
  }

  // 14:30 / 14.30 / 2:30pm / 2pm / v 9 / ve 14
  const m =
    text.match(/\b(?:ve?\s+)?(\d{1,2})[:.](\d{2})\s?(am|pm)?\b/i) ||
    text.match(/\b(\d{1,2})\s?(am|pm)\b/i) ||
    text.match(/\bve?\s+(\d{1,2})(?:\s?h(?:od)?)?\b/i)
  if (!m) return null
  let h = parseInt(m[1], 10)
  const min = m[2] && /^\d{2}$/.test(m[2]) ? parseInt(m[2], 10) : 0
  const ap = (m[3] || (m[2] && !/^\d{2}$/.test(m[2]) ? m[2] : '') || '').toLowerCase()
  if (ap === 'pm' && h < 12) h += 12
  if (ap === 'am' && h === 12) h = 0
  if (h > 23) return null
  return { h, m: min, raw: m[0] }
}

function parseDay(text: string, now: Date): { date: Date; raw: string } | null {
  const lower = text.toLowerCase()
  let m: RegExpMatchArray | null

  // --- English ---
  m = lower.match(/\b(today|tonight)\b/)
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
    const idx = EN_WEEKDAYS.findIndex((w) => w.startsWith(m![2]))
    if (idx >= 0) return { date: nextWeekday(now, idx, !!m[1]), raw: m[0] }
  }

  // --- Czech ---
  m = lower.match(/\b(dnes|dneska|dneska)\b/)
  if (m) return { date: startOfDay(now), raw: m[0] }
  m = lower.match(/\b(zítra|zitra|zejtra)\b/)
  if (m) return { date: addDays(startOfDay(now), 1), raw: m[0] }
  m = lower.match(/\b(pozítří|pozitri)\b/)
  if (m) return { date: addDays(startOfDay(now), 2), raw: m[0] }
  m = lower.match(/\bza\s+(\d+)\s+(minut\w*|min|hodin\w*|hod|h|den|dny|dní|dnů|týden|týdny|týdnů|tyden|tydny|tydnu)\b/)
  if (m) {
    const n = parseInt(m[1], 10)
    const unit = m[2]
    if (/^(minut|min|hodin|hod|h)/.test(unit)) {
      // handled by relative-time path; treat as today for the day part
      return null
    }
    const mult = /týd|tyd/.test(unit) ? 7 : 1
    return { date: addDays(startOfDay(now), n * mult), raw: m[0] }
  }
  m = lower.match(/\b(příští|pristi)\s+(\S+)/)
  const csNext = !!m
  const csWeekdayText = m ? m[2] : lower
  for (let i = 0; i < 7; i++) {
    const re = new RegExp(`\\b(?:ve?\\s+)?(?:${CS_WEEKDAY_STEMS[i]})\\w*`, 'i')
    const wm = csWeekdayText.match(re)
    if (wm) {
      const raw = csNext ? (m as RegExpMatchArray)[0] : wm[0]
      return { date: nextWeekday(now, i, csNext), raw }
    }
  }

  // --- numeric / month-name dates (shared) ---
  m = lower.match(
    /\b(\d{1,2})\.?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/,
  )
  if (m) {
    const mo = EN_MONTHS.findIndex((x) => x.startsWith(m![2]))
    return { date: resolveMonthDay(now, mo, parseInt(m[1], 10)), raw: m[0] }
  }
  m = lower.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})\b/)
  if (m) {
    const mo = EN_MONTHS.findIndex((x) => x.startsWith(m![1]))
    return { date: resolveMonthDay(now, mo, parseInt(m[2], 10)), raw: m[0] }
  }
  // Czech: "25. srpna"
  for (let i = 0; i < 12; i++) {
    const re = new RegExp(`\\b(\\d{1,2})\\.?\\s+(?:${CS_MONTH_STEMS[i]})\\w*`, 'i')
    const mm = lower.match(re)
    if (mm) return { date: resolveMonthDay(now, i, parseInt(mm[1], 10)), raw: mm[0] }
  }
  // 25/8 or 25.8. or 25. 8.
  m = lower.match(/\b(\d{1,2})\s?[./]\s?(\d{1,2})\.?(?:\s?(\d{4}))?\b/)
  if (m) {
    const day = parseInt(m[1], 10)
    const mo = parseInt(m[2], 10) - 1
    if (mo >= 0 && mo < 12 && day >= 1 && day <= 31) {
      if (m[3]) return { date: new Date(parseInt(m[3], 10), mo, day), raw: m[0] }
      return { date: resolveMonthDay(now, mo, day), raw: m[0] }
    }
  }

  return null
}

const REPEAT_UNITS: [RegExp, RepeatFreq][] = [
  [/^(den|dny|dní|dnů|dni|dnu|days?)$/, 'daily'],
  [/^(týden|týdny|týdnů|tyden|tydny|tydnu|weeks?)$/, 'weekly'],
  [/^(měsíc|měsíce|měsíců|mesic|mesice|mesicu|months?)$/, 'monthly'],
  [/^(rok|roky|let|years?)$/, 'yearly'],
]

const REPEAT_WORDS: Record<string, RepeatFreq> = {
  denně: 'daily', denne: 'daily', týdně: 'weekly', tydne: 'weekly',
  měsíčně: 'monthly', mesicne: 'monthly', ročně: 'yearly', rocne: 'yearly',
  daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly',
}

/**
 * A repeat phrase in the text. Returns the rule, the matched text, and what to
 * leave behind in its place: a weekday stays ("každý pátek" → "pátek") so it
 * still sets the first date.
 */
function parseRepeat(text: string): { rule: RepeatRule; raw: string; keep: string } | null {
  const l = text.toLowerCase()
  let m: RegExpMatchArray | null

  m = l.match(
    /(?:ve\s+všední\s+dny|ve\s+vsedni\s+dny|každý\s+(?:pracovní|všední|pracovni|vsedni)\s+den|kazdy\s+(?:pracovni|vsedni)\s+den|every\s+weekday|on\s+weekdays)/,
  )
  if (m) return { rule: { freq: 'weekdays', interval: 1 }, raw: m[0], keep: '' }

  m = l.match(
    /(?:každ[éýou]|kazd[eyou]|every)\s+(pondělí|pondeli|úterý|utery|středu|stredu|středa|streda|čtvrtek|ctvrtek|pátek|patek|sobotu|sobota|neděli|nedele|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(?![\p{L}])/u,
  )
  if (m) {
    const word = m[1]
    const stems = [...CS_WEEKDAY_STEMS.map((s) => new RegExp(`^(?:${s})`)), ...EN_WEEKDAYS.map((w) => new RegExp(`^${w}`))]
    const idx = stems.findIndex((re) => re.test(word))
    if (idx >= 0) return { rule: { freq: 'weekly', interval: 1, days: [idx % 7] }, raw: m[0], keep: word }
  }

  m = l.match(/(?:každých|každé|každý|každou|kazdych|kazde|kazdy|every)\s+(\d+)\s+([\p{L}]+)/u)
  if (m) {
    const unit = REPEAT_UNITS.find(([re]) => re.test(m![2]))
    const n = parseInt(m[1], 10)
    if (unit && n >= 1) return { rule: { freq: unit[1], interval: n }, raw: m[0], keep: '' }
  }

  m = l.match(/(?:každý|každé|každou|kazdy|kazde|every)\s+(den|týden|tyden|měsíc|mesic|rok|day|week|month|year)(?![\p{L}])/u)
  if (m) {
    const unit = REPEAT_UNITS.find(([re]) => re.test(m![1]))
    if (unit) return { rule: { freq: unit[1], interval: 1 }, raw: m[0], keep: '' }
  }

  m = l.match(/(?:^|\s)(denně|denne|týdně|tydne|měsíčně|mesicne|ročně|rocne|daily|weekly|monthly|yearly)(?=\s|$)/u)
  if (m) return { rule: { freq: REPEAT_WORDS[m[1]], interval: 1 }, raw: m[1], keep: '' }
  return null
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parseCapture(input: string, now = new Date()): ParseResult {
  let text = input
  let space: Space | undefined
  const hashes: string[] = []
  const contactNames: string[] = []

  text = text.replace(/(^|\s)#([\p{L}\p{N}_-]+)/gu, (_all, sp, name: string) => {
    const kw = SPACE_WORDS[name.toLowerCase()]
    if (kw) space ??= kw
    else hashes.push(name)
    return sp
  })
  let flame = false
  text = text.replace(/(^|\s)!(?=\s|$)/g, (_all, sp) => {
    flame = true
    return sp
  })
  text = text.replace(
    /(^|\s)@([\p{L}][\p{L}\p{N}_'-]*(?:\s+[\p{L}][\p{L}\p{N}_'-]*)?)/gu,
    (_all, sp, name) => {
      contactNames.push(name.trim())
      return sp
    },
  )

  let repeat: RepeatRule | undefined
  const rep = parseRepeat(text)
  if (rep) {
    repeat = rep.rule
    text = text.replace(new RegExp(escapeRe(rep.raw), 'i'), ` ${rep.keep} `)
  }

  let when: ParsedWhen | null = null

  // relative minutes/hours (en + cs)
  const rel =
    text.toLowerCase().match(/\bin\s+(\d+)\s+(min|mins|minutes|h|hr|hrs|hour|hours)\b/) ||
    text.toLowerCase().match(/\bza\s+(\d+)\s+(minut\w*|min|hodin\w*|hod|h)\b/)
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
      /\b(?:od\s+)?(\d{1,2}(?:[:.]\d{2})?\s?(?:am|pm)?)\s?(?:[-–]|do)\s?(\d{1,2}(?:[:.]\d{2})?\s?(?:am|pm)?)\b/i,
    )
    const clock = !range ? parseClock(text) : null

    if (day || range || clock) {
      const base = day ? day.date : startOfDay(now)
      const start = new Date(base)
      let end: Date | undefined
      let allDay = true

      if (range) {
        const a = parseClock(range[1]) || parseClock('v ' + range[1])
        const b = parseClock(range[2]) || parseClock('v ' + range[2])
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

      if (day) text = text.replace(new RegExp(escapeRe(day.raw), 'i'), ' ')

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
    .replace(/\b(at|on|by|for|v|ve|na|do|od|k|ke)\s*$/i, '')
    .trim()

  return { title: title || input.trim(), projectName: hashes[0], hashes, space, flame, contactNames, when, repeat }
}
