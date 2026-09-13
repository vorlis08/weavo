export type ItemKind = 'event' | 'task' | 'note'

export type SourceKind = 'gmail' | 'gcal' | 'slack'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export type TaskPriority = 'low' | 'medium' | 'high'
export const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 }

export type RepeatFreq = 'none' | 'daily' | 'weekly' | 'monthly'

export type AccentName = 'iris' | 'amber' | 'rose' | 'sage' | 'blue'

export const PROJECT_COLORS: { name: AccentName; value: string }[] = [
  { name: 'iris', value: '#8d93ef' },
  { name: 'amber', value: '#dfa871' },
  { name: 'sage', value: '#83c79d' },
  { name: 'rose', value: '#de8892' },
  { name: 'blue', value: '#7cc1e8' },
]

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

export interface Project {
  id: string
  name: string
  color: string
  archived?: boolean
  /** the project page body — free-form rich text (Notion-style) */
  description?: string
  /** ISO datetime — optional project deadline */
  due?: string
  createdAt?: string
  /** ordered, collapsible content sections on the project page */
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
  priority?: TaskPriority
  /** recurring task: when completed, the next occurrence is created automatically */
  repeat?: RepeatFreq
  /** parked in the Someday/later list, kept out of the board and digest */
  someday?: boolean

  /** event — ISO datetimes */
  start?: string
  end?: string
  allDay?: boolean
  contactIds?: string[]

  /** shared */
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
}

export interface WeavoData {
  version: number
  items: Record<string, Item>
  projects: Record<string, Project>
  goals: Record<string, Goal>
  reflections: Record<string, Reflection>
  contacts: Record<string, Contact>
  reminders: Record<string, Reminder>
  settings: Settings
  google: GoogleIntegration
}
