import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, Moon, Sun } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { eventsOn } from '@/lib/recur'
import { addDays, dateLocale, startOfDay } from '@/lib/date'
import { dayActivity, isHot, isOverdue, todayTasks } from '@/lib/selectors'
import { SPACE_COLOR } from '@/lib/types'
import type { Item } from '@/lib/types'
import { MoodPicker, dateKey } from '@/views/ReflectionView'
import { Modal } from './overlays'
import { FlameButton, byUrgency } from './todo'
import { Button, cn } from './ui'

/** new due date `days` from today, keeping the task's time of day */
function shiftDue(item: Item, days: number): string {
  const d = addDays(startOfDay(new Date()), days)
  const old = item.due ? new Date(item.due) : null
  if (old) d.setHours(old.getHours(), old.getMinutes())
  return d.toISOString()
}

function PlanRow({ item, children }: { item: Item; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-t border-line py-2.5 first:border-t-0">
      <span className="h-5 w-[3px] shrink-0 rounded-full" style={{ background: SPACE_COLOR[item.space] }} />
      <span className="min-w-0 flex-1 truncate text-sm">{item.title}</span>
      <div className="flex shrink-0 gap-1">{children}</div>
    </div>
  )
}

function Mini({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="h-6 rounded-md border border-line-2 px-2 text-xs text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
    >
      {children}
    </button>
  )
}

function Footer({
  step,
  steps,
  onBack,
  onNext,
  nextLabel,
  onLater,
}: {
  step: number
  steps: number
  onBack: () => void
  onNext: () => void
  nextLabel: string
  onLater: () => void
}) {
  const t = useT()
  return (
    <div className="mt-5 flex items-center gap-2">
      <span className="mono text-xs text-ink-3">{t.rituals.step(step + 1, steps)}</span>
      <div className="ml-auto flex gap-2">
        {step > 0 ? (
          <Button onClick={onBack}>{t.rituals.back}</Button>
        ) : (
          <Button variant="ghost" onClick={onLater}>
            {t.rituals.later}
          </Button>
        )}
        <Button variant="accent" onClick={onNext}>
          {nextLabel}
        </Button>
      </div>
    </div>
  )
}

const Heading = ({ title, hint }: { title: string; hint: string }) => (
  <>
    <h2 className="text-lg font-semibold tracking-[-0.02em]">{title}</h2>
    <p className="mb-4 mt-1 text-sm text-ink-2">{hint}</p>
  </>
)

