import type { Item, ReminderDefaults, ReminderTrigger } from './types'

export const DEFAULT_REMINDERS: ReminderDefaults = { event: 5, taskTimed: 0, taskDay: '09:00' }

/** does this ISO datetime carry a time of day (not just midnight)? */
export function hasTimeOfDay(iso?: string) {
  if (!iso) return false
  const d = new Date(iso)
  return d.getHours() !== 0 || d.getMinutes() !== 0
}

/**
 * The reminders a new item gets out of the box: events shortly before they
 * start, tasks and notes with a time when that time comes, and ones with just
 * a date on the morning of that day.
 */
export function defaultTriggers(
  item: Pick<Item, 'kind' | 'due' | 'start' | 'allDay'>,
  defaults: ReminderDefaults,
): ReminderTrigger[] {
  if (item.kind === 'event') {
    if (!item.start) return []
    if (item.allDay) return defaults.taskDay ? [{ type: 'on_day', time: defaults.taskDay }] : []
    return defaults.event == null ? [] : [{ type: 'before_start', minutes: defaults.event }]
  }
  if (!item.due) return []
  if (hasTimeOfDay(item.due)) return defaults.taskTimed == null ? [] : [{ type: 'before_due', minutes: defaults.taskTimed }]
  return defaults.taskDay ? [{ type: 'on_day', time: defaults.taskDay }] : []
}

/** "5 min before", "at the time", "09:00 on the day" — as short data for the UI */
export function triggerKey(t: ReminderTrigger): string {
  return t.type === 'on_day' ? `day:${t.time}` : t.type === 'at' ? `at:${t.at}` : `min:${t.minutes}`
}
