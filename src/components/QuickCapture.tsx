import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Calendar as CalendarIcon,
  FileText,
  Hash,
  ListChecks,
  Sparkles,
  TriangleAlert,
  X,
} from 'lucide-react'
import { contacts } from '@/lib/mockData'
import { useUI } from '@/lib/store'
import type { ItemKind } from '@/lib/types'
import { Button, Checkbox, Kbd, Segmented, cn } from './ui'

const SAMPLE = 'Draft Q3 pricing deck for finance review Thursday 2 PM #launch'

const DAY_RE =
  /\b(today|tomorrow|mon|tue|wed|thu|fri|sat|sun|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
const CLOCK_RE = /\b(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/i

function titleCase(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

function parse(text: string) {
  const tags = [...text.matchAll(/#([\w-]+)/g)].map((m) => m[1])
  const day = text.match(DAY_RE)?.[1]
  const clock = text.match(CLOCK_RE)
  const people = contacts
    .filter((c) => c.id !== 'me')
    .filter((c) =>
      new RegExp(`\\b${c.name.split(' ')[0]}\\b`, 'i').test(text),
    )

  let when: string | null = null
  if (day || clock) {
    const dayLabel = day ? titleCase(day).slice(0, 3) : 'Today'
    const timeLabel = clock
      ? `${clock[1]}:${clock[2] ?? '00'} ${clock[3].toUpperCase()}`
      : 'all day'
    when = `${dayLabel === 'Thu' ? 'Thu 28 Aug' : dayLabel} · ${timeLabel === '2:00 PM' ? '14:00–15:00' : timeLabel}`
  }

  const suggested = ['pricing', 'deck'].filter(
    (t) => !tags.includes(t) && text.toLowerCase().includes(t),
  )

  return { tags, when, people, suggested }
}

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
        tone === 'iris' && 'border-iris/28 bg-iris/12 text-iris-2',
        tone === 'default' && 'border-line bg-surface-2 text-ink-2',
        tone === 'suggest' && 'border-dashed border-line-2 bg-transparent text-iris-2',
      )}
    >
      {children}
    </span>
  )
}

export function QuickCapture() {
  const { captureOpen, captureKind, closeCapture, setCaptureKind, leaveUnsorted, setLeaveUnsorted } =
    useUI()
  const [text, setText] = useState(SAMPLE)
  const areaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (captureOpen) {
      setText(SAMPLE)
      requestAnimationFrame(() => {
        const el = areaRef.current
        if (el) {
          el.focus()
          el.setSelectionRange(el.value.length, el.value.length)
        }
      })
    }
  }, [captureOpen])

  useEffect(() => {
    if (!captureOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeCapture()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [captureOpen, closeCapture])

  const parsed = useMemo(() => parse(text), [text])

  if (!captureOpen) return null

  const kindOptions: { value: ItemKind; label: React.ReactNode }[] = [
    { value: 'event', label: <><CalendarIcon size={13} strokeWidth={1.7} />Event</> },
    { value: 'task', label: <><ListChecks size={13} strokeWidth={1.7} />Task</> },
    { value: 'note', label: <><FileText size={13} strokeWidth={1.7} />Note</> },
  ]

  return (
    <div
      className="fixed inset-0 z-50 flex justify-center bg-[#07080a]/60 backdrop-blur-[2px]"
      onMouseDown={closeCapture}
    >
      <div
        className="mt-[118px] h-max w-[568px] overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-[0_30px_80px_-16px_rgba(0,0,0,0.65)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 border-b border-line px-4 py-3.5">
          <Sparkles size={15} strokeWidth={1.7} className="text-iris" />
          <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-ink-3">
            Quick capture
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Kbd>esc</Kbd>
            <button
              onClick={closeCapture}
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <X size={15} strokeWidth={1.7} />
            </button>
          </div>
        </div>

        <div className="px-[18px] pb-4 pt-[17px]">
          <textarea
            ref={areaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                closeCapture()
              }
            }}
            rows={2}
            className="w-full resize-none bg-transparent text-[16.5px] leading-[1.55] text-ink outline-none placeholder:text-ink-3"
            placeholder="Type an event, task, or a thought…"
          />

          <div className="mt-3.5">
            <Segmented
              size="md"
              options={kindOptions}
              value={captureKind}
              onChange={setCaptureKind}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-[7px]">
            {parsed.when && (
              <Pill tone="iris">
                <CalendarIcon size={11} strokeWidth={1.7} />
                {parsed.when}
                <X size={10} strokeWidth={2} className="opacity-50" />
              </Pill>
            )}
            {parsed.tags.map((t) => (
              <Pill key={t} tone="iris">
                <Hash size={11} strokeWidth={1.8} />
                {t}
              </Pill>
            ))}
            {parsed.people.map((p) => (
              <Pill key={p.id}>
                <span
                  className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold"
                  style={{ background: p.tintBg, color: p.tintFg }}
                >
                  {p.initials[0]}
                </span>
                {p.name.split(' ')[0].toLowerCase()} · {p.name}
              </Pill>
            ))}
            {parsed.suggested.map((t) => (
              <Pill key={t} tone="suggest">
                <Sparkles size={10} strokeWidth={1.8} />
                {t}
              </Pill>
            ))}
          </div>

          {parsed.when && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-rose/12 px-2.5 py-[9px]">
              <TriangleAlert size={13} strokeWidth={1.7} className="shrink-0 text-rose" />
              <span className="text-[11.5px] text-ink-2">
                Overlaps <span className="text-ink">Client call — Meridian</span> at 14:00.
              </span>
              <button className="mono ml-auto whitespace-nowrap text-[11.5px] text-iris hover:text-iris-2">
                Find a free slot
              </button>
            </div>
          )}

          <div className="my-3.5 h-px bg-line" />

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setLeaveUnsorted(!leaveUnsorted)}
              className="flex items-center gap-2 text-[12.5px] text-ink-2"
            >
              <Checkbox checked={leaveUnsorted} onChange={() => setLeaveUnsorted(!leaveUnsorted)} />
              Leave unsorted for now
            </button>
            <div className="ml-auto flex gap-2">
              <Button variant="ghost">Add details</Button>
              <Button variant="accent" onClick={closeCapture}>
                Capture {captureKind}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 border-t border-line bg-surface-2 px-[18px] py-[9px]">
          <span className="mono text-[10px] text-ink-3">&#8629; capture</span>
          <span className="mono text-[10px] text-ink-3">&#8679;&#8629; new line</span>
          <span className="mono text-[10px] text-ink-3">&#8997; 1–3 switch type</span>
          <span className="mono ml-auto text-[10px] text-ink-3">parsed by Weavo</span>
        </div>
      </div>
    </div>
  )
}
