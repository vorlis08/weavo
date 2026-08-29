import { addDays, isSameDay, overlaps, startOfDay } from './date'
import type { Item, Reminder, WeavoData } from './types'

export const list = <T,>(rec: Record<string, T>): T[] => Object.values(rec)

export function itemsArray(data: WeavoData): Item[] {
  return Object.values(data.items)
}

export function sortByDue(a: Item, b: Item) {
  if (!a.due && !b.due) return a.createdAt < b.createdAt ? -1 : 1
  if (!a.due) return 1
  if (!b.due) return -1
  return new Date(a.due).getTime() - new Date(b.due).getTime()
}

export function eventStartMs(it: Item) {
  return it.start ? new Date(it.start).getTime() : Infinity
}

/** map of eventId -> ids of other events it time-overlaps */
export function eventConflicts(events: Item[]): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (let i = 0; i < events.length; i++) {
    for (let j = i + 1; j < events.length; j++) {
      const a = events[i]
      const b = events[j]
      if (a.allDay || b.allDay || !a.start || !a.end || !b.start || !b.end) continue
      if (overlaps(a.start, a.end, b.start, b.end)) {
        ;(out[a.id] ??= []).push(b.id)
        ;(out[b.id] ??= []).push(a.id)
      }
    }
  }
  return out
}

export interface FreeSlot {
  start: Date
  end: Date
}

/**
 * Find the first free slot of `durationMin` minutes within working hours,
 * starting from `from`, before `before` (if given), avoiding `busy` events.
 */
export function suggestSlot(
  busy: Item[],
  opts: {
    durationMin: number
    from?: Date
    before?: Date
    dayStartHour: number
    dayEndHour: number
  },
): FreeSlot | null {
  const from = opts.from ?? new Date()
  const horizon = opts.before ?? addDays(from, 14)
  const blocks = busy
    .filter((e) => e.start && e.end && !e.allDay)
    .map((e) => [new Date(e.start!).getTime(), new Date(e.end!).getTime()] as const)
    .sort((a, b) => a[0] - b[0])

  const dur = opts.durationMin * 60_000
  let cursor = new Date(from)
  cursor.setSeconds(0, 0)
  cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15)

  for (let guard = 0; guard < 24 * 14 * 4 && cursor < horizon; guard++) {
    const h = cursor.getHours() + cursor.getMinutes() / 60
    if (h < opts.dayStartHour) {
      cursor.setHours(opts.dayStartHour, 0, 0, 0)
      continue
    }
    if (h + opts.durationMin / 60 > opts.dayEndHour) {
      cursor = startOfDay(addDays(cursor, 1))
      cursor.setHours(opts.dayStartHour, 0, 0, 0)
      continue
    }
    const slotStart = cursor.getTime()
    const slotEnd = slotStart + dur
    const clash = blocks.find(([s, e]) => s < slotEnd && slotStart < e)
    if (!clash) return { start: new Date(slotStart), end: new Date(slotEnd) }
    cursor = new Date(Math.max(slotEnd, clash[1]))
    cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15, 0, 0)
  }
  return null
}

export function reminderDueAt(r: Reminder, item: Item): number | null {
  if (r.done) return null
  if (r.snoozedUntil) return new Date(r.snoozedUntil).getTime()
  if (r.trigger.type === 'at') return new Date(r.trigger.at).getTime()
  if (r.trigger.type === 'before_due' && item.due)
    return new Date(item.due).getTime() - r.trigger.minutes * 60_000
  if (r.trigger.type === 'before_start' && item.start)
    return new Date(item.start).getTime() - r.trigger.minutes * 60_000
  return null
}

export interface Digest {
  todayEvents: Item[]
  dueToday: Item[]
  overdue: Item[]
  upcoming: Item[]
  unsorted: Item[]
  completedToday: Item[]
  stale: Item[]
}

export function buildDigest(data: WeavoData, ref = new Date()): Digest {
  const items = itemsArray(data)
  const today = startOfDay(ref)
  const weekEnd = addDays(today, 7)

  const isOpenTask = (it: Item) => it.kind === 'task' && it.status !== 'done'

  return {
    todayEvents: items
      .filter((it) => it.kind === 'event' && it.start && isSameDay(it.start, ref))
      .sort((a, b) => eventStartMs(a) - eventStartMs(b)),
    dueToday: items
      .filter((it) => isOpenTask(it) && it.due && isSameDay(it.due, ref))
      .sort(sortByDue),
    overdue: items
      .filter(
        (it) => isOpenTask(it) && it.due && new Date(it.due) < today && !isSameDay(it.due, ref),
      )
      .sort(sortByDue),
    upcoming: items
      .filter(
        (it) =>
          isOpenTask(it) &&
          it.due &&
          new Date(it.due) > ref &&
          new Date(it.due) <= weekEnd &&
          !isSameDay(it.due, ref),
      )
      .sort(sortByDue),
    unsorted: items
      .filter((it) => it.unsorted)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    completedToday: items.filter(
      (it) => it.completedAt && isSameDay(it.completedAt, ref),
    ),
    stale: items
      .filter(
        (it) =>
          isOpenTask(it) &&
          !it.due &&
          !it.unsorted &&
          Date.now() - new Date(it.updatedAt).getTime() > 7 * 86_400_000,
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1)),
  }
}

/** notes that mention [[title]] of the given item, plus notes it links to */
export function noteLinks(data: WeavoData, item: Item) {
  const items = itemsArray(data)
  const title = item.title.toLowerCase()
  const mentionsRe = /\[\[([^\]]+)\]\]/g

  const linkedFrom = items.filter((n) => {
    if (n.id === item.id || !n.body) return false
    let m: RegExpExecArray | null
    mentionsRe.lastIndex = 0
    while ((m = mentionsRe.exec(n.body))) {
      if (m[1].trim().toLowerCase() === title) return true
    }
    return false
  })

  const linksTo: Item[] = []
  if (item.body) {
    const seen = new Set<string>()
    let m: RegExpExecArray | null
    mentionsRe.lastIndex = 0
    while ((m = mentionsRe.exec(item.body))) {
      const target = items.find(
        (t) => t.id !== item.id && t.title.toLowerCase() === m![1].trim().toLowerCase(),
      )
      if (target && !seen.has(target.id)) {
        seen.add(target.id)
        linksTo.push(target)
      }
    }
  }
  return { linkedFrom, linksTo }
}
