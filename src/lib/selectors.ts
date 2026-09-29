import { addDays, isSameDay, overlaps, startOfDay } from './date'
import { eventsOn, expandEvent } from './recur'
import type { Item, Project, ProjectPhase, Reminder, Space, WeavoData } from './types'

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

/** the instant a reminder fires for one occurrence of an item (snooze ignored) */
function triggerMs(r: Reminder, item: Item): number | null {
  const t = r.trigger
  if (t.type === 'at') return new Date(t.at).getTime()
  if (t.type === 'before_due' && item.due) return new Date(item.due).getTime() - t.minutes * 60_000
  if (t.type === 'before_start' && item.start) return new Date(item.start).getTime() - t.minutes * 60_000
  if (t.type === 'on_day') {
    const ref = item.kind === 'event' ? item.start : (item.due ?? item.start)
    if (!ref) return null
    const [h, m] = t.time.split(':').map(Number)
    const d = new Date(ref)
    d.setHours(h || 0, m || 0, 0, 0)
    return d.getTime()
  }
  return null
}

export function reminderDueAt(r: Reminder, item: Item): number | null {
  if (r.done) return null
  if (r.snoozedUntil) return new Date(r.snoozedUntil).getTime()
  return triggerMs(r, item)
}

/**
 * Every instant this reminder is due within [fromMs, toMs]: one for a plain
 * item, one per occurrence for a repeating event.
 */
export function reminderTimes(r: Reminder, item: Item, fromMs: number, toMs: number): number[] {
  if (r.done) return []
  if (r.snoozedUntil) return [new Date(r.snoozedUntil).getTime()]
  if (item.kind === 'event' && item.repeat && item.start) {
    // look a day either side: a trigger can sit before or after the occurrence day
    const occ = expandEvent(item, new Date(fromMs - 2 * 86_400_000), new Date(toMs + 2 * 86_400_000))
    return occ.map((o) => triggerMs(r, o)).filter((x): x is number => x != null && x >= fromMs && x <= toMs)
  }
  const t = triggerMs(r, item)
  return t == null ? [] : [t]
}

/** how many days ahead a task surfaces in "today" — the longest lead of its tags */
export function leadDays(data: WeavoData, it: Item): number {
  return Math.max(0, ...it.tags.map((id) => data.tags[id]?.leadDays ?? 0))
}

const isOpen = (it: Item) => it.kind === 'task' && it.status !== 'done'

export function isOverdue(it: Item, ref = new Date()): boolean {
  return isOpen(it) && !!it.due && new Date(it.due) < startOfDay(ref)
}

/**
 * Tasks that belong on today's list: due today, overdue, or inside their tag's
 * lead window (shopping shows up two days early). Tasks finished today stay on
 * the list so progress reads "4/9", not "0/5". Subtasks roll up into their
 * parent; parked (someday / waiting) tasks are elsewhere.
 */
export function isOnToday(data: WeavoData, it: Item, ref = new Date()): boolean {
  if (it.kind !== 'task' || !it.due || it.someday || it.waitingFor || it.parentId) return false
  const within = startOfDay(new Date(it.due)) <= addDays(startOfDay(ref), leadDays(data, it))
  if (it.status === 'done') return within && !!it.completedAt && isSameDay(it.completedAt, ref)
  return within
}

/** burning: flagged by hand, or already past due */
export function isHot(it: Item, ref = new Date()): boolean {
  return isOpen(it) && !it.someday && !it.waitingFor && (!!it.flame || isOverdue(it, ref))
}

export function todayTasks(data: WeavoData, space?: Space, ref = new Date()): Item[] {
  return itemsArray(data).filter(
    (it) => (!space || it.space === space) && isOnToday(data, it, ref),
  )
}

export function waitingTasks(data: WeavoData, space?: Space): Item[] {
  return itemsArray(data)
    .filter((it) => isOpen(it) && it.waitingFor && (!space || it.space === space))
    .sort((a, b) => (a.waitingFor!.since < b.waitingFor!.since ? -1 : 1))
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
    todayEvents: eventsOn(data, ref),
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
          !it.someday &&
          Date.now() - new Date(it.updatedAt).getTime() > 7 * 86_400_000,
      )
      .sort((a, b) => (a.updatedAt < b.updatedAt ? -1 : 1)),
  }
}

export interface ProjectStats {
  /** all tasks in the project (incl. subtasks) */
  total: number
  done: number
  openTasks: number
  overdue: number
  nextDue?: string
  events: number
  notes: number
  /** 0–100 */
  pct: number
}

