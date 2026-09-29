import { useMemo, useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, ChevronRight, Ellipsis, Inbox, Mail, Plus, Search, Settings } from 'lucide-react'
import { mainViews, moreViews } from '@/lib/nav'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { todayTasks } from '@/lib/selectors'
import { PROJECT_COLORS, SPACE_COLOR } from '@/lib/types'
import type { Space } from '@/lib/types'
import { WeavoLogo } from './brand'
import { Avatar, Badge, Kbd, ProjectGlyph, SpaceThread, cn } from './ui'

const itemCls = (active: boolean) =>
  cn(
    'group flex h-9 w-full items-center gap-3 rounded-[9px] px-2.5 text-base font-medium transition-colors',
    active ? 'bg-surface-2 text-ink [&>svg]:text-iris' : 'text-ink-2 hover:bg-surface hover:text-ink',
  )
const navClass = ({ isActive }: { isActive: boolean }) => itemCls(isActive)

/** the sidebar; on phones the same content opens as a drawer (`onNavigate` closes it) */
export function Sidebar({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const t = useT()
  const navigate = useNavigate()
  const location = useLocation()
  const openCapture = useStore((s) => s.openCapture)
  const setPalette = useStore((s) => s.setPalette)
  const addProject = useStore((s) => s.addProject)
  const data = useStore((s) => s.data)
  const projectsRec = data.projects
  const [creating, setCreating] = useState<Space | null>(null)
  const [draft, setDraft] = useState('')
  const inMore = ['/timeline', '/notes', '/mail'].some((p) => location.pathname.startsWith(p))
  const [moreOpen, setMoreOpen] = useState(inMore)
  const projects = useMemo(
    () => Object.values(projectsRec).filter((p) => p.status === 'active'),
    [projectsRec],
  )

  const openToday = todayTasks(data).filter((it) => it.status !== 'done').length
  const countFor = (projectId: string) =>
    Object.values(data.items).filter(
      (it) => it.projectId === projectId && it.kind === 'task' && it.status !== 'done' && !it.someday,
    ).length
  const unsortedCount = Object.values(data.items).filter((it) => it.unsorted).length

  function createProject() {
    const name = draft.trim()
    const space = creating
    setDraft('')
    setCreating(null)
    if (!name || !space) return
    const color = PROJECT_COLORS[Object.keys(projectsRec).length % PROJECT_COLORS.length].value
    const p = addProject(name, color, space)
    navigate(`/project/${p.id}`)
    onNavigate?.()
  }

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : path === '/reflection'
        ? /^\/(reflection|goals?)(\/|$)/.test(location.pathname)
        : path === '/projects'
          ? location.pathname === '/projects'
          : location.pathname.startsWith(path)

  return (
    <aside
      className={cn(
        'flex w-[236px] shrink-0 flex-col overflow-y-auto border-r border-line bg-side px-3 pb-3.5 pt-[18px]',
        className,
      )}
      onClick={(e) => {
        if (onNavigate && (e.target as HTMLElement).closest('a')) onNavigate()
      }}
    >
      <div className="px-2.5 pb-[18px] pt-0.5">
        <WeavoLogo />
      </div>

      <button
        data-tour="capture"
        onClick={() => {
          onNavigate?.()
          openCapture()
        }}
        className="mb-[18px] flex h-[38px] shrink-0 items-center gap-2.5 rounded-[10px] border border-line-2 bg-surface px-2.5 text-base text-ink-2 transition-colors hover:border-line-3 hover:bg-surface-2 hover:text-ink"
      >
        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-iris text-iris-ink">
          <Plus size={13} strokeWidth={2.4} />
        </span>
        {t.nav.capture}
        <span className="ml-auto max-md:hidden">
          <Kbd>C</Kbd>
        </span>
      </button>

      <nav data-tour="views" className="flex flex-col gap-px">
        {mainViews.map((v) => (
          <NavLink key={v.id} to={v.path} className={() => itemCls(isActive(v.path))}>
            <v.icon size={18} strokeWidth={1.6} />
            {t.nav[v.id]}
            {v.id === 'todo' && openToday > 0 && (
              <span className="mono ml-auto text-sm font-normal text-ink-3">{openToday}</span>
            )}
          </NavLink>
        ))}
        <button onClick={() => setMoreOpen((o) => !o)} className={itemCls(false)} aria-expanded={moreOpen}>
          <Ellipsis size={18} strokeWidth={1.6} />
          {t.nav.more}
          <ChevronRight size={14} className={cn('ml-auto text-ink-3 transition-transform', moreOpen && 'rotate-90')} />
        </button>
        {moreOpen && (
          <div className="flex flex-col gap-px pl-[30px]">
            {moreViews.map((v) => (
              <NavLink key={v.id} to={v.path} className={(a) => cn(navClass(a), 'h-8 text-sm')}>
                {t.nav[v.id]}
              </NavLink>
            ))}
            {data.google.connected && (
              <NavLink to="/mail" className={(a) => cn(navClass(a), 'h-8 text-sm')}>
                <Mail size={15} strokeWidth={1.6} />
                {t.nav.mail}
              </NavLink>
            )}
          </div>
        )}
      </nav>

      <div data-tour="projects">
        {(['work', 'personal'] as Space[]).map((space) => {
          const list = projects.filter((p) => p.space === space)
          return (
            <div key={space}>
              <div className="group/sec flex items-center gap-2 px-2.5 pb-1.5 pt-[22px] text-sm font-medium text-ink-3">
                <SpaceThread color={SPACE_COLOR[space]} className="w-3.5" />
                {t.spaces[space]}
                <button
                  onClick={() => {
                    setCreating((c) => (c === space ? null : space))
                    setDraft('')
                  }}
                  className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-ink-3 opacity-60 transition hover:bg-surface-2 hover:text-ink group-hover/sec:opacity-100"
                  title={t.nav.manageProjects}
                  aria-label={t.nav.manageProjects}
                >
                  <Plus size={14} />
                </button>
              </div>
              {creating === space && (
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={createProject}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') createProject()
                    if (e.key === 'Escape') {
                      setDraft('')
                      setCreating(null)
                    }
                  }}
                  placeholder={t.project.newProjectName}
                  className="mx-1 mb-1 h-8 w-[calc(100%-8px)] rounded-lg border border-line-2 bg-surface px-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-iris/60"
                />
              )}
              {list.map((p) => (
                <NavLink
                  key={p.id}
                  to={`/project/${p.id}`}
                  className={({ isActive: a }) =>
                    cn(
                      'flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] transition-colors',
                      a ? 'bg-surface-2 text-ink' : 'text-ink-2 hover:bg-surface hover:text-ink',
                    )
                  }
                >
                  <ProjectGlyph color={p.color} />
                  <span className="truncate">{p.name}</span>
                  {countFor(p.id) > 0 && <span className="mono ml-auto text-sm text-ink-3">{countFor(p.id)}</span>}
                </NavLink>
              ))}
              {list.length === 0 && creating !== space && (
                <p className="px-2.5 py-1 text-sm text-ink-4">{t.nav.noProjectsInSpace}</p>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-auto flex flex-col gap-px border-t border-line pt-3">
        {unsortedCount > 0 && (
          <NavLink to="/triage" className={navClass}>
            <Inbox size={18} strokeWidth={1.6} />
            {t.nav.unsorted}
            <span className="ml-auto">
              <Badge tone="accent">{unsortedCount}</Badge>
            </span>
          </NavLink>
        )}
        <button
          data-tour="search"
          onClick={() => {
            onNavigate?.()
            setPalette(true)
          }}
          className={itemCls(false)}
        >
          <Search size={18} strokeWidth={1.6} />
          {t.common.search}
          <span className="ml-auto max-md:hidden">
            <Kbd>⌘K</Kbd>
          </span>
        </button>
        <NavLink to="/guide" className={navClass}>
          <BookOpen size={18} strokeWidth={1.6} />
          {t.nav.guide}
        </NavLink>
        <NavLink to="/settings" className={navClass} data-tour="settings">
          <Settings size={18} strokeWidth={1.6} />
          {t.nav.settings}
        </NavLink>
        {data.settings.displayName && (
          <div className="flex items-center gap-2.5 px-2.5 pt-2 text-sm text-ink-2">
            <Avatar name={data.settings.displayName} size={24} />
            {data.settings.displayName}
          </div>
        )}
      </div>
    </aside>
  )
}
