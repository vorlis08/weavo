import { views } from '@/lib/nav'
import { TopBar } from '@/components/TopBar'

const blurb: Record<string, string> = {
  calendar: 'Full month and day views with drag-to-reschedule and conflict detection.',
  timeline: 'A Gantt-style lane per project with task dependencies drawn as links.',
  notes: 'A force-directed graph of notes and their backlinks — click a node to open it.',
  digest: 'Your daily and weekly rollup: what is coming up, what slipped, what to defer.',
}

export function Placeholder({ id }: { id: string }) {
  const view = views.find((v) => v.id === id)
  if (!view) return null
  const Icon = view.icon
  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">{view.label}</h1>
      </TopBar>
      <div className="flex flex-1 items-center justify-center p-10">
        <div className="max-w-[360px] text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-surface text-ink-3">
            <Icon size={22} strokeWidth={1.5} />
          </div>
          <h2 className="text-[15px]">{view.label} view</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{blurb[id]}</p>
          <p className="mono mt-4 text-[10.5px] text-ink-3">Not built yet in this preview</p>
        </div>
      </div>
    </>
  )
}
