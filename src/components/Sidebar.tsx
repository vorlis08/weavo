import { useMemo } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { BookOpen, Inbox, Mail, Plus, Search, Settings } from 'lucide-react'
import { views } from '@/lib/nav'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { Badge, Dot, Kbd, SectionLabel, cn } from './ui'

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex h-[31px] items-center gap-2.5 rounded-md px-2.5 text-[12.75px] font-medium transition-colors',
    isActive ? 'bg-iris/12 text-iris-2' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  )
}

export function Sidebar() {
  const t = useT()
  const navigate = useNavigate()
  const openCapture = useStore((s) => s.openCapture)
  const setPalette = useStore((s) => s.setPalette)
  const projectsRec = useStore((s) => s.data.projects)
  const items = useStore((s) => s.data.items)
  const googleConnected = useStore((s) => s.data.google.connected)
  const projects = useMemo(
    () => Object.values(projectsRec).filter((p) => !p.archived),
    [projectsRec],
  )

  const countFor = (projectId: string) =>
    Object.values(items).filter(
      (it) => it.projectId === projectId && it.status !== 'done',
    ).length
  const unsortedCount = Object.values(items).filter((it) => it.unsorted).length

  return (
    <aside className="flex w-[232px] shrink-0 flex-col border-r border-line bg-[#0c0d10] px-3.5 py-[18px]">
      <div className="flex items-center gap-2.5 px-2 pb-4 pt-0.5">
        <div className="flex h-[22px] w-[22px] items-center justify-center rounded-[7px] bg-gradient-to-br from-iris to-[#6f76d9]">
          <svg viewBox="0 0 24 24" className="h-[13px] w-[13px]" fill="none" stroke="#0b0c0e" strokeWidth={2.3} strokeLinecap="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
        <span className="text-[14.5px] font-semibold tracking-[-0.02em]">Weavo</span>
      </div>

      <button
        data-tour="capture"
        onClick={() => openCapture()}
        className="mb-[7px] flex h-8 w-full items-center gap-[7px] rounded-lg bg-iris px-[13px] text-[12.5px] font-semibold text-[#0b0c0e] transition-colors hover:bg-iris-2"
      >
        <Plus size={16} strokeWidth={1.7} />
        {t.capture.title}
        <span className="mono ml-auto text-[10px] opacity-55">C</span>
      </button>

      <button
        data-tour="search"
        onClick={() => setPalette(true)}
        className="mb-4 flex h-8 items-center gap-2.5 rounded-lg border border-line px-2.5 text-ink-3 transition-colors hover:border-line-2 hover:text-ink-2"
      >
        <Search size={13} strokeWidth={1.6} />
        <span className="text-[12px]">{t.common.search}</span>
        <span className="mono ml-auto text-[10px]">⌘K</span>
      </button>

      <SectionLabel className="px-2.5 pb-[7px]">{t.nav.views}</SectionLabel>
      <nav data-tour="views">
        {views.map((v) => (
          <NavLink key={v.id} to={v.path} end={v.path === '/'} className={navClass}>
            <v.icon size={16} strokeWidth={1.5} />
            {t.nav[v.id]}
          </NavLink>
        ))}
        {googleConnected && (
          <NavLink to="/mail" className={navClass}>
            <Mail size={16} strokeWidth={1.5} />
            {t.nav.mail}
          </NavLink>
        )}
      </nav>

      <div
        data-tour="projects"
        className="flex items-center justify-between px-2.5 pb-[7px] pt-[17px]"
      >
        <SectionLabel>{t.nav.projects}</SectionLabel>
        <button
          onClick={() => navigate('/settings')}
          className="text-ink-3 transition-colors hover:text-ink-2"
          title={t.nav.manageProjects}
        >
          <Plus size={13} />
        </button>
      </div>
      {projects.length === 0 && (
        <p className="px-2.5 pb-1 text-[11px] leading-relaxed text-ink-3">
          {t.nav.addProjectHint}
        </p>
      )}
      {projects.map((p) => (
        <NavLink
          key={p.id}
          to={`/project/${p.id}`}
          className={({ isActive }) =>
            cn(
              'flex h-[31px] items-center gap-2.5 rounded-md px-2.5 text-[12.75px] font-medium transition-colors',
              isActive ? 'bg-iris/12 text-iris-2' : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
            )
          }
        >
          <Dot color={p.color} />
          <span className="truncate">{p.name}</span>
          {countFor(p.id) > 0 && (
            <span className="mono ml-auto text-[11px] text-ink-3">{countFor(p.id)}</span>
          )}
        </NavLink>
      ))}

      <div className="mt-auto border-t border-line pt-3">
        <NavLink to="/triage" className={navClass}>
          <Inbox size={16} strokeWidth={1.5} />
          {t.nav.unsorted}
          {unsortedCount > 0 && <Badge tone="accent">{unsortedCount}</Badge>}
        </NavLink>
        <NavLink to="/guide" className={navClass}>
          <BookOpen size={16} strokeWidth={1.5} />
          {t.nav.guide}
        </NavLink>
        <NavLink to="/settings" className={navClass} data-tour="settings">
          <Settings size={16} strokeWidth={1.5} />
          {t.nav.settings}
        </NavLink>
      </div>

      <div className="px-2.5 pt-2">
        <Kbd>?</Kbd> <span className="text-[10px] text-ink-3">{t.nav.shortcuts}</span>
      </div>
    </aside>
  )
}
