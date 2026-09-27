import { useMemo, useState } from 'react'
import { NavLink, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, Clock9, Columns3, Flame, Hourglass, List, Plus, Repeat, Trash2 } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { ProgressBar, TodoSection, byUrgency } from '@/components/todo'
import { Button, Dot, Segmented, cn } from '@/components/ui'
import { useConfirmDelete } from '@/components/useConfirmDelete'
import { BoardColumns } from './Board'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { addDays, fmtDayMonth, fmtTime, isSameDay, startOfDay } from '@/lib/date'
import { isHot, isOnToday, isOverdue, todayTasks, waitingTasks } from '@/lib/selectors'
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
  const openCapture = useStore((s) => s.openCapture)

  const now = new Date()
  const today = useMemo(() => todayTasks(data, space).sort(byUrgency), [data, space])
  const mine = useMemo(
    () =>
      Object.values(data.items).filter(
        (it) => it.kind === 'task' && it.space === space && !it.parentId,
      ),
    [data.items, space],
  )
  const events = Object.values(data.items)
    .filter((it) => it.kind === 'event' && it.space === space && it.start && isSameDay(it.start, now))
    .sort((a, b) => (a.start! < b.start! ? -1 : 1))

  const weekEnd = addDays(startOfDay(now), 8)
  const planned = (it: Item) => isOpen(it) && !it.someday && !it.waitingFor
  const upcoming = mine
    .filter((it) => planned(it) && it.due && new Date(it.due) < weekEnd && !isOnToday(data, it))
    .sort((a, b) => (a.due! < b.due! ? -1 : 1))
  const noDate = mine.filter((it) => planned(it) && !it.due && !it.unsorted).sort(byUrgency)
  const waiting = waitingTasks(data, space)
  const someday = mine.filter((it) => it.someday && isOpen(it))

  const done = today.filter((it) => !isOpen(it)).length

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">{t.todo.title}</h1>
        <div className="flex gap-0.5 rounded-lg border border-line bg-surface-2 p-0.5" data-tour="todo-space">
          {(['personal', 'work'] as Space[]).map((sp) => (
            <NavLink
              key={sp}
              to={sp === 'work' ? '/todo/work' : '/todo'}
              end
              className={cn(
                'flex h-7 items-center gap-2 rounded-md px-3 text-[13px] font-semibold transition-colors',
                space === sp ? 'bg-surface-3 text-ink' : 'text-ink-2 hover:text-ink',
              )}
            >
              <Dot color={SPACE_COLOR[sp]} className="h-1.5 w-1.5" />
              {sp === 'work' ? t.spaces.workTodo : t.spaces.personal}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
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
              { value: 'list', label: <><List size={13} />{t.todo.list}</> },
              { value: 'kanban', label: <><Columns3 size={13} />{t.todo.kanban}</> },
            ]}
            value={todoMode}
            onChange={(v) => updateSettings({ todoMode: v })}
          />
          <Button variant="accent" onClick={() => openCapture('task')}>
            <Plus size={14} />
            {t.todo.newTask}
          </Button>
        </div>
      </TopBar>

      {todoMode === 'kanban' ? (
        <BoardColumns space={space} />
      ) : (
        <div className="flex-1 overflow-y-auto px-7 py-6">
          <div className="mx-auto max-w-[860px]">
            <p className="mb-4 text-[12.5px] text-ink-2">
              {space === 'work' ? t.todo.subWork : t.todo.subPersonal}
            </p>

            <div className="mb-5 flex items-center gap-3">
              <ProgressBar items={today} />
              <span className="mono text-[12px] text-ink-2">{t.todo.progress(done, today.length)}</span>
            </div>

            {events.length > 0 && (
              <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
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
              <TodoSection
                title={space === 'work' ? t.todo.thisWeek : t.todo.upcoming}
                items={upcoming}
              />
            )}
            {space === 'personal' && (
              <TodoSection
                title={t.todo.waiting}
                icon={<Hourglass size={13} />}
                hint={t.todo.waitingHint}
                items={waiting}
              />
            )}
            <TodoSection title={t.todo.noDate} items={noDate} />
            <SomedaySection items={someday} space={space} />
          </div>
        </div>
      )}
    </>
  )
}

