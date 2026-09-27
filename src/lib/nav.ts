import {
  CalendarDays,
  FolderKanban,
  GanttChartSquare,
  Home,
  ListChecks,
  Moon,
  Network,
  type LucideIcon,
} from 'lucide-react'

export type ViewId = 'home' | 'todo' | 'calendar' | 'projects' | 'reflection' | 'timeline' | 'notes'

export interface ViewDef {
  id: ViewId
  path: string
  icon: LucideIcon
}

/** the sidebar's main navigation */
export const mainViews: ViewDef[] = [
  { id: 'home', path: '/', icon: Home },
  { id: 'todo', path: '/todo', icon: ListChecks },
  { id: 'calendar', path: '/calendar', icon: CalendarDays },
  { id: 'projects', path: '/projects', icon: FolderKanban },
  { id: 'reflection', path: '/reflection', icon: Moon },
]

/** kept but tucked into the collapsed "More" group */
export const moreViews: ViewDef[] = [
  { id: 'timeline', path: '/timeline', icon: GanttChartSquare },
  { id: 'notes', path: '/notes', icon: Network },
]

export const views: ViewDef[] = [...mainViews, ...moreViews]
