import { DEFAULT_GOOGLE, DEFAULT_SETTINGS } from './store'
import { addDays, startOfDay, startOfWeek } from './date'
import type { Item, WeavoData } from './types'

/**
 * A self-consistent example dataset anchored to the current week, so the app
 * looks alive without shipping stale "John Doe" content. Loaded only on demand
 * from Settings and fully removable.
 */
export function makeSampleData(now = new Date()): WeavoData {
  const uid = () => crypto.randomUUID()
  const monday = startOfWeek(now, true)
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const dueDay = (dayOffset: number, h = 17) => at(dayOffset, h)

  const pLaunch = { id: uid(), name: 'Product launch', color: '#dfa871' }
  const pSite = { id: uid(), name: 'Website', color: '#8d93ef' }
  const pHome = { id: uid(), name: 'Personal', color: '#83c79d' }

  const cAlex = { id: uid(), name: 'Alex Rivera', email: 'alex@example.com', role: 'Design' }
  const cSam = { id: uid(), name: 'Sam Cole', email: 'sam@example.com', role: 'Finance' }

  const items: Item[] = []
  const ts = startOfDay(now).toISOString()
  const push = (it: Partial<Item> & Pick<Item, 'kind' | 'title'>) => {
    const full: Item = {
      id: uid(),
      tags: [],
      body: '',
      createdAt: ts,
      updatedAt: ts,
      ...it,
    }
    items.push(full)
    return full
  }

  // events across the week
  push({ kind: 'event', title: 'Team standup', start: at(0, 9, 30), end: at(0, 9, 45), projectId: pLaunch.id })
  push({ kind: 'event', title: 'Design review', start: at(0, 11), end: at(0, 12), projectId: pSite.id, contactIds: [cAlex.id] })
  push({ kind: 'event', title: 'Deep work — copy', start: at(2, 13), end: at(2, 15), projectId: pLaunch.id })
  push({ kind: 'event', title: 'Budget sync', start: at(2, 14), end: at(2, 15), projectId: pLaunch.id, contactIds: [cSam.id] })
  push({ kind: 'event', title: '1:1 with Alex', start: at(3, 10), end: at(3, 10, 30), contactIds: [cAlex.id] })
  push({ kind: 'event', title: 'Sprint planning', start: at(1, 9, 30), end: at(1, 11), projectId: pLaunch.id })
  push({ kind: 'event', title: 'Gym', start: at(0, 18), end: at(0, 19), projectId: pHome.id })
  push({ kind: 'event', title: 'Launch day', start: at(4, 12), end: at(4, 13), projectId: pLaunch.id })

  const approval = push({
    kind: 'task',
    title: 'Get pricing sign-off',
    projectId: pLaunch.id,
    status: 'blocked',
    assigneeId: cSam.id,
    due: dueDay(2, 12),
  })
  const copy = push({
    kind: 'task',
    title: 'Finalize pricing page copy',
    projectId: pLaunch.id,
    status: 'in_progress',
    due: dueDay(4, 15),
    body: 'Rewrite the three tier descriptions. Lead with outcomes, keep each under 60 words.\n\nSee [[Pricing notes]] for the agreed messaging.',
    blockedBy: [approval.id],
    tags: ['copy'],
    checklist: [
      { id: uid(), text: 'Starter tier', done: true },
      { id: uid(), text: 'Pro tier', done: false },
      { id: uid(), text: 'Enterprise tier', done: false },
    ],
  })
  push({ kind: 'task', title: 'Publish pricing page', projectId: pLaunch.id, status: 'todo', blockedBy: [copy.id] })
  push({ kind: 'task', title: 'Announce in team channel', projectId: pLaunch.id, status: 'todo', blockedBy: [copy.id] })
  push({ kind: 'task', title: 'Update social share images', projectId: pSite.id, status: 'todo', due: dueDay(3) })
  push({ kind: 'task', title: 'QA the checkout flow', projectId: pSite.id, status: 'in_progress' })
  push({ kind: 'task', title: 'Book flights for the offsite', projectId: pHome.id, status: 'done', completedAt: addDays(now, -1).toISOString() })
  push({ kind: 'task', title: 'Reply to Alex about the venue', projectId: pHome.id, status: 'todo', due: dueDay(0, 16) })
  push({ kind: 'task', title: 'Review contractor invoice', status: 'todo', unsorted: true })

  push({
    kind: 'note',
    title: 'Pricing notes',
    projectId: pLaunch.id,
    body: 'Agreed with finance: lead with ROI language, drop per-seat framing.\n\nOpen question — show annual pricing by default? Related: [[Finalize pricing page copy]].',
    tags: ['pricing'],
  })
  push({ kind: 'note', title: 'Offsite ideas', projectId: pHome.id, body: 'Coast route, two nights, team dinner on the first evening.' })
  push({ kind: 'note', title: 'Bundle onboarding into Pro tier?', unsorted: true, body: 'Stray thought from the product channel — worth a proper writeup.' })

  const projects = Object.fromEntries([pLaunch, pSite, pHome].map((p) => [p.id, p]))
  const contacts = Object.fromEntries([cAlex, cSam].map((c) => [c.id, c]))

  const reminders = {
    r1: {
      id: 'r1',
      itemId: copy.id,
      trigger: { type: 'before_due' as const, minutes: 120 },
      note: '2 hours before due',
    },
  }

  return {
    version: 1,
    items: Object.fromEntries(items.map((i) => [i.id, i])),
    projects,
    contacts,
    reminders,
    settings: { ...DEFAULT_SETTINGS, displayName: 'You', tourSeen: true },
    google: { ...DEFAULT_GOOGLE },
  }
}
