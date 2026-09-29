import { useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Clock9, Columns3, Flame, Hourglass, List, Plus, Repeat, Trash2 } from 'lucide-react'
import { Page } from '@/components/Page'
import { ProgressBar, TodoSection, byUrgency } from '@/components/todo'
import { Kbd, ProjectGlyph, Segmented, cn } from '@/components/ui'
import { useConfirmDelete } from '@/components/useConfirmDelete'
import { BoardColumns } from './Board'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { addDays, fmtLongDate, fmtTime, isSameDay, startOfDay } from '@/lib/date'
import { isHot, isOnToday, isOverdue, todayTasks, waitingTasks } from '@/lib/selectors'
import { taskFromLine } from '@/lib/capture'
import { SPACE_COLOR } from '@/lib/types'
import type { Item, Space } from '@/lib/types'

const isOpen = (it: Item) => it.status !== 'done'

export function TodoView() {
  const t = useT()
  const params = useParams()
  const space: Space = params.space === 'work' ? 'work' : 'personal'
  const data = useStore((s) => s.data)
  const { todoMode, workGroup } = data.settings
  const updateSettings = useStore((s) => s.updateSettings)

  const now = new Date()
  const today = useMemo(() => todayTasks(data, space).sort(byUrgency), [data, space])
  const mine = useMemo(
    () => Object.values(data.items).filter((it) => it.kind === 'task' && it.space === space && !it.parentId),
    [data.items, space],
  )
  const events = Object.values(data.items)
    .filter((it) => it.kind === 'event' && it.space === space && it.start && isSameDay(it.start, now))
    .sort((a, b) => (a.start! < b.start! ? -1 : 1))

  const weekEnd = addDays(startOfDay(now), 8)
  const planned = (it: Item) => isOpen(it) && !it.someday && !it.waitingFor
  // burning work is already listed under "On fire"
  const upcoming = mine
    .filter(
      (it) =>
        planned(it) &&
        it.due &&
        new Date(it.due) < weekEnd &&
        !isOnToday(data, it) &&
        !(space === 'work' && isHot(it)),
    )
    .sort((a, b) => (a.due! < b.due! ? -1 : 1))
  const noDate = mine.filter((it) => planned(it) && !it.due && !it.unsorted).sort(byUrgency)
  const waiting = waitingTasks(data, space)
  const someday = mine.filter((it) => it.someday && isOpen(it))
  const done = today.filter((it) => !isOpen(it)).length

  const actions = (
    <>
      {space === 'work' && todoMode === 'list' && (
        <Segmented
          options={[
            { value: 'urgency', label: t.todo.byUrgency },
            { value: 'project', label: t.todo.byProject },
          ]}
          value={workGroup}
          onChange={(v) => updateSettings({ workGroup: v })}
        />
      )}
      <Segmented
        options={[
          { value: 'list', label: <><List size={15} />{t.todo.list}</> },
          { value: 'kanban', label: <><Columns3 size={15} />{t.todo.kanban}</> },
        ]}
        value={todoMode}
        onChange={(v) => updateSettings({ todoMode: v })}
      />
    </>
  )

  const tabs = <SpaceTabs space={space} />

  if (todoMode === 'kanban')
    return (
      <Page eyebrow={fmtLongDate(now)} title={t.todo.title} actions={actions} fill>
        {tabs}
        <BoardColumns space={space} />
      </Page>
    )

  return (
    <Page eyebrow={fmtLongDate(now)} title={t.todo.title} actions={actions}>
      {tabs}
      <QuickAdd space={space} />

      <div className="mb-7 flex items-center gap-3.5">
        <ProgressBar items={today} />
        <span className="whitespace-nowrap text-sm text-ink-2">
          <b className="font-semibold text-ink">{done}</b> {t.todo.ofDone(today.length)}
        </span>
      </div>

      {events.length > 0 && (
        <div className="-mt-1 mb-7 flex gap-2 overflow-x-auto pb-1">
          {events.map((ev) => (
            <EventPill key={ev.id} item={ev} />
          ))}
        </div>
      )}

      {space === 'personal' ? (
        <PersonalSections today={today} />
      ) : workGroup === 'project' ? (
        <WorkByProject mine={mine} today={today} />
      ) : (
        <WorkByUrgency mine={mine} today={today} />
      )}

      {!(space === 'work' && workGroup === 'project') && (
        <TodoSection title={space === 'work' ? t.todo.thisWeek : t.todo.upcoming} items={upcoming} />
      )}
      {space === 'personal' && (
        <TodoSection
          title={t.todo.waiting}
          icon={<Hourglass size={14} />}
          hint={t.todo.waitingHint}
          items={waiting}
        />
      )}
      <TodoSection title={t.todo.noDate} items={noDate} />
      <SomedaySection items={someday} space={space} />
    </Page>
  )
}

