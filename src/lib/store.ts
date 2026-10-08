import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Contact,
  Goal,
  GoogleIntegration,
  Item,
  ItemKind,
  Lang,
  Project,
  ProjectPhase,
  Reflection,
  Reminder,
  Photo,
  House,
  Visit,
  Settings,
  Space,
  Tag,
  TaskStatus,
  WeavoData,
} from './types'
import { DEFAULT_SPACE, TAG_COLORS } from './types'
import { legacyRule, makeRule, nextOccurrence } from './recur'
import { firstCleaning, visitId } from './houses'
import { deletePhotoBlob } from './photos'
import { DEFAULT_REMINDERS, defaultTriggers } from './reminders'
import { reminderTimes } from './selectors'
import type { ReminderAlert } from './desktop'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36)

export const DEFAULT_SETTINGS: Settings = {
  lang: 'cs',
  displayName: '',
  weekStartsMonday: true,
  dayStartHour: 8,
  dayEndHour: 20,
  defaultView: '/',
  notificationsAsked: false,
  tourSeen: false,
  spaceFilter: 'all',
  todoMode: 'list',
  workGroup: 'urgency',
  reminderDefaults: { ...DEFAULT_REMINDERS },
}

export const DEFAULT_GOOGLE: GoogleIntegration = {
  clientId: '',
  connected: false,
  scopes: [],
  gmailQuery: 'is:starred',
  calendarSyncEnabled: true,
  space: DEFAULT_SPACE,
}

const DATA_VERSION = 8

const STARTER_TAGS: Record<Lang, [string, number?][]> = {
  cs: [['Škola'], ['Vaření'], ['Nákup', 2], ['Projekty'], ['Zdraví'], ['Domov']],
  en: [['School'], ['Cooking'], ['Shopping', 2], ['Projects'], ['Health'], ['Home']],
}

/** starter personal tags so the to-do is usable on day one */
export function starterTags(lang: Lang = 'cs'): Record<string, Tag> {
  const ts = new Date().toISOString()
  const out: Record<string, Tag> = {}
  STARTER_TAGS[lang].forEach(([name, leadDays], i) => {
    const t: Tag = { id: uid(), name, color: TAG_COLORS[i % TAG_COLORS.length], space: DEFAULT_SPACE, createdAt: ts }
    if (leadDays) t.leadDays = leadDays
    out[t.id] = t
  })
  return out
}

/**
 * Bring data from any older version (persisted or imported JSON) up to the
 * current shape: every item and project gets a space, and legacy free-text
 * tags become Tag entities.
 */
export function normalizeData(d: Partial<WeavoData>, seedTags = false): Partial<WeavoData> {
  const projects: Record<string, Project> = {}
  for (const old of Object.values(d.projects ?? {})) {
    // v5 archived projects become "done"
    const { archived, ...p } = old as Project & { archived?: boolean }
    projects[p.id] = { ...p, space: DEFAULT_SPACE, status: p.status ?? (archived ? 'done' : 'active') }
  }

  const tags: Record<string, Tag> = { ...(d.tags ?? {}) }
  if (seedTags && !Object.keys(tags).length) Object.assign(tags, starterTags(d.settings?.lang))
  const byName = new Map(Object.values(tags).map((t) => [t.name.toLowerCase(), t.id]))
  const tagId = (raw: string) => {
    if (tags[raw]) return raw
    const key = raw.toLowerCase()
    let id = byName.get(key)
    if (!id) {
      const t: Tag = {
        id: uid(),
        name: raw,
        color: TAG_COLORS[Object.keys(tags).length % TAG_COLORS.length],
        space: DEFAULT_SPACE,
        createdAt: new Date().toISOString(),
      }
      tags[t.id] = t
      byName.set(key, t.id)
      id = t.id
    }
    return id
  }

  const items: Record<string, Item> = {}
  for (const it of Object.values(d.items ?? {})) {
    items[it.id] = {
      ...it,
      space: DEFAULT_SPACE,
      tags: [...new Set((it.tags ?? []).map(tagId))],
      // v7: repeat became a rule (was 'none' | 'daily' | 'weekly' | 'monthly')
      repeat: legacyRule(it.repeat),
    }
    if (!items[it.id].repeat) delete items[it.id].repeat
  }
  return { ...d, version: DATA_VERSION, projects, tags, items }
}