export function projectStats(
  data: WeavoData,
  projectId: string,
  ref = new Date(),
): ProjectStats {
  const mine = itemsArray(data).filter((it) => it.projectId === projectId)
  const tasks = mine.filter((it) => it.kind === 'task')
  const done = tasks.filter((it) => it.status === 'done').length
  const open = tasks.filter((it) => it.status !== 'done')
  const overdue = open.filter((it) => it.due && new Date(it.due) < ref).length
  const nextDue = open
    .filter((it) => it.due)
    .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime())[0]?.due
  return {
    total: tasks.length,
    done,
    openTasks: open.length,
    overdue,
    nextDue,
    events: mine.filter((it) => it.kind === 'event').length,
    notes: mine.filter((it) => it.kind === 'note').length,
    pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  }
}

export interface GoalStats {
  projectCount: number
  total: number
  done: number
  /** 0–100 */
  pct: number
}

/** aggregate progress across every project rolled up under a goal */
export function goalStats(data: WeavoData, goalId: string): GoalStats {
  const linked = Object.values(data.projects).filter((p) => p.goalId === goalId)
  const tasks = itemsArray(data).filter(
    (it) => it.kind === 'task' && it.projectId && linked.some((p) => p.id === it.projectId),
  )
  const done = tasks.filter((it) => it.status === 'done').length
  return {
    projectCount: linked.length,
    total: tasks.length,
    done,
    pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
  }
}

/** what happened on a given day, for the daily reflection auto-summary */
export function dayActivity(data: WeavoData, ref = new Date()) {
  const items = itemsArray(data)
  return {
    completed: items.filter((it) => it.completedAt && isSameDay(it.completedAt, ref)),
    events: eventsOn(data, ref),
  }
}

/** direct subtasks of a task, oldest first */
export function subtasks(data: WeavoData, parentId: string): Item[] {
  return itemsArray(data)
    .filter((it) => it.parentId === parentId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
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

const PRIO: Record<string, number> = { high: 0, medium: 1, low: 2 }

/** open, planned tasks of a project (no subtasks, nothing parked) */
export function projectOpenTasks(data: WeavoData, projectId: string): Item[] {
  return itemsArray(data).filter(
    (it) =>
      it.projectId === projectId &&
      it.kind === 'task' &&
      it.status !== 'done' &&
      !it.parentId &&
      !it.someday,
  )
}

/** the next thing to do in a project: burning first, then overdue, then by due date and priority */
export function projectNextStep(data: WeavoData, projectId: string, ref = new Date()): Item | undefined {
  return projectOpenTasks(data, projectId)
    .filter((it) => !it.waitingFor)
    .sort(
      (a, b) =>
        Number(!!b.flame) - Number(!!a.flame) ||
        Number(isOverdue(b, ref)) - Number(isOverdue(a, ref)) ||
        (a.due ?? '9999').localeCompare(b.due ?? '9999') ||
        (PRIO[a.priority ?? ''] ?? 3) - (PRIO[b.priority ?? ''] ?? 3),
    )[0]
}

/** burning and waiting counts — the signals column of the projects list */
export function projectSignals(data: WeavoData, projectId: string, ref = new Date()) {
  const open = projectOpenTasks(data, projectId)
  return {
    hot: open.filter((it) => isHot(it, ref)).length,
    waiting: open.filter((it) => it.waitingFor).length,
  }
}

export function phaseStats(data: WeavoData, projectId: string, phaseId: string | null) {
  const tasks = itemsArray(data).filter(
    (it) =>
      it.projectId === projectId &&
      it.kind === 'task' &&
      !it.parentId &&
      !it.someday &&
      (phaseId ? it.phaseId === phaseId : !it.phaseId),
  )
  return { done: tasks.filter((it) => it.status === 'done').length, total: tasks.length }
}

/**
 * The phase a project is in: the one whose dates cover today, otherwise the
 * first phase that still has open work.
 */
export function currentPhase(data: WeavoData, project: Project, ref = new Date()): ProjectPhase | undefined {
  const phases = project.phases ?? []
  const today = startOfDay(ref).getTime()
  const dated = phases.find(
    (ph) => ph.start && ph.end && startOfDay(ph.start).getTime() <= today && today <= startOfDay(ph.end).getTime(),
  )
  if (dated) return dated
  return phases.find((ph) => {
    const s = phaseStats(data, project.id, ph.id)
    return s.total > s.done
  })
}
