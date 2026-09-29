import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronRight, Clock9, Expand, Flame, Moon, Trash2, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { addDays, fromLocalInput, startOfDay, toLocalInput } from '@/lib/date'
import { SPACE_COLOR, SPACES } from '@/lib/types'
import type { Item, TaskPriority } from '@/lib/types'
import { RepeatField } from './fields'
import { InlineBody, TagEditor, WaitingInput } from './editors'
import { Steps } from './Steps'
import { DueLabel } from './todo'
import { useConfirmDelete } from './useConfirmDelete'
import { Button, Checkbox, ProjectGlyph, Segmented, Select, SpaceThread, cn } from './ui'

const PRIORITIES: ('none' | TaskPriority)[] = ['none', 'low', 'medium', 'high']

/** a task, opened beside the list instead of on a page of its own */
export function TaskDrawer() {
  const peekId = useStore((s) => s.peekId)
  const item = useStore((s) => (s.peekId ? s.data.items[s.peekId] : undefined))
  const closePeek = useStore((s) => s.closePeek)
  const location = useLocation()

  const openPeek = useStore((s) => s.openPeek)
  useEffect(() => {
    closePeek()
  }, [location.pathname, closePeek])
  // ?peek=<id> opens a task straight in the drawer
  useEffect(() => {
    const id = new URLSearchParams(location.search).get('peek')
    if (id) openPeek(id)
  }, [location.search, openPeek])
  useEffect(() => {
    if (!peekId) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && closePeek()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [peekId, closePeek])

  if (!item) return null
  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-[#060609]/45 [animation:fade-in_.18s]" onClick={closePeek} />
      <aside
        role="dialog"
        aria-label={item.title}
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-line-2 bg-surface shadow-[-30px_0_80px_rgba(0,0,0,0.45)] [animation:drawer-in_.28s_var(--ease-out-soft)] sm:w-[480px]"
      >
        <DrawerBody key={item.id} item={item} onClose={closePeek} />
      </aside>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="pt-[7px] text-sm text-ink-3">{label}</dt>
      <dd className="m-0 flex min-h-9 flex-wrap items-center gap-2">{children}</dd>
    </>
  )
}

function DrawerBody({ item, onClose }: { item: Item; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const { updateItem, toggleDone, toggleFlame, toast } = useStore()
  const { askDelete, dialog } = useConfirmDelete()
  const project = item.projectId ? data.projects[item.projectId] : undefined
  const phase = project?.phases?.find((ph) => ph.id === item.phaseId)
  const done = item.status === 'done'
  const [title, setTitle] = useState(item.title)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = titleRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [title])

  const setDueDay = (days: number) => {
    const d = addDays(startOfDay(new Date()), days)
    const old = item.due ? new Date(item.due) : null
    if (old) d.setHours(old.getHours(), old.getMinutes())
    updateItem(item.id, { due: d.toISOString() })
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line py-3 pl-5 pr-3 pt-[calc(12px+env(safe-area-inset-top,0px))] text-sm text-ink-3">
        {project ? (
          <button
            onClick={() => navigate(`/project/${project.id}`)}
            className="flex min-w-0 items-center gap-2 hover:text-ink"
          >
            <ProjectGlyph color={project.color} />
            <span className="truncate">{project.name}</span>
            {phase && (
              <>
                <ChevronRight size={13} className="shrink-0" />
                <span className="truncate">{phase.name}</span>
              </>
            )}
          </button>
        ) : (
          <span className="flex items-center gap-2">
            <SpaceThread color={SPACE_COLOR[item.space]} />
            {t.spaces[item.space]}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center">
          <Button variant="ghost" square size="sm" onClick={() => navigate(`/item/${item.id}`)} title={t.drawer.openFull}>
            <Expand size={15} />
          </Button>
          <Button variant="ghost" square size="sm" onClick={onClose} title={t.drawer.close}>
            <X size={17} />
          </Button>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8 pt-6 sm:px-6">
        <div className="flex items-start gap-3.5">
          <Checkbox checked={done} onChange={() => toggleDone(item.id)} className="mt-[7px]" />
          <textarea
            ref={titleRef}
            value={title}
            rows={1}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => {
              const v = title.trim()
              if (v && v !== item.title) updateItem(item.id, { title: v })
              else setTitle(item.title)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                ;(e.target as HTMLTextAreaElement).blur()
              }
            }}
            className={cn(
              'display w-full resize-none overflow-hidden bg-transparent text-2xl leading-tight outline-none',
              done && 'text-ink-3 line-through decoration-ink-4',
            )}
          />
        </div>
        {item.due && !done && (
          <div className="ml-[34px] mt-1 text-sm text-ink-3">
            <DueLabel item={item} data={data} />
          </div>
        )}

        <dl className="my-6 grid grid-cols-[92px_1fr] gap-x-3 gap-y-1">
          <Row label={t.drawer.due}>
            <input
              type="datetime-local"
              value={item.due ? toLocalInput(item.due) : ''}
              onChange={(e) => updateItem(item.id, { due: e.target.value ? fromLocalInput(e.target.value) : undefined })}
              className="h-8 rounded-lg border border-line-2 bg-surface px-2.5 text-sm text-ink outline-none [color-scheme:dark] focus:border-iris/60"
            />
            <button onClick={() => setDueDay(0)} className="h-8 rounded-lg px-2 text-sm text-ink-3 hover:bg-surface-2 hover:text-ink">
              {t.common.today}
            </button>
            <button onClick={() => setDueDay(1)} className="h-8 rounded-lg px-2 text-sm text-ink-3 hover:bg-surface-2 hover:text-ink">
              {t.common.tomorrow}
            </button>
          </Row>
          <Row label={t.todo.flame}>
            <button
              onClick={() => toggleFlame(item.id)}
              className={cn(
                'flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
                item.flame ? 'border-flame/45 bg-flame/10 text-flame' : 'border-line-2 text-ink-3 hover:text-ink',
              )}
            >
              <Flame size={14} fill={item.flame ? 'currentColor' : 'none'} fillOpacity={0.28} />
              {item.flame ? t.todo.yes : t.todo.no}
            </button>
          </Row>
          <Row label={t.detail.propPriority}>
            <Segmented
              options={PRIORITIES.map((p) => ({ value: p, label: p === 'none' ? '—' : t.priority[p] }))}
              value={item.priority ?? 'none'}
              onChange={(p) => updateItem(item.id, { priority: p === 'none' ? undefined : p })}
            />
          </Row>
          <Row label={t.spaces.label}>
            <Segmented
              options={SPACES.map((sp) => ({
                value: sp,
                label: (
                  <>
                    <SpaceThread color={SPACE_COLOR[sp]} />
                    {t.spaces[sp]}
                  </>
                ),
              }))}
              value={item.space}
              onChange={(sp) =>
                updateItem(item.id, {
                  space: sp,
                  projectId: project?.space === sp ? item.projectId : undefined,
                  phaseId: project?.space === sp ? item.phaseId : undefined,
                  tags: item.tags.filter((id) => data.tags[id]?.space === sp),
                })
              }
            />
          </Row>
          <Row label={t.detail.propProject}>
            <Select
              value={item.projectId ?? ''}
              onChange={(e) => updateItem(item.id, { projectId: e.target.value || undefined, phaseId: undefined })}
              className="h-8 max-w-[260px]"
            >
              <option value="">{t.common.noProject}</option>
              {SPACES.map((sp) => (
                <optgroup key={sp} label={t.spaces[sp]}>
                  {Object.values(data.projects)
                    .filter((p) => p.space === sp && (p.status !== 'done' || p.id === item.projectId))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
          </Row>
          {project?.phases?.length ? (
            <Row label={t.detail.propPhase}>
              <Select
                value={item.phaseId ?? ''}
                onChange={(e) => updateItem(item.id, { phaseId: e.target.value || undefined })}
                className="h-8 max-w-[260px]"
              >
                <option value="">{t.project.phaseNone}</option>
                {project.phases.map((ph) => (
                  <option key={ph.id} value={ph.id}>
                    {ph.name}
                  </option>
                ))}
              </Select>
            </Row>
          ) : null}
          <Row label={t.detail.propTags}>
            <TagEditor tags={item.tags} space={item.space} onChange={(tg) => updateItem(item.id, { tags: tg })} />
          </Row>
          <Row label={t.todo.waitingFor}>
            <WaitingInput key={item.id} itemId={item.id} who={item.waitingFor?.who} since={item.waitingFor?.since} />
          </Row>
          <Row label={t.detail.propRepeat}>
            <RepeatField value={item.repeat} onChange={(repeat) => updateItem(item.id, { repeat })} />
          </Row>
        </dl>

        <h4 className="mb-1.5 text-sm font-semibold text-ink-2">
          {t.drawer.steps}
          {item.checklist?.length ? (
            <span className="ml-2 font-medium text-ink-3">
              {item.checklist.filter((s) => s.done).length}/{item.checklist.length}
            </span>
          ) : null}
        </h4>
        <div className="mb-6">
          <Steps item={item} />
        </div>

        <h4 className="mb-2 text-sm font-semibold text-ink-2">{t.drawer.note}</h4>
        <div className="rounded-md bg-surface-2 px-3.5 py-3">
          <InlineBody
            value={item.body ?? ''}
            onCommit={(v) => updateItem(item.id, { body: v })}
            placeholder={t.drawer.notePh}
            onFollow={(title) => {
              const target = Object.values(data.items).find((x) => x.title.toLowerCase() === title.toLowerCase())
              if (target) navigate(`/item/${target.id}`)
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-1.5 border-t border-line px-3 py-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDueDay(1)
            toast(t.drawer.movedTomorrow)
          }}
        >
          <Moon size={14} />
          {t.drawer.toTomorrow}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            updateItem(item.id, { someday: true, flame: undefined })
            toast(t.drawer.movedSomeday)
            onClose()
          }}
        >
          <Clock9 size={14} />
          {t.drawer.toSomeday}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          square
          onClick={() => askDelete(item.id, item.title, onClose)}
          title={t.common.delete}
          className="hover:text-rose"
        >
          <Trash2 size={14} />
        </Button>
        <Button variant={done ? 'default' : 'accent'} size="sm" className="ml-auto" onClick={() => toggleDone(item.id)}>
          {done ? t.drawer.undone : t.drawer.done}
        </Button>
      </div>
      {dialog}
    </>
  )
}
