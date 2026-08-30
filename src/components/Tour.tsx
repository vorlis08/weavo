import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeft, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { cn } from './ui'

interface Step {
  sel: string
  route: string
  place: 'right' | 'bottom' | 'center'
}

const STEPS: Step[] = [
  { sel: '[data-tour="capture"]', route: '/', place: 'right' },
  { sel: '[data-tour="search"]', route: '/', place: 'right' },
  { sel: '[data-tour="views"]', route: '/', place: 'right' },
  { sel: '[data-tour="projects"]', route: '/', place: 'right' },
  { sel: '[data-tour="board-col"]', route: '/board', place: 'bottom' },
  { sel: '[data-tour="settings"]', route: '/', place: 'right' },
  { sel: '', route: '/guide', place: 'center' },
]

const CONTENT: Record<'cs' | 'en', { title: string; body: string }[]> = {
  cs: [
    { title: 'Zachyť cokoli', body: 'Zmáčkni C nebo klikni sem a zapiš událost, úkol nebo nápad. Weavo si z věty samo vytáhne datum, #projekt i @osobu.' },
    { title: 'Hledej a skákej', body: '⌘K / Ctrl-K otevře hledání napříč vším — a umožní skočit do libovolného pohledu.' },
    { title: 'Jedna sada, šest pohledů', body: 'Kalendář, nástěnka, časová osa, graf poznámek a psaný souhrn — stejné položky z různých úhlů.' },
    { title: 'Seskupuj podle projektu', body: 'Cokoli zařaď pod projekt. Kliknutím otevřeš jeho stránku a vlastní nástěnku.' },
    { title: 'Přetahuj věci dál', body: 'Na nástěnce přetáhni kartu mezi sloupci a změníš její stav. Novou přidáš přes + v hlavičce sloupce.' },
    { title: 'Nastavení', body: 'Připoj Google, nastav pracovní hodiny, zapni notifikace, exportuj data.' },
    { title: 'To je celá průvodka', body: 'Celý psaný průvodce je tady, kdykoli ho budeš chtít.' },
  ],
  en: [
    { title: 'Capture anything', body: 'Press C or click here to jot down an event, a task, or a stray thought. Weavo reads the date, #project and @person straight out of the sentence.' },
    { title: 'Find and jump', body: '⌘K / Ctrl-K opens a search across every record — and lets you jump to any view.' },
    { title: 'One set of records, six views', body: 'Calendar, board, timeline, a graph of your notes, and a written digest — the same items, seen from different angles.' },
    { title: 'Group by project', body: 'File anything under a project. Click one to open its page and its own board.' },
    { title: 'Drag things along', body: 'On the board, drag a card between columns to change its status. Add one inline with the + on a column header.' },
    { title: 'Settings', body: 'Connect Google, set your working hours, turn on notifications, export your data.' },
    { title: 'That’s the tour', body: 'The full written guide is right here whenever you want it.' },
  ],
}

const CARD_W = 320

