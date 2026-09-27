import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Flame, Hourglass, Repeat } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { fmtDayMonth, fmtDue, isSameDay } from '@/lib/date'
import { isOnToday } from '@/lib/selectors'
import { PRIORITY_RANK, SPACE_COLOR } from '@/lib/types'
import type { Item, Space, TaskPriority, WeavoData } from '@/lib/types'
import { PRIORITY_COLOR, SourceBadge } from './items'
import { Checkbox, Dot, Segmented, cn } from './ui'

const rank = (p?: TaskPriority) => (p ? PRIORITY_RANK[p] : 3)

/** open before done, burning first, then priority, then due date */
export function byUrgency(a: Item, b: Item) {
  const done = (it: Item) => (it.status === 'done' ? 1 : 0)
  return (
    done(a) - done(b) ||
    Number(!!b.flame) - Number(!!a.flame) ||
    rank(a.priority) - rank(b.priority) ||
    (a.due ?? '9999').localeCompare(b.due ?? '9999')
  )
}

/** the due label for a to-do row: overdue in rose, "for Wednesday" inside a lead window */
function DueLabel({ item, data }: { item: Item; data: WeavoData }) {
  const t = useT()
  if (!item.due) return null
  const due = new Date(item.due)
  const now = new Date()
  const d = fmtDue(item.due)!
  if (item.status !== 'done' && d.overdue && !isSameDay(due, now))
    return <span className="mono text-[10.5px] text-rose">{d.label}</span>
  if (!isSameDay(due, now) && due > now && isOnToday(data, item))
    return (
      <span className="text-[11px] text-sage">
        {t.todo.dueFor(due.getDay())} · {fmtDayMonth(due)}
      </span>
    )
  if (isSameDay(due, now)) {
    const hasTime = due.getHours() !== 0 || due.getMinutes() !== 0
    return hasTime ? <span className="mono text-[10.5px] text-ink-3">{d.label}</span> : null
  }
  return <span className="mono text-[10.5px] text-ink-3">{d.label}</span>
}

export function FlameButton({ item, always }: { item: Item; always?: boolean }) {
  const t = useT()
  const toggleFlame = useStore((s) => s.toggleFlame)
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        toggleFlame(item.id)
      }}
      title={item.flame ? t.todo.flameOff : t.todo.flameOn}
      aria-pressed={!!item.flame}
      className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all hover:bg-surface-3',
        item.flame
          ? 'text-flame'
          : 'text-ink-3 hover:text-ink-2 focus-visible:opacity-100',
        !item.flame && !always && 'opacity-0 group-hover:opacity-100',
      )}
    >
      <Flame size={15} strokeWidth={1.7} fill={item.flame ? 'currentColor' : 'none'} fillOpacity={0.3} />
    </button>
  )
}

/** one task on a to-do list — checkbox, title, context chips, due, flame toggle */
export function TodoRow({
  item,
  showSpace,
  hideContext,
}: {
  item: Item
  /** colored stripe for lists that mix both spaces */
  showSpace?: boolean
  /** drop the tag/project chips when the section already groups by them */
  hideContext?: boolean
}) {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const toggleDone = useStore((s) => s.toggleDone)
  const done = item.status === 'done'
  const project = item.projectId ? data.projects[item.projectId] : undefined
  const waitDays = item.waitingFor
    ? Math.max(0, Math.floor((Date.now() - new Date(item.waitingFor.since).getTime()) / 86_400_000))
    : 0

  return (
    <div
      onClick={() => navigate(`/item/${item.id}`)}
      className="group flex min-h-[42px] cursor-pointer items-center gap-2.5 border-t border-line px-3 py-[7px] first:border-t-0 hover:bg-surface-2"
    >
      {showSpace && (
        <span className="h-5 w-[3px] shrink-0 rounded-full" style={{ background: SPACE_COLOR[item.space] }} />
      )}
      <Checkbox checked={done} onChange={() => toggleDone(item.id)} />
      <div className="min-w-0 flex-1">
        <div className={cn('truncate text-[13px]', done && 'text-ink-3 line-through')}>{item.title}</div>
        <div className="mt-px flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-3 empty:hidden">
          {!hideContext && project && (
            <span className="flex items-center gap-1.5">
              <Dot color={project.color} className="h-1.5 w-1.5" />
              {project.name}
            </span>
          )}
          {!hideContext &&
            item.tags.map((id) =>
              data.tags[id] ? (
                <span key={id} className="flex items-center gap-1.5">
                  <Dot color={data.tags[id].color} className="h-1.5 w-1.5" />
                  {data.tags[id].name}
                </span>
              ) : null,
            )}
          <DueLabel item={item} data={data} />
          {item.repeat && item.repeat !== 'none' && (
            <span className="flex items-center gap-1">
              <Repeat size={11} />
              {t.repeat[item.repeat]}
            </span>
          )}
          {item.waitingFor && (
            <span className="flex items-center gap-1 text-amber">
              <Hourglass size={11} />
              {t.todo.waitingOn(item.waitingFor.who)} · {t.todo.waitingDays(waitDays)}
            </span>
          )}
        </div>
      </div>
      {item.source && <SourceBadge source={item.source} size={12} />}
      {item.priority && (
        <Dot color={PRIORITY_COLOR[item.priority]} title={t.priority[item.priority]} />
      )}
      <FlameButton item={item} />
    </div>
  )
}

