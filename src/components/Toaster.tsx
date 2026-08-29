import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useStore } from '@/lib/store'

export function Toaster() {
  const toasts = useStore((s) => s.toasts)
  const dismiss = useStore((s) => s.dismissToast)

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 rounded-xl border border-line-2 bg-surface-3 py-2 pl-3.5 pr-2 text-[12.5px] shadow-[0_16px_44px_-10px_rgba(0,0,0,0.6)]"
        >
          <span className="text-ink">{t.message}</span>
          {t.action && (
            <button
              onClick={() => {
                t.action!.run()
                dismiss(t.id)
              }}
              className="rounded-md px-2 py-1 text-[12px] font-semibold text-iris-2 hover:bg-iris/12"
            >
              {t.action.label}
            </button>
          )}
          <button
            onClick={() => dismiss(t.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  )
}
