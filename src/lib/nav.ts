import {
  CalendarDays,
  Columns3,
  LayoutGrid,
  GanttChartSquare,
  Network,
  Sunrise,
  type LucideIcon,
} from 'lucide-react'

export interface ViewDef {
  id: string
  label: string
  path: string
  icon: LucideIcon
}

export const views: ViewDef[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', path: '/calendar', icon: CalendarDays },
  { id: 'kanban', label: 'Board', path: '/board', icon: Columns3 },
  { id: 'timeline', label: 'Timeline', path: '/timeline', icon: GanttChartSquare },
  { id: 'notes', label: 'Notes map', path: '/notes', icon: Network },
  { id: 'digest', label: 'Digest', path: '/digest', icon: Sunrise },
]