export function Tour() {
  const tr = useT()
  const lang = useStore((s) => s.data.settings.lang)
  const content = CONTENT[lang] ?? CONTENT.en
  const tourOpen = useStore((s) => s.tourOpen)
  const endTour = useStore((s) => s.endTour)
  const navigate = useNavigate()
  const location = useLocation()
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  useEffect(() => {
    if (tourOpen) setStep(0)
  }, [tourOpen])

  const s = STEPS[step]

  useEffect(() => {
    if (!tourOpen) return
    if (s.route !== location.pathname) navigate(s.route)
  }, [tourOpen, step, s.route, location.pathname, navigate])

  useEffect(() => {
    if (!tourOpen) return
    let timer = 0
    let tries = 0
    const measure = () => {
      if (!s.sel) {
        setRect(null)
        return
      }
      const el = document.querySelector(s.sel)
      if (!el && tries < 20) {
        tries += 1
        timer = window.setTimeout(measure, 90)
        return
      }
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
        setRect(el.getBoundingClientRect())
      } else {
        setRect(null)
      }
    }
    timer = window.setTimeout(measure, s.route !== location.pathname ? 380 : 60)
    const onResize = () => {
      const el = s.sel ? document.querySelector(s.sel) : null
      setRect(el ? el.getBoundingClientRect() : null)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('resize', onResize)
    }
  }, [tourOpen, step, s.sel, s.route, location.pathname])

  function next() {
    if (step >= STEPS.length - 1) endTour()
    else setStep((v) => v + 1)
  }

  useEffect(() => {
    if (!tourOpen) return
    function h(e: KeyboardEvent) {
      if (e.key === 'Escape') endTour()
      else if (e.key === 'ArrowRight' || e.key === 'Enter') next()
      else if (e.key === 'ArrowLeft') setStep((v) => Math.max(0, v - 1))
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tourOpen, step, endTour])

  if (!tourOpen) return null

  const last = step === STEPS.length - 1

  const CARD_H = 190
  let cardStyle: React.CSSProperties = {
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  }
  if (rect && s.place === 'right') {
    const fitsRight = rect.right + 16 + CARD_W < window.innerWidth
    const left = fitsRight ? rect.right + 16 : Math.max(12, rect.left - 16 - CARD_W)
    const top = Math.min(
      Math.max(CARD_H / 2 + 12, rect.top + rect.height / 2),
      window.innerHeight - CARD_H / 2 - 12,
    )
    cardStyle = { left, top, transform: 'translateY(-50%)' }
  } else if (rect && s.place === 'bottom') {
    const left = Math.min(Math.max(12, rect.left), window.innerWidth - CARD_W - 12)
    const top = Math.min(rect.bottom + 14, window.innerHeight - CARD_H - 12)
    cardStyle = { left, top }
  }

  return (
    <div className="fixed inset-0 z-[70]">
      {/* click shield */}
      <div
        className="absolute inset-0"
        style={{ background: rect ? 'transparent' : 'rgba(6,7,9,0.72)' }}
        onClick={(e) => e.stopPropagation()}
      />
      {/* spotlight */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-[10px] transition-all duration-200"
          style={{
            left: rect.left - 6,
            top: rect.top - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(6,7,9,0.72)',
            border: '1px solid rgba(141,147,239,0.65)',
          }}
        />
      )}
      {/* card */}
      <div
        className="absolute w-[320px] rounded-2xl border border-line-2 bg-surface p-4 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.6)]"
        style={cardStyle}
      >
        <div className="flex items-center gap-2">
          <span className="mono text-[10px] text-ink-3">
            {step + 1} / {STEPS.length}
          </span>
          <button
            onClick={endTour}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
            aria-label={tr.common.cancel}
          >
            <X size={14} />
          </button>
        </div>
        <h3 className="mt-1 text-[15px] font-semibold">{content[step].title}</h3>
        <p className="mt-1.5 text-[12.75px] leading-relaxed text-ink-2">{content[step].body}</p>
        <div className="mt-3.5 flex items-center gap-2">
          {step > 0 && (
            <button
              onClick={() => setStep((v) => Math.max(0, v - 1))}
              className="flex h-8 items-center gap-1 rounded-lg px-2 text-[12px] text-ink-2 hover:text-ink"
            >
              <ChevronLeft size={13} />
              {tr.common.back}
            </button>
          )}
          {!last && (
            <button
              onClick={endTour}
              className="h-8 rounded-lg px-2 text-[12px] text-ink-3 hover:text-ink-2"
            >
              {tr.common.skip}
            </button>
          )}
          <button
            onClick={next}
            className={cn(
              'ml-auto h-8 rounded-lg bg-iris px-3.5 text-[12.5px] font-semibold text-[#0b0c0e] hover:bg-iris-2',
            )}
          >
            {last ? tr.common.finish : tr.common.next}
          </button>
        </div>
      </div>
    </div>
  )
}
