import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarClock, CheckCircle2, Clock3, Inbox, TriangleAlert } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { Badge, EmptyState } from '@/components/ui'
import { CompletedRow, TaskRow } from '@/components/items'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { dateLocale, fmtTime } from '@/lib/date'
import { buildDigest } from '@/lib/selectors'
import type { Item } from '@/lib/types'

function Section({
  icon: Icon,
  title,
  count,
  tone,
  children,
}: {
  icon: typeof Clock3
  title: string
  count: number
  tone?: 'rose' | 'amber'
  children: React.ReactNode
}) {
  if (count === 0) return null
  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center gap-2">
        <Icon
          size={14}
          strokeWidth={1.6}
          className={tone === 'rose' ? 'text-rose' : tone === 'amber' ? 'text-amber' : 'text-ink-2'}
        />
        <h2 className="text-[13.5px] font-semibold">{title}</h2>
        <Badge tone={tone ?? 'default'}>{count}</Badge>
      </div>
      <div className="rounded-xl border border-line bg-surface p-1.5">{children}</div>
    </section>
  )
}

function EventRow({ item }: { item: Item }) {
  const t = useT()
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/item/${item.id}`)}
      className="flex w-full items-center gap-2.5 rounded-md px-1.5 py-1.5 text-left hover:bg-surface-2"
    >
      <span className="mono w-14 shrink-0 text-[11px] text-ink-3">
        {item.allDay ? t.digest.allDay : fmtTime(item.start!)}
      </span>
      <span className="min-w-0 flex-1 truncate text-[12.5px]">{item.title}</span>
    </button>
  )
}

export function Digest() {
  const t = useT()
  const data = useStore((s) => s.data)
  const digest = useMemo(() => buildDigest(data), [data])

  const total =
    digest.todayEvents.length +
    digest.dueToday.length +
    digest.overdue.length +
    digest.upcoming.length +
    digest.unsorted.length +
    digest.stale.length +
    digest.completedToday.length

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.digest.title}</h1>
        <span className="mono text-ink-3">
          {new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </TopBar>

      <div className="flex-1 overflow-y-auto px-8 py-7">
        <div className="mx-auto max-w-[620px]">
          {total === 0 ? (
            <EmptyState
              icon={<CalendarClock size={22} strokeWidth={1.5} />}
              title={t.digest.emptyTitle}
              hint={t.digest.emptyHint}
            />
          ) : (
            <>
              <Section icon={CalendarClock} title={t.digest.sTodayEvents} count={digest.todayEvents.length}>
                {digest.todayEvents.map((it) => (
                  <EventRow key={it.id} item={it} />
                ))}
              </Section>
              <Section icon={TriangleAlert} title={t.digest.sOverdue} count={digest.overdue.length} tone="rose">
                {digest.overdue.map((it) => (
                  <TaskRow key={it.id} item={it} />
                ))}
              </Section>
              <Section icon={Clock3} title={t.digest.sDueToday} count={digest.dueToday.length} tone="amber">
                {digest.dueToday.map((it) => (
                  <TaskRow key={it.id} item={it} />
                ))}
              </Section>
              <Section icon={CalendarClock} title={t.digest.sUpcoming} count={digest.upcoming.length}>
                {digest.upcoming.map((it) => (
                  <TaskRow key={it.id} item={it} />
                ))}
              </Section>
              <Section icon={Inbox} title={t.digest.sInbox} count={digest.unsorted.length}>
                {digest.unsorted.map((it) => (
                  <TaskRow key={it.id} item={it} />
                ))}
              </Section>
              <Section icon={Clock3} title={t.digest.sStale} count={digest.stale.length}>
                {digest.stale.map((it) => (
                  <TaskRow key={it.id} item={it} />
                ))}
              </Section>
              <Section icon={CheckCircle2} title={t.digest.sDoneToday} count={digest.completedToday.length}>
                {digest.completedToday.map((it) => (
                  <CompletedRow key={it.id} item={it} />
                ))}
              </Section>
            </>
          )}
        </div>
      </div>
    </>
  )
}
