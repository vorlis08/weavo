import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { Sparkles, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { useReminderEngine } from '@/hooks/useReminderEngine'
import { useGoogleSync } from '@/hooks/useGoogleSync'
import { setDateLang } from '@/lib/date'
import { Sidebar } from './Sidebar'
import { QuickCapture } from './QuickCapture'
import { CommandPalette } from './CommandPalette'
import { Toaster } from './Toaster'
import { Tour } from './Tour'
import { Modal } from './overlays'
import { Kbd } from './ui'

function isTyping(el: EventTarget | null) {
  const n = el as HTMLElement | null
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable)
}

function TourNudge() {
  const t = useT()
  const tourSeen = useStore((s) => s.data.settings.tourSeen)
  const tourOpen = useStore((s) => s.tourOpen)
  const startTour = useStore((s) => s.startTour)
  const endTour = useStore((s) => s.endTour)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1200)
    return () => clearTimeout(timer)
  }, [])

  if (tourSeen || tourOpen || !ready) return null
  return (
    <div className="fixed bottom-5 right-5 z-40 w-[300px] rounded-2xl border border-line-2 bg-surface p-4 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.6)]">
      <div className="flex items-start gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-iris/14 text-iris-2">
          <Sparkles size={14} />
        </span>
        <div>
          <div className="text-[13px] font-medium">{t.tour.nudgeTitle}</div>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-2">{t.tour.nudgeBody}</p>
        </div>
        <button
          onClick={endTour}
          className="ml-auto -mr-1 -mt-1 flex h-6 w-6 items-center justify-center rounded-md text-ink-3 hover:text-ink"
          aria-label={t.common.cancel}
        >
          <X size={13} />
        </button>
      </div>
      <div className="mt-3 flex gap-2">
        <button
          onClick={startTour}
          className="h-8 flex-1 rounded-lg bg-iris text-[12.5px] font-semibold text-[#0b0c0e] hover:bg-iris-2"
        >
          {t.tour.take}
        </button>
        <button
          onClick={endTour}
          className="h-8 rounded-lg px-3 text-[12px] text-ink-3 hover:text-ink-2"
        >
          {t.tour.later}
        </button>
      </div>
    </div>
  )
}

export function AppShell() {
  const t = useT()
  const navigate = useNavigate()
  const { openCapture, setPalette, captureOpen, paletteOpen, tourOpen } = useStore()
  const [helpOpen, setHelpOpen] = useState(false)
  const lang = useStore((s) => s.data.settings.lang)
  useReminderEngine(navigate)
  useGoogleSync()

  useEffect(() => {
    setDateLang(lang)
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    if (tourOpen) return
    let g = 0
    function onKey(e: KeyboardEvent) {
      if (isTyping(e.target)) return
      const k = e.key.toLowerCase()

      if ((e.metaKey || e.ctrlKey) && k === 'k') {
        e.preventDefault()
        setPalette(!paletteOpen)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return

      if (Date.now() - g < 600) {
        if (k === 'd') navigate('/')
        else if (k === 'c') navigate('/calendar')
        else if (k === 'b') navigate('/board')
        else if (k === 't') navigate('/timeline')
        else if (k === 'n') navigate('/notes')
        g = 0
        return
      }
      if (k === 'g') {
        g = Date.now()
        return
      }
      if (k === 'c' && !captureOpen) {
        e.preventDefault()
        openCapture()
      } else if (k === '?' || (k === '/' && e.shiftKey)) {
        setHelpOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, openCapture, setPalette, captureOpen, paletteOpen, tourOpen])

  return (
    <div className="flex h-full overflow-hidden bg-bg text-ink">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
      <QuickCapture />
      <CommandPalette />
      <Toaster />
      <TourNudge />
      <Tour />
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title={t.shortcutsModal.title} width={360}>
        <div className="flex flex-col gap-2 p-4">
          {(
            [
              ['C', t.shortcutsModal.capture],
              ['⌘ / Ctrl + K', t.shortcutsModal.search],
              ['G → D / C / B / T / N', t.shortcutsModal.goto],
              ['?', t.shortcutsModal.thisList],
            ] as [string, string][]
          ).map(([k, label]) => (
            <div key={k} className="flex items-center justify-between text-[12.5px]">
              <span className="text-ink-2">{label}</span>
              <Kbd>{k}</Kbd>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  )
}
