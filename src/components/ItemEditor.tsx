import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  ChevronRight,
  Clock9,
  Expand,
  FileText,
  Flame,
  FolderPlus,
  ListChecks,
  Moon,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { parseCapture, type ParseResult } from '@/lib/parse'
import { resolveHashes } from '@/lib/capture'
import { addDays, overlaps, startOfDay, toLocalInput } from '@/lib/date'
import { eventsOn } from '@/lib/recur'
import { defaultTriggers, hasTimeOfDay } from '@/lib/reminders'
import type { Item, ItemKind, ReminderTrigger, Space, TaskPriority, TaskStatus, WeavoData } from '@/lib/types'
import { PROJECT_COLORS, SPACE_COLOR, SPACES } from '@/lib/types'
import { RemindersField, RepeatField, type ReminderEntry } from './fields'
import { TagEditor } from './editors'
import { Modal } from './overlays'
import { StepsList } from './Steps'
import { useConfirmDelete } from './useConfirmDelete'
import { Button, Checkbox, Dot, Kbd, ProjectGlyph, Segmented, Select, SpaceThread, cn } from './ui'

type Draft = Partial<Item> & { kind: ItemKind; title: string }

/** the four fields that say "when"; they are edited together */
const WHEN_KEYS = ['due', 'start', 'end', 'allDay'] as const
const STATUSES: TaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']
const PRIORITIES: ('none' | TaskPriority)[] = ['none', 'low', 'medium', 'high']
const KIND_ICON = { task: ListChecks, event: CalendarIcon, note: FileText }

const pad = (n: number) => String(n).padStart(2, '0')
const dateStr = (iso?: string) => (iso ? toLocalInput(iso).slice(0, 10) : '')
const timeStr = (iso?: string, always = false) => {
  if (!iso) return ''
  const d = new Date(iso)
  return always || d.getHours() || d.getMinutes() ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : ''
}
const join = (date: string, time: string) => new Date(`${date}T${time || '00:00'}`).toISOString()

function nextHour() {
  const d = new Date()
  d.setMinutes(0, 0, 0)
  d.setHours(d.getHours() + 1)
  return d
}

/** what changes when an item switches type: the "when" fields move between due and start/end */
function convertKind(v: Draft, k: ItemKind): Partial<Item> {
  const at = v.start ?? v.due
  if (k === 'event') {
    const start = at ?? nextHour().toISOString()
    const allDay = at ? (v.allDay ?? !hasTimeOfDay(at)) : false
    return {
      start,
      end: allDay ? start : new Date(new Date(start).getTime() + 3_600_000).toISOString(),
      allDay,
      due: undefined,
      status: undefined,
      flame: undefined,
      waitingFor: undefined,
    }
  }
  if (k === 'task')
    return { due: v.due ?? v.start, start: undefined, end: undefined, allDay: undefined, status: v.status ?? 'todo' }
  return {
    due: v.due ?? v.start,
    start: undefined,
    end: undefined,
    allDay: undefined,
    status: undefined,
    flame: undefined,
    waitingFor: undefined,
    repeat: undefined,
  }
}

/** an editor works on a draft (create) or on a stored item (edit) through the same few handles */
interface Model {
  mode: 'create' | 'edit'
  v: Draft
  set: (patch: Partial<Item>) => void
  setKind: (k: ItemKind) => void
  setSpace: (sp: Space) => void
  setStatus: (s: TaskStatus) => void
  reminders: ReminderEntry[]
  addReminder: (t: ReminderTrigger) => void
  removeReminder: (id: string) => void
  /** create: a project the #word asks for, made on save */
  newProject?: string
  conflict?: Item
}

/* ───────────────────────── small controlled fields ───────────────────────── */

function Row({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <>
      <dt className="pt-[5px] text-sm text-ink-3">{label}</dt>
      <dd className={cn('m-0 flex min-h-7 flex-wrap items-center gap-2', wide && 'min-w-0')}>{children}</dd>
    </>
  )
}

const inputCls =
  'h-7 rounded-md border border-line-2 bg-surface px-2 text-sm text-ink outline-none transition-colors placeholder:text-ink-3 focus:border-iris/60 [color-scheme:dark]'