function emptyData(): WeavoData {
  return {
    version: DATA_VERSION,
    items: {},
    projects: {},
    tags: starterTags(),
    goals: {},
    reflections: {},
    contacts: {},
    reminders: {},
    photos: {},
    houses: {},
    visits: {},
    settings: { ...DEFAULT_SETTINGS },
    google: { ...DEFAULT_GOOGLE },
  }
}

/** a reminder whose time has already passed when it is made is born fired, so it does not go off retroactively */
function armed(r: Reminder, item: Item): Reminder {
  const nowMs = Date.now()
  return reminderTimes(r, item, nowMs - 12 * 3_600_000, nowMs).some((ms) => ms <= nowMs)
    ? { ...r, firedAt: new Date().toISOString() }
    : r
}

export interface Toast {
  id: string
  message: string
  action?: { label: string; run: () => void }
}

interface Store {
  data: WeavoData

  captureOpen: boolean
  captureKind: ItemKind
  captureText: string
  /** fields the capture window starts with (say, the slot clicked in the calendar) */
  capturePreset: Partial<Item> | null
  paletteOpen: boolean
  /** task shown in the side drawer */
  peekId: string | null
  tourOpen: boolean
  toasts: Toast[]
  /** reminders on screen right now (the in-app big reminder; the desktop shell shows its own windows) */
  alerts: ReminderAlert[]

  openCapture: (kind?: ItemKind, text?: string, preset?: Partial<Item>) => void
  closeCapture: () => void
  setCaptureKind: (k: ItemKind) => void
  setCaptureText: (t: string) => void
  setPalette: (open: boolean) => void
  openPeek: (id: string) => void
  closePeek: () => void
  startTour: () => void
  endTour: () => void
  toast: (message: string, action?: Toast['action']) => void
  dismissToast: (id: string) => void
  pushAlert: (a: ReminderAlert) => void
  dismissAlert: (reminderId: string) => void

  /** `reminders: false` skips the default reminders (the editor sets its own) */
  createItem: (partial: Partial<Item> & { kind: ItemKind; title: string }, opts?: { reminders?: boolean }) => Item
  updateItem: (id: string, patch: Partial<Item>) => void
  /** removes the item and any subtasks; returns a snapshot for undo */
  deleteItem: (id: string) => { items: Item[]; reminders: Reminder[] }
  restoreItems: (items: Item[], reminders: Reminder[]) => void
  toggleDone: (id: string) => void
  setStatus: (id: string, status: TaskStatus, order?: number) => void

  addProject: (name: string, color: string, space?: Space, extra?: Partial<Project>) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void
  addSubtask: (parentId: string, title: string) => Item | undefined

  addTag: (name: string, space: Space, color?: string) => Tag
  updateTag: (id: string, patch: Partial<Tag>) => void
  /** removes the tag and strips it from every item */
  deleteTag: (id: string) => void

  toggleFlame: (id: string) => void
  /** park the task on someone (`who`), or clear it with null */
  setWaitingFor: (id: string, who: string | null) => void

  addPhase: (projectId: string, name: string) => ProjectPhase | undefined
  updatePhase: (projectId: string, phaseId: string, patch: Partial<ProjectPhase>) => void
  /** removes the phase; its tasks move to "No phase" */
  deletePhase: (projectId: string, phaseId: string) => void
  movePhase: (projectId: string, phaseId: string, dir: -1 | 1) => void

  addGoal: (title: string, color: string) => Goal
  updateGoal: (id: string, patch: Partial<Goal>) => void
  deleteGoal: (id: string) => void

