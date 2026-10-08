import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ChevronDown, Phone, Plus, Trash2 } from 'lucide-react'
import { Page } from '@/components/Page'
import { VisitPhotos } from '@/components/Photos'
import { ConfirmDialog } from '@/components/overlays'
import { Button, TextArea, TextField, cn } from '@/components/ui'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { fmtShort } from '@/lib/date'
import {
  averageRating,
  cleaningDays,
  dateKey,
  isEnded,
  nextCleaningDay,
  openDays,
  parseKey,
  ratingStyle,
  visitId,
} from '@/lib/houses'
import { DEFAULT_SPACE } from '@/lib/types'
import type { House, Visit } from '@/lib/types'

/** weekdays in Monday-first order, as getDay() numbers */
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]

function useDays() {
  const t = useT()
  return (days: number[]) => WEEK_ORDER.filter((d) => days.includes(d)).map((d) => t.houses.dayShort[d]).join(', ')
}

function RatingBadge({ value, label }: { value?: number; label?: string }) {
  const t = useT()
  return (
    <span
      className="inline-flex h-6 min-w-[58px] items-center justify-center rounded-md border px-2 text-sm font-semibold"
      style={ratingStyle(value ? Math.round(value) : undefined)}
    >
      {label ?? (value ? `${Math.round(value)}/10` : t.houses.noRating)}
    </span>
  )
}

/* ───────────────────────────── list (a tab of Úkoly) ───────────────────────────── */

