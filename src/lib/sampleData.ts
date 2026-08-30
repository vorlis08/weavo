import { DEFAULT_GOOGLE, DEFAULT_SETTINGS } from './store'
import { addDays, startOfDay, startOfWeek } from './date'
import type { Item, Lang, WeavoData } from './types'

const TEXT = {
  cs: {
    pLaunch: 'Uvedení produktu',
    pSite: 'Web',
    pHome: 'Osobní',
    cAlex: 'Alex Rivera',
    cSam: 'Sam Cole',
    roleDesign: 'Design',
    roleFinance: 'Finance',
    you: 'Já',
    standup: 'Denní standup',
    designReview: 'Design review',
    deepWork: 'Soustředěná práce — texty',
    budgetSync: 'Sync k rozpočtu',
    oneOnOne: '1:1 s Alexem',
    sprintPlanning: 'Plánování sprintu',
    gym: 'Posilovna',
    launchDay: 'Den spuštění',
    approval: 'Schválit ceník',
    copy: 'Dodělat texty stránky s ceníkem',
    copyBody:
      'Přepsat popisy tří tarifů. Vést výhodami, každý do 60 slov.\n\nDohodnutá zpráva je v [[Poznámky k ceníku]].',
    ck1: 'Tarif Starter',
    ck2: 'Tarif Pro',
    ck3: 'Tarif Enterprise',
    publish: 'Publikovat stránku s ceníkem',
    announce: 'Oznámit v týmovém kanálu',
    social: 'Aktualizovat obrázky pro sdílení',
    qa: 'Otestovat proces objednávky',
    flights: 'Zamluvit letenky na offsite',
    replyAlex: 'Odpovědět Alexovi ohledně místa',
    invoice: 'Zkontrolovat fakturu od dodavatele',
    pricingNotes: 'Poznámky k ceníku',
    pricingNotesBody:
      'Domluva s financemi: vést jazykem návratnosti, vypustit počítání podle sedadel.\n\nOtevřená otázka — ukazovat ve výchozím stavu roční ceny? Souvisí: [[Dodělat texty stránky s ceníkem]].',
    offsiteIdeas: 'Nápady na offsite',
    offsiteBody: 'Trasa podél pobřeží, dvě noci, týmová večeře první večer.',
    bundle: 'Přidat onboarding do tarifu Pro?',
    bundleBody: 'Nápad z produktového kanálu — chce pořádně sepsat.',
    remNote: '2 hodiny před termínem',
  },
  en: {
    pLaunch: 'Product launch',
    pSite: 'Website',
    pHome: 'Personal',
    cAlex: 'Alex Rivera',
    cSam: 'Sam Cole',
    roleDesign: 'Design',
    roleFinance: 'Finance',
    you: 'You',
    standup: 'Team standup',
    designReview: 'Design review',
    deepWork: 'Deep work — copy',
    budgetSync: 'Budget sync',
    oneOnOne: '1:1 with Alex',
    sprintPlanning: 'Sprint planning',
    gym: 'Gym',
    launchDay: 'Launch day',
    approval: 'Get pricing sign-off',
    copy: 'Finalize pricing page copy',
    copyBody:
      'Rewrite the three tier descriptions. Lead with outcomes, keep each under 60 words.\n\nSee [[Pricing notes]] for the agreed messaging.',
    ck1: 'Starter tier',
    ck2: 'Pro tier',
    ck3: 'Enterprise tier',
    publish: 'Publish pricing page',
    announce: 'Announce in team channel',
    social: 'Update social share images',
    qa: 'QA the checkout flow',
    flights: 'Book flights for the offsite',
    replyAlex: 'Reply to Alex about the venue',
    invoice: 'Review contractor invoice',
    pricingNotes: 'Pricing notes',
    pricingNotesBody:
      'Agreed with finance: lead with ROI language, drop per-seat framing.\n\nOpen question — show annual pricing by default? Related: [[Finalize pricing page copy]].',
    offsiteIdeas: 'Offsite ideas',
    offsiteBody: 'Coast route, two nights, team dinner on the first evening.',
    bundle: 'Bundle onboarding into Pro tier?',
    bundleBody: 'Stray thought from the product channel — worth a proper writeup.',
    remNote: '2 hours before due',
  },
}

/**
 * A self-consistent example dataset anchored to the current week, so the app
 * looks alive without shipping stale content. Loaded only on demand from
 * Settings and fully removable.
 */
