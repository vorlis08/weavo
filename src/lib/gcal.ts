import { gfetch } from './google'

const BASE = 'https://www.googleapis.com/calendar/v3'

export interface GCalEvent {
  externalId: string
  title: string
  start: string
  end: string
  allDay: boolean
  url?: string
  updated?: string
}

interface RawEvent {
  id: string
  status: string
  summary?: string
  htmlLink?: string
  updated?: string
  start: { dateTime?: string; date?: string }
  end: { dateTime?: string; date?: string }
}

export async function listCalendarEvents(timeMin: Date, timeMax: Date): Promise<GCalEvent[]> {
  const params = new URLSearchParams({
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  })
  const res = await gfetch(`${BASE}/calendars/primary/events?${params}`)
  const json = (await res.json()) as { items?: RawEvent[] }
  return (json.items ?? [])
    .filter((e) => e.status !== 'cancelled' && (e.summary ?? '').trim() !== '')
    .map((e) => {
      const allDay = !!e.start.date
      const start = e.start.dateTime ?? `${e.start.date}T00:00:00`
      const endRaw = e.end.dateTime ?? `${e.end.date}T00:00:00`
      return {
        externalId: e.id,
        title: e.summary!.trim(),
        start: new Date(start).toISOString(),
        end: new Date(endRaw).toISOString(),
        allDay,
        url: e.htmlLink,
        updated: e.updated,
      }
    })
}
