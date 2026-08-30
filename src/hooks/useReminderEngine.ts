import { useEffect } from 'react'
import type { NavigateFunction } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { dict } from '@/lib/i18n'
import { reminderDueAt } from '@/lib/selectors'
import { showNotification } from '@/lib/notify'
import { fmtDue } from '@/lib/date'

/** Scans reminders on an interval and fires the ones that have come due. */
export function useReminderEngine(navigate: NavigateFunction) {
  useEffect(() => {
    function tick() {
      const { data, updateReminder, toast } = useStore.getState()
      const t = dict(data.settings.lang)
      const nowMs = Date.now()
      for (const r of Object.values(data.reminders)) {
        if (r.done || r.firedAt) continue
        const item = data.items[r.itemId]
        if (!item) continue
        const dueMs = reminderDueAt(r, item)
        if (dueMs == null) continue
        // fire if it came due within the last 12h (don't replay ancient reminders)
        if (dueMs <= nowMs && nowMs - dueMs < 12 * 3_600_000) {
          updateReminder(r.id, { firedAt: new Date().toISOString(), snoozedUntil: undefined })
          showNotification(item.title, r.note || fmtDue(item.due)?.label || t.dashboard.reminderFallback, () =>
            navigate(`/item/${item.id}`),
          )
          toast(t.reminderToast(item.title), {
            label: t.common.open,
            run: () => navigate(`/item/${item.id}`),
          })
        }
      }
    }
    tick()
    const id = setInterval(tick, 30_000)
    return () => clearInterval(id)
  }, [navigate])
}
