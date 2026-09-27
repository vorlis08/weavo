import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  FileText,
  Flame,
  FolderPlus,
  Hash,
  ListChecks,
  TriangleAlert,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { parseCapture } from '@/lib/parse'
import { fmtDayMonth, fmtTime, fmtWeekday } from '@/lib/date'
import type { Item, ItemKind, Project, Space } from '@/lib/types'
import { PROJECT_COLORS, SPACE_COLOR, SPACES } from '@/lib/types'
import { Modal } from './overlays'
import { Button, Checkbox, Dot, Kbd, Segmented, cn } from './ui'

function Pill({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'iris' | 'suggest'
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[27px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[11.75px]',
        tone === 'iris' && 'border-iris/30 bg-iris/12 text-iris-2',
        tone === 'default' && 'border-line bg-surface-2 text-ink-2',
        tone === 'suggest' && 'border-dashed border-line-2 bg-transparent text-ink-3',
      )}
    >
      {children}
    </span>
  )
}

export function QuickCapture() {
  const t = useT()
  const {
    captureOpen,
    captureKind,
    captureText,
    closeCapture,
    setCaptureKind,
    setCaptureText,
    data,
    createItem,
    addProject,
    toast,
  } = useStore()
  const navigate = useNavigate()
  const kindLabel = (k: ItemKind) =>
    k === 'event' ? t.kind.eventLower : k === 'task' ? t.kind.taskLower : t.kind.noteLower
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const location = useLocation()
  const [leaveUnsorted, setLeaveUnsorted] = useState(false)
  const [spacePick, setSpacePick] = useState<Space>('personal')
  const [flame, setFlame] = useState(false)

  useEffect(() => {
    if (captureOpen) {
      setLeaveUnsorted(false)
      setFlame(false)
      // start in the space the user is looking at
      const { data: d } = useStore.getState()
      const projectMatch = location.pathname.match(/^\/project\/([^/]+)/)
      setSpacePick(
        location.pathname.startsWith('/todo/work')
          ? 'work'
          : projectMatch && d.projects[projectMatch[1]]
            ? d.projects[projectMatch[1]].space
            : location.pathname.startsWith('/todo') || d.settings.spaceFilter !== 'work'
              ? 'personal'
              : 'work',
      )
      requestAnimationFrame(() => {
        const el = areaRef.current
        if (el) {
          el.focus()
          el.setSelectionRange(el.value.length, el.value.length)
        }
      })
    }
  }, [captureOpen])

  const parsed = useMemo(() => parseCapture(captureText), [captureText])
  const chosenSpace = parsed.space ?? spacePick

  // each #word is a tag of the chosen space, else an existing project, else (first one) a new project
  const resolved = useMemo(() => {
    const tagIds: string[] = []
    let project: Project | undefined
    let newProject: string | undefined
    for (const h of parsed.hashes) {
      const low = h.toLowerCase()
      const tag = Object.values(data.tags).find((tg) => tg.space === chosenSpace && tg.name.toLowerCase() === low)
      if (tag) {
        if (!tagIds.includes(tag.id)) tagIds.push(tag.id)
        continue
      }
      const p = Object.values(data.projects).find((x) => x.name.toLowerCase() === low)
      if (p && !project) project = p
      else if (!p && !project && !newProject) newProject = h
    }
    return { tagIds, project, newProject }
  }, [parsed.hashes, data.tags, data.projects, chosenSpace])
  const existingProject = resolved.project
  const space = existingProject?.space ?? chosenSpace
  const burning = flame || parsed.flame

  const whenLabel = parsed.when
    ? parsed.when.allDay
      ? `${fmtWeekday(parsed.when.start, 'short')} ${fmtDayMonth(parsed.when.start)}`
      : `${fmtWeekday(parsed.when.start, 'short')} ${fmtDayMonth(parsed.when.start)} · ${fmtTime(
          parsed.when.start,
        )}${captureKind === 'event' && parsed.when.end ? `–${fmtTime(parsed.when.end)}` : ''}`
    : null

  const conflict = useMemo(() => {
    if (captureKind !== 'event' || !parsed.when || parsed.when.allDay) return null
    const s = parsed.when.start.getTime()
    const e = (parsed.when.end ?? parsed.when.start).getTime()
    return Object.values(data.items).find(
      (it) =>
        it.kind === 'event' &&
        it.start &&
        it.end &&
        new Date(it.start).getTime() < e &&
        s < new Date(it.end).getTime(),
    )
  }, [captureKind, parsed.when, data.items])

  if (!captureOpen) return null

  function build(): Item {
    let projectId = existingProject?.id
    if (!projectId && resolved.newProject) {
      projectId = addProject(
        resolved.newProject,
        PROJECT_COLORS[Object.keys(data.projects).length % PROJECT_COLORS.length].value,
        space,
      ).id
    }
    const base: Partial<Item> & { kind: ItemKind; title: string } = {
      kind: captureKind,
      title: parsed.title,
      projectId,
      space,
      tags: resolved.tagIds,
      flame: (captureKind === 'task' && burning) || undefined,
      unsorted: leaveUnsorted || undefined,
    }
    if (parsed.when) {
      if (captureKind === 'event') {
        base.start = parsed.when.start.toISOString()
        base.end = (
          parsed.when.end ?? new Date(parsed.when.start.getTime() + 3_600_000)
        ).toISOString()
        base.allDay = parsed.when.allDay
      } else if (captureKind === 'task') {
        base.due = parsed.when.start.toISOString()
      }
    }
    if (captureKind === 'task') base.status = 'todo'
    return createItem(base)
  }

  function capture(openAfter: boolean) {
    if (!parsed.title.trim()) return
    const item = build()
    setCaptureText('')
    closeCapture()
    if (openAfter) navigate(`/item/${item.id}`)
    else
      toast(t.capture.toastCaptured(kindLabel(captureKind)), {
        label: t.common.open,
        run: () => navigate(`/item/${item.id}`),
      })
  }

  const kindOptions: { value: ItemKind; label: React.ReactNode }[] = [
    { value: 'event', label: <><CalendarIcon size={13} strokeWidth={1.7} />{t.kind.event}</> },
    { value: 'task', label: <><ListChecks size={13} strokeWidth={1.7} />{t.kind.task}</> },
    { value: 'note', label: <><FileText size={13} strokeWidth={1.7} />{t.kind.note}</> },
  ]

  return (
    <Modal open={captureOpen} onClose={closeCapture} width={568} align="top">
      <div className="px-[18px] pb-2 pt-[18px]">
        <textarea
          ref={areaRef}
          value={captureText}
          onChange={(e) => setCaptureText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              capture(false)
            }
          }}
          rows={2}
          placeholder={t.capture.placeholder}
          className="w-full resize-none bg-transparent text-[16px] leading-[1.5] text-ink outline-none placeholder:text-ink-3"
        />

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Segmented size="md" options={kindOptions} value={captureKind} onChange={setCaptureKind} />
          <Segmented
            size="md"
            options={SPACES.map((sp) => ({
              value: sp,
              label: <><Dot color={SPACE_COLOR[sp]} className="h-1.5 w-1.5" />{t.spaces[sp]}</>,
            }))}
            value={space}
            onChange={setSpacePick}
          />
          {captureKind === 'task' && (
            <button
              type="button"
              onClick={() => setFlame((f) => !f)}
              title={t.todo.flameOn}
              className={cn(
                'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-[12px] transition-colors',
                burning ? 'border-flame/50 bg-flame/12 text-flame' : 'border-line text-ink-3 hover:text-ink-2',
              )}
            >
              <Flame size={13} fill={burning ? 'currentColor' : 'none'} fillOpacity={0.3} />
              {t.todo.flame}
            </button>
          )}
        </div>

        {(whenLabel || existingProject || resolved.newProject || resolved.tagIds.length > 0) && (
          <div className="mt-3 flex flex-wrap gap-[7px]">
            {whenLabel && (
              <Pill tone="iris">
                <CalendarIcon size={11} strokeWidth={1.7} />
                {whenLabel}
                {captureKind === 'task' && ` · ${t.capture.due}`}
              </Pill>
            )}
            {(existingProject || resolved.newProject) && (
              <Pill tone={existingProject ? 'iris' : 'suggest'}>
                {existingProject ? (
                  <Hash size={11} strokeWidth={1.8} />
                ) : (
                  <FolderPlus size={11} strokeWidth={1.7} />
                )}
                {existingProject ? existingProject.name : t.capture.newProject(resolved.newProject!)}
              </Pill>
            )}
            {resolved.tagIds.map((id) => (
              <Pill key={id}>
                <Dot color={data.tags[id].color} className="h-1.5 w-1.5" />
                {data.tags[id].name}
              </Pill>
            ))}
          </div>
        )}

        {conflict && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose/12 px-2.5 py-[9px]">
            <TriangleAlert size={13} strokeWidth={1.7} className="shrink-0 text-rose" />
            <span className="text-[11.5px] text-ink-2">
              {t.capture.overlaps(conflict.title, conflict.start ? fmtTime(conflict.start) : '')}
            </span>
          </div>
        )}

        <div className="my-3.5 h-px bg-line" />

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setLeaveUnsorted((v) => !v)}
            className="flex items-center gap-2 text-[12.5px] text-ink-2"
          >
            <Checkbox checked={leaveUnsorted} onChange={() => setLeaveUnsorted((v) => !v)} />
            {t.capture.leaveUnsorted}
          </button>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={() => capture(true)} disabled={!parsed.title.trim()}>
              {t.capture.addDetails}
            </Button>
            <Button variant="accent" onClick={() => capture(false)} disabled={!parsed.title.trim()}>
              {t.capture.submit(kindLabel(captureKind))}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-[18px] py-[9px]">
        <span className="text-[10px] text-ink-3">
          <Kbd>↵</Kbd> {t.capture.hintCapture}&nbsp;·&nbsp;<Kbd>⇧↵</Kbd> {t.capture.hintNewline}&nbsp;·&nbsp;<Kbd>esc</Kbd> {t.capture.hintClose}
        </span>
        <span className="mono ml-auto text-[10px] text-ink-3">{t.capture.parsedLive}</span>
      </div>
    </Modal>
  )
}
