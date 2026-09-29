import { useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { CalendarDays, FolderKanban, Home, ListChecks, Menu, Plus, Search } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { WeavoLogo } from './brand'
import { Sidebar } from './Sidebar'
import { cn } from './ui'

/** phone header: menu (opens the sidebar), logo, search */
export function MobileTopBar({ onMenu }: { onMenu: () => void }) {
  const t = useT()
  const setPalette = useStore((s) => s.setPalette)
  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-line bg-bg/90 px-2 pb-2 pt-[calc(8px+env(safe-area-inset-top,0px))] backdrop-blur-md md:hidden">
      <button
        onClick={onMenu}
        className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 active:bg-surface-2"
        aria-label={t.nav.menu}
      >
        <Menu size={20} strokeWidth={1.7} />
      </button>
      <WeavoLogo />
      <button
        onClick={() => setPalette(true)}
        className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl text-ink-2 active:bg-surface-2"
        aria-label={t.common.search}
      >
        <Search size={19} strokeWidth={1.7} />
      </button>
    </header>
  )
}

/** phone tab bar with the capture button in the middle */
export function MobileTabBar() {
  const t = useT()
  const openCapture = useStore((s) => s.openCapture)
  const location = useLocation()
  const tab = (to: string, Icon: typeof Home, label: string, match: (p: string) => boolean) => {
    const on = match(location.pathname)
    return (
      <NavLink
        to={to}
        className={cn(
          'flex min-w-[58px] flex-col items-center gap-1 py-1 text-[11px] font-medium',
          on ? 'text-ink' : 'text-ink-3',
        )}
      >
        <Icon size={21} strokeWidth={1.6} className={on ? 'text-iris' : undefined} />
        {label}
      </NavLink>
    )
  }
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-side/92 px-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))] pt-2 backdrop-blur-lg md:hidden">
      {tab('/', Home, t.nav.home, (p) => p === '/')}
      {tab('/todo', ListChecks, t.nav.todo, (p) => p.startsWith('/todo'))}
      <button
        onClick={() => openCapture()}
        className="flex h-12 w-12 items-center justify-center rounded-2xl bg-iris text-iris-ink shadow-[0_8px_24px_-6px_rgb(158_160_247/0.5)] active:scale-95"
        aria-label={t.nav.capture}
      >
        <Plus size={22} strokeWidth={2.2} />
      </button>
      {tab('/calendar', CalendarDays, t.nav.calendar, (p) => p.startsWith('/calendar'))}
      {tab('/projects', FolderKanban, t.nav.projects, (p) => p.startsWith('/project'))}
    </nav>
  )
}

/** the full sidebar as a drawer on phones */
export function SidebarDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const location = useLocation()
  // close whenever the route changes
  useEffect(() => {
    onClose()
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-[#060609]/60 backdrop-blur-[2px] [animation:fade-in_.18s]" onClick={onClose} />
      <Sidebar
        onNavigate={onClose}
        className="absolute inset-y-0 left-0 w-[min(300px,86vw)] pt-[calc(18px+env(safe-area-inset-top,0px))] shadow-[30px_0_80px_rgba(0,0,0,0.45)] [animation:drawer-left_.26s_var(--ease-out-soft)]"
      />
    </div>
  )
}