function EventPill({ item }: { item: Item }) {
  const navigate = useNavigate()
  return (
    <button
      onClick={() => navigate(`/item/${item.id}`)}
      className="flex shrink-0 items-center gap-2.5 rounded-lg border border-line bg-surface py-1.5 pl-2 pr-3 text-[12.5px] hover:border-line-2"
    >
      <span className="h-5 w-[3px] rounded-full" style={{ background: SPACE_COLOR[item.space] }} />
      {!item.allDay && <span className="mono text-[11px] text-ink-2">{fmtTime(item.start!)}</span>}
      {item.title}
    </button>
  )
}

function PersonalSections({ today }: { today: Item[] }) {
  const t = useT()
  const tags = useStore((s) => s.data.tags)
  const personalTags = Object.values(tags)
    .filter((tg) => tg.space === 'personal')
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

  const overdue = today.filter((it) => isOverdue(it))
  const rest = today.filter((it) => !isOverdue(it) && !(it.repeat && it.repeat !== 'none'))
  const routines = today.filter((it) => !isOverdue(it) && it.repeat && it.repeat !== 'none')
  // a task with several tags sits under the first one in tag order
  const home = (it: Item) => personalTags.find((tg) => it.tags.includes(tg.id))?.id
  const untagged = rest.filter((it) => !home(it))

  return (
    <>
      <TodoSection title={t.todo.overdue} icon={<Flame size={13} />} hot items={overdue} />
      {personalTags.map((tg) => (
        <TodoSection
          key={tg.id}
          title={tg.name}
          dot={tg.color}
          hint={tg.leadDays ? t.todo.leadHint(tg.leadDays) : undefined}
          items={rest.filter((it) => home(it) === tg.id)}
          hideContext
        />
      ))}
      <TodoSection
        title={personalTags.length ? t.todo.noTag : t.todo.today}
        items={untagged}
        empty={rest.length || overdue.length || routines.length ? undefined : t.todo.emptyToday}
      />
      <TodoSection
        title={t.todo.routines}
        icon={<Repeat size={13} />}
        hint={t.todo.routinesHint}
        items={routines}
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
        icon={<Flame size={13} />}
        hot
        hint={t.todo.hotHint}
        items={hot}
        empty={t.todo.emptyHot}
      />
      <TodoSection title={t.todo.today} items={rest} empty={t.todo.emptyToday} />
      <TodoSection
        title={t.todo.waiting}
        icon={<Hourglass size={13} />}
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
  const workProjects = Object.values(projects).filter((p) => p.space === 'work' && !p.archived)
  const loose = active.filter((it) => !it.projectId || !projects[it.projectId])
  return (
    <>
      {workProjects.map((p) => (
        <TodoSection
          key={p.id}
          title={p.name}
          dot={p.color}
          hint={p.due ? t.todo.projectDue(fmtDayMonth(p.due)) : undefined}
          items={active.filter((it) => it.projectId === p.id)}
          hideContext
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
      icon={<Clock9 size={13} />}
      hint={t.todo.somedayHint}
      items={items}
      collapsible
      defaultOpen={false}
    >
      <div className="overflow-hidden rounded-xl border border-line bg-surface">
        <div className="flex items-center gap-2.5 px-3 py-2.5">
          <Plus size={14} className="shrink-0 text-ink-3" />
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            onBlur={commit}
            placeholder={t.todo.somedayAdd}
            className="flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        {items.map((it) => (
          <div key={it.id} className="group flex items-center gap-2.5 border-t border-line px-3 py-2 hover:bg-surface-2">
            <button
              onClick={() => navigate(`/item/${it.id}`)}
              className="min-w-0 flex-1 truncate text-left text-[12.5px] hover:text-iris-2"
            >
              {it.title}
            </button>
            <button
              onClick={() => updateItem(it.id, { someday: false })}
              className="flex shrink-0 items-center gap-1 text-[11px] text-iris opacity-0 hover:text-iris-2 group-hover:opacity-100"
            >
              {t.todo.promote}
              <ArrowRight size={11} />
            </button>
            <button
              onClick={() => askDelete(it.id, it.title)}
              className="shrink-0 text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
      {dialog}
    </TodoSection>
  )
}
