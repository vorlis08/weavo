import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, ListChecks, Sparkles } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { ReflectionTabs } from '@/components/ReflectionTabs'
import { SectionLabel, cn } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { dayActivity } from '@/lib/selectors'
import { fmtLongDate } from '@/lib/date'
import type { Reflection } from '@/lib/types'

const MOODS: { value: 1 | 2 | 3 | 4 | 5; emoji: string }[] = [
  { value: 1, emoji: '😞' },
  { value: 2, emoji: '🙁' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😄' },
]

export function dateKey(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function MoodPicker({
  value,
  onChange,
}: {
  value?: 1 | 2 | 3 | 4 | 5
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void
}) {
  return (
    <div className="flex gap-1.5">
      {MOODS.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg border text-xl transition-colors',
            value === m.value
              ? 'border-iris/50 bg-iris/14'
              : 'border-line bg-surface-2 hover:border-line-2',
          )}
        >
          {m.emoji}
        </button>
      ))}
    </div>
  )
}

function TodayCard() {
  const t = useT()
  const data = useStore((s) => s.data)
  const upsertReflection = useStore((s) => s.upsertReflection)
  const today = new Date()
  const key = dateKey(today)
  const entry = data.reflections[key]
  const [draft, setDraft] = useState(entry?.note ?? '')

  const activity = useMemo(() => dayActivity(data, today), [data]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit() {
    if (draft !== (entry?.note ?? '')) upsertReflection(key, { note: draft })
  }

  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="flex items-center gap-2">
        <Sparkles size={15} strokeWidth={1.6} className="text-iris-2" />
        <h2 className="text-lg">{t.reflection.todayTitle}</h2>
      </div>
      <p className="mt-1 text-sm text-ink-3">{fmtLongDate(today)}</p>

      <div className="mt-3.5 flex items-center gap-2.5 text-sm text-ink-2">
        <ListChecks size={14} strokeWidth={1.6} className="shrink-0 text-ink-3" />
        {activity.completed.length === 0 && activity.events.length === 0 ? (
          <span>{t.reflection.summaryNone}</span>
        ) : (
          <span>
            {activity.completed.length > 0 && t.reflection.summaryTasks(activity.completed.length)}
            {activity.completed.length > 0 && activity.events.length > 0 && ' · '}
            {activity.events.length > 0 && t.reflection.summaryEvents(activity.events.length)}
          </span>
        )}
      </div>

      <div className="mt-4">
        <SectionLabel className="mb-1.5">{t.reflection.moodLabel}</SectionLabel>
        <MoodPicker value={entry?.mood} onChange={(v) => upsertReflection(key, { mood: v })} />
      </div>

      <div className="mt-4">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          placeholder={t.reflection.notePlaceholder}
          rows={4}
          className="w-full resize-none rounded-lg border border-line bg-surface-2 p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-ink-3 focus:border-iris/50"
        />
      </div>
    </section>
  )
}

function HistoryRow({ entry }: { entry: Reflection }) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const mood = MOODS.find((m) => m.value === entry.mood)
  const d = new Date(entry.date + 'T00:00')

  return (
    <div className="rounded-lg border border-line bg-surface">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left"
      >
        {open ? (
          <ChevronDown size={13} className="shrink-0 text-ink-3" />
        ) : (
          <ChevronRight size={13} className="shrink-0 text-ink-3" />
        )}
        <span className="w-[150px] shrink-0 text-sm text-ink-2">{fmtLongDate(d)}</span>
        {mood && <span className="text-lg">{mood.emoji}</span>}
        {!open && entry.note && (
          <span className="min-w-0 flex-1 truncate text-sm text-ink-3">{entry.note}</span>
        )}
      </button>
      {open && (
        <div className="px-3.5 pb-3.5 text-sm leading-relaxed text-ink-2">
          {entry.note ? <p className="whitespace-pre-line">{entry.note}</p> : <p className="text-ink-3">{t.reflection.noNote}</p>}
        </div>
      )}
    </div>
  )
}

export function ReflectionView() {
  const t = useT()
  const reflections = useStore((s) => s.data.reflections)
  const todayKey = dateKey(new Date())

  const history = useMemo(
    () =>
      Object.values(reflections)
        .filter((r) => r.date !== todayKey && (r.note || r.mood))
        .sort((a, b) => (a.date < b.date ? 1 : -1)),
    [reflections, todayKey],
  )

  return (
    <>
      <TopBar>
        <h1 className="text-lg">{t.nav.reflection}</h1>
        <ReflectionTabs />
      </TopBar>
      <div className="flex-1 overflow-y-auto px-7 py-6">
        <div className="mx-auto flex max-w-[640px] flex-col gap-6">
          <TodayCard />
          <div>
            <SectionLabel className="mb-2.5">{t.reflection.historyTitle}</SectionLabel>
            {history.length === 0 ? (
              <p className="text-sm text-ink-3">{t.reflection.emptyHistory}</p>
            ) : (
              <div className="flex flex-col gap-2">
                {history.map((r) => (
                  <HistoryRow key={r.id} entry={r} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
