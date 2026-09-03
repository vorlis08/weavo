import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  FileText,
  FolderPlus,
  Hash,
  ListChecks,
  TriangleAlert,
} from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { parseCapture } from '@/lib/parse'
import { fmtDayMonth, fmtTime, fmtWeekday } from '@/lib/date'
import type { Item, ItemKind } from '@/lib/types'
import { PROJECT_COLORS } from '@/lib/types'
import { Modal } from './overlays'
import { Button, Checkbox, Kbd, Segmented, cn } from './ui'

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
  const [leaveUnsorted, setLeaveUnsorted] = useState(false)

  useEffect(() => {
    if (captureOpen) {
      setLeaveUnsorted(false)
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

  const existingProject = parsed.projectName
    ? Object.values(data.projects).find(
        (p) => p.name.toLowerCase() === parsed.projectName!.toLowerCase(),
      )
    : undefined

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
    let projectId: string | undefined
    if (parsed.projectName) {
      projectId =
        existingProject?.id ??
        addProject(
          parsed.projectName,
          PROJECT_COLORS[Object.keys(data.projects).length % PROJECT_COLORS.length].value,
        ).id
    }
    const base: Partial<Item> & { kind: ItemKind; title: string } = {
      kind: captureKind,
      title: parsed.title,
      projectId,
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

        <div className="mt-2">
          <Segmented size="md" options={kindOptions} value={captureKind} onChange={setCaptureKind} />
        </div>

        {(whenLabel || parsed.projectName) && (
          <div className="mt-3 flex flex-wrap gap-[7px]">
            {whenLabel && (
              <Pill tone="iris">
                <CalendarIcon size={11} strokeWidth={1.7} />
                {whenLabel}
                {captureKind === 'task' && ` · ${t.capture.due}`}
              </Pill>
            )}
            {parsed.projectName && (
              <Pill tone={existingProject ? 'iris' : 'suggest'}>
                {existingProject ? (
                  <Hash size={11} strokeWidth={1.8} />
                ) : (
                  <FolderPlus size={11} strokeWidth={1.7} />
                )}
                {existingProject ? existingProject.name : t.capture.newProject(parsed.projectName)}
              </Pill>
            )}
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
