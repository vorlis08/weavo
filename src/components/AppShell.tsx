import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useStore } from '@/lib/store'
import { useReminderEngine } from '@/hooks/useReminderEngine'
import { useGoogleSync } from '@/hooks/useGoogleSync'
import { Sidebar } from './Sidebar'
import { QuickCapture } from './QuickCapture'
import { CommandPalette } from './CommandPalette'
import { Toaster } from './Toaster'
import { Modal } from './overlays'
import { Kbd } from './ui'

function isTyping(el: EventTarget | null) {
  const n = el as HTMLElement | null
  return !!n && (n.tagName === 'INPUT' || n.tagName === 'TEXTAREA' || n.isContentEditable)
}

const SHORTCUTS: [string, string][] = [
  ['C', 'Quick capture'],
  ['⌘ / Ctrl + K', 'Search everything'],
  ['G then D / C / B', 'Go to Dashboard / Calendar / Board'],
  ['?', 'This list'],
]

export function AppShell() {
  const navigate = useNavigate()
  const { openCapture, setPalette, captureOpen, paletteOpen } = useStore()
  const [helpOpen, setHelpOpen] = useState(false)
  useReminderEngine(navigate)
  useGoogleSync()

  useEffect(() => {
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
  }, [navigate, openCapture, setPalette, captureOpen, paletteOpen])

  return (
    <div className="flex h-full overflow-hidden bg-bg text-ink">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
      <QuickCapture />
      <CommandPalette />
      <Toaster />
      <Modal open={helpOpen} onClose={() => setHelpOpen(false)} title="Keyboard shortcuts" width={360}>
        <div className="flex flex-col gap-2 p-4">
          {SHORTCUTS.map(([k, label]) => (
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