/** morning: re-date overdue work, flag what is burning, see the day at a glance */
function PlanDay({ onClose }: { onClose: () => void }) {
  const t = useT()
  const data = useStore((s) => s.data)
  const { updateItem, toggleDone, updateSettings, toast } = useStore()
  const [step, setStep] = useState(0)

  const overdue = Object.values(data.items)
    .filter((it) => isOverdue(it) && !it.someday && !it.waitingFor && !it.parentId)
    .sort(byUrgency)
  const today = todayTasks(data).filter((it) => it.status !== 'done' && !isOverdue(it)).sort(byUrgency)
  const hot = Object.values(data.items).filter((it) => isHot(it)).sort(byUrgency)
  const events = eventsOn(data, new Date())

  function finish() {
    updateSettings({ lastPlanned: dateKey(new Date()) })
    toast(t.rituals.started)
    onClose()
  }

  return (
    <div className="p-5">
      {step === 0 && (
        <>
          <Heading title={t.rituals.overdueTitle} hint={t.rituals.overdueHint} />
          {overdue.length ? (
            overdue.map((it) => (
              <PlanRow key={it.id} item={it}>
                <Mini onClick={() => updateItem(it.id, { due: shiftDue(it, 0) })}>{t.rituals.toToday}</Mini>
                <Mini onClick={() => updateItem(it.id, { due: shiftDue(it, 1) })}>{t.rituals.toTomorrow}</Mini>
                <Mini onClick={() => updateItem(it.id, { someday: true, flame: undefined })}>{t.rituals.toSomeday}</Mini>
                <Mini onClick={() => toggleDone(it.id)}>{t.rituals.markDone}</Mini>
              </PlanRow>
            ))
          ) : (
            <p className="text-sm text-ink-3">{t.rituals.overdueNone}</p>
          )}
        </>
      )}
      {step === 1 && (
        <>
          <Heading title={t.rituals.hotTitle} hint={t.rituals.hotHint} />
          {today.length ? (
            today.map((it) => (
              <PlanRow key={it.id} item={it}>
                <FlameButton item={it} always />
              </PlanRow>
            ))
          ) : (
            <p className="text-sm text-ink-3">{t.rituals.hotNone}</p>
          )}
        </>
      )}
      {step === 2 && (
        <>
          <Heading title={t.rituals.dayTitle} hint={new Date().toLocaleDateString(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' })} />
          <div className="mb-4 flex flex-wrap gap-6 rounded-md bg-surface-2 px-4 py-3 text-sm text-ink-2">
            {[
              [todayTasks(data).filter((it) => it.status !== 'done').length, t.rituals.tasks],
              [hot.length, t.rituals.burning],
              [events.length, t.rituals.events],
                          ].map(([n, label]) => (
              <span key={label}>
                <b className="block text-xl font-semibold text-ink">{n}</b>
                {label}
              </span>
            ))}
          </div>
          {hot.map((it) => (
            <PlanRow key={it.id} item={it}>
              <FlameButton item={it} always />
            </PlanRow>
          ))}
        </>
      )}
      <Footer
        step={step}
        steps={3}
        onBack={() => setStep((s) => s - 1)}
        onNext={() => (step < 2 ? setStep((s) => s + 1) : finish())}
        nextLabel={step < 2 ? t.rituals.next : t.rituals.start}
        onLater={onClose}
      />
    </div>
  )
}

/** evening: clear today's leftovers, then mood + note into the day's reflection */
function CloseDay({ onClose }: { onClose: () => void }) {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const { updateItem, toggleDone, updateSettings, upsertReflection, toast } = useStore()
  const key = dateKey(new Date())
  const entry = data.reflections[key]
  const [step, setStep] = useState(0)
  const [mood, setMood] = useState(entry?.mood)
  const [note, setNote] = useState(entry?.note ?? '')

  const today = todayTasks(data)
  // only what was due by today — tasks showing early (shopping's lead window) are not leftovers
  const left = today
    .filter((it) => it.status !== 'done' && startOfDay(it.due!) <= startOfDay(new Date()))
    .sort(byUrgency)
  const activity = dayActivity(data)

  function finish() {
    upsertReflection(key, { mood, note })
    updateSettings({ lastClosed: key })
    toast(t.rituals.saved, { label: t.common.open, run: () => navigate('/reflection') })
    onClose()
  }

  return (
    <div className="p-5">
      {step === 0 && (
        <>
          <Heading title={t.rituals.leftTitle} hint={t.rituals.leftHint} />
          {left.length ? (
            left.map((it) => (
              <PlanRow key={it.id} item={it}>
                <Mini onClick={() => toggleDone(it.id)}>{t.rituals.markDone}</Mini>
                <Mini onClick={() => updateItem(it.id, { due: shiftDue(it, 1) })}>{t.rituals.toTomorrow}</Mini>
                <Mini onClick={() => updateItem(it.id, { someday: true, flame: undefined })}>{t.rituals.toSomeday}</Mini>
              </PlanRow>
            ))
          ) : (
            <p className="text-sm text-ink-3">{t.rituals.leftNone}</p>
          )}
        </>
      )}
      {step === 1 && (
        <>
          <Heading title={t.rituals.moodTitle} hint={t.rituals.moodHint} />
          <div className="mb-4 flex flex-wrap gap-6 rounded-md bg-surface-2 px-4 py-3 text-sm text-ink-2">
            <span>
              <b className="block text-xl font-semibold text-ink">
                {today.filter((it) => it.status === 'done').length}/{today.length}
              </b>
              {t.rituals.doneCount}
            </span>
            <span>
              <b className="block text-xl font-semibold text-ink">{activity.events.length}</b>
              {t.rituals.events}
            </span>
          </div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.07em] text-ink-3">
            {t.reflection.moodLabel}
          </div>
          <MoodPicker value={mood} onChange={setMood} />
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t.reflection.notePlaceholder}
            rows={4}
            className="mt-4 w-full resize-y rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-ink outline-none placeholder:text-ink-3 focus:border-iris/50"
          />
        </>
      )}
      <Footer
        step={step}
        steps={2}
        onBack={() => setStep((s) => s - 1)}
        onNext={() => (step < 1 ? setStep(1) : finish())}
        nextLabel={step < 1 ? t.rituals.next : t.rituals.save}
        onLater={onClose}
      />
    </div>
  )
}

/** the two ritual buttons on Home; the one that fits the time of day is emphasized */
export function DayRituals() {
  const t = useT()
  const { lastPlanned, lastClosed } = useStore((s) => s.data.settings)
  const [open, setOpen] = useState<'plan' | 'close' | null>(null)
  const key = dateKey(new Date())
  const evening = new Date().getHours() >= 17

  const tile = (
    kind: 'plan' | 'close',
    icon: ReactNode,
    title: string,
    hint: string,
    done: boolean,
  ) => (
    <button
      onClick={() => setOpen(kind)}
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 text-left transition-colors hover:border-line-3 hover:bg-surface-2',
        (kind === 'close') === evening && !done ? 'border-line-3' : 'border-line',
      )}
    >
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-surface-3 text-ink-2"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium">{title}</span>
        <span className="block truncate text-sm text-ink-3">{hint}</span>
      </span>
      {done && (
        <span className="flex shrink-0 items-center gap-1 text-sm text-sage">
          <Check size={12} />
          {t.rituals.doneToday}
        </span>
      )}
    </button>
  )

  return (
    <>
      <div className="mb-6 grid gap-2.5 sm:grid-cols-2">
        {tile('plan', <Sun size={15} />, t.rituals.plan, t.rituals.planHint, lastPlanned === key)}
        {tile('close', <Moon size={15} />, t.rituals.close, t.rituals.closeHint, lastClosed === key)}
      </div>
      <Modal open={open === 'plan'} onClose={() => setOpen(null)} width={560}>
        <PlanDay onClose={() => setOpen(null)} />
      </Modal>
      <Modal open={open === 'close'} onClose={() => setOpen(null)} width={560}>
        <CloseDay onClose={() => setOpen(null)} />
      </Modal>
    </>
  )
}
