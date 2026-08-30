import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useT } from '@/lib/i18n'
import { cn } from './ui'

export function useEscape(active: boolean, onEscape: () => void) {
  useEffect(() => {
    if (!active) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onEscape()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onEscape])
}

export function Modal({
  open,
  onClose,
  children,
  title,
  width = 460,
  align = 'center',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  width?: number
  align?: 'center' | 'top'
}) {
  useEscape(open, onClose)
  if (!open) return null
  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex justify-center bg-[#07080a]/60 backdrop-blur-[2px]',
        align === 'center' ? 'items-center' : 'items-start pt-[10vh]',
      )}
      onMouseDown={onClose}
    >
      <div
        className="max-h-[85vh] w-full overflow-hidden rounded-2xl border border-line-2 bg-surface shadow-[0_30px_80px_-16px_rgba(0,0,0,0.65)]"
        style={{ maxWidth: width }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center border-b border-line px-4 py-3">
            <h2 className="text-[13.5px] font-semibold">{title}</h2>
            <button
              onClick={onClose}
              className="ml-auto flex h-[26px] w-[26px] items-center justify-center rounded-md text-ink-3 hover:bg-surface-2 hover:text-ink"
            >
              <X size={15} strokeWidth={1.7} />
            </button>
          </div>
        )}
        <div className="max-h-[calc(85vh-49px)] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body,
  )
}

export interface MenuItem {
  label: ReactNode
  onSelect: () => void
  danger?: boolean
  icon?: ReactNode
}

export function Menu({
  trigger,
  items,
  align = 'left',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode
  items: (MenuItem | 'separator')[]
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('mousedown', onDoc)
    return () => window.removeEventListener('mousedown', onDoc)
  }, [open])
  useEscape(open, () => setOpen(false))

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={cn(
            'absolute z-40 mt-1 min-w-[176px] overflow-hidden rounded-xl border border-line-2 bg-surface-3 p-1 shadow-[0_16px_44px_-10px_rgba(0,0,0,0.6)]',
            align === 'right' ? 'right-0' : 'left-0',
          )}
        >
          {items.map((it, i) =>
            it === 'separator' ? (
              <div key={i} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={i}
                onClick={() => {
                  setOpen(false)
                  it.onSelect()
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors',
                  it.danger
                    ? 'text-rose hover:bg-rose/12'
                    : 'text-ink-2 hover:bg-surface-2 hover:text-ink',
                )}
              >
                {it.icon}
                {it.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  )
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useT()
  return (
    <Modal open={open} onClose={onCancel} width={380}>
      <div className="p-5">
        <h2 className="text-[14px] font-semibold">{title}</h2>
        {body && <p className="mt-2 text-[12.5px] leading-relaxed text-ink-2">{body}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="h-8 rounded-lg border border-line-2 bg-surface-2 px-3 text-[12.5px] font-medium hover:bg-surface-3"
          >
            {t.common.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="h-8 rounded-lg bg-rose/15 px-3 text-[12.5px] font-semibold text-rose hover:bg-rose/25"
          >
            {confirmLabel ?? t.common.delete}
          </button>
        </div>
      </div>
    </Modal>
  )
}