export function TodoList({
  items,
  empty,
  hot,
  showSpace,
  hideContext,
}: {
  items: Item[]
  empty?: string
  hot?: boolean
  showSpace?: boolean
  hideContext?: boolean
}) {
  const t = useT()
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border bg-surface',
        hot ? 'border-flame/35' : 'border-line',
      )}
    >
      {items.length ? (
        items.map((it) => (
          <TodoRow key={it.id} item={it} showSpace={showSpace} hideContext={hideContext} />
        ))
      ) : (
        <div className="px-3.5 py-3 text-[12.5px] text-ink-3">{empty ?? t.todo.emptySection}</div>
      )}
    </div>
  )
}

/** a titled block on the to-do page; hidden when empty unless it has an empty message */
export function TodoSection({
  title,
  icon,
  dot,
  hint,
  items,
  hot,
  empty,
  hideContext,
  showSpace,
  collapsible,
  defaultOpen = true,
  children,
}: {
  title: string
  icon?: ReactNode
  dot?: string
  hint?: string
  items: Item[]
  hot?: boolean
  empty?: string
  hideContext?: boolean
  showSpace?: boolean
  collapsible?: boolean
  defaultOpen?: boolean
  children?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!items.length && !empty && !collapsible) return null
  const openCount = items.filter((it) => it.status !== 'done').length
  const head = (
    <>
      {collapsible && (
        <ChevronRight size={13} className={cn('transition-transform', open && 'rotate-90')} />
      )}
      {icon}
      {dot && <Dot color={dot} />}
      {title}
      <span className="mono text-[10.5px] font-normal text-ink-3">{openCount}</span>
    </>
  )
  return (
    <section className="mb-6">
      <div
        className={cn(
          'flex items-center gap-2 px-1 pb-2 text-[12px] font-semibold',
          hot ? 'text-flame' : 'text-ink-2',
        )}
      >
        {collapsible ? (
          <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2 hover:text-ink">
            {head}
          </button>
        ) : (
          head
        )}
        {hint && <span className="ml-auto text-[11px] font-normal text-ink-3">{hint}</span>}
      </div>
      {(!collapsible || open) &&
        (children ?? (
          <TodoList items={items} empty={empty} hot={hot} hideContext={hideContext} showSpace={showSpace} />
        ))}
    </section>
  )
}

export function ProgressBar({ items, split }: { items: Item[]; split?: boolean }) {
  const n = items.length || 1
  const doneOf = (sp?: Space) =>
    items.filter((it) => it.status === 'done' && (!sp || it.space === sp)).length
  return (
    <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-surface-3">
      {split ? (
        <>
          <i className="h-full transition-[width]" style={{ width: `${(doneOf('personal') / n) * 100}%`, background: SPACE_COLOR.personal }} />
          <i className="h-full transition-[width]" style={{ width: `${(doneOf('work') / n) * 100}%`, background: SPACE_COLOR.work }} />
        </>
      ) : (
        <i className="h-full bg-sage transition-[width]" style={{ width: `${(doneOf() / n) * 100}%` }} />
      )}
    </div>
  )
}

/** Osobní / Práce / (Vše) switch shared by Home and Calendar */
export function SpaceFilterSwitch() {
  const t = useT()
  const value = useStore((s) => s.data.settings.spaceFilter)
  const updateSettings = useStore((s) => s.updateSettings)
  return (
    <Segmented
      options={[
        { value: 'all', label: t.spaces.all },
        { value: 'personal', label: <><Dot color={SPACE_COLOR.personal} className="h-1.5 w-1.5" />{t.spaces.personal}</> },
        { value: 'work', label: <><Dot color={SPACE_COLOR.work} className="h-1.5 w-1.5" />{t.spaces.work}</> },
      ]}
      value={value}
      onChange={(v) => updateSettings({ spaceFilter: v })}
    />
  )
}