export function HousesPanel() {
  const t = useT()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const addHouse = useStore((s) => s.addHouse)
  const days = useDays()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [partner, setPartner] = useState('')

  const houses = Object.values(data.houses).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))

  function create() {
    const n = name.trim()
    if (!n) return
    const h = addHouse(
      { name: n, partner: partner.trim(), startDate: dateKey(new Date()), weekdays: [5], time: '18:00' },
      t.houses.eventTitle(n),
    )
    setName('')
    setPartner('')
    setCreating(false)
    navigate(`/domy/${h.id}`)
  }

  return (
    <div>
      <div className="mb-5 flex justify-end">
        <Button variant="accent" onClick={() => setCreating((c) => !c)}>
          <Plus size={15} />
          {t.houses.add}
        </Button>
      </div>

      {creating && (
        <div className="mb-6 flex flex-wrap items-center gap-2.5 rounded-lg border border-line bg-surface p-3.5">
          <TextField
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder={t.houses.namePh}
            className="min-w-[200px] flex-1"
          />
          <TextField
            value={partner}
            onChange={(e) => setPartner(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder={t.houses.partnerPh}
            className="min-w-[200px] flex-1"
          />
          <Button variant="accent" onClick={create} disabled={!name.trim()}>
            {t.houses.create}
          </Button>
        </div>
      )}

      {houses.length === 0 && !creating && <p className="py-14 text-center text-base text-ink-3">{t.houses.empty}</p>}

      <div className="flex flex-col gap-2.5">
        {houses.map((h) => {
          const visits = Object.values(data.visits).filter((v) => v.houseId === h.id)
          const avg = averageRating(visits)
          const open = isEnded(h) ? [] : openDays(h, data.visits)
          const next = nextCleaningDay(h)
          return (
            <Link
              key={h.id}
              to={`/domy/${h.id}`}
              className={cn(
                'flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border px-4 py-3.5 transition-colors hover:brightness-125',
                isEnded(h) && 'opacity-60',
              )}
              style={ratingStyle(avg ? Math.round(avg) : undefined)}
            >
              <div className="min-w-[180px] flex-1">
                <div className="text-lg font-semibold">{h.name}</div>
                <div className="text-sm text-ink-2">
                  {h.partner || '—'} · {t.houses.everyDays(days(h.weekdays), h.time)}
                </div>
              </div>
              <div className="text-sm text-ink-2">
                {isEnded(h) ? t.houses.ended : next ? `${t.houses.next}: ${fmtShort(parseKey(next))}` : ''}
              </div>
              <div className={cn('text-sm', open.length ? 'font-semibold text-flame' : 'text-ink-3')}>
                {open.length ? t.houses.missing(open.length) : t.houses.allDone}
              </div>
              <RatingBadge value={avg} />
            </Link>
          )
        })}
      </div>
    </div>
  )
}

/* ───────────────────────────────── detail ───────────────────────────────── */

export function HouseView() {
  const t = useT()
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const updateHouse = useStore((s) => s.updateHouse)
  const deleteHouse = useStore((s) => s.deleteHouse)
  const days = useDays()
  const [confirm, setConfirm] = useState(false)
  const house = data.houses[id]

  const visits = useMemo(() => Object.values(data.visits).filter((v) => v.houseId === id), [data.visits, id])
  if (!house) return <Navigate to="/todo?view=houses" replace />

  const title = (name: string) => t.houses.eventTitle(name)
  const avg = averageRating(visits)
  const today = dateKey(new Date())
  const past = cleaningDays(house, new Date()).filter((k) => k <= today).reverse()
  const next = nextCleaningDay({ ...house, startDate: house.startDate }, new Date())
  const upcoming = next && next > today ? next : undefined

  function toggleDay(d: number) {
    const has = house.weekdays.includes(d)
    const weekdays = has ? house.weekdays.filter((x) => x !== d) : [...house.weekdays, d]
    if (weekdays.length) updateHouse(house.id, { weekdays })
  }

  return (
    <Page
      before={
        <Link to="/todo?view=houses" className="mb-1.5 inline-flex items-center gap-1 text-sm text-ink-3 hover:text-ink">
          <ArrowLeft size={14} />
          {t.houses.back}
        </Link>
      }
      title={
        <input
          value={house.name}
          onChange={(e) => updateHouse(house.id, { name: e.target.value }, title(e.target.value))}
          className="display w-full bg-transparent outline-none"
        />
      }
      lede={isEnded(house) ? t.houses.ended : undefined}
      actions={
        <>
          <RatingBadge value={avg} label={avg ? t.houses.avg(avg.toFixed(1)) : undefined} />
          <Button variant="danger" onClick={() => setConfirm(true)}>
            <Trash2 size={14} />
            {t.houses.delete}
          </Button>
        </>
      }
    >
      <section className="mb-8 grid gap-4 rounded-lg border border-line bg-surface p-4 sm:grid-cols-2">
        <Labeled label={t.houses.partner}>
          <TextField value={house.partner} onChange={(e) => updateHouse(house.id, { partner: e.target.value })} />
        </Labeled>
        <Labeled label={t.houses.time}>
          <TextField
            type="time"
            value={house.time}
            onChange={(e) => e.target.value && updateHouse(house.id, { time: e.target.value })}
          />
        </Labeled>
        <Labeled label={t.houses.start}>
          <TextField
            type="date"
            value={house.startDate}
            onChange={(e) => e.target.value && updateHouse(house.id, { startDate: e.target.value })}
          />
        </Labeled>
        <Labeled label={t.houses.end}>
          <div className="flex gap-2">
            <TextField
              type="date"
              value={house.endDate ?? ''}
              onChange={(e) => updateHouse(house.id, { endDate: e.target.value || undefined })}
            />
            {!house.endDate && (
              <Button onClick={() => updateHouse(house.id, { endDate: today })}>{t.houses.endNow}</Button>
            )}
            {house.endDate && (
              <Button variant="ghost" onClick={() => updateHouse(house.id, { endDate: undefined })}>
                {t.houses.endEmpty}
              </Button>
            )}
          </div>
        </Labeled>
        <div className="sm:col-span-2">
          <Labeled label={t.houses.weekdays}>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_ORDER.map((d) => (
                <button
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={cn(
                    'h-8 min-w-[44px] rounded-md border px-3 text-sm font-medium transition-colors',
                    house.weekdays.includes(d)
                      ? 'border-transparent bg-ink text-bg'
                      : 'border-line-2 text-ink-2 hover:bg-surface-2',
                  )}
                >
                  {t.houses.dayShort[d]}
                </button>
              ))}
            </div>
          </Labeled>
        </div>
        <div className="sm:col-span-2">
          <Labeled label={t.houses.notes}>
            <TextArea
              value={house.notes ?? ''}
              onChange={(e) => updateHouse(house.id, { notes: e.target.value })}
              placeholder={t.houses.notesPh}
            />
          </Labeled>
        </div>
      </section>

      <h2 className="mb-3 text-sm font-semibold text-ink-2">{t.houses.visits}</h2>
      {upcoming && (
        <div className="mb-2 flex items-center gap-3 rounded-lg border border-dashed border-line-2 px-4 py-3 text-base text-ink-3">
          <span className="text-ink-2">{t.houses.upcoming}</span>
          {fmtShort(parseKey(upcoming))} · {days(house.weekdays)} {house.time}
        </div>
      )}
      {past.length === 0 && <p className="py-6 text-base text-ink-3">{t.houses.visitsEmpty}</p>}
      <div className="flex flex-col gap-2">
        {past.map((date) => (
          <VisitRow key={date} house={house} date={date} visit={data.visits[visitId(house.id, date)]} />
        ))}
      </div>

      <ConfirmDialog
        open={confirm}
        title={t.houses.deleteTitle(house.name)}
        body={t.houses.deleteBody}
        onConfirm={() => {
          deleteHouse(house.id)
          navigate('/todo?view=houses')
        }}
        onCancel={() => setConfirm(false)}
      />
    </Page>
  )
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-ink-3">{label}</span>
      {children}
    </div>
  )
}

