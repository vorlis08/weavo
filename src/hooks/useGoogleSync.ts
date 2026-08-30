import { useEffect } from 'react'
import { useStore } from '@/lib/store'
import { dict } from '@/lib/i18n'
import { initGoogle, getAccessToken } from '@/lib/google'
import { listCalendarEvents } from '@/lib/gcal'
import { addDays, startOfDay } from '@/lib/date'

const SYNC_MS = 5 * 60_000

/** Keeps mirrored Google Calendar events fresh while a Google account is connected. */
export function useGoogleSync() {
  const connected = useStore((s) => s.data.google.connected)
  const clientId = useStore((s) => s.data.google.clientId)
  const calendarSyncEnabled = useStore((s) => s.data.google.calendarSyncEnabled)

  useEffect(() => {
    if (!connected || !clientId) return
    let cancelled = false

    async function sync() {
      const { updateGoogle, upsertExternalEvents, toast, data } = useStore.getState()
      const t = dict(data.settings.lang)
      try {
        await initGoogle(clientId)
        await getAccessToken() // silent refresh; throws if re-consent needed
        if (calendarSyncEnabled) {
          const start = startOfDay(addDays(new Date(), -7))
          const end = addDays(new Date(), 45)
          const events = await listCalendarEvents(start, end)
          if (!cancelled)
            upsertExternalEvents(events, { start: start.toISOString(), end: end.toISOString() })
        } else if (!cancelled) {
          updateGoogle({ lastError: undefined })
        }
      } catch (e) {
        if (cancelled) return
        const msg = e instanceof Error ? e.message : String(e)
        if (/auth|token|consent|popup|401|invalid_grant/i.test(msg)) {
          updateGoogle({ connected: false, lastError: t.google.sessionExpired })
          toast(t.google.disconnectedToast)
        } else {
          updateGoogle({ lastError: msg })
        }
      }
    }

    sync()
    const id = setInterval(sync, SYNC_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [connected, clientId, calendarSyncEnabled])
}