  upsertReflection: (date: string, patch: Partial<Omit<Reflection, 'id' | 'date'>>) => void

  addContact: (c: Omit<Contact, 'id'>) => Contact
  updateContact: (id: string, patch: Partial<Contact>) => void
  deleteContact: (id: string) => void

  addReminder: (r: Omit<Reminder, 'id'>) => Reminder
  updateReminder: (id: string, patch: Partial<Reminder>) => void
  deleteReminder: (id: string) => void
  snoozeReminder: (id: string, minutes: number) => void
  addPhoto: (p: Omit<Photo, 'id' | 'createdAt'> & { id?: string }) => Photo
  updatePhoto: (id: string, patch: Partial<Pick<Photo, 'caption' | 'takenAt'>>) => void
  deletePhoto: (id: string) => void
  /** creates the house and the repeating calendar event that carries its schedule */
  addHouse: (input: Pick<House, 'name' | 'partner' | 'startDate' | 'weekdays' | 'time'> & Partial<House>, eventTitle: string) => House
  /** `eventTitle` renames the calendar event after the house */
  updateHouse: (id: string, patch: Partial<Omit<House, 'id' | 'eventId' | 'createdAt'>>, eventTitle?: string) => void
  deleteHouse: (id: string) => void
  upsertVisit: (houseId: string, date: string, patch: Partial<Omit<Visit, 'id' | 'houseId' | 'date'>>) => void

  updateSettings: (patch: Partial<Settings>) => void
  updateGoogle: (patch: Partial<GoogleIntegration>) => void
  upsertExternalEvents: (
    events: {
      externalId: string
      title: string
      start: string
      end: string
      allDay: boolean
      url?: string
      updated?: string
    }[],
    window: { start: string; end: string },
  ) => void
  replaceAll: (data: WeavoData) => void
  clearAll: () => void
}

