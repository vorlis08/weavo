import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Contact,
  GoogleIntegration,
  Item,
  ItemKind,
  Project,
  Reminder,
  Settings,
  TaskStatus,
  WeavoData,
} from './types'

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
}

export const DEFAULT_GOOGLE: GoogleIntegration = {
  clientId: '',
  connected: false,
  scopes: [],
  gmailQuery: 'is:starred',
  calendarSyncEnabled: true,
}

function emptyData(): WeavoData {
  return {
    version: 1,
    items: {},
    projects: {},
    contacts: {},
    reminders: {},
    settings: { ...DEFAULT_SETTINGS },
    google: { ...DEFAULT_GOOGLE },
  }
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
  paletteOpen: boolean
  tourOpen: boolean
  toasts: Toast[]

  openCapture: (kind?: ItemKind, text?: string) => void
  closeCapture: () => void
  setCaptureKind: (k: ItemKind) => void
  setCaptureText: (t: string) => void
  setPalette: (open: boolean) => void
  startTour: () => void
  endTour: () => void
  toast: (message: string, action?: Toast['action']) => void
  dismissToast: (id: string) => void

  createItem: (partial: Partial<Item> & { kind: ItemKind; title: string }) => Item
  updateItem: (id: string, patch: Partial<Item>) => void
  deleteItem: (id: string) => void
  toggleDone: (id: string) => void
  setStatus: (id: string, status: TaskStatus, order?: number) => void

  addProject: (name: string, color: string) => Project
  updateProject: (id: string, patch: Partial<Project>) => void
  deleteProject: (id: string) => void

  addContact: (c: Omit<Contact, 'id'>) => Contact
  updateContact: (id: string, patch: Partial<Contact>) => void
  deleteContact: (id: string) => void

  addReminder: (r: Omit<Reminder, 'id'>) => Reminder
  updateReminder: (id: string, patch: Partial<Reminder>) => void
  deleteReminder: (id: string) => void
  snoozeReminder: (id: string, minutes: number) => void

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
      paletteOpen: false,
      tourOpen: false,
      toasts: [],

      openCapture: (kind, text) =>
        set((s) => ({
          captureOpen: true,
          captureKind: kind ?? s.captureKind,
          captureText: text ?? '',
        })),
      closeCapture: () => set({ captureOpen: false, captureText: '' }),
      setCaptureKind: (k) => set({ captureKind: k }),
      setCaptureText: (t) => set({ captureText: t }),
      setPalette: (open) => set({ paletteOpen: open }),
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
      dismissToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

      createItem: (partial) => {
        const ts = now()
        const item: Item = {
          id: uid(),
          body: '',
          tags: [],
          ...partial,
          status: partial.kind === 'task' ? (partial.status ?? 'todo') : partial.status,
          createdAt: ts,
          updatedAt: ts,
        }
        set((s) => ({
          data: { ...s.data, items: { ...s.data.items, [item.id]: item } },
        }))
        return item
      },

      updateItem: (id, patch) =>
        set((s) => {
          const cur = s.data.items[id]
          if (!cur) return s
          return {
            data: {
              ...s.data,
              items: {
                ...s.data.items,
                [id]: { ...cur, ...patch, updatedAt: now() },
              },
            },
          }
        }),

      deleteItem: (id) =>
        set((s) => {
          const items = { ...s.data.items }
          delete items[id]
          // scrub dependency references
          for (const it of Object.values(items)) {
            if (it.blockedBy?.includes(id)) {
              items[it.id] = { ...it, blockedBy: it.blockedBy.filter((x) => x !== id) }
            }
          }
          const reminders = { ...s.data.reminders }
          for (const r of Object.values(reminders)) {
            if (r.itemId === id) delete reminders[r.id]
          }
          return { data: { ...s.data, items, reminders } }
        }),

      toggleDone: (id) =>
        set((s) => {
          const it = s.data.items[id]
          if (!it) return s
          const done = it.kind === 'task' ? it.status !== 'done' : !it.completedAt
          return {
            data: {
              ...s.data,
              items: {
                ...s.data.items,
                [id]: {
                  ...it,
                  status: it.kind === 'task' ? (done ? 'done' : 'todo') : it.status,
                  completedAt: done ? now() : undefined,
                  updatedAt: now(),
                },
              },
            },
          }
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

      addProject: (name, color) => {
        const p: Project = { id: uid(), name: name.trim(), color }
        set((s) => ({ data: { ...s.data, projects: { ...s.data.projects, [p.id]: p } } }))
        return p
      },
      updateProject: (id, patch) =>
        set((s) => ({
          data: {
            ...s.data,
            projects: { ...s.data.projects, [id]: { ...s.data.projects[id], ...patch } },
          },
        })),
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
        const rem: Reminder = { id: uid(), ...r }
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

      updateSettings: (patch) =>
        set((s) => ({ data: { ...s.data, settings: { ...s.data.settings, ...patch } } })),

      updateGoogle: (patch) =>
        set((s) => ({ data: { ...s.data, google: { ...s.data.google, ...patch } } })),

      upsertExternalEvents: (events, window) =>
        set((s) => {
          const items = { ...s.data.items }
          const byExternal = new Map<string, Item>()
          for (const it of Object.values(items)) {
            if (it.source === 'gcal' && it.externalId) byExternal.set(it.externalId, it)
          }
          const seen = new Set<string>()
          for (const ev of events) {
            seen.add(ev.externalId)
            const existing = byExternal.get(ev.externalId)
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
          // drop mirrored events that vanished from Google within the synced window
          const winStart = new Date(window.start).getTime()
          const winEnd = new Date(window.end).getTime()
          for (const it of byExternal.values()) {
            if (seen.has(it.externalId!)) continue
            const t = it.start ? new Date(it.start).getTime() : 0
            if (t >= winStart && t <= winEnd) delete items[it.id]
          }
          return {
            data: {
              ...s.data,
              items,
              google: { ...s.data.google, lastCalendarSync: now(), lastError: undefined },
            },
          }
        }),

      replaceAll: (data) => set({ data: { ...emptyData(), ...data } }),
      clearAll: () => set({ data: emptyData() }),
    }),
    {
      name: 'weavo-v1',
      version: 2,
      partialize: (s) => ({ data: s.data }),
      migrate: (persisted, version) => {
        const p = persisted as { data?: Partial<WeavoData> } | undefined
        if (p?.data && version < 2 && !p.data.google) {
          p.data.google = { ...DEFAULT_GOOGLE }
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
            settings: { ...DEFAULT_SETTINGS, ...(p?.data?.settings ?? {}) },
            google: { ...DEFAULT_GOOGLE, ...(p?.data?.google ?? {}) },
          },
        }
      },
    },
  ),
)