/** Osobní / Práce as big tabs, each underlined with its thread */
function SpaceTabs({ space }: { space: Space }) {
  const t = useT()
  const data = useStore((s) => s.data)
  // what needs attention: open tasks for today plus anything burning
  const count = (sp: Space) =>
    new Set([
      ...todayTasks(data, sp).filter(isOpen).map((it) => it.id),
      ...Object.values(data.items).filter((it) => it.space === sp && isHot(it)).map((it) => it.id),
    ]).size
  return (
    <div className="mb-6 flex gap-7 border-b border-line" data-tour="todo-space">
      {(['personal', 'work'] as Space[]).map((sp) => (
        <NavLink
          key={sp}
          to={sp === 'work' ? '/todo/work' : '/todo'}
          end
          className={cn(
            'display relative flex items-center gap-2.5 px-0.5 pb-3 text-xl tracking-[-0.02em] transition-colors',
            space === sp ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
          )}
        >
          {sp === 'work' ? t.spaces.workTodo : t.spaces.personal}
          <span className="rounded-full bg-surface-2 px-2 py-px font-sans text-sm font-semibold tracking-normal text-ink-2">
            {count(sp)}
          </span>
          <span
            className={cn(
              'absolute -bottom-px left-0 right-0 h-[2px] origin-left rounded-full transition-transform duration-300 ease-out-soft',
              space === sp ? 'scale-x-100' : 'scale-x-0',
            )}
            style={{ background: SPACE_COLOR[sp] }}
          />
        </NavLink>
      ))}
    </div>
  )
}

/** one line in, a task out — understands dates, #tags and "!" */
function QuickAdd({ space }: { space: Space }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const createItem = useStore((s) => s.createItem)
  const toast = useStore((s) => s.toast)
  const [draft, setDraft] = useState('')
  function commit() {
    const partial = taskFromLine(draft, space, data)
    if (!partial) return
    createItem(partial)
    setDraft('')
    toast(t.todo.added)
  }
  return (
    <label className="mb-6 flex h-12 items-center gap-3 rounded-xl border border-line bg-surface px-3.5 text-ink-3 transition-colors focus-within:border-line-3">
      <Plus size={16} />
      <input
        id="todo-quick-add"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && commit()}
        placeholder={t.todo.addPh}
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
      />
      <span className="max-sm:hidden">
        <Kbd>↵</Kbd>
      </span>
    </label>
  )
}

function EventPill({ item }: { item: Item }) {
  const navigate = useNavigate()
  const past = item.end ? new Date(item.end) < new Date() : false
  return (
    <button
      onClick={() => navigate(`/item/${item.id}`)}
      className={cn(
        'flex h-9 shrink-0 items-center gap-2.5 rounded-[10px] border border-line bg-surface pl-3 pr-3.5 text-[13.5px] transition-colors hover:border-line-3',
        past && 'opacity-50',
      )}
    >
      <span className="h-4 w-[2px] rounded-full" style={{ background: SPACE_COLOR[item.space] }} />
      {!item.allDay && <span className="mono text-sm text-ink-3">{fmtTime(item.start!)}</span>}
      {item.title}
    </button>
  )
}

function PersonalSections({ today }: { today: Item[] }) {
  const t = useT()
  const { tags, projects } = useStore((s) => s.data)
  const tagOrder = Object.values(tags)
    .filter((tg) => tg.space === 'personal')
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

  const overdue = today.filter((it) => isOverdue(it))
  const routine = (it: Item) => !!it.repeat && it.repeat !== 'none'
  const rest = today.filter((it) => !isOverdue(it) && !routine(it))
  const routines = today.filter((it) => !isOverdue(it) && routine(it))

  // group by project first, then by the first tag in tag order, the rest under "Other"
  const byProject = new Map<string, Item[]>()
  const byTag = new Map<string, Item[]>()
  const other: Item[] = []
  for (const it of rest) {
    if (it.projectId && projects[it.projectId]) byProject.set(it.projectId, [...(byProject.get(it.projectId) ?? []), it])
    else {
      const tg = tagOrder.find((x) => it.tags.includes(x.id))
      if (tg) byTag.set(tg.id, [...(byTag.get(tg.id) ?? []), it])
      else other.push(it)
    }
  }

  return (
    <>
      <TodoSection title={t.todo.overdue} icon={<Flame size={14} />} hot items={overdue} />
      {[...byProject.entries()].map(([pid, list]) => (
        <TodoSection
          key={pid}
          title={projects[pid].name}
          glyph={<ProjectGlyph color={projects[pid].color} />}
          items={list}
          hideProject
          ctx="today"
        />
      ))}
      {tagOrder
        .filter((tg) => byTag.has(tg.id))
        .map((tg) => (
          <TodoSection
            key={tg.id}
            title={`#${tg.name}`}
            hint={tg.leadDays ? t.todo.leadHint(tg.leadDays) : undefined}
            items={byTag.get(tg.id)!}
            hideTags
            ctx="today"
          />
        ))}
      <TodoSection
        title={byProject.size || byTag.size ? t.todo.other : t.todo.today}
        items={other}
        ctx="today"
        empty={rest.length || overdue.length || routines.length ? undefined : t.todo.emptyToday}
      />
      <TodoSection
        title={t.todo.routines}
        icon={<Repeat size={14} />}
        hint={t.todo.routinesHint}
        items={routines}
        ctx="today"
      />
    </>
  )
}

