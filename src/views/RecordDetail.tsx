import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  CalendarDays,
  ChevronLeft,
  ExternalLink,
  GitBranch,
  MoreHorizontal,
  Plus,
  Sparkles,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { SourceBadge } from '@/components/items'
import {
  Avatar,
  Button,
  Checkbox,
  Chip,
  Dot,
  SectionLabel,
  Select,
  cn,
} from '@/components/ui'
import { ConfirmDialog, Menu } from '@/components/overlays'
import { ItemPicker } from '@/components/ItemPicker'
import { InlineBody, InlineTitle, PropRow, TagEditor } from '@/components/editors'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { eventConflicts, noteLinks, suggestSlot } from '@/lib/selectors'
import { dateLocale, fmtDue, fmtTime, toLocalInput } from '@/lib/date'
import type { TaskStatus } from '@/lib/types'

const STATUS_COLOR: Record<TaskStatus, string> = {
  todo: 'var(--color-ink-2)',
  in_progress: 'var(--color-amber)',
  blocked: 'var(--color-rose)',
  done: 'var(--color-sage)',
}
const STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
}

export function RecordDetail() {
  const t = useT()
  const { id } = useParams()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const { updateItem, deleteItem, createItem, addReminder, deleteReminder, toast } = useStore()

  const item = id ? data.items[id] : undefined
  const [pickDep, setPickDep] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const blocks = useMemo(
    () => (item ? Object.values(data.items).filter((x) => x.blockedBy?.includes(item.id)) : []),
    [data.items, item],
  )
  const links = useMemo(() => (item ? noteLinks(data, item) : { linkedFrom: [], linksTo: [] }), [data, item])
  const reminders = useMemo(
    () => (item ? Object.values(data.reminders).filter((r) => r.itemId === item.id) : []),
    [data.reminders, item],
  )
  const conflictIds = useMemo(() => {
    if (!item || item.kind !== 'event') return []
    const evs = Object.values(data.items).filter((i) => i.kind === 'event' && i.start && !i.allDay)
    return (eventConflicts(evs)[item.id] ?? []).map((cid) => data.items[cid]).filter(Boolean)
  }, [data.items, item])

  const suggestion = useMemo(() => {
    if (!item || item.kind !== 'task' || item.status === 'done') return null
    const openBlockers = (item.blockedBy ?? []).filter((b) => data.items[b]?.status !== 'done')
    const busy = Object.values(data.items).filter((i) => i.kind === 'event')
    const slot = suggestSlot(busy, {
      durationMin: 60,
      before: item.due ? new Date(item.due) : undefined,
      dayStartHour: data.settings.dayStartHour,
      dayEndHour: data.settings.dayEndHour,
    })
    if (!slot) return null
    return { slot, blocked: openBlockers.length > 0 }
  }, [item, data.items, data.settings])

  function followLink(title: string) {
    const target = Object.values(data.items).find(
      (x) => x.title.toLowerCase() === title.toLowerCase(),
    )
    if (target) navigate(`/item/${target.id}`)
    else {
      const n = createItem({ kind: 'note', title })
      navigate(`/item/${n.id}`)
    }
  }

  if (!item) {
    return (
      <>
        <TopBar>
          <Button variant="ghost" square onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <h1 className="text-[16px]">{t.detail.notFoundTitle}</h1>
        </TopBar>
        <div className="flex flex-1 items-center justify-center text-[13px] text-ink-2">
          {t.detail.notFoundBody}
        </div>
      </>
    )
  }

  const project = item.projectId ? data.projects[item.projectId] : undefined
  const status =
    item.kind === 'task' && item.status
      ? { label: t.status[item.status], color: STATUS_COLOR[item.status] }
      : null
  const due = fmtDue(item.due)
  const done = item.kind === 'task' ? item.status === 'done' : !!item.completedAt

  return (
    <>
      <TopBar>
        <Button variant="ghost" square onClick={() => navigate(-1)}>
          <ChevronLeft size={16} />
        </Button>
        <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
          {project ? (
            <Link to={`/project/${project.id}`} className="flex items-center gap-1.5 hover:text-ink-2">
              <Dot color={project.color} />
              {project.name}
            </Link>
          ) : (
            <span>{t.kind[item.kind]}</span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {(item.due || item.start) && (
            <Button variant="ghost" className="text-[12px]" onClick={() => navigate('/calendar')}>
              <CalendarDays size={13} />
              {t.nav.calendar}
            </Button>
          )}
          <Menu
            align="right"
            trigger={({ toggle }) => (
              <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-2 hover:bg-surface-2 hover:text-ink">
                <MoreHorizontal size={15} />
              </button>
            )}
            items={[
              item.kind !== 'task'
                ? {
                    label: t.detail.menuToTask,
                    onSelect: () => updateItem(item.id, { kind: 'task', status: 'todo' }),
                  }
                : {
                    label: t.detail.menuToNote,
                    onSelect: () => updateItem(item.id, { kind: 'note', status: undefined }),
                  },
              {
                label: item.unsorted ? t.detail.menuFromUnsorted : t.detail.menuToUnsorted,
                onSelect: () => updateItem(item.id, { unsorted: !item.unsorted || undefined }),
              },
              'separator',
              { label: t.common.delete, icon: <Trash2 size={13} />, danger: true, onSelect: () => setConfirmDel(true) },
            ]}
          />
        </div>
      </TopBar>

      <div className="flex flex-1 justify-center overflow-y-auto px-8 pb-12 pt-[26px]">
        <div className="flex w-full max-w-[1000px] gap-[34px]">
          {/* main */}
          <div className="min-w-0 flex-1">
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              {status && (
                <Chip
                  style={{
                    background: `color-mix(in oklab, ${status.color} 12%, transparent)`,
                    color: status.color,
                    borderColor: 'transparent',
                  }}
                >
                  <Dot color={status.color} />
                  {status.label}
                </Chip>
              )}
              {item.kind !== 'task' && (
                <Chip>
                  <span>{t.kind[item.kind]}</span>
                </Chip>
              )}
              {item.unsorted && <Chip className="border-iris/25 bg-iris/12 text-iris-2">{t.detail.unsorted}</Chip>}
              {item.source && (
                <Chip>
                  <SourceBadge source={item.source} size={12} />
                  {item.source === 'gmail' ? t.detail.fromGmail : item.source === 'gcal' ? t.detail.fromCalendar : t.detail.fromSlack}
                </Chip>
              )}
              {item.externalUrl && (
                <a
                  href={item.externalUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11.5px] text-iris hover:text-iris-2"
                >
                  {t.detail.openExternal} <ExternalLink size={11} />
                </a>
              )}
            </div>

            {item.readOnlyExternal && (
              <div className="mb-3 mt-1 rounded-lg bg-surface-2 px-3 py-2 text-[11.5px] text-ink-3">
                {t.detail.mirrorBanner}
              </div>
            )}

            <InlineTitle value={item.title} onCommit={(v) => updateItem(item.id, { title: v })} />

            {(due || item.start) && (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-2">
                {item.kind === 'event' && item.start && (
                  <span className="mono">
                    {new Date(item.start).toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' })}
                    {!item.allDay && ` · ${fmtTime(item.start)}${item.end ? `–${fmtTime(item.end)}` : ''}`}
                  </span>
                )}
                {due && (
                  <span className={due.overdue ? 'text-rose' : ''}>{t.detail.dueLabel(due.label)}</span>
                )}
              </div>
            )}

            {conflictIds.length > 0 && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose/12 px-3 py-2">
                <TriangleAlert size={13} strokeWidth={1.7} className="shrink-0 text-rose" />
                <span className="text-[12px] text-ink-2">
                  {t.detail.overlapsPrefix}{' '}
                  {conflictIds.map((c, i) => (
                    <span key={c.id}>
                      {i > 0 && ', '}
                      <Link to={`/item/${c.id}`} className="text-ink hover:text-iris-2">
                        {c.title}
                      </Link>
                    </span>
                  ))}
                  .
                </span>
              </div>
            )}

            {suggestion && (
              <div className="mt-4 flex gap-2.5 rounded-xl border border-iris/25 bg-iris/12 px-[15px] py-3">
                <Sparkles size={17} strokeWidth={1.6} className="mt-px shrink-0 text-iris" />
                <div className="flex-1">
                  <div className="text-[12.75px] leading-normal text-ink">
                    <b className="font-semibold">
                      {t.detail.freeSlot(
                        `${suggestion.slot.start.toLocaleDateString(dateLocale(), { weekday: 'short', day: 'numeric', month: 'short' })} ${fmtTime(suggestion.slot.start.toISOString())}–${fmtTime(suggestion.slot.end.toISOString())}`,
                      )}
                    </b>{' '}
                    {suggestion.blocked ? t.detail.freeSlotBlocked : t.detail.freeSlotOpen}
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      variant="accent"
                      className="h-7 text-[11.5px]"
                      onClick={() => {
                        createItem({
                          kind: 'event',
                          title: item.title,
                          projectId: item.projectId,
                          start: suggestion.slot.start.toISOString(),
                          end: suggestion.slot.end.toISOString(),
                        })
                        toast(t.detail.scheduledToast)
                      }}
                    >
                      {t.detail.schedule}
                    </Button>
                    <Button
                      variant="ghost"
                      className="h-7 text-[11.5px]"
                      onClick={() => updateItem(item.id, { due: suggestion.slot.end.toISOString() })}
                    >
                      {t.detail.setAsDue}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <SectionLabel className="mt-6">{item.kind === 'note' ? t.detail.noteLabel : t.detail.description}</SectionLabel>
            <div className="mt-2">
              <InlineBody
                value={item.body ?? ''}
                onCommit={(v) => updateItem(item.id, { body: v })}
                onFollow={followLink}
              />
            </div>

            {item.kind === 'task' && (
              <>
                <div className="mt-6 flex items-center gap-2">
                  <SectionLabel>{t.detail.checklist}</SectionLabel>
                  {item.checklist && item.checklist.length > 0 && (
                    <span className="mono text-[10px] text-ink-3">
                      {item.checklist.filter((c) => c.done).length}/{item.checklist.length}
                    </span>
                  )}
                </div>
                <div className="mt-2 flex flex-col gap-1">
                  {(item.checklist ?? []).map((c) => (
                    <div key={c.id} className="group flex items-center gap-2.5 rounded-md px-1 py-1 hover:bg-surface-2">
                      <Checkbox
                        checked={c.done}
                        onChange={() =>
                          updateItem(item.id, {
                            checklist: item.checklist!.map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)),
                          })
                        }
                      />
                      <input
                        defaultValue={c.text}
                        onBlur={(e) =>
                          updateItem(item.id, {
                            checklist: item.checklist!.map((x) => (x.id === c.id ? { ...x, text: e.target.value } : x)),
                          })
                        }
                        className={cn(
                          'flex-1 bg-transparent text-[12.5px] outline-none',
                          c.done && 'text-ink-3 line-through',
                        )}
                      />
                      <button
                        onClick={() =>
                          updateItem(item.id, { checklist: item.checklist!.filter((x) => x.id !== c.id) })
                        }
                        className="text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() =>
                      updateItem(item.id, {
                        checklist: [...(item.checklist ?? []), { id: uid(), text: t.detail.newChecklistItem, done: false }],
                      })
                    }
                    className="flex items-center gap-1.5 px-1 py-1 text-[11.5px] text-ink-3 hover:text-ink-2"
                  >
                    <Plus size={12} />
                    {t.detail.addItem}
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-2">
                  <SectionLabel>{t.detail.dependencies}</SectionLabel>
                  <button
                    onClick={() => setPickDep(true)}
                    className="flex items-center gap-1 text-[11px] text-iris hover:text-iris-2"
                  >
                    <Plus size={11} />
                    {t.detail.addBlockedBy}
                  </button>
                </div>
                <div className="mt-2.5 flex flex-col gap-3">
                  {(item.blockedBy ?? []).length > 0 && (
                    <div>
                      <SectionLabel className="mb-1.5 text-[9.5px]">{t.detail.blockedBy}</SectionLabel>
                      <div className="flex flex-col gap-2">
                        {(item.blockedBy ?? []).map((bid) => {
                          const b = data.items[bid]
                          if (!b) return null
                          return (
                            <div key={bid} className="group flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5">
                              <GitBranch size={14} strokeWidth={1.7} className="shrink-0 text-rose" />
                              <Link to={`/item/${bid}`} className="min-w-0 flex-1 truncate text-[12.5px] hover:text-iris-2">
                                {b.title}
                              </Link>
                              <span className="mono text-[10px] text-ink-3">
                                {b.status === 'done' ? t.detail.doneState : t.detail.openState}
                              </span>
                              <button
                                onClick={() =>
                                  updateItem(item.id, {
                                    blockedBy: (item.blockedBy ?? []).filter((x) => x !== bid),
                                  })
                                }
                                className="text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {blocks.length > 0 && (
                    <div>
                      <SectionLabel className="mb-1.5 text-[9.5px]">{t.detail.blocks(blocks.length)}</SectionLabel>
                      <div className="flex flex-col gap-2">
                        {blocks.map((b) => (
                          <Link
                            key={b.id}
                            to={`/item/${b.id}`}
                            className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-[12.5px] hover:border-line-2"
                          >
                            <ArrowRight size={14} strokeWidth={1.7} className="shrink-0 text-ink-2" />
                            <span className="truncate">{b.title}</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {(item.blockedBy ?? []).length === 0 && blocks.length === 0 && (
                    <p className="text-[11.5px] text-ink-3">{t.detail.noDependencies}</p>
                  )}
                </div>
              </>
            )}

            {(links.linkedFrom.length > 0 || links.linksTo.length > 0) && (
              <>
                <SectionLabel className="mt-6">{t.detail.linkedNotes}</SectionLabel>
                <div className="mt-2.5 flex flex-col gap-2">
                  {links.linksTo.map((n) => (
                    <Link key={n.id} to={`/item/${n.id}`} className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 hover:border-line-2">
                      <div className="flex items-center gap-2">
                        <ArrowRight size={13} className="text-ink-3" />
                        <span className="text-[12.5px] font-medium">{n.title}</span>
                        <span className="ml-auto text-[10px] text-ink-3">{t.detail.linksTo}</span>
                      </div>
                    </Link>
                  ))}
                  {links.linkedFrom.map((n) => (
                    <Link key={n.id} to={`/item/${n.id}`} className="rounded-lg border border-line bg-surface-2 px-3 py-2.5 hover:border-line-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-medium">{n.title}</span>
                        <span className="ml-auto text-[10px] text-ink-3">{t.detail.mentionsThis}</span>
                      </div>
                      {n.body && (
                        <p className="mt-1 line-clamp-2 text-[11.5px] text-ink-2">{n.body}</p>
                      )}
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* side */}
          <div className="flex w-[300px] shrink-0 flex-col gap-3.5">
            <div className="rounded-xl border border-line bg-surface px-[15px] py-2.5">
              {item.kind === 'task' && (
                <>
                  <PropRow label={t.detail.propStatus}>
                    <Select
                      value={item.status}
                      onChange={(e) => useStore.getState().setStatus(item.id, e.target.value as TaskStatus)}
                      className="h-7"
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>
                          {t.status[s]}
                        </option>
                      ))}
                    </Select>
                  </PropRow>
                  <Divider />
                </>
              )}
              <PropRow label={t.detail.propProject}>
                <Select
                  value={item.projectId ?? ''}
                  onChange={(e) => updateItem(item.id, { projectId: e.target.value || undefined })}
                  className="h-7"
                >
                  <option value="">{t.common.noProject}</option>
                  {Object.values(data.projects).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </Select>
              </PropRow>
              <Divider />
              {item.kind === 'task' ? (
                <>
                  <PropRow label={t.detail.propAssignee}>
                    <Select
                      value={item.assigneeId ?? ''}
                      onChange={(e) => updateItem(item.id, { assigneeId: e.target.value || undefined })}
                      className="h-7"
                    >
                      <option value="">{t.detail.propUnassigned}</option>
                      {Object.values(data.contacts).map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </PropRow>
                  <Divider />
                  <PropRow label={t.detail.propDue}>
                    <input
                      type="datetime-local"
                      value={item.due ? toLocalInput(item.due) : ''}
                      onChange={(e) =>
                        updateItem(item.id, {
                          due: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                        })
                      }
                      className="h-7 w-full rounded-lg border border-line bg-surface-2 px-2 text-[11.5px] text-ink outline-none [color-scheme:dark] focus:border-iris/50"
                    />
                  </PropRow>
                </>
              ) : item.kind === 'event' ? (
                <>
                  <PropRow label={t.detail.propStarts}>
                    <input
                      type="datetime-local"
                      value={item.start ? toLocalInput(item.start) : ''}
                      onChange={(e) => updateItem(item.id, { start: new Date(e.target.value).toISOString() })}
                      className="h-7 w-full rounded-lg border border-line bg-surface-2 px-2 text-[11.5px] text-ink outline-none [color-scheme:dark] focus:border-iris/50"
                    />
                  </PropRow>
                  <Divider />
                  <PropRow label={t.detail.propEnds}>
                    <input
                      type="datetime-local"
                      value={item.end ? toLocalInput(item.end) : ''}
                      onChange={(e) => updateItem(item.id, { end: new Date(e.target.value).toISOString() })}
                      className="h-7 w-full rounded-lg border border-line bg-surface-2 px-2 text-[11.5px] text-ink outline-none [color-scheme:dark] focus:border-iris/50"
                    />
                  </PropRow>
                  <Divider />
                  <PropRow label={t.detail.propAllDay}>
                    <Checkbox
                      checked={!!item.allDay}
                      onChange={() => updateItem(item.id, { allDay: !item.allDay })}
                    />
                  </PropRow>
                </>
              ) : null}
              <Divider />
              <PropRow label={t.detail.propTags}>
                <TagEditor tags={item.tags} onChange={(tg) => updateItem(item.id, { tags: tg })} />
              </PropRow>
            </div>

            {item.kind !== 'note' && (
              <div className="rounded-xl border border-line bg-surface px-[15px] py-3.5">
                <div className="mb-1 flex items-center gap-2">
                  <Bell size={13} strokeWidth={1.6} className="text-ink-2" />
                  <h3 className="text-[14px]">{t.detail.reminders}</h3>
                </div>
                {reminders.map((r) => (
                  <div key={r.id} className="group flex items-center gap-2 border-t border-line py-2 first:border-0">
                    <span className="flex-1 text-[12px] text-ink">
                      {r.trigger.type === 'at'
                        ? t.detail.remAt(new Date(r.trigger.at).toLocaleString(dateLocale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))
                        : r.trigger.type === 'before_due'
                          ? t.detail.remBeforeDue(humanMinutes(t, r.trigger.minutes))
                          : t.detail.remBeforeStart(humanMinutes(t, r.trigger.minutes))}
                      {r.firedAt && <span className="mono ml-1.5 text-[10px] text-amber">{t.detail.remFired}</span>}
                    </span>
                    <button
                      onClick={() => deleteReminder(r.id)}
                      className="text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
                <Menu
                  trigger={({ toggle }) => (
                    <button onClick={toggle} className="mt-2 flex items-center gap-1.5 text-[11px] text-iris hover:text-iris-2">
                      <Plus size={11} />
                      {t.detail.addReminder}
                    </button>
                  )}
                  items={[
                    ...(item.due || item.start
                      ? [10, 60, 120, 1440].map((m) => ({
                          label:
                            item.kind === 'event'
                              ? t.detail.remBeforeStart(humanMinutes(t, m))
                              : t.detail.remBeforeDue(humanMinutes(t, m)),
                          onSelect: () =>
                            addReminder({
                              itemId: item.id,
                              trigger: {
                                type: item.kind === 'event' ? 'before_start' : 'before_due',
                                minutes: m,
                              },
                              note:
                                item.kind === 'event'
                                  ? t.detail.remBeforeStart(humanMinutes(t, m))
                                  : t.detail.remBeforeDue(humanMinutes(t, m)),
                            }),
                        }))
                      : []),
                    {
                      label: t.detail.remCustom,
                      onSelect: () => {
                        const when = new Date(Date.now() + 3_600_000)
                        addReminder({
                          itemId: item.id,
                          trigger: { type: 'at', at: when.toISOString() },
                          note: t.detail.remCustom,
                        })
                      },
                    },
                  ]}
                />
              </div>
            )}

            {item.kind === 'event' && (
              <div className="rounded-xl border border-line bg-surface px-[15px] py-3.5">
                <h3 className="mb-2 text-[14px]">{t.detail.people}</h3>
                {(item.contactIds ?? []).map((cid) => {
                  const c = data.contacts[cid]
                  if (!c) return null
                  return (
                    <div key={cid} className="group flex items-center gap-2.5 border-t border-line py-1.5 first:border-0">
                      <Avatar name={c.name} size={20} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[12.5px]">{c.name}</div>
                        {c.role && <div className="text-[10px] text-ink-3">{c.role}</div>}
                      </div>
                      <button
                        onClick={() =>
                          updateItem(item.id, {
                            contactIds: (item.contactIds ?? []).filter((x) => x !== cid),
                          })
                        }
                        className="text-ink-3 opacity-0 hover:text-rose group-hover:opacity-100"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  )
                })}
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value)
                      updateItem(item.id, {
                        contactIds: [...(item.contactIds ?? []), e.target.value],
                      })
                  }}
                  className="mt-2 h-7"
                >
                  <option value="">{t.detail.addPerson}</option>
                  {Object.values(data.contacts)
                    .filter((c) => !(item.contactIds ?? []).includes(c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </Select>
              </div>
            )}
          </div>
        </div>
      </div>

      <ItemPicker
        open={pickDep}
        title={t.detail.blockedBy}
        kinds={['task']}
        exclude={[item.id, ...(item.blockedBy ?? [])]}
        onPick={(picked) =>
          updateItem(item.id, { blockedBy: [...(item.blockedBy ?? []), picked.id] })
        }
        onClose={() => setPickDep(false)}
      />
      <ConfirmDialog
        open={confirmDel}
        title={t.detail.deleteConfirmTitle(item.title)}
        onConfirm={() => {
          deleteItem(item.id)
          navigate(-1)
        }}
        onCancel={() => setConfirmDel(false)}
      />
      {done && null}
    </>
  )
}

function Divider() {
  return <div className="h-px bg-line" />
}

function humanMinutes(t: ReturnType<typeof useT>, m: number) {
  if (m >= 1440) return t.detail.days(m / 1440)
  if (m >= 60) return t.detail.hours(m / 60)
  return t.detail.minutes(m)
}
