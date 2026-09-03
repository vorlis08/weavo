import { useState } from 'react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { ConfirmDialog } from './overlays'

/**
 * Shared "confirm, then delete with an undo toast" flow for items.
 * `askDelete(id, title, after?)` opens the confirm dialog; render `dialog` once.
 */
export function useConfirmDelete() {
  const t = useT()
  const toast = useStore((s) => s.toast)
  const deleteItem = useStore((s) => s.deleteItem)
  const restoreItems = useStore((s) => s.restoreItems)
  const [pending, setPending] = useState<{ id: string; title: string; after?: () => void } | null>(
    null,
  )

  function confirm() {
    if (!pending) return
    const snap = deleteItem(pending.id)
    toast(t.common.deleted, {
      label: t.common.undo,
      run: () => restoreItems(snap.items, snap.reminders),
    })
    pending.after?.()
    setPending(null)
  }

  const dialog = (
    <ConfirmDialog
      open={!!pending}
      title={pending ? t.detail.deleteConfirmTitle(pending.title) : ''}
      onConfirm={confirm}
      onCancel={() => setPending(null)}
    />
  )

  return {
    askDelete: (id: string, title: string, after?: () => void) =>
      setPending({ id, title, after }),
    dialog,
  }
}