function WorkByUrgency({ mine, today }: { mine: Item[]; today: Item[] }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const hot = mine.filter((it) => isHot(it)).sort(byUrgency)
  const rest = today.filter((it) => !isHot(it))
  return (
    <>
      <TodoSection
        title={t.todo.hot}
        icon={<Flame size={14} />}
        hot
        hint={t.todo.hotHint}
        items={hot}
        empty={t.todo.emptyHot}
      />
      <TodoSection title={t.todo.today} items={rest} empty={t.todo.emptyToday} ctx="today" />
      <TodoSection
        title={t.todo.waiting}
        icon={<Hourglass size={14} />}
        hint={t.todo.waitingHint}
        items={waitingTasks(data, 'work')}
      />
    </>
  )
}

function WorkByProject({ mine, today }: { mine: Item[]; today: Item[] }) {
  const t = useT()
  const projects = useStore((s) => s.data.projects)
  const active = [
    ...mine.filter((it) => isOpen(it) && !it.someday && !it.unsorted),
    ...today.filter((it) => !isOpen(it)),
  ].sort(byUrgency)
  const workProjects = Object.values(projects).filter((p) => p.space === 'work' && p.status === 'active')
  const loose = active.filter((it) => !it.projectId || !projects[it.projectId])
  return (
    <>
      {workProjects.map((p) => (
        <TodoSection
          key={p.id}
          title={p.name}
          glyph={<ProjectGlyph color={p.color} />}
          items={active.filter((it) => it.projectId === p.id)}
          hideProject
        />
      ))}
      <TodoSection title={t.todo.noProject} items={loose} />
    </>
  )
}

function SomedaySection({ items, space }: { items: Item[]; space: Space }) {
  const t = useT()
  const navigate = useNavigate()
  const createItem = useStore((s) => s.createItem)
  const updateItem = useStore((s) => s.updateItem)
  const { askDelete, dialog } = useConfirmDelete()
  const [draft, setDraft] = useState('')

  function commit() {
    const v = draft.trim()
    if (v) createItem({ kind: 'task', title: v, status: 'todo', someday: true, space })
    setDraft('')
  }

  return (
    <TodoSection
      title={t.todo.someday}
      icon={<Clock9 size={14} />}
      hint={t.todo.somedayHint}
      items={items}
      collapsible
      defaultOpen={false}
    >
      <div className="flex flex-col">
        {items.map((it) => (
          <div
            key={it.id}
            className="group flex min-h-11 items-center gap-3 rounded-[11px] px-3 hover:bg-surface"
          >
            <span className="h-5 w-5 shrink-0 rounded-full border-[1.6px] border-dashed border-ink-4" />
            <button
              onClick={() => navigate(`/item/${it.id}`)}
              className="min-w-0 flex-1 truncate text-left text-base hover:text-iris-2"
            >
              {it.title}
            </button>
            <button
              onClick={() => updateItem(it.id, { someday: false })}
              className="flex shrink-0 items-center gap-1 text-sm text-iris-2 opacity-0 transition-opacity hover:text-iris group-hover:opacity-100 max-md:opacity-100"
            >
              {t.todo.promote}
              <ArrowRight size={13} />
            </button>
            <button
              onClick={() => askDelete(it.id, it.title)}
              className="shrink-0 text-ink-3 opacity-0 transition-opacity hover:text-rose group-hover:opacity-100"
              aria-label={t.common.delete}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        <label className="flex min-h-11 items-center gap-3 rounded-[11px] px-3 text-ink-3 hover:bg-surface">
          <Plus size={16} className="mx-0.5" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            onBlur={commit}
            placeholder={t.todo.somedayAdd}
            className="flex-1 bg-transparent text-base text-ink outline-none placeholder:text-ink-3"
          />
        </label>
      </div>
      {dialog}
    </TodoSection>
  )
}
