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
  implemented: boolean
}

export const views: ViewDef[] = [
  { id: 'dashboard', label: 'Dashboard', path: '/', icon: LayoutGrid, implemented: true },
  { id: 'calendar', label: 'Calendar', path: '/calendar', icon: CalendarDays, implemented: false },
  { id: 'kanban', label: 'Kanban', path: '/kanban', icon: Columns3, implemented: true },
  { id: 'timeline', label: 'Timeline', path: '/timeline', icon: GanttChartSquare, implemented: false },
  { id: 'notes', label: 'Notes map', path: '/notes', icon: Network, implemented: false },
  { id: 'digest', label: 'Digest', path: '/digest', icon: Sunrise, implemented: false },
]
