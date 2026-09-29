import { NavLink } from 'react-router-dom'
import { useT } from '@/lib/i18n'
import { cn } from './ui'

/** Journal and Goals share one sidebar entry; this switches between them */
export function ReflectionTabs() {
  const t = useT()
  const cls = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex h-7 items-center rounded-[7px] px-3 text-sm font-medium transition-colors',
      isActive ? 'bg-surface-3 text-ink' : 'text-ink-3 hover:text-ink',
    )
  return (
    <div className="inline-flex gap-0.5 rounded-[10px] border border-line bg-surface p-[3px]">
      <NavLink to="/reflection" className={cls}>
        {t.reflectionTabs.journal}
      </NavLink>
      <NavLink to="/goals" className={cls}>
        {t.reflectionTabs.goals}
      </NavLink>
    </div>
  )
}
