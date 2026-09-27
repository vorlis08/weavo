import { NavLink } from 'react-router-dom'
import { useT } from '@/lib/i18n'
import { cn } from './ui'

/** Journal and Goals share one sidebar entry; this switches between them */
export function ReflectionTabs() {
  const t = useT()
  const cls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-7 items-center rounded-md px-3 text-[12.5px] font-medium transition-colors',
      isActive ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:text-ink',
    )
  return (
    <div className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5">
      <NavLink to="/reflection" className={cls}>
        {t.reflectionTabs.journal}
      </NavLink>
      <NavLink to="/goals" className={cls}>
        {t.reflectionTabs.goals}
      </NavLink>
    </div>
  )
}