const now = () => new Date().toISOString()

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      data: emptyData(),

      captureOpen: false,
      captureKind: 'task',
      captureText: '',
      capturePreset: null,
      paletteOpen: false,
      peekId: null,
      tourOpen: false,
      toasts: [],
      alerts: [],

      openCapture: (kind, text, preset) =>
        set((s) => ({
          captureOpen: true,
          captureKind: kind ?? s.captureKind,
          captureText: text ?? '',
          capturePreset: preset ?? null,
        })),
      closeCapture: () => set({ captureOpen: false, captureText: '', capturePreset: null }),
      setCaptureKind: (k) => set({ captureKind: k }),
      setCaptureText: (t) => set({ captureText: t }),
      setPalette: (open) => set({ paletteOpen: open }),
      openPeek: (id) => set({ peekId: id }),
      closePeek: () => set({ peekId: null }),
      startTour: () => set({ tourOpen: true, captureOpen: false, paletteOpen: false }),
      endTour: () =>
        set((s) => ({
          tourOpen: false,
          data: { ...s.data, settings: { ...s.data.settings, tourSeen: true } },
        })),

      toast: (message, action) => {
        const id = uid()
        set((s) => ({ toasts: [...s.toasts, { id, message, action }] }))
        setTimeout(() => get().dismissToast(id), 5000)
      },
      pushAlert: (a) =>
        set((s) => ({ alerts: [...s.alerts.filter((x) => x.reminderId !== a.reminderId), a] })),
      dismissAlert: (reminderId) => set((s) => ({ alerts: s.alerts.filter((x) => x.reminderId !== reminderId) })),
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      createItem: (partial, opts) => {
        const ts = now()
        const item: Item = {
          id: uid(),
          body: '',
          tags: [],
          ...partial,
          // an item always lives in its project's space
          space: DEFAULT_SPACE,
          status: partial.kind === 'task' ? (partial.status ?? 'todo') : partial.status,
          createdAt: ts,
          updatedAt: ts,
        }
        const reminders = { ...get().data.reminders }
        // dated items get the default reminders (imported and sub-items excluded)
        if (opts?.reminders !== false && !item.parentId && !item.source) {
          for (const trigger of defaultTriggers(item, get().data.settings.reminderDefaults)) {
            const id = uid()
            reminders[id] = armed({ id, itemId: item.id, trigger }, item)
          }
        }
        set((s) => ({
          data: { ...s.data, items: { ...s.data.items, [item.id]: item }, reminders },
        }))
        return item
      },

      updateItem: (id, patch) =>
        set((s) => {
          const cur = s.data.items[id]
          if (!cur) return s
          const project = patch.projectId ? s.data.projects[patch.projectId] : undefined
          return {
            data: {
              ...s.data,
              items: {
                ...s.data.items,
                [id]: {
                  ...cur,
                  ...patch,
                  ...(project ? { space: project.space } : {}),
                  updatedAt: now(),
                },
              },
            },
          }
        }),

      deleteItem: (id) => {
        const snapshot: { items: Item[]; reminders: Reminder[] } = { items: [], reminders: [] }
        set((s) => {
          const items = { ...s.data.items }
          // collect the item and any subtasks that roll up into it
          const removed = new Set<string>([id])
          for (const it of Object.values(items)) {
            if (it.parentId === id) removed.add(it.id)
          }
          for (const rid of removed) {
            if (items[rid]) snapshot.items.push(items[rid])
            delete items[rid]
          }
          // scrub dependency references
          for (const it of Object.values(items)) {
            if (it.blockedBy?.some((x) => removed.has(x))) {
              items[it.id] = {
                ...it,
                blockedBy: it.blockedBy.filter((x) => !removed.has(x)),
              }
            }
          }
          const reminders = { ...s.data.reminders }
          for (const r of Object.values(reminders)) {
            if (removed.has(r.itemId)) {
              snapshot.reminders.push(r)
              delete reminders[r.id]
            }
          }
          return { data: { ...s.data, items, reminders } }
        })
        return snapshot
      },

      restoreItems: (items, reminders) =>
        set((s) => {
          const it = { ...s.data.items }
          for (const x of items) it[x.id] = x
          const rem = { ...s.data.reminders }
          for (const r of reminders) rem[r.id] = r
          return { data: { ...s.data, items: it, reminders: rem } }
        }),

      toggleDone: (id) =>
        set((s) => {
          const it = s.data.items[id]
          if (!it) return s
          const done = it.kind === 'task' ? it.status !== 'done' : !it.completedAt
          const items = {
            ...s.data.items,
            [id]: {
              ...it,
              status: it.kind === 'task' ? (done ? 'done' : 'todo') : it.status,
              completedAt: done ? now() : undefined,
              updatedAt: now(),
            },
          }
          // completing a repeating task spins off the next occurrence, reminders included
          const reminders = { ...s.data.reminders }
          const nextDue = done && it.kind === 'task' && it.repeat && it.due ? nextOccurrence(it.due, it.repeat) : undefined
          if (nextDue) {
            const nid = uid()
            items[nid] = {
              ...it,
              id: nid,
              status: 'todo',
              completedAt: undefined,
              flame: undefined,
              waitingFor: undefined,
              due: nextDue,
              checklist: it.checklist?.map((c) => ({ ...c, done: false })),
              createdAt: now(),
              updatedAt: now(),
            }
            for (const r of Object.values(s.data.reminders)) {
              if (r.itemId !== id || r.trigger.type === 'at') continue
              const rid = uid()
              reminders[rid] = { id: rid, itemId: nid, trigger: r.trigger, note: r.note }
            }
          }
          return { data: { ...s.data, items, reminders } }
        }),

      setStatus: (id, status, order) =>
        set((s) => {
          const it = s.data.items[id]
          if (!it) return s
          return {
            data: {
              ...s.data,
              items: {
                ...s.data.items,
                [id]: {
                  ...it,
                  status,
                  boardOrder: order ?? it.boardOrder,
                  completedAt: status === 'done' ? now() : undefined,
                  unsorted: false,
                  updatedAt: now(),
                },
              },
            },
          }
        }),

      addProject: (name, color, space = DEFAULT_SPACE, extra = {}) => {
        const p: Project = { id: uid(), name: name.trim(), color, space, status: 'active', createdAt: now(), ...extra }
        set((s) => ({ data: { ...s.data, projects: { ...s.data.projects, [p.id]: p } } }))
        return p
      },
      updateProject: (id, patch) =>
        set((s) => {
          let items = s.data.items
          // moving a project to the other space takes its items along
          if (patch.space && patch.space !== s.data.projects[id]?.space) {
            items = { ...items }
            for (const it of Object.values(items)) {
              if (it.projectId === id) items[it.id] = { ...it, space: patch.space, updatedAt: now() }
            }
          }
          return {
            data: {
              ...s.data,
              items,
              projects: { ...s.data.projects, [id]: { ...s.data.projects[id], ...patch } },
            },
          }
        }),
      deleteProject: (id) =>
        set((s) => {
          const projects = { ...s.data.projects }
          delete projects[id]
          const items = { ...s.data.items }
          for (const it of Object.values(items)) {
            if (it.projectId === id) items[it.id] = { ...it, projectId: undefined }
          }
          return { data: { ...s.data, projects, items } }
        }),

      addSubtask: (parentId, title) => {
        const parent = get().data.items[parentId]
        if (!parent) return undefined
        return get().createItem({
          kind: 'task',
          title: title.trim(),
          parentId,
          projectId: parent.projectId,
          space: parent.space,
        })
      },

      addPhase: (projectId, name) => {
        const p = get().data.projects[projectId]
        if (!p) return undefined
        const phase: ProjectPhase = { id: uid(), name: name.trim() }
        get().updateProject(projectId, { phases: [...(p.phases ?? []), phase] })
        return phase
      },
      updatePhase: (projectId, phaseId, patch) => {
        const p = get().data.projects[projectId]
        if (!p?.phases) return
        get().updateProject(projectId, {
          phases: p.phases.map((ph) => (ph.id === phaseId ? { ...ph, ...patch } : ph)),
        })
      },
      deletePhase: (projectId, phaseId) =>
        set((s) => {
          const p = s.data.projects[projectId]
          if (!p) return s
          const items = { ...s.data.items }
          for (const it of Object.values(items)) {
            if (it.phaseId === phaseId) items[it.id] = { ...it, phaseId: undefined, updatedAt: now() }
          }
          return {
            data: {
              ...s.data,
              items,
              projects: {
                ...s.data.projects,
                [projectId]: { ...p, phases: (p.phases ?? []).filter((ph) => ph.id !== phaseId) },
              },
            },
          }
        }),
      movePhase: (projectId, phaseId, dir) => {
        const p = get().data.projects[projectId]
        const list = [...(p?.phases ?? [])]
        const i = list.findIndex((ph) => ph.id === phaseId)
        const j = i + dir
        if (i < 0 || j < 0 || j >= list.length) return
        ;[list[i], list[j]] = [list[j], list[i]]
        get().updateProject(projectId, { phases: list })
      },

      addTag: (name, space, color) => {
        const count = Object.keys(get().data.tags).length
        const t: Tag = {
          id: uid(),
          name: name.trim().replace(/^#/, ''),
          color: color ?? TAG_COLORS[count % TAG_COLORS.length],
          space,
          createdAt: now(),
        }
        set((s) => ({ data: { ...s.data, tags: { ...s.data.tags, [t.id]: t } } }))
        return t
      },
      updateTag: (id, patch) =>
        set((s) => ({
          data: { ...s.data, tags: { ...s.data.tags, [id]: { ...s.data.tags[id], ...patch } } },
        })),
      deleteTag: (id) =>
        set((s) => {
          const tags = { ...s.data.tags }
          delete tags[id]
          const items = { ...s.data.items }
          for (const it of Object.values(items)) {
            if (it.tags.includes(id)) items[it.id] = { ...it, tags: it.tags.filter((x) => x !== id) }
          }
          return { data: { ...s.data, tags, items } }
        }),

      toggleFlame: (id) => {
        const it = get().data.items[id]
        if (it) get().updateItem(id, { flame: !it.flame })
      },
      setWaitingFor: (id, who) =>
        get().updateItem(id, {
          waitingFor: who?.trim() ? { who: who.trim(), since: now() } : undefined,
        }),

      addGoal: (title, color) => {
        const g: Goal = { id: uid(), title: title.trim(), color, createdAt: now() }
        set((s) => ({ data: { ...s.data, goals: { ...s.data.goals, [g.id]: g } } }))
        return g
      },
      updateGoal: (id, patch) =>
        set((s) => ({
          data: { ...s.data, goals: { ...s.data.goals, [id]: { ...s.data.goals[id], ...patch } } },
        })),
      deleteGoal: (id) =>
        set((s) => {
          const goals = { ...s.data.goals }
          delete goals[id]
          const projects = { ...s.data.projects }
          for (const p of Object.values(projects)) {
            if (p.goalId === id) projects[p.id] = { ...p, goalId: undefined }
          }
          return { data: { ...s.data, goals, projects } }
        }),

      upsertReflection: (date, patch) =>
        set((s) => {
          const existing = s.data.reflections[date]
          const rec: Reflection = existing
            ? { ...existing, ...patch, updatedAt: now() }
            : { id: date, date, createdAt: now(), updatedAt: now(), ...patch }
          return { data: { ...s.data, reflections: { ...s.data.reflections, [date]: rec } } }
        }),

      addContact: (c) => {
        const contact: Contact = { id: uid(), ...c }
        set((s) => ({
          data: { ...s.data, contacts: { ...s.data.contacts, [contact.id]: contact } },
        }))
        return contact
      },
      updateContact: (id, patch) =>
        set((s) => ({
          data: {
            ...s.data,
            contacts: { ...s.data.contacts, [id]: { ...s.data.contacts[id], ...patch } },
          },
        })),
      deleteContact: (id) =>
        set((s) => {
          const contacts = { ...s.data.contacts }
          delete contacts[id]
          return { data: { ...s.data, contacts } }
        }),

      addReminder: (r) => {
        const item = get().data.items[r.itemId]
        const rem: Reminder = item ? armed({ id: uid(), ...r }, item) : { id: uid(), ...r }
        set((s) => ({
          data: { ...s.data, reminders: { ...s.data.reminders, [rem.id]: rem } },
        }))
        return rem
      },
      updateReminder: (id, patch) =>
        set((s) => ({
          data: {
            ...s.data,
            reminders: { ...s.data.reminders, [id]: { ...s.data.reminders[id], ...patch } },
          },
        })),
      deleteReminder: (id) =>
        set((s) => {
          const reminders = { ...s.data.reminders }
          delete reminders[id]
          return { data: { ...s.data, reminders } }
        }),
      snoozeReminder: (id, minutes) =>
        set((s) => ({
          data: {
            ...s.data,
            reminders: {
              ...s.data.reminders,
              [id]: {
                ...s.data.reminders[id],
                firedAt: undefined,
                snoozedUntil: new Date(Date.now() + minutes * 60_000).toISOString(),
              },
            },
          },
        })),

      addPhoto: (p) => {
        const photo: Photo = { ...p, id: p.id ?? uid(), createdAt: now() }
        set((s) => ({ data: { ...s.data, photos: { ...s.data.photos, [photo.id]: photo } } }))
        return photo
      },
      updatePhoto: (id, patch) =>
        set((s) =>
          s.data.photos[id] ? { data: { ...s.data, photos: { ...s.data.photos, [id]: { ...s.data.photos[id], ...patch } } } } : s,
        ),
      deletePhoto: (id) =>
        set((s) => {
          const photos = { ...s.data.photos }
          delete photos[id]
          return { data: { ...s.data, photos } }
        }),

      addHouse: (input, eventTitle) => {
        const id = uid()
        const start = firstCleaning(input)
        const event = get().createItem({
          kind: 'event',
          title: eventTitle,
          body: input.partner,
          start: start.toISOString(),
          end: new Date(start.getTime() + 30 * 60_000).toISOString(),
          houseId: id,
          repeat: makeRule('weekly', {
            days: input.weekdays,
            until: input.endDate ? new Date(`${input.endDate}T12:00:00`).toISOString() : undefined,
          }),
        })
        const house: House = { ...input, id, eventId: event.id, createdAt: now() }
        set((s) => ({ data: { ...s.data, houses: { ...s.data.houses, [id]: house } } }))
        return house
      },
      updateHouse: (id, patch, eventTitle) => {
        const old = get().data.houses[id]
        if (!old) return
        const house = { ...old, ...patch }
        if ('endDate' in patch && !patch.endDate) delete house.endDate
        set((s) => ({ data: { ...s.data, houses: { ...s.data.houses, [id]: house } } }))
        if (get().data.items[house.eventId]) {
          const start = firstCleaning(house)
          get().updateItem(house.eventId, {
            ...(eventTitle ? { title: eventTitle } : {}),
            body: house.partner,
            start: start.toISOString(),
            end: new Date(start.getTime() + 30 * 60_000).toISOString(),
            repeat: makeRule('weekly', {
              days: house.weekdays,
              until: house.endDate ? new Date(`${house.endDate}T12:00:00`).toISOString() : undefined,
            }),
          })
        }
      },
      deleteHouse: (id) => {
        const house = get().data.houses[id]
        if (!house) return
        get().deleteItem(house.eventId)
        const visitIds = new Set(Object.values(get().data.visits).filter((v) => v.houseId === id).map((v) => v.id))
        set((s) => {
          const houses = { ...s.data.houses }
          delete houses[id]
          const visits = Object.fromEntries(Object.entries(s.data.visits).filter(([k]) => !visitIds.has(k)))
          const photos = Object.fromEntries(
            Object.entries(s.data.photos).filter(([pid, p]) => {
              if (p.visitId && visitIds.has(p.visitId)) {
                deletePhotoBlob(pid).catch(() => undefined)
                return false
              }
              return true
            }),
          )
          return { data: { ...s.data, houses, visits, photos } }
        })
      },
      upsertVisit: (houseId, date, patch) =>
        set((s) => {
          const id = visitId(houseId, date)
          const prev = s.data.visits[id] ?? { id, houseId, date, updatedAt: now() }
          return { data: { ...s.data, visits: { ...s.data.visits, [id]: { ...prev, ...patch, updatedAt: now() } } } }
        }),

      updateSettings: (patch) =>
        set((s) => ({ data: { ...s.data, settings: { ...s.data.settings, ...patch } } })),

      updateGoogle: (patch) =>
        set((s) => ({ data: { ...s.data, google: { ...s.data.google, ...patch } } })),

      upsertExternalEvents: (events, window) =>
        set((s) => {
          const items = { ...s.data.items }
          const evByExternal = new Map<string, Item>()
          const taskByExternal = new Map<string, Item>()
          for (const it of Object.values(items)) {
            if (it.source !== 'gcal' || !it.externalId) continue
            if (it.kind === 'task') taskByExternal.set(it.externalId, it)
            else evByExternal.set(it.externalId, it)
          }
          const seen = new Set<string>()
          for (const ev of events) {
            seen.add(ev.externalId)
            const existing = evByExternal.get(ev.externalId)
            if (existing) {
              items[existing.id] = {
                ...existing,
                title: ev.title,
                start: ev.start,
                end: ev.end,
                allDay: ev.allDay,
                externalUrl: ev.url,
                externalUpdatedAt: ev.updated,
                updatedAt: now(),
              }
            } else {
              const id = uid()
              items[id] = {
                id,
                kind: 'event',
                title: ev.title,
                start: ev.start,
                end: ev.end,
                allDay: ev.allDay,
                space: s.data.google.space,
                tags: [],
                source: 'gcal',
                externalId: ev.externalId,
                externalUrl: ev.url,
                externalUpdatedAt: ev.updated,
                readOnlyExternal: true,
                createdAt: now(),
                updatedAt: now(),
              }
            }

            // mirror each calendar entry as a task as well, keyed by the same externalId
            const existingTask = taskByExternal.get(ev.externalId)
            if (existingTask) {
              items[existingTask.id] = {
                ...existingTask,
                title: ev.title,
                due: ev.start,
                externalUrl: ev.url,
                externalUpdatedAt: ev.updated,
                updatedAt: now(),
              }
            } else {
              const tid = uid()
              items[tid] = {
                id: tid,
                kind: 'task',
                status: 'todo',
                title: ev.title,
                due: ev.start,
                space: s.data.google.space,
                tags: [],
                source: 'gcal',
                externalId: ev.externalId,
                externalUrl: ev.url,
                externalUpdatedAt: ev.updated,
                readOnlyExternal: true,
                createdAt: now(),
                updatedAt: now(),
              }
            }
          }
          // drop mirrored entries that vanished from Google within the synced window
          const winStart = new Date(window.start).getTime()
          const winEnd = new Date(window.end).getTime()
          const inWindow = (it: Item) => {
            const t = it.start
              ? new Date(it.start).getTime()
              : it.due
                ? new Date(it.due).getTime()
                : 0
            return t >= winStart && t <= winEnd
          }
          for (const it of evByExternal.values()) {
            if (!seen.has(it.externalId!) && inWindow(it)) delete items[it.id]
          }
          for (const it of taskByExternal.values()) {
            // keep a mirrored task the user has already completed
            if (!seen.has(it.externalId!) && it.status !== 'done' && inWindow(it)) delete items[it.id]
          }
          return {
            data: {
              ...s.data,
              items,
              google: { ...s.data.google, lastCalendarSync: now(), lastError: undefined },
            },
          }
        }),

      replaceAll: (data) => set({ data: { ...emptyData(), ...normalizeData(data) } }),
      clearAll: () => set({ data: emptyData() }),
    }),
    {
      name: 'weavo-v1',
      version: DATA_VERSION,
      partialize: (s) => ({ data: s.data }),
      migrate: (persisted, version) => {
        const p = persisted as { data?: Partial<WeavoData> } | undefined
        if (p?.data && version < 2 && !p.data.google) {
          p.data.google = { ...DEFAULT_GOOGLE }
        }
        if (p?.data && version < 4) {
          p.data.goals ??= {}
          p.data.reflections ??= {}
        }
        if (p?.data && version < 5) {
          p.data = normalizeData(p.data, true)
        } else if (p?.data && version < 8) {
          // v8: the Osobní / Pracovní spaces were merged into Andulka — keep a copy of what was there
          try {
            localStorage.setItem('weavo-v1-backup-v7', JSON.stringify(persisted))
          } catch {
            /* storage full — carry on */
          }
          p.data = normalizeData(p.data)
        }
        return p as { data: WeavoData }
      },
      merge: (persisted, current) => {
        const p = persisted as { data?: Partial<WeavoData> } | undefined
        return {
          ...current,
          data: {
            ...emptyData(),
            ...(p?.data ?? {}),
            settings: {
              ...DEFAULT_SETTINGS,
              ...(p?.data?.settings ?? {}),
              reminderDefaults: { ...DEFAULT_REMINDERS, ...(p?.data?.settings?.reminderDefaults ?? {}) },
            },
            google: { ...DEFAULT_GOOGLE, ...(p?.data?.google ?? {}) },
          },
        }
      },
    },
  ),
)
