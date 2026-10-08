import { useEffect } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { dict } from '@/lib/i18n'
import { reminderTimes } from '@/lib/selectors'
import { showNotification } from '@/lib/notify'
import { fmtDue } from '@/lib/date'
import { buildAlert, showAlert } from '@/lib/alerts'
import { desktop } from '@/lib/desktop'

/** don't replay reminders that came due long ago (the app was closed) */
const GRACE_MS = 12 * 3_600_000

/**
 * Scans reminders on an interval and fires the ones that have come due.
 * A reminder is due once per occurrence: it counts as fired only if it fired
 * after the occurrence time, so repeating events keep reminding and a moved
 * due date re-arms the reminder.
 */
export function useReminderEngine(navigate: NavigateFunction) {
  useEffect(() => {
    function tick() {
      const { data, updateReminder, toast } = useStore.getState()
      const t = dict(data.settings.lang)
      const nowMs = Date.now()
      for (const r of Object.values(data.reminders)) {
        if (r.done) continue
        const item = data.items[r.itemId]
        if (!item) continue
        const firedMs = r.firedAt ? new Date(r.firedAt).getTime() : 0
        const dueMs = reminderTimes(r, item, nowMs - GRACE_MS, nowMs).find((ms) => ms <= nowMs && ms >= nowMs - GRACE_MS && firedMs < ms)
        if (dueMs == null) continue
        updateReminder(r.id, { firedAt: new Date().toISOString(), snoozedUntil: undefined })
        const body = r.note || fmtDue(item.due ?? item.start)?.label || t.dashboard.reminderFallback
        showAlert(buildAlert(r, item.title, body, item.kind === 'task' && item.status !== 'done'))
        if (!desktop()) {
          showNotification(item.title, body, () => useStore.getState().openPeek(item.id))
          toast(t.reminderToast(item.title), {
            label: t.common.open,
            run: () => useStore.getState().openPeek(item.id),
          })
        }
      }
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [navigate])
}
