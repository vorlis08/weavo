export type ItemKind = 'event' | 'task' | 'note'

export type SourceKind = 'gmail' | 'gcal' | 'slack'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export type AccentName = 'iris' | 'amber' | 'rose' | 'sage' | 'blue'

export const PROJECT_COLORS: { name: AccentName; value: string }[] = [
  { name: 'iris', value: '#8d93ef' },
  { name: 'amber', value: '#dfa871' },
  { name: 'sage', value: '#83c79d' },
  { name: 'rose', value: '#de8892' },
  { name: 'blue', value: '#7cc1e8' },
]

export interface Project {
  id: string
  name: string
  color: string
  archived?: boolean
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

export interface Settings {
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
  contacts: Record<string, Contact>
  reminders: Record<string, Reminder>
  settings: Settings
  google: GoogleIntegration
}
