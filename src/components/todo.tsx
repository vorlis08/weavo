import { useState, type ReactNode } from 'react'
import { ChevronRight, Flame, Hourglass, Repeat } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { daysUntil, fmtRelDay, fmtShort, fmtTime } from '@/lib/date'
import { isOnToday } from '@/lib/selectors'
import { PRIORITY_RANK, SPACES, SPACE_COLOR } from '@/lib/types'
import type { Item, Space, TaskPriority, WeavoData } from '@/lib/types'
import { SourceBadge } from './items'
import { Checkbox, ProjectGlyph, Segmented, SpaceThread, cn } from './ui'

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

const hasTime = (iso: string) => {
  const d = new Date(iso)
  return d.getHours() !== 0 || d.getMinutes() !== 0
}

const metaCls = 'inline-flex items-center gap-1.5 whitespace-nowrap'

/**
 * The due label of a row. Overdue reads in rose, a task showing early in its
 * lead window reads "for Wednesday" in jade; on the today list a plain
 * "today" is left out because the list already says it.
 */
export function DueLabel({ item, data, ctx }: { item: Item; data: WeavoData; ctx?: 'today' }) {
  const t = useT()
  if (!item.due || item.status === 'done') return null
  const n = daysUntil(item.due)
  const time = hasTime(item.due) ? ` ${fmtTime(item.due)}` : ''
  if (n < 0)
    return (
      <span className={cn(metaCls, 'text-rose')}>
        {t.todo.overdueLabel} · {fmtRelDay(item.due)}
      </span>
    )
  if (n > 0 && ctx === 'today' && isOnToday(data, item))
    return (
      <span className={cn(metaCls, 'text-sage')}>
        {t.todo.dueFor(new Date(item.due).getDay())} · {fmtShort(item.due)}
      </span>
    )
  if (n === 0)
    return ctx === 'today' && !time ? null : (
      <span className={cn(metaCls, 'text-ink-2')}>
        {fmtRelDay(item.due)}
        {time}
      </span>
    )
  return (
    <span className={metaCls}>
      {fmtRelDay(item.due)}
      {time}
    </span>
  )
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
      aria-label={item.flame ? t.todo.flameOff : t.todo.flameOn}
      aria-pressed={!!item.flame}
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-[opacity,color,background-color] hover:bg-surface-3',
        item.flame ? 'text-flame' : 'text-ink-4 hover:text-ink-2 focus-visible:opacity-100',
        !item.flame && !always && 'opacity-0 group-hover/row:opacity-100 max-md:hidden',
      )}
    >
      <Flame size={14} strokeWidth={1.7} fill={item.flame ? 'currentColor' : 'none'} fillOpacity={0.28} />
    </button>
  )
}

/** one task — one line: checkbox, title, then project and due in fixed columns on the right */
export function TodoRow({
  item,
  showSpace,
  hideProject,
  hideTags,
  ctx,
}: {
  item: Item
  /** a colored thread on the left, for lists that mix both spaces */
  showSpace?: boolean
  hideProject?: boolean
  hideTags?: boolean
  ctx?: 'today'
}) {
  const t = useT()
  const data = useStore((s) => s.data)
  const toggleDone = useStore((s) => s.toggleDone)
  const openPeek = useStore((s) => s.openPeek)
  const done = item.status === 'done'
  const project = item.projectId ? data.projects[item.projectId] : undefined
  const waitDays = item.waitingFor ? Math.max(0, -daysUntil(item.waitingFor.since)) : 0
  const steps = item.checklist ?? []
  const tags = hideTags ? [] : item.tags.filter((id) => data.tags[id])
  const extras = (
    <>
      {tags.map((id) => (
        <span key={id} className={metaCls}>
          #{data.tags[id].name}
        </span>
      ))}
      {item.repeat && (
        <span className={metaCls} title={t.repeat.summary(item.repeat)}>
          <Repeat size={12} />
        </span>
      )}
      {item.waitingFor && (
        <span className={cn(metaCls, 'text-ink-2')}>
          <Hourglass size={12} className="text-amber" />
          {item.waitingFor.who} · {t.todo.waitingDays(waitDays)}
        </span>
      )}
      {steps.length > 0 && !done && (
        <span className={metaCls}>{t.todo.stepsCount(steps.filter((s) => s.done).length, steps.length)}</span>
      )}
    </>
  )

  return (
    <div className="@container">
      <div
        onClick={() => openPeek(item.id)}
        className="group/row relative flex min-h-[34px] cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1 transition-colors hover:bg-surface-2"
      >
        {showSpace && (
          <span
            className="absolute bottom-2 left-0 top-2 w-[2px] rounded-full"
            style={{ background: SPACE_COLOR[item.space] }}
          />
        )}
        <Checkbox checked={done} onChange={() => toggleDone(item.id)} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span
              className={cn(
                'truncate text-base transition-colors max-md:whitespace-normal',
                done && 'text-ink-3 line-through decoration-ink-4',
              )}
            >
              {item.priority === 'high' && !done && (
                <span className="mr-1.5 font-semibold text-rose" title={t.priority.high}>
                  !
                </span>
              )}
              {item.title}
            </span>
            <span className="flex shrink-0 items-center gap-2.5 text-sm text-ink-3 @max-[520px]:hidden">{extras}</span>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-ink-3 empty:hidden @[520px]:hidden">
            {!hideProject && project && (
              <span className={metaCls}>
                <ProjectGlyph color={project.color} />
                {project.name}
              </span>
            )}
            <DueLabel item={item} data={data} ctx={ctx} />
            {extras}
          </div>
        </div>
        {!hideProject && (
          <span className="flex w-[140px] shrink-0 items-center gap-1.5 truncate text-sm text-ink-3 @max-[520px]:hidden">
            {project && (
              <>
                <ProjectGlyph color={project.color} />
                <span className="truncate">{project.name}</span>
              </>
            )}
          </span>
        )}
        <span className="w-[104px] shrink-0 text-right text-sm text-ink-3 @max-[520px]:hidden">
          <DueLabel item={item} data={data} ctx={ctx} />
        </span>
        {item.source && <SourceBadge source={item.source} size={13} />}
        <FlameButton item={item} />
      </div>
    </div>
  )
}

