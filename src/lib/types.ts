export type ItemKind = 'event' | 'task' | 'note'

export type SourceKind = 'gmail' | 'gcal' | 'slack'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high'
export const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

/** how a repeat rule steps: every N days / working days / weeks (on chosen days) / months / years */
export type RepeatFreq = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'

export interface RepeatRule {
  freq: RepeatFreq
  /** every N units (ignored for 'weekdays') */
  interval: number
  /** weekly: weekdays it happens on, 0 = Sunday … 6 = Saturday; empty = the anchor's weekday */
  days?: number[]
  /** ISO date — the last day an occurrence may fall on */
  until?: string
}

/** top-level partition: personal, work and Andulka items live in separate to-do lists */
export type Space = 'personal' | 'work' | 'andulka'
/** the spaces the UI offers — for now only Andulka (Osobní/Pracovní were merged into it) */
export const SPACES: Space[] = ['andulka']
export const DEFAULT_SPACE: Space = 'andulka'
export type SpaceFilter = 'all' | Space
/** the threads — personal jade, work ochre, Andulka rose */
export const SPACE_COLOR: Record<Space, string> = { personal: '#5fb98c', work: '#d6a45a', andulka: '#d28aad' }

export type AccentName = 'cornflower' | 'terracotta' | 'lavender' | 'pink' | 'leaf' | 'sky' | 'sand' | 'slate'

/** project identity colors — muted, and distinct from the space threads and the semantic colors */
export const PROJECT_COLORS: { name: AccentName; value: string }[] = [
  { name: 'cornflower', value: '#7d9fd4' },
  { name: 'terracotta', value: '#d4826b' },
  { name: 'lavender', value: '#a58ce0' },
  { name: 'pink', value: '#d28aad' },
  { name: 'leaf', value: '#84b876' },
  { name: 'sky', value: '#62adc8' },
  { name: 'sand', value: '#bdad68' },
  { name: 'slate', value: '#8f99aa' },
]

export const TAG_COLORS = ['#7fb2f0', '#d9c26f', '#83c79d', '#c49bf0', '#6fc3c9', '#de8892', '#dfa871', '#9fc46e']

/** a label within one space (school, cooking, shopping…) */
export interface Tag {
  id: string
  name: string
  color: string
  space: Space
  /** show tasks with this tag in "today" this many days before they are due */
  leadDays?: number
  createdAt: string
}

/** a task parked on someone else — sent, now waiting for their reply */
export interface WaitingFor {
  who: string
  /** ISO datetime the ball was handed over */
  since: string
}

export type ProjectSectionId = 'tasks' | 'events' | 'notes' | 'done'

export interface ProjectSection {
  id: ProjectSectionId
  collapsed?: boolean
}

export const DEFAULT_PROJECT_SECTIONS: ProjectSection[] = [
  { id: 'tasks' },
  { id: 'events' },
  { id: 'notes' },
  { id: 'done' },
]

export type ProjectStatus = 'active' | 'paused' | 'done'
export const PROJECT_STATUSES: ProjectStatus[] = ['active', 'paused', 'done']

/** a stage of a project (Příprava → Realizace → Předání); tasks point at it by phaseId */
export interface ProjectPhase {
  id: string
  name: string
  /** ISO dates — optional, drawn on the project's timeline */
  start?: string
  end?: string
}

export interface Project {
  id: string
  name: string
  color: string
  space: Space
  status: ProjectStatus
  /** the brief — a short free-form description on top of the project page */
  description?: string
  /** ISO datetime — optional start; the timeline falls back to createdAt */
  start?: string
  /** ISO datetime — optional project deadline */
  due?: string
  createdAt?: string
  /** ordered stages; tasks without a phase sit in "No phase" */
  phases?: ProjectPhase[]
  /** @deprecated section layout of the old project page, no longer shown */
  sections?: ProjectSection[]
  /** the long-term goal this project rolls up into, if any */
  goalId?: string
}

/** a long-term objective (quarter/year horizon) that projects roll up into */
export interface Goal {
  id: string
  title: string
  color: string
  archived?: boolean
  /** free-form page body — why it matters, what success looks like */
  description?: string
  /** ISO date — optional target date */
  targetDate?: string
  createdAt: string
}

/** one day's journal entry */
export interface Reflection {
  /** = the date, e.g. '2026-09-13' */
  id: string
  date: string
  mood?: 1 | 2 | 3 | 4 | 5
  note?: string
  createdAt: string
  updatedAt: string
}

/** a photo kept in the Andulka space — the image itself lives in IndexedDB (lib/photos.ts) under the same id */
export interface Photo {
  id: string
  space: Space
  /** ISO datetime it was taken / received */
  takenAt: string
  caption?: string
  /** the cleaning day it documents (a Visit id) */
  visitId?: string
  width: number
  height: number
  createdAt: string
}

