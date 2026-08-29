export type ItemKind = 'event' | 'task' | 'note'

export type SourceKind = 'gmail' | 'slack' | 'notion' | 'drive' | 'gcal'

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'

export type AccentName = 'iris' | 'amber' | 'rose' | 'sage' | 'ink'

export interface Project {
  id: string
  name: string
  color: string
}

export interface Contact {
  id: string
  name: string
  initials: string
  role?: string
  tintBg: string
  tintFg: string
}

export type ReminderKind = 'time' | 'context' | 'escalation'
export type ReminderState = 'active' | 'overdue' | 'snoozed' | 'upcoming'

export interface Reminder {
  id: string
  kind: ReminderKind
  label: string
  detail: string
  state: ReminderState
}

interface ItemBase {
  id: string
  title: string
  projectId?: string
  source?: SourceKind
  tags: string[]
  suggestedTags?: string[]
  unsorted?: boolean
  capturedAgo?: string
}

export interface TaskItem extends ItemBase {
  kind: 'task'
  status: TaskStatus
  code?: string
  start?: string
  due?: string
  description?: string
  blockedBy: string[]
  blocks: string[]
  linkedNoteIds: string[]
  contactIds: string[]
  reminders: Reminder[]
  checklist?: { done: number; total: number }
  activity?: { at: string; text: string }[]
  suggestedTime?: { label: string; reason: string }
  conflict?: string
}

export interface EventItem extends ItemBase {
  kind: 'event'
  /** 0 = Monday … 4 = Friday of the shown week */
  day: number
  startH: number
  endH: number
  contactIds: string[]
  milestone?: boolean
  conflict?: string
  needsTime?: boolean
  accent?: AccentName
}

export interface NoteItem extends ItemBase {
  kind: 'note'
  snippet: string
  /** ids of items this note links out to */
  links: string[]
  /** ids of items that link back to this note */
  backlinks: string[]
}

export type Item = TaskItem | EventItem | NoteItem

export interface NavView {
  id: string
  label: string
  path: string
}