export function TodoList({
  items,
  empty,
  showSpace,
  hideProject,
  hideTags,
  ctx,
}: {
  items: Item[]
  empty?: string
  showSpace?: boolean
  hideProject?: boolean
  hideTags?: boolean
  ctx?: 'today'
}) {
  if (!items.length) return empty ? <p className="px-2.5 pb-1 pt-0.5 text-base text-ink-4">{empty}</p> : null
  return (
    <div className="flex flex-col">
      {items.map((it) => (
        <TodoRow key={it.id} item={it} showSpace={showSpace} hideProject={hideProject} hideTags={hideTags} ctx={ctx} />
      ))}
    </div>
  )
}

/** a titled group of tasks; hidden when empty unless it has an empty message */
export function TodoSection({
  title,
  icon,
  glyph,
  hint,
  items,
  hot,
  empty,
  showSpace,
  hideProject,
  hideTags,
  ctx,
  collapsible,
  defaultOpen = true,
  children,
}: {
  title: string
  icon?: ReactNode
  /** a project square or space thread before the title */
  glyph?: ReactNode
  hint?: string
  items: Item[]
  hot?: boolean
  empty?: string
  showSpace?: boolean
  hideProject?: boolean
  hideTags?: boolean
  ctx?: 'today'
  collapsible?: boolean
  defaultOpen?: boolean
  children?: ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  if (!items.length && !empty && !collapsible) return null
  const openCount = items.filter((it) => it.status !== 'done').length
  const head = (
    <>
      {collapsible && <ChevronRight size={14} className={cn('transition-transform', open && 'rotate-90')} />}
      {icon}
      {glyph}
      {title}
      <span className="font-normal text-ink-4">{openCount}</span>
    </>
  )
  return (
    <section className="mb-6">
      <div
        className={cn('flex items-center gap-2 px-2.5 pb-1.5 text-sm font-medium', hot ? 'text-flame' : 'text-ink-2')}
      >
        {collapsible ? (
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 hover:text-ink"
            aria-expanded={open}
          >
            {head}
          </button>
        ) : (
          head
        )}
        <i className="h-px flex-1 bg-line" />
        {hint && <span className="text-sm font-normal text-ink-4 max-sm:hidden">{hint}</span>}
      </div>
      {(!collapsible || open) &&
        (children ?? (
          <TodoList
            items={items}
            empty={empty}
            showSpace={showSpace}
            hideProject={hideProject}
            hideTags={hideTags}
            ctx={ctx}
          />
        ))}
    </section>
  )
}

/** progress as a thread; split shows personal and work side by side */
export function ProgressBar({ items, split }: { items: Item[]; split?: boolean }) {
  const n = items.length || 1
  const doneOf = (sp?: Space) => items.filter((it) => it.status === 'done' && (!sp || it.space === sp)).length
  return (
    <div className="flex h-1 flex-1 overflow-hidden rounded-full bg-surface-3">
      {split ? (
        <>
          <i
            className="h-full transition-[width] duration-500"
            style={{
              width: `${(doneOf('personal') / n) * 100}%`,
              background: SPACE_COLOR.personal,
            }}
          />
          <i
            className="h-full transition-[width] duration-500"
            style={{
              width: `${(doneOf('work') / n) * 100}%`,
              background: SPACE_COLOR.work,
            }}
          />
          <i
            className="h-full transition-[width] duration-500"
            style={{
              width: `${(doneOf('andulka') / n) * 100}%`,
              background: SPACE_COLOR.andulka,
            }}
          />
        </>
      ) : (
        <i className="h-full bg-ink-3 transition-[width] duration-500" style={{ width: `${(doneOf() / n) * 100}%` }} />
      )}
    </div>
  )
}

/** Vše / Osobní / Práce — shared by Home and Calendar */
export function SpaceFilterSwitch() {
  const t = useT()
  if (SPACES.length < 2) return null
  const value = useStore((s) => s.data.settings.spaceFilter)
  const updateSettings = useStore((s) => s.updateSettings)
  return (
    <Segmented
      options={[
        { value: 'all', label: t.spaces.all },
        {
          value: 'personal',
          label: (
            <>
              <SpaceThread color={SPACE_COLOR.personal} />
              {t.spaces.personal}
            </>
          ),
        },
        {
          value: 'work',
          label: (
            <>
              <SpaceThread color={SPACE_COLOR.work} />
              {t.spaces.work}
            </>
          ),
        },
        {
          value: 'andulka',
          label: (
            <>
              <SpaceThread color={SPACE_COLOR.andulka} />
              {t.spaces.andulka}
            </>
          ),
        },
      ]}
      value={value}
      onChange={(v) => updateSettings({ spaceFilter: v })}
    />
  )
}