/** text that writes through as you type (a draft) or when you leave the field (a stored item) */
function TextInput({
  value,
  onCommit,
  live,
  className,
  ...rest
}: {
  value: string
  onCommit: (v: string) => void
  live: boolean
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  return (
    <input
      {...rest}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        if (live) onCommit(e.target.value)
      }}
      onBlur={() => !live && draft !== value && onCommit(draft)}
      onKeyDown={(e) => e.key === 'Enter' && !live && (e.target as HTMLInputElement).blur()}
      className={cn(inputCls, 'w-full', className)}
    />
  )
}

function AutoArea({
  value,
  onCommit,
  live,
  className,
  minRows = 3,
  ...rest
}: {
  value: string
  onCommit: (v: string) => void
  live: boolean
  minRows?: number
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'>) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)
  useEffect(() => setDraft(value), [value])
  useEffect(() => {
    const el = ref.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [draft])
  return (
    <textarea
      {...rest}
      ref={ref}
      rows={minRows}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value)
        if (live) onCommit(e.target.value)
      }}
      onBlur={() => !live && draft !== value && onCommit(draft)}
      className={cn('w-full resize-none overflow-hidden', className)}
    />
  )
}

/** a date and, optionally, a time of day */
function WhenInput({
  value,
  onChange,
  timeRequired,
  quick,
  disabledTime,
}: {
  value?: string
  onChange: (iso?: string) => void
  /** events always have a time; tasks and notes may leave it empty */
  timeRequired?: boolean
  quick?: boolean
  disabledTime?: boolean
}) {
  const t = useT()
  const date = dateStr(value)
  const time = timeStr(value, timeRequired)
  const pick = (days: number) => {
    const d = addDays(startOfDay(new Date()), days)
    onChange(join(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`, time))
  }
  return (
    <>
      <input
        type="date"
        value={date}
        onChange={(e) => onChange(e.target.value ? join(e.target.value, time) : undefined)}
        className={cn(inputCls, 'w-[132px]')}
        aria-label={t.editor.date}
      />
      {!disabledTime && (
        <input
          type="time"
          value={time}
          onChange={(e) => {
            const d = date || dateStr(new Date().toISOString())
            onChange(join(d, e.target.value))
          }}
          className={cn(inputCls, 'w-[92px]')}
          aria-label={t.editor.time}
        />
      )}
      {quick && (
        <>
          <button
            type="button"
            onClick={() => pick(0)}
            className="h-7 rounded-md px-1.5 text-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            {t.common.today}
          </button>
          <button
            type="button"
            onClick={() => pick(1)}
            className="h-7 rounded-md px-1.5 text-sm text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            {t.common.tomorrow}
          </button>
        </>
      )}
      {value && !timeRequired && time && (
        <button
          type="button"
          onClick={() => onChange(join(date, ''))}
          className="text-ink-4 hover:text-ink-2"
          aria-label={t.common.delete}
        >
          <X size={13} />
        </button>
      )}
    </>
  )
}

/* ─────────────────────────────── the form ─────────────────────────────── */

function ItemForm({ m }: { m: Model }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const { v, set } = m
  const live = m.mode === 'create'
  const isTask = v.kind === 'task'
  const isEvent = v.kind === 'event'
  const isNote = v.kind === 'note'
  const project = v.projectId ? data.projects[v.projectId] : undefined
  const hasDate = !!(isEvent ? v.start : v.due)

  const kindOptions = (['task', 'event', 'note'] as ItemKind[]).map((k) => {
    const Icon = KIND_ICON[k]
    return {
      value: k,
      label: (
        <>
          <Icon size={13} strokeWidth={1.7} />
          {t.kind[k]}
        </>
      ),
    }
  })

  const setStart = (iso?: string) => {
    if (!iso) return
    const dur = v.start && v.end ? new Date(v.end).getTime() - new Date(v.start).getTime() : 3_600_000
    set({ start: iso, end: v.allDay ? iso : new Date(new Date(iso).getTime() + Math.max(dur, 0)).toISOString() })
  }
  const setEnd = (iso?: string) => {
    if (!iso) return
    set({ end: v.start && new Date(iso) < new Date(v.start) ? v.start : iso })
  }
  const setAllDay = (on: boolean) => {
    const s = new Date(v.start ?? nextHour().toISOString())
    if (on) {
      const day = startOfDay(s).toISOString()
      set({ allDay: true, start: day, end: day })
    } else {
      s.setHours(9, 0, 0, 0)
      set({ allDay: false, start: s.toISOString(), end: new Date(s.getTime() + 3_600_000).toISOString() })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Segmented options={kindOptions} value={v.kind} onChange={m.setKind} className="self-start" />

      <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-3 gap-y-2.5">
        {isEvent ? (
          <>
            <Row label={t.editor.starts}>
              <WhenInput value={v.start} onChange={setStart} timeRequired disabledTime={v.allDay} quick />
              <label className="flex cursor-pointer items-center gap-1.5 text-sm text-ink-2">
                <Checkbox checked={!!v.allDay} onChange={() => setAllDay(!v.allDay)} />
                {t.detail.propAllDay}
              </label>
            </Row>
            {!v.allDay && (
              <Row label={t.editor.ends}>
                <WhenInput value={v.end} onChange={setEnd} timeRequired />
              </Row>
            )}
          </>
        ) : (
          <Row label={isTask ? t.drawer.due : t.editor.noteDate}>
            <WhenInput value={v.due} onChange={(due) => set({ due })} quick />
          </Row>
        )}

        {!isNote && (
          <Row label={t.repeat.label} wide>
            <RepeatField value={v.repeat} onChange={(repeat) => set({ repeat })} />
          </Row>
        )}

        {(!isNote || hasDate) && (
          <Row label={t.remind.label} wide>
            <RemindersField
              kind={v.kind}
              entries={m.reminders}
              hasDate={hasDate}
              onAdd={m.addReminder}
              onRemove={m.removeReminder}
            />
          </Row>
        )}

        {isTask && (
          <>
            <Row label={t.editor.status}>
              <Segmented
                options={STATUSES.map((s) => ({ value: s, label: t.status[s] }))}
                value={v.status ?? 'todo'}
                onChange={m.setStatus}
              />
            </Row>
            <Row label={t.detail.propPriority}>
              <Segmented
                options={PRIORITIES.map((p) => ({ value: p, label: p === 'none' ? '—' : t.priority[p] }))}
                value={v.priority ?? 'none'}
                onChange={(p) => set({ priority: p === 'none' ? undefined : p })}
              />
              <button
                type="button"
                onClick={() => set({ flame: v.flame ? undefined : true })}
                aria-pressed={!!v.flame}
                className={cn(
                  'flex h-7 items-center gap-1.5 rounded-md border px-2 text-sm transition-colors',
                  v.flame ? 'border-flame/45 bg-flame/10 text-flame' : 'border-line-2 text-ink-3 hover:text-ink',
                )}
              >
                <Flame size={13} fill={v.flame ? 'currentColor' : 'none'} fillOpacity={0.28} />
                {t.todo.flame}
              </button>
            </Row>
          </>
        )}

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
            value={v.space ?? 'personal'}
            onChange={m.setSpace}
          />
        </Row>

        <Row label={t.detail.propProject} wide>
          <Select
            value={v.projectId ?? ''}
            onChange={(e) => set({ projectId: e.target.value || undefined, phaseId: undefined })}
            className="h-7 max-w-[260px]"
          >
            <option value="">{m.newProject ? t.capture.newProject(m.newProject) : t.common.noProject}</option>
            {SPACES.map((sp) => (
              <optgroup key={sp} label={t.spaces[sp]}>
                {Object.values(data.projects)
                  .filter((p) => p.space === sp && (p.status !== 'done' || p.id === v.projectId))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </optgroup>
            ))}
          </Select>
          {m.newProject && !v.projectId && (
            <span className="flex items-center gap-1 text-xs text-ink-3">
              <FolderPlus size={12} />
              {t.capture.newProject(m.newProject)}
            </span>
          )}
        </Row>

        {project?.phases?.length ? (
          <Row label={t.detail.propPhase} wide>
            <Select
              value={v.phaseId ?? ''}
              onChange={(e) => set({ phaseId: e.target.value || undefined })}
              className="h-7 max-w-[260px]"
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

        <Row label={t.detail.propTags} wide>
          <TagEditor tags={v.tags ?? []} space={v.space ?? 'personal'} onChange={(tags) => set({ tags })} />
        </Row>

        {isTask && (
          <Row label={t.todo.waitingFor} wide>
            <TextInput
              live={live}
              value={v.waitingFor?.who ?? ''}
              placeholder={t.todo.waitingPh}
              onCommit={(who) =>
                set({
                  waitingFor: who.trim()
                    ? { who: who.trim(), since: v.waitingFor?.since ?? new Date().toISOString() }
                    : undefined,
                })
              }
            />
          </Row>
        )}

        {isEvent && (
          <>
            <Row label={t.editor.place} wide>
              <TextInput
                live={live}
                value={v.place ?? ''}
                placeholder={t.editor.placePh}
                onCommit={(place) => set({ place: place || undefined })}
              />
            </Row>
            <Row label={t.editor.link} wide>
              <TextInput
                live={live}
                type="url"
                value={v.link ?? ''}
                placeholder={t.editor.linkPh}
                onCommit={(link) => set({ link: link.trim() || undefined })}
              />
            </Row>
          </>
        )}
      </dl>

      {m.conflict && (
        <div className="flex items-center gap-2 rounded-md bg-rose/12 px-2.5 py-2">
          <TriangleAlert size={13} strokeWidth={1.7} className="shrink-0 text-rose" />
          <span className="text-sm text-ink-2">
            {t.capture.overlaps(m.conflict.title, m.conflict.start ? timeStr(m.conflict.start, true) : '')}
          </span>
        </div>
      )}

      {isTask && (
        <section>
          <h4 className="mb-1 text-sm font-medium text-ink-2">
            {t.drawer.steps}
            {v.checklist?.length ? (
              <span className="ml-2 font-normal text-ink-3">
                {v.checklist.filter((s) => s.done).length}/{v.checklist.length}
              </span>
            ) : null}
          </h4>
          <StepsList steps={v.checklist ?? []} onChange={(checklist) => set({ checklist })} />
        </section>
      )}

      <section>
        <h4 className="mb-1.5 text-sm font-medium text-ink-2">{t.drawer.note}</h4>
        <AutoArea
          live={live}
          value={v.body ?? ''}
          minRows={isNote ? 6 : 3}
          placeholder={t.drawer.notePh}
          onCommit={(body) => set({ body })}
          className="rounded-md border border-line bg-surface-2 px-3 py-2.5 text-base leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:border-iris/50"
        />
      </section>
    </div>
  )
}

/* ─────────────────────── create: the capture window ─────────────────────── */

function defaultSpaceFor(pathname: string, data: WeavoData): Space {
  const projectMatch = pathname.match(/^\/project\/([^/]+)/)
  if (pathname.startsWith('/todo/work')) return 'work'
  if (projectMatch && data.projects[projectMatch[1]]) return data.projects[projectMatch[1]].space
  if (pathname.startsWith('/todo') || data.settings.spaceFilter !== 'work') return 'personal'
  return 'work'
}

/** what the quick line contributes, for a given type */
function fromParse(p: ParseResult, kind: ItemKind, raw: string): Partial<Item> {
  const out: Partial<Item> = {}
  if (raw.trim()) out.title = p.title
  const w = p.when
  if (w) {
    if (kind === 'event') {
      out.start = w.start.toISOString()
      out.allDay = w.allDay
      out.end = w.allDay ? out.start : (w.end ?? new Date(w.start.getTime() + 3_600_000)).toISOString()
    } else out.due = w.start.toISOString()
  }
  if (p.space) out.space = p.space
  if (p.flame && kind === 'task') out.flame = true
  if (p.repeat && kind !== 'note') out.repeat = p.repeat
  return out
}

function CaptureBody() {
  const t = useT()
  const location = useLocation()
  const { captureKind, captureText, capturePreset, closeCapture, data } = useStore()
  const { createItem, addProject, addReminder, toast, openPeek } = useStore()
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const [raw, setRaw] = useState(captureText)
  const [kind, setKindState] = useState<ItemKind>(captureKind)
  const [manual, setManual] = useState<Partial<Item>>({})
  const [remManual, setRemManual] = useState<ReminderTrigger[] | null>(null)
  const [leaveInbox, setLeaveInbox] = useState(false)
  const [defaultSpace] = useState(() => defaultSpaceFor(location.pathname, data))
  const [slot] = useState(() => {
    const s = nextHour()
    return { start: s.toISOString(), end: new Date(s.getTime() + 3_600_000).toISOString() }
  })

  useEffect(() => {
    const el = areaRef.current
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }, [])

  const parsed = useMemo(() => parseCapture(raw), [raw])
  const layer = useMemo(() => fromParse(parsed, kind, raw), [parsed, kind, raw])

  const base: Draft = {
    kind,
    title: '',
    tags: [],
    space: defaultSpace,
    status: kind === 'task' ? 'todo' : undefined,
    ...(kind === 'event' ? { start: slot.start, end: slot.end, allDay: false } : {}),
    ...(capturePreset ?? {}),
  }
  const hashSpace = manual.space ?? layer.space ?? base.space ?? defaultSpace
  const resolved = resolveHashes(parsed.hashes, hashSpace, data)
  const merged: Draft = {
    ...base,
    ...layer,
    ...(resolved.tagIds.length ? { tags: resolved.tagIds } : {}),
    ...(resolved.project ? { projectId: resolved.project.id } : {}),
    ...manual,
    kind,
  }
  const mergedProject = merged.projectId ? data.projects[merged.projectId] : undefined
  const v: Draft = { ...merged, space: mergedProject?.space ?? merged.space }
  const newProject = !v.projectId ? resolved.newProject : undefined

  const triggers = remManual ?? defaultTriggers(v, data.settings.reminderDefaults)
  const reminders: ReminderEntry[] = triggers.map((trigger, i) => ({ id: String(i), trigger }))

  const conflict = useMemo(() => {
    if (kind !== 'event' || !v.start || !v.end || v.allDay) return undefined
    return eventsOn(data, new Date(v.start)).find((e) => e.end && overlaps(e.start!, e.end, v.start!, v.end!))
  }, [kind, v.start, v.end, v.allDay, data])

  const set = (patch: Partial<Item>) =>
    setManual((m) => {
      const group = WHEN_KEYS.some((k) => k in patch)
      const frozen = group ? Object.fromEntries(WHEN_KEYS.map((k) => [k, v[k]])) : {}
      return { ...m, ...frozen, ...patch }
    })

  const model: Model = {
    mode: 'create',
    v,
    set,
    setKind: (k) => {
      if (WHEN_KEYS.some((key) => key in manual) || capturePreset?.start) {
        setManual((m) => ({ ...m, ...convertKind(v, k) }))
      }
      setKindState(k)
      setRemManual(null)
    },
    setSpace: (sp) =>
      set({
        space: sp,
        projectId: mergedProject?.space === sp ? v.projectId : undefined,
        phaseId: mergedProject?.space === sp ? v.phaseId : undefined,
        tags: (v.tags ?? []).filter((id) => data.tags[id]?.space === sp),
      }),
    setStatus: (status) => set({ status }),
    reminders,
    addReminder: (tr) => setRemManual([...triggers, tr]),
    removeReminder: (id) => setRemManual(triggers.filter((_, i) => String(i) !== id)),
    newProject,
    conflict,
  }

  function save(another: boolean) {
    const title = v.title.trim()
    if (!title) return
    let projectId = v.projectId
    if (!projectId && newProject) {
      projectId = addProject(
        newProject,
        PROJECT_COLORS[Object.keys(data.projects).length % PROJECT_COLORS.length].value,
        v.space ?? 'personal',
      ).id
    }
    const payload: Draft = { ...v, title, projectId }
    // a repeating task or note needs a day to repeat from
    if (kind !== 'event' && payload.repeat && !payload.due) payload.due = startOfDay(new Date()).toISOString()
    if (kind !== 'event') {
      delete payload.start
      delete payload.end
      delete payload.allDay
    }
    if (kind === 'event') delete payload.due
    if (kind !== 'task') {
      delete payload.flame
      delete payload.waitingFor
      delete payload.priority
    }
    if (kind === 'note') delete payload.repeat
    const item = createItem({ ...payload, unsorted: leaveInbox || undefined }, { reminders: false })
    for (const trigger of remManual ?? defaultTriggers(item, data.settings.reminderDefaults)) {
      addReminder({ itemId: item.id, trigger })
    }
    toast(t.editor.saved(t.kind[kind].toLowerCase()), { label: t.common.open, run: () => openPeek(item.id) })
    if (another) {
      setRaw('')
      setManual({})
      setRemManual(null)
      areaRef.current?.focus()
    } else closeCapture()
  }

  const canSave = !!v.title.trim()

  return (
    <div
      className="flex max-h-[88vh] flex-col"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault()
          save(false)
        }
      }}
    >
      <div className="overflow-y-auto px-4 pb-3 pt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-ink-3">
          <span>{t.editor.newKind[kind]}</span>
          <button
            onClick={closeCapture}
            className="-mr-1 flex h-6 w-6 items-center justify-center rounded text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label={t.drawer.close}
          >
            <X size={14} />
          </button>
        </div>
        <textarea
          ref={areaRef}
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
              e.preventDefault()
              save(false)
            }
          }}
          rows={1}
          placeholder={t.editor.quickPh}
          aria-label={t.editor.quickLabel}
          className="w-full resize-none bg-transparent text-xl leading-snug text-ink outline-none placeholder:text-ink-4"
        />
        <p className="mb-4 mt-1 text-xs text-ink-4">{t.editor.quickHint}</p>

        <div className="mb-4 grid grid-cols-[84px_minmax(0,1fr)] items-center gap-x-3">
          <span className="text-sm text-ink-3">{t.editor.name}</span>
          <TextInput
            live
            value={v.title}
            placeholder={t.editor.namePh}
            onCommit={(title) => setManual((m) => ({ ...m, title }))}
          />
        </div>

        <ItemForm m={model} />

        <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-ink-2">
          <Checkbox checked={leaveInbox} onChange={() => setLeaveInbox((x) => !x)} />
          {t.editor.leaveInbox}
        </label>
      </div>

      <div className="flex items-center gap-2 border-t border-line px-4 py-2.5">
        <span className="text-xs text-ink-4 max-sm:hidden">
          <Kbd>↵</Kbd> {t.editor.hintSave} · <Kbd>esc</Kbd> {t.editor.hintClose}
        </span>
        <span className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => save(true)} disabled={!canSave}>
            {t.editor.saveNext}
          </Button>
          <Button variant="accent" size="sm" onClick={() => save(false)} disabled={!canSave}>
            {t.editor.save}
          </Button>
        </span>
      </div>
    </div>
  )
}

/** the capture window — open with C or the "new item" buttons */
export function CaptureDialog() {
  const open = useStore((s) => s.captureOpen)
  const closeCapture = useStore((s) => s.closeCapture)
  return (
    <Modal open={open} onClose={closeCapture} width={640} align="top">
      <CaptureBody />
    </Modal>
  )
}

/* ─────────────────────────── edit: the side panel ─────────────────────────── */

function EditBody({ item, onClose }: { item: Item; onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const { updateItem, toggleDone, setStatus, addReminder, deleteReminder, updateReminder, toast } = useStore()
  const { askDelete, dialog } = useConfirmDelete()
  const project = item.projectId ? data.projects[item.projectId] : undefined
  const phase = project?.phases?.find((ph) => ph.id === item.phaseId)
  const done = item.status === 'done'
  const isTask = item.kind === 'task'

  const stored = useMemo(
    () => Object.values(data.reminders).filter((r) => r.itemId === item.id),
    [data.reminders, item.id],
  )
  const conflict = useMemo(() => {
    if (item.kind !== 'event' || !item.start || !item.end || item.allDay) return undefined
    return eventsOn(data, new Date(item.start)).find(
      (e) => e.id !== item.id && e.end && overlaps(e.start!, e.end, item.start!, item.end!),
    )
  }, [item, data])

  const model: Model = {
    mode: 'edit',
    v: item as Draft,
    set: (patch) => updateItem(item.id, patch),
    setKind: (k) => {
      updateItem(item.id, { kind: k, ...convertKind(item as Draft, k) })
      // "before it starts" and "before it is due" swap places with the type
      for (const r of stored) {
        if (k === 'event' && r.trigger.type === 'before_due')
          updateReminder(r.id, { trigger: { type: 'before_start', minutes: r.trigger.minutes } })
        if (k !== 'event' && r.trigger.type === 'before_start')
          updateReminder(r.id, { trigger: { type: 'before_due', minutes: r.trigger.minutes } })
      }
    },
    setSpace: (sp) =>
      updateItem(item.id, {
        space: sp,
        projectId: project?.space === sp ? item.projectId : undefined,
        phaseId: project?.space === sp ? item.phaseId : undefined,
        tags: item.tags.filter((id) => data.tags[id]?.space === sp),
      }),
    setStatus: (s) => {
      if (s === 'done') {
        if (!done) toggleDone(item.id)
      } else if (done) {
        toggleDone(item.id)
        if (s !== 'todo') setStatus(item.id, s)
      } else setStatus(item.id, s)
    },
    reminders: stored.map((r) => ({ id: r.id, trigger: r.trigger, firedAt: r.firedAt })),
    addReminder: (trigger) => addReminder({ itemId: item.id, trigger }),
    removeReminder: deleteReminder,
    conflict,
  }

  const [title, setTitle] = useState(item.title)
  const titleRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => {
    const el = titleRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = el.scrollHeight + 'px'
    }
  }, [title])

  const toTomorrow = () => {
    const d = addDays(startOfDay(new Date()), 1)
    const old = item.due ? new Date(item.due) : null
    if (old) d.setHours(old.getHours(), old.getMinutes())
    updateItem(item.id, { due: d.toISOString() })
    toast(t.drawer.movedTomorrow)
  }

  return (
    <>
      <div className="flex items-center gap-2 border-b border-line py-2.5 pl-4 pr-2.5 pt-[calc(10px+env(safe-area-inset-top,0px))] text-sm text-ink-3">
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
            <Dot color={SPACE_COLOR[item.space]} />
            {t.spaces[item.space]}
          </span>
        )}
        <span className="ml-auto flex shrink-0 items-center">
          <Button
            variant="ghost"
            square
            size="sm"
            onClick={() => navigate(`/item/${item.id}`)}
            title={t.drawer.openFull}
          >
            <Expand size={14} />
          </Button>
          <Button variant="ghost" square size="sm" onClick={onClose} title={t.drawer.close}>
            <X size={16} />
          </Button>
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-5 sm:px-5">
        <div className="mb-4 flex items-start gap-3">
          {isTask && <Checkbox checked={done} onChange={() => toggleDone(item.id)} className="mt-[7px]" />}
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
            aria-label={t.editor.name}
            className={cn(
              'display w-full resize-none overflow-hidden bg-transparent text-xl outline-none',
              done && 'text-ink-3 line-through decoration-ink-4',
            )}
          />
        </div>
        {item.readOnlyExternal && (
          <p className="mb-4 rounded-md bg-amber/10 px-2.5 py-2 text-sm text-ink-2">{t.editor.external}</p>
        )}
        <ItemForm m={model} />
      </div>

      <div className="flex items-center gap-1.5 border-t border-line px-3 py-2.5 pb-[calc(10px+env(safe-area-inset-bottom,0px))]">
        {isTask && (
          <>
            <Button variant="ghost" size="sm" onClick={toTomorrow}>
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
          </>
        )}
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
        {isTask && (
          <Button
            variant={done ? 'default' : 'accent'}
            size="sm"
            className="ml-auto"
            onClick={() => toggleDone(item.id)}
          >
            {done ? t.drawer.undone : t.drawer.done}
          </Button>
        )}
      </div>
      {dialog}
    </>
  )
}

/** any item, opened beside the list — tasks, events and notes alike */
export function PeekPanel() {
  const peekId = useStore((s) => s.peekId)
  const item = useStore((s) => (s.peekId ? s.data.items[s.peekId] : undefined))
  const closePeek = useStore((s) => s.closePeek)
  const openPeek = useStore((s) => s.openPeek)
  const location = useLocation()

  useEffect(() => {
    closePeek()
  }, [location.pathname, closePeek])
  // ?peek=<id> opens an item straight in the panel
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
        className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-line-2 bg-side shadow-[-30px_0_80px_rgba(0,0,0,0.45)] [animation:drawer-in_.28s_var(--ease-out-soft)] sm:w-[500px]"
      >
        <EditBody key={item.id} item={item} onClose={closePeek} />
      </aside>
    </div>
  )
}