/** a house that is cleaned on a schedule — Weavo tracks the cleaning days, the photos the partner owes and the client's satisfaction */
export interface House {
  id: string
  name: string
  /** the partner who cleans it */
  partner: string
  /** YYYY-MM-DD — the first day photos are required */
  startDate: string
  /** YYYY-MM-DD — the last day photos are required; empty = still running */
  endDate?: string
  /** cleaning weekdays, 0 = Sunday … 6 = Saturday */
  weekdays: number[]
  /** HH:MM — when the reminder to call the partner fires */
  time: string
  notes?: string
  /** the repeating calendar event that carries the schedule */
  eventId: string
  createdAt: string
}

/** one cleaning day of a house; id = `${houseId}:${date}` */
export interface Visit {
  id: string
  houseId: string
  /** YYYY-MM-DD */
  date: string
  /** the partner was called */
  called?: boolean
  /** what was wrong */
  issues?: string
  /** client satisfaction 1 (worst) – 10 (best) */
  rating?: number
  /** the photos arrived */
  photosReceived?: boolean
  updatedAt: string
}

export interface Contact {
  id: string
  name: string
  email?: string
  role?: string
}

/** minutes before the reference time, or an absolute ISO instant */
export type ReminderTrigger =
  | { type: 'before_due'; minutes: number }
  | { type: 'before_start'; minutes: number }
  | { type: 'at'; at: string }
  /** on the day of the due date / event start, at HH:MM */
  | { type: 'on_day'; time: string }

export interface Reminder {
  id: string
  itemId: string
  trigger: ReminderTrigger
  note?: string
  /** ISO instant it last fired, if it has */
  firedAt?: string
  /** ISO instant to re-arm after a snooze */
  snoozedUntil?: string
  done?: boolean
}

export interface Item {
  id: string
  kind: ItemKind
  title: string
  body?: string
  space: Space
  projectId?: string

  /** task */
  status?: TaskStatus
  /** ISO datetime (may be date-only at midnight) */
  due?: string
  assigneeId?: string
  blockedBy?: string[]
  checklist?: { id: string; text: string; done: boolean }[]
  /** subtask: id of the parent task this rolls up into */
  parentId?: string
  /** the project phase this task belongs to */
  phaseId?: string
  priority?: TaskPriority
  /** recurring: a task spawns its next occurrence when completed, an event is expanded on the calendar */
  repeat?: RepeatRule
  /** parked in the Someday/later list, kept out of the board and digest */
  someday?: boolean
  /** manually marked as burning — must get done no matter what */
  flame?: boolean
  waitingFor?: WaitingFor

  /** event — ISO datetimes */
  start?: string
  end?: string
  allDay?: boolean
  contactIds?: string[]
  /** the house whose cleaning schedule this event is */
  houseId?: string

  /** event — where it takes place, and a link to join (meeting URL) */
  place?: string
  link?: string

  /** shared — Tag ids */
  tags: string[]
  unsorted?: boolean
  boardOrder?: number

  /** provenance for items pulled from a connected service */
  source?: SourceKind
  externalId?: string
  externalUrl?: string
  externalUpdatedAt?: string
  /** calendar events imported from Google are treated as read-only mirrors */
  readOnlyExternal?: boolean

  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface GoogleIntegration {
  clientId: string
  connected: boolean
  email?: string
  name?: string
  picture?: string
  scopes: string[]
  gmailQuery: string
  calendarSyncEnabled: boolean
  /** which space events synced from this account land in */
  space: Space
  lastCalendarSync?: string
  lastError?: string
}

export type Lang = 'cs' | 'en'

/** reminders a new item gets by default; null switches that kind off */
export interface ReminderDefaults {
  /** minutes before an event starts */
  event: number | null
  /** minutes before a task (or note) with a time of day is due; 0 = at that time */
  taskTimed: number | null
  /** HH:MM on the due day for items that have a date but no time */
  taskDay: string | null
}

export interface Settings {
  lang: Lang
  displayName: string
  weekStartsMonday: boolean
  dayStartHour: number
  dayEndHour: number
  defaultView: string
  notificationsAsked: boolean
  tourSeen: boolean
  /** shared space filter for the combined views (Home, Calendar) */
  spaceFilter: SpaceFilter
  todoMode: 'list' | 'kanban'
  /** how the work to-do is grouped */
  workGroup: 'urgency' | 'project'
  /** date keys (YYYY-MM-DD) of the last morning plan / evening close */
  lastPlanned?: string
  lastClosed?: string
  reminderDefaults: ReminderDefaults
}

export interface WeavoData {
  version: number
  items: Record<string, Item>
  projects: Record<string, Project>
  tags: Record<string, Tag>
  goals: Record<string, Goal>
  reflections: Record<string, Reflection>
  contacts: Record<string, Contact>
  reminders: Record<string, Reminder>
  photos: Record<string, Photo>
  houses: Record<string, House>
  visits: Record<string, Visit>
  settings: Settings
  google: GoogleIntegration
}
