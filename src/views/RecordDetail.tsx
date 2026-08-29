import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowRight,
  ArrowUp,
  Bell,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileText,
  GitBranch,
  MoreHorizontal,
  Plus,
  Sparkles,
} from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { SourceIcon } from '@/components/SourceIcon'
import { Avatar, Button, Chip, Dot, SectionLabel, cn } from '@/components/ui'
import {
  contactById,
  itemById,
  notes,
  projectById,
  tasks,
} from '@/lib/mockData'
import type { NoteItem, ReminderKind, TaskItem } from '@/lib/types'

const statusMeta: Record<TaskItem['status'], { label: string; color: string }> = {
  todo: { label: 'To do', color: 'var(--color-ink-2)' },
  in_progress: { label: 'In progress', color: 'var(--color-amber)' },
  blocked: { label: 'Blocked', color: 'var(--color-rose)' },
  done: { label: 'Done', color: 'var(--color-sage)' },
}

const reminderIcon: Record<ReminderKind, typeof Bell> = {
  time: Clock,
  context: Sparkles,
  escalation: ArrowUp,
}

function Backlinked({ text }: { text: string }) {
  const parts = text.split(/(\[\[.+?\]\])/g)
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('[[') ? (
          <span key={i} className="text-iris-2">
            {p.slice(2, -2)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  )
}

function RelRow({
  to,
  icon,
  title,
  subtitle,
  source,
  right,
}: {
  to?: string
  icon: React.ReactNode
  title: string
  subtitle?: string
  source?: 'slack' | 'gmail'
  right?: React.ReactNode
}) {
  const inner = (
    <>
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-[12.75px] text-ink">{title}</div>
        {subtitle && <div className="mt-px text-[10.5px] text-ink-3">{subtitle}</div>}
      </div>
      {source && <SourceIcon source={source} size={16} />}
      {right}
    </>
  )
  const cls =
    'flex items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-line-2 hover:bg-surface-3'
  return to ? (
    <Link to={to} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}

function NoteDetail({ note }: { note: NoteItem }) {
  const project = projectById(note.projectId)
  return (
    <div className="flex-1">
      <div className="mb-3 flex items-center gap-2.5">
        <Chip>
          <FileText size={12} strokeWidth={1.7} />
          Note
        </Chip>
        {project && (
          <span className="flex items-center gap-1.5 text-[12px] text-ink-2">
            <Dot color={project.color} />
            {project.name}
          </span>
        )}
        {note.source && <SourceIcon source={note.source} size={17} />}
      </div>
      <h1 className="text-[24px] leading-tight tracking-[-0.025em]">{note.title}</h1>
      <p className="mt-4 text-[13.5px] leading-relaxed text-ink">
        <Backlinked text={note.snippet} />
      </p>

      {note.backlinks.length > 0 && (
        <>
          <SectionLabel className="mt-7">
            Linked from · {note.backlinks.length}
          </SectionLabel>
          <div className="mt-3 flex flex-col gap-2">
            {note.backlinks.map((id) => {
              const t = itemById(id)
              return (
                <RelRow
                  key={id}
                  to={`/item/${id}`}
                  icon={<ArrowRight size={15} strokeWidth={1.7} className="shrink-0 text-ink-2" />}
                  title={t?.title ?? id}
                />
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

export function RecordDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const item = id ? itemById(id) : undefined

  if (!item) {
    return (
      <>
        <TopBar>
          <Button variant="ghost" square onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <h1 className="text-[16px]">Not found</h1>
        </TopBar>
        <div className="flex flex-1 items-center justify-center text-[13px] text-ink-2">
          No record with id “{id}”.
        </div>
      </>
    )
  }

  const project = projectById(item.projectId)

  if (item.kind !== 'task') {
    return (
      <>
        <TopBar>
          <Button variant="ghost" square onClick={() => navigate(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
            {project && <Dot color={project.color} />}
            <span>{project?.name ?? 'No project'}</span>
          </div>
        </TopBar>
        <div className="flex flex-1 justify-center overflow-y-auto px-8 pb-11 pt-[30px]">
          <div className="w-full max-w-[720px]">
            {item.kind === 'note' ? (
              <NoteDetail note={item} />
            ) : (
              <div className="flex-1">
                <Chip>
                  <CalendarDays size={12} strokeWidth={1.7} />
                  Event
                </Chip>
                <h1 className="mt-3 text-[24px] leading-tight tracking-[-0.025em]">
                  {item.title}
                </h1>
                {item.conflict && (
                  <p className="mt-3 text-[12.5px] text-rose">
                    Overlaps “{item.conflict}”.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  const task = item
  const status = statusMeta[task.status]
  const blockedBy = task.blockedBy.map((x) => tasks.find((t) => t.id === x)).filter(Boolean) as TaskItem[]
  const blocks = task.blocks.map((x) => tasks.find((t) => t.id === x)).filter(Boolean) as TaskItem[]
  const linkedNotes = task.linkedNoteIds
    .map((x) => notes.find((n) => n.id === x))
    .filter(Boolean) as NoteItem[]
  const people = task.contactIds.map(contactById).filter(Boolean)

  return (
    <>
      <TopBar>
        <Button variant="ghost" square onClick={() => navigate(-1)}>
          <ChevronLeft size={16} />
        </Button>
        <div className="flex items-center gap-1.5 text-[12.5px] text-ink-3">
          {project && <Dot color={project.color} />}
          <span>{project?.name}</span>
          <ChevronRight size={13} className="text-ink-3" />
          <span>Tasks</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" className="text-[12px]">
            <CalendarDays size={13} />
            Open in calendar
          </Button>
          <Button variant="ghost" square>
            <MoreHorizontal size={14} />
          </Button>
        </div>
      </TopBar>

      <div className="flex flex-1 justify-center overflow-y-auto px-8 pb-11 pt-[30px]">
        <div className="flex w-full max-w-[1000px] gap-[34px]">
          {/* main column */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex flex-wrap items-center gap-2.5">
              <Chip
                style={{ background: 'color-mix(in oklab, ' + status.color + ' 12%, transparent)', color: status.color, borderColor: 'transparent' }}
              >
                <Dot color={status.color} />
                {status.label}
              </Chip>
              {task.code && <span className="mono text-ink-3">{task.code}</span>}
              {task.source && (
                <Chip>
                  <SourceIcon source={task.source} size={15} />
                  From {task.source === 'gmail' ? 'Gmail' : task.source}
                </Chip>
              )}
            </div>

            <h1 className="text-[24px] leading-[1.25] tracking-[-0.025em]">{task.title}</h1>

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-2">
              {people[0] && (
                <span className="flex items-center gap-1.5">
                  <Avatar contact={people[0]!} size={18} />
                  {people[0]!.name}
                </span>
              )}
              {task.due && (
                <>
                  <span className="text-ink-3">·</span>
                  <span className="flex items-center gap-1.5">
                    <Clock size={13} strokeWidth={1.6} />
                    Due {task.due}
                  </span>
                </>
              )}
              {project && (
                <>
                  <span className="text-ink-3">·</span>
                  <span className="flex items-center gap-1.5">
                    <Dot color={project.color} />
                    {project.name}
                  </span>
                </>
              )}
            </div>

            {task.suggestedTime && (
              <div className="mt-[18px] flex gap-2.5 rounded-xl border border-iris/25 bg-iris/12 px-[15px] py-3">
                <Sparkles size={17} strokeWidth={1.6} className="mt-px shrink-0 text-iris" />
                <div className="flex-1">
                  <div className="text-[12.75px] leading-normal text-ink">
                    <b className="font-semibold">Suggested time — {task.suggestedTime.label}.</b>{' '}
                    {task.suggestedTime.reason}
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <Button variant="accent" className="h-7 text-[11.5px]">
                      Schedule it
                    </Button>
                    <Button variant="ghost" className="h-7 text-[11.5px]">
                      Pick another time
                    </Button>
                    <Button variant="ghost" className="h-7 text-[11.5px]">
                      Dismiss
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {task.description && (
              <>
                <SectionLabel className="mt-[26px]">Description</SectionLabel>
                <p className="mt-2.5 whitespace-pre-line text-[13.5px] leading-relaxed text-ink">
                  {task.description}
                </p>
              </>
            )}

            {(blockedBy.length > 0 || blocks.length > 0) && (
              <>
                <SectionLabel className="mt-7">Dependencies</SectionLabel>
                <div className="mt-3 flex flex-col gap-3.5">
                  {blockedBy.length > 0 && (
                    <div>
                      <SectionLabel className="mb-2 text-[9.5px] tracking-[0.12em]">
                        Blocked by
                      </SectionLabel>
                      <div className="flex flex-col gap-2">
                        {blockedBy.map((b) => (
                          <RelRow
                            key={b.id}
                            to={`/item/${b.id}`}
                            icon={<GitBranch size={15} strokeWidth={1.7} className="shrink-0 text-rose" />}
                            title={b.title}
                            subtitle={
                              b.contactIds[0]
                                ? `Owner: ${contactById(b.contactIds[0])?.name}`
                                : undefined
                            }
                            right={
                              <Chip className="border-transparent bg-rose/12 text-rose">
                                Waiting
                              </Chip>
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {blocks.length > 0 && (
                    <div>
                      <SectionLabel className="mb-2 text-[9.5px] tracking-[0.12em]">
                        Blocks · {blocks.length}
                      </SectionLabel>
                      <div className="flex flex-col gap-2">
                        {blocks.map((b) => (
                          <RelRow
                            key={b.id}
                            to={`/item/${b.id}`}
                            icon={<ArrowRight size={15} strokeWidth={1.7} className="shrink-0 text-ink-2" />}
                            title={b.title}
                            source={b.source === 'slack' ? 'slack' : undefined}
                            right={<Chip>{statusMeta[b.status].label}</Chip>}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            {linkedNotes.length > 0 && (
              <>
                <SectionLabel className="mt-7">Linked notes · {linkedNotes.length}</SectionLabel>
                <div className="mt-3 flex flex-col gap-2.5">
                  {linkedNotes.map((n) => {
                    const backlink = n.backlinks.includes(task.id)
                    return (
                      <Link
                        key={n.id}
                        to={`/item/${n.id}`}
                        className="flex flex-col gap-1.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 transition-colors hover:border-line-2 hover:bg-surface-3"
                      >
                        <div className="flex w-full items-center gap-2">
                          <FileText size={14} strokeWidth={1.6} className="shrink-0 text-ink-2" />
                          <span className="text-[12.75px] font-medium">{n.title}</span>
                          <span className="ml-auto text-[10px] text-ink-3">
                            {backlink ? 'mentions this task' : 'backlink'}
                          </span>
                        </div>
                        <div className="text-[11.5px] leading-normal text-ink-2">
                          <Backlinked text={n.snippet} />
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}

            {task.activity && task.activity.length > 0 && (
              <>
                <SectionLabel className="mt-7">Activity</SectionLabel>
                <div className="mt-3 flex flex-col gap-2.5 text-[11.5px] text-ink-2">
                  {task.activity.map((a, i) => (
                    <div key={i} className="flex gap-2.5">
                      <span className="mono shrink-0 text-ink-3">{a.at}</span>
                      <span>{a.text}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* side column */}
          <div className="flex w-[300px] shrink-0 flex-col gap-3.5">
            <div className="rounded-xl border border-line bg-surface px-[15px] py-3.5 text-[12.5px]">
              {[
                ['Status', <span key="s" className="flex items-center gap-1.5"><Dot color={status.color} />{status.label}</span>],
                ['Project', project ? <span key="p" className="flex items-center gap-1.5"><Dot color={project.color} />{project.name}</span> : '—'],
                ['Assignee', people[0] ? <span key="a" className="flex items-center gap-1.5"><Avatar contact={people[0]!} size={17} />{people[0]!.name}</span> : '—'],
                ['Start', <span key="st" className="text-ink-2">{task.start ?? '—'}</span>],
                ['Due', task.due ?? '—'],
              ].map(([label, value], i) => (
                <div key={i}>
                  {i > 0 && <div className="h-px bg-line" />}
                  <div className="flex gap-3 py-[7px]">
                    <span className="w-[76px] shrink-0 text-ink-3">{label as string}</span>
                    <span className="flex-1 text-ink">{value}</span>
                  </div>
                </div>
              ))}
              <div className="h-px bg-line" />
              <div className="flex gap-3 py-[7px]">
                <span className="w-[76px] shrink-0 text-ink-3">Tags</span>
                <span className="flex flex-1 flex-wrap gap-1.5">
                  {task.tags.map((t) => (
                    <span key={t} className="inline-flex h-[22px] items-center rounded-md bg-surface-3 px-2 text-[11px] text-ink-2">
                      {t}
                    </span>
                  ))}
                  {task.suggestedTags?.map((t) => (
                    <span key={t} className="inline-flex h-[22px] items-center gap-1 rounded-md border border-dashed border-line-2 px-2 text-[11px] text-iris-2">
                      <Sparkles size={9} strokeWidth={1.8} />
                      {t}
                    </span>
                  ))}
                </span>
              </div>
            </div>

            {task.reminders.length > 0 && (
              <div className="rounded-xl border border-line bg-surface px-[15px] py-3.5">
                <div className="mb-1.5 flex items-center gap-2">
                  <Bell size={13} strokeWidth={1.6} className="text-ink-2" />
                  <h3 className="text-[14px]">Reminders</h3>
                </div>
                {task.reminders.map((r, i) => {
                  const Icon = reminderIcon[r.kind]
                  return (
                    <div
                      key={r.id}
                      className={cn('flex gap-2.5 py-2', i > 0 && 'border-t border-line')}
                    >
                      <Icon
                        size={14}
                        strokeWidth={1.6}
                        className={cn(
                          'mt-0.5 shrink-0',
                          r.kind === 'context' && 'text-iris',
                          r.kind === 'escalation' && 'text-amber',
                          r.kind === 'time' && 'text-ink-2',
                        )}
                      />
                      <div>
                        <div className="text-[12px] text-ink">{r.label}</div>
                        <div className="mt-px text-[10.5px] text-ink-3">{r.detail}</div>
                      </div>
                    </div>
                  )
                })}
                <button className="mt-2 flex items-center gap-1.5 text-[11px] text-iris hover:text-iris-2">
                  <Plus size={11} strokeWidth={1.8} />
                  Add reminder
                </button>
              </div>
            )}

            {people.length > 0 && (
              <div className="rounded-xl border border-line bg-surface px-[15px] py-3.5">
                <h3 className="mb-2.5 text-[14px]">People</h3>
                {people.map((c, i) => (
                  <div
                    key={c!.id}
                    className={cn('flex items-center gap-2.5 py-1.5', i > 0 && 'border-t border-line')}
                  >
                    <Avatar contact={c!} size={22} />
                    <div className="min-w-0">
                      <div className="text-[12.5px] text-ink">{c!.name}</div>
                      {c!.role && <div className="text-[10.5px] text-ink-3">{c!.role}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