function VisitRow({ house, date, visit }: { house: House; date: string; visit?: Visit }) {
  const t = useT()
  const upsertVisit = useStore((s) => s.upsertVisit)
  const [open, setOpen] = useState(date === dateKey(new Date()))
  const set = (patch: Partial<Visit>) => upsertVisit(house.id, date, patch)
  const settled = !!visit?.rating && !!visit.photosReceived
  const vid = visitId(house.id, date)

  return (
    <div className="overflow-hidden rounded-lg border transition-colors" style={ratingStyle(visit?.rating)}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left">
        <span className="min-w-[110px] text-base font-semibold">{fmtShort(parseKey(date))}</span>
        <span className="flex items-center gap-1 text-sm text-ink-2">
          <Phone size={13} className={visit?.called ? 'text-ink' : 'text-ink-4'} />
          {visit?.called ? t.houses.called : ''}
        </span>
        {visit?.issues && <span className="min-w-0 flex-1 truncate text-sm text-ink-2">{visit.issues}</span>}
        {!settled && <span className="ml-auto text-sm font-semibold text-flame">{t.houses.toDo}</span>}
        {visit?.photosReceived && <span className="text-sm text-ink-2">{t.houses.photosReceived}</span>}
        <span className={cn(settled ? 'ml-auto' : '', 'flex items-center gap-2')}>
          {visit?.rating ? <RatingBadge value={visit.rating} /> : null}
          <ChevronDown size={15} className={cn('text-ink-3 transition-transform', open && 'rotate-180')} />
        </span>
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-line/60 bg-bg/40 px-4 py-4">
          <label className="flex w-fit cursor-pointer items-center gap-2 text-base">
            <input type="checkbox" checked={!!visit?.called} onChange={(e) => set({ called: e.target.checked })} />
            {t.houses.called}
          </label>
          <Labeled label={t.houses.issues}>
            <TextArea
              value={visit?.issues ?? ''}
              onChange={(e) => set({ issues: e.target.value })}
              placeholder={t.houses.issuesPh}
            />
          </Labeled>
          <Labeled label={t.houses.ratingLabel}>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => set({ rating: visit?.rating === n ? undefined : n })}
                  className={cn(
                    'h-9 w-9 rounded-md border text-sm font-semibold transition-all',
                    visit?.rating === n ? 'scale-110 ring-2 ring-ink' : 'opacity-80 hover:opacity-100',
                  )}
                  style={ratingStyle(n)}
                >
                  {n}
                </button>
              ))}
            </div>
          </Labeled>
          <div className="flex flex-col gap-2.5">
            <label className="flex w-fit cursor-pointer items-center gap-2 text-base">
              <input
                type="checkbox"
                checked={!!visit?.photosReceived}
                onChange={(e) => set({ photosReceived: e.target.checked })}
              />
              {t.houses.photosReceived}
            </label>
            <VisitPhotos visitId={vid} date={date} space={DEFAULT_SPACE} onAdded={() => set({ photosReceived: true })} />
          </div>
        </div>
      )}
    </div>
  )
}
