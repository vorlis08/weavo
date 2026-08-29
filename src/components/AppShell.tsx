import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useUI } from '@/lib/store'
import { Sidebar } from './Sidebar'
import { QuickCapture } from './QuickCapture'

export function AppShell() {
  const { openCapture, captureOpen } = useUI()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement
      const typing =
        el?.tagName === 'INPUT' ||
        el?.tagName === 'TEXTAREA' ||
        el?.isContentEditable
      if (typing || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key.toLowerCase() === 'c' && !captureOpen) {
        e.preventDefault()
        openCapture()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openCapture, captureOpen])

  return (
    <div className="flex h-full overflow-hidden bg-bg text-ink">
      <Sidebar />
      <main className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </main>
      <QuickCapture />
    </div>
  )
}
