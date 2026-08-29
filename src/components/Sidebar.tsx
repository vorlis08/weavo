import { NavLink } from 'react-router-dom'
import { Inbox, Plus, Search, SlidersHorizontal } from 'lucide-react'
import { views } from '@/lib/nav'
import { projects, projectCounts } from '@/lib/mockData'
import { useUI } from '@/lib/store'
import { Badge, Dot, SectionLabel, cn } from './ui'

function navClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex h-[31px] items-center gap-2.5 rounded-md px-2.5 text-[12.75px] font-medium transition-colors',
    isActive
      ? 'bg-iris/12 text-iris-2'
      : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
  )
}

export function Sidebar() {
  const openCapture = useUI((s) => s.openCapture)

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
        onClick={() => openCapture()}
        className="mb-[7px] flex h-8 w-full items-center gap-[7px] rounded-lg bg-iris px-[13px] text-[12.5px] font-semibold text-[#0b0c0e] transition-colors hover:bg-iris-2"
      >
        <Plus size={16} strokeWidth={1.7} />
        Quick capture
        <span className="mono ml-auto text-[10px] opacity-55">C</span>
      </button>

      <div className="mb-4 flex h-8 items-center gap-2.5 rounded-lg border border-line px-2.5 text-ink-3">
        <Search size={13} strokeWidth={1.6} />
        <span className="text-[12px]">Search</span>
        <span className="mono ml-auto text-[10px]">K</span>
      </div>

      <SectionLabel className="px-2.5 pb-[7px]">Views</SectionLabel>
      {views.map((v) => (
        <NavLink key={v.id} to={v.path} end={v.path === '/'} className={navClass}>
          <v.icon size={16} strokeWidth={1.5} />
          {v.label}
          {!v.implemented && (
            <span className="mono ml-auto text-[9px] text-ink-3">soon</span>
          )}
        </NavLink>
      ))}

      <SectionLabel className="px-2.5 pb-[7px] pt-[17px]">Projects</SectionLabel>
      {projects.map((p) => (
        <div key={p.id} className="flex h-[31px] items-center gap-2.5 rounded-md px-2.5 text-[12.75px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <Dot color={p.color} />
          {p.name}
          <span className="mono ml-auto text-[11px] text-ink-3">{projectCounts[p.id]}</span>
        </div>
      ))}

      <div className="mt-auto border-t border-line pt-3">
        <div className="flex h-[31px] items-center justify-between rounded-md px-2.5 text-[12.75px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <span className="flex items-center gap-2.5">
            <Inbox size={16} strokeWidth={1.5} />
            Unsorted
          </span>
          <Badge tone="accent">7</Badge>
        </div>
        <div className="flex h-[31px] items-center gap-2.5 rounded-md px-2.5 text-[12.75px] font-medium text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink">
          <SlidersHorizontal size={16} strokeWidth={1.5} />
          Settings
        </div>
      </div>
    </aside>
  )
}
