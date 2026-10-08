import { dict } from './i18n'
import { useStore } from './store'
import { desktop, minutesUntilTomorrowMorning } from './desktop'
import type { AlertAction, ReminderAlert } from './desktop'
import type { Reminder } from './types'

export function buildAlert(
  reminder: Pick<Reminder, 'id' | 'itemId'>,
  title: string,
  body: string,
  showDone: boolean,
): ReminderAlert {
  const t = dict(useStore.getState().data.settings.lang).bigReminder
  return {
    reminderId: reminder.id,
    itemId: reminder.itemId,
    title,
    body,
    labels: { heading: t.heading, done: t.done, open: t.open, snooze: t.snooze, showDone },
    snoozes: [
      { label: t.min5, minutes: 5 },
      { label: t.min15, minutes: 15 },
      { label: t.hour1, minutes: 60 },
      { label: t.tomorrow, tomorrow: true },
    ],
  }
}

/** show the big reminder: the desktop shell opens its own always-on-top window, a browser tab shows the in-app overlay */
export function showAlert(a: ReminderAlert) {
  const d = desktop()
  if (d) d.showAlert(a)
  else useStore.getState().pushAlert(a)
}

/** what Done / Snooze / Open do, whichever surface they were pressed on */
export function handleAlertAction(a: AlertAction) {
  const s = useStore.getState()
  s.dismissAlert(a.reminderId)
  if (a.action === 'done') {
    const item = s.data.items[a.itemId]
    if (item && item.kind === 'task' && item.status !== 'done') s.toggleDone(a.itemId)
  } else if (a.action === 'snooze') {
    if (s.data.reminders[a.reminderId])
      s.snoozeReminder(a.reminderId, a.tomorrow ? minutesUntilTomorrowMorning() : (a.minutes ?? 5))
  } else {
    desktop()?.focusApp()
    if (s.data.items[a.itemId]) s.openPeek(a.itemId)
  }
}
