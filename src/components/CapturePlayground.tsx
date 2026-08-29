import { useMemo, useState } from 'react'
import {
  Calendar as CalendarIcon,
  FileText,
  Hash,
  ListChecks,
  User,
} from 'lucide-react'
import { parseCapture } from '@/lib/parse'
import { fmtDayMonth, fmtTime, fmtWeekday } from '@/lib/date'
import type { ItemKind } from '@/lib/types'
import { Segmented, cn } from './ui'

const EXAMPLES = [
  'Draft pricing deck for finance review Thursday 2pm #launch',
  'Call the plumber tomorrow 9am',
  'Design review Fri 2–3pm @alex #website',
  'Ship the newsletter in 3 days',
  'Idea: bundle onboarding into the Pro tier',
]

function Chip({
  children,
  on,
}: {
  children: React.ReactNode
  on?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex h-[26px] items-center gap-1.5 whitespace-nowrap rounded-lg border px-2.5 text-[11.5px]',
        on
          ? 'border-iris/30 bg-iris/12 text-iris-2'
          : 'border-line bg-surface-2 text-ink-2',
      )}
    >
      {children}
    </span>
  )
}

export function CapturePlayground() {
  const [text, setText] = useState(EXAMPLES[0])
  const [kind, setKind] = useState<ItemKind>('task')

  const parsed = useMemo(() => parseCapture(text), [text])

  const whenLabel = parsed.when
    ? parsed.when.allDay
      ? `${fmtWeekday(parsed.when.start, 'short')} ${fmtDayMonth(parsed.when.start)}`
      : `${fmtWeekday(parsed.when.start, 'short')} ${fmtDayMonth(parsed.when.start)} · ${fmtTime(
          parsed.when.start,
        )}${kind === 'event' && parsed.when.end ? `–${fmtTime(parsed.when.end)}` : ''}`
    : null

  return (
    <div className="my-5 overflow-hidden rounded-2xl border border-line-2 bg-surface">
      <div className="mono flex items-center gap-2 border-b border-line px-4 py-2.5 text-[10px] uppercase tracking-[0.13em] text-ink-3">
        <span className="text-iris">✦</span> Quick capture — try it
        <span className="ml-auto normal-case tracking-normal text-ink-3">
          sandbox · nothing is created
        </span>
      </div>

      <div className="px-4 pb-3 pt-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          spellCheck={false}
          className="w-full resize-none bg-transparent text-[16px] leading-snug text-ink outline-none"
          aria-label="Quick capture example text"
        />

        <div className="mt-3">
          <Segmented
            size="md"
            options={[
              { value: 'event', label: <><CalendarIcon size={13} strokeWidth={1.7} />Event</> },
              { value: 'task', label: <><ListChecks size={13} strokeWidth={1.7} />Task</> },
              { value: 'note', label: <><FileText size={13} strokeWidth={1.7} />Note</> },
            ]}
            value={kind}
            onChange={setKind}
          />
        </div>

        <div className="mt-3 flex min-h-[26px] flex-wrap gap-1.5">
          {whenLabel && (
            <Chip on>
              <CalendarIcon size={11} strokeWidth={1.7} />
              {whenLabel}
              {kind === 'task' && ' · due'}
            </Chip>
          )}
          {parsed.projectName && (
            <Chip on>
              <Hash size={11} strokeWidth={1.8} />
              {parsed.projectName}
            </Chip>
          )}
          {parsed.contactNames.map((n) => (
            <Chip key={n}>
              <User size={11} strokeWidth={1.7} />
              {n}
            </Chip>
          ))}
          {!whenLabel && !parsed.projectName && parsed.contactNames.length === 0 && (
            <span className="text-[11.5px] text-ink-3">
              No date, project, or person detected — it’ll just be titled “{parsed.title}”.
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-line bg-surface-2 px-4 py-2.5">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
              text === ex
                ? 'border-iris/40 bg-iris/12 text-iris-2'
                : 'border-line text-ink-3 hover:border-line-2 hover:text-ink-2',
            )}
          >
            {ex.length > 34 ? ex.slice(0, 33) + '…' : ex}
          </button>
        ))}
      </div>
    </div>
  )
}
