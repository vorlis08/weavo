import {
  CalendarDays,
  Columns3,
  LayoutGrid,
  GanttChartSquare,
  Network,
  Sunrise,
  type LucideIcon,
} from 'lucide-react'

export type ViewId = 'dashboard' | 'calendar' | 'board' | 'timeline' | 'notes' | 'digest'

export interface ViewDef {
  id: ViewId
  path: string
  icon: LucideIcon
}

export const views: ViewDef[] = [
  { id: 'dashboard', path: '/', icon: LayoutGrid },
  { id: 'calendar', path: '/calendar', icon: CalendarDays },
  { id: 'board', path: '/board', icon: Columns3 },
  { id: 'timeline', path: '/timeline', icon: GanttChartSquare },
  { id: 'notes', path: '/notes', icon: Network },
  { id: 'digest', path: '/digest', icon: Sunrise },
]