export function makeSampleData(now = new Date(), lang: Lang = 'cs'): WeavoData {
  const x = TEXT[lang] ?? TEXT.cs
  const uid = () => crypto.randomUUID()
  const monday = startOfWeek(now, true)
  const at = (dayOffset: number, h: number, m = 0) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + dayOffset)
    d.setHours(h, m, 0, 0)
    return d.toISOString()
  }
  const dueDay = (dayOffset: number, h = 17) => at(dayOffset, h)

  const pLaunch = { id: uid(), name: x.pLaunch, color: '#dfa871' }
  const pSite = { id: uid(), name: x.pSite, color: '#8d93ef' }
  const pHome = { id: uid(), name: x.pHome, color: '#83c79d' }

  const cAlex = { id: uid(), name: x.cAlex, email: 'alex@example.com', role: x.roleDesign }
  const cSam = { id: uid(), name: x.cSam, email: 'sam@example.com', role: x.roleFinance }

  const items: Item[] = []
  const ts = startOfDay(now).toISOString()
  const push = (it: Partial<Item> & Pick<Item, 'kind' | 'title'>) => {
    const full: Item = { id: uid(), tags: [], body: '', createdAt: ts, updatedAt: ts, ...it }
    items.push(full)
    return full
  }

  push({ kind: 'event', title: x.standup, start: at(0, 9, 30), end: at(0, 9, 45), projectId: pLaunch.id })
  push({ kind: 'event', title: x.designReview, start: at(0, 11), end: at(0, 12), projectId: pSite.id, contactIds: [cAlex.id] })
  push({ kind: 'event', title: x.deepWork, start: at(2, 13), end: at(2, 15), projectId: pLaunch.id })
  push({ kind: 'event', title: x.budgetSync, start: at(2, 14), end: at(2, 15), projectId: pLaunch.id, contactIds: [cSam.id] })
  push({ kind: 'event', title: x.oneOnOne, start: at(3, 10), end: at(3, 10, 30), contactIds: [cAlex.id] })
  push({ kind: 'event', title: x.sprintPlanning, start: at(1, 9, 30), end: at(1, 11), projectId: pLaunch.id })
  push({ kind: 'event', title: x.gym, start: at(0, 18), end: at(0, 19), projectId: pHome.id })
  push({ kind: 'event', title: x.launchDay, start: at(4, 12), end: at(4, 13), projectId: pLaunch.id })

  const approval = push({
    kind: 'task', title: x.approval, projectId: pLaunch.id, status: 'blocked',
    assigneeId: cSam.id, due: dueDay(2, 12),
  })
  const copy = push({
    kind: 'task', title: x.copy, projectId: pLaunch.id, status: 'in_progress', due: dueDay(4, 15),
    body: x.copyBody, blockedBy: [approval.id], tags: ['copy'],
    checklist: [
      { id: uid(), text: x.ck1, done: true },
      { id: uid(), text: x.ck2, done: false },
      { id: uid(), text: x.ck3, done: false },
    ],
  })
  push({ kind: 'task', title: x.publish, projectId: pLaunch.id, status: 'todo', blockedBy: [copy.id] })
  push({ kind: 'task', title: x.announce, projectId: pLaunch.id, status: 'todo', blockedBy: [copy.id] })
  push({ kind: 'task', title: x.social, projectId: pSite.id, status: 'todo', due: dueDay(3) })
  push({ kind: 'task', title: x.qa, projectId: pSite.id, status: 'in_progress' })
  push({ kind: 'task', title: x.flights, projectId: pHome.id, status: 'done', completedAt: addDays(now, -1).toISOString() })
  push({ kind: 'task', title: x.replyAlex, projectId: pHome.id, status: 'todo', due: dueDay(0, 16) })
  push({ kind: 'task', title: x.invoice, status: 'todo', unsorted: true })

  push({ kind: 'note', title: x.pricingNotes, projectId: pLaunch.id, body: x.pricingNotesBody, tags: ['pricing'] })
  push({ kind: 'note', title: x.offsiteIdeas, projectId: pHome.id, body: x.offsiteBody })
  push({ kind: 'note', title: x.bundle, unsorted: true, body: x.bundleBody })

  const projects = Object.fromEntries([pLaunch, pSite, pHome].map((p) => [p.id, p]))
  const contacts = Object.fromEntries([cAlex, cSam].map((c) => [c.id, c]))
  const reminders = {
    r1: { id: 'r1', itemId: copy.id, trigger: { type: 'before_due' as const, minutes: 120 }, note: x.remNote },
  }

  return {
    version: 1,
    items: Object.fromEntries(items.map((i) => [i.id, i])),
    projects,
    contacts,
    reminders,
    settings: { ...DEFAULT_SETTINGS, lang, displayName: x.you, tourSeen: true },
    google: { ...DEFAULT_GOOGLE },
  }
}
