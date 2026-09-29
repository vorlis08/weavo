export type ItemKind = 'event' | 'task' | 'note'

export type SourceKind = 'gmail' | 'gcal' | 'slack'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high'
export const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

export type RepeatFreq = 'none' | 'daily' | 'weekly' | 'monthly'

/** top-level partition: personal and work items live in separate to-do lists */
export type Space = 'personal' | 'work'
export const SPACES: Space[] = ['personal', 'work']
export type SpaceFilter = 'all' | Space
/** the two threads — personal jade, work ochre */
export const SPACE_COLOR: Record<Space, string> = { personal: '#5fb98c', work: '#d6a45a' }

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
  /** recurring task: when completed, the next occurrence is created automatically */
  repeat?: RepeatFreq
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
  settings: Settings
  google: GoogleIntegration
}
