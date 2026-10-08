import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Camera, CheckCircle2, CircleAlert, Trash2, X } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useT } from '@/lib/i18n'
import { compressImage, deletePhotoBlob, getPhotoBlob, putPhotoBlob } from '@/lib/photos'
import { fmtDayMonth, fmtShort, fmtTime, isSameDay, startOfWeek } from '@/lib/date'
import type { Photo, Space } from '@/lib/types'
import { Button, cn } from './ui'
import { ConfirmDialog, useEscape } from './overlays'

/** object URL for a stored photo, revoked on unmount */
function usePhotoUrl(id: string) {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    let alive = true
    let made: string | undefined
    getPhotoBlob(id)
      .then((b) => {
        if (!alive || !b) return
        made = URL.createObjectURL(b)
        setUrl(made)
      })
      .catch(() => undefined)
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [id])
  return url
}

function Thumb({ photo, onOpen }: { photo: Photo; onOpen: () => void }) {
  const url = usePhotoUrl(photo.id)
  return (
    <button
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-md border border-line bg-surface-2 transition-colors hover:border-line-3"
    >
      {url && <img src={url} alt={photo.caption ?? ''} className="h-full w-full object-cover" loading="lazy" />}
      <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-6 text-left text-xs text-white">
        {photo.caption ? `${photo.caption} · ` : ''}
        {fmtShort(photo.takenAt)}
      </span>
    </button>
  )
}

function Lightbox({ photo, onClose }: { photo: Photo; onClose: () => void }) {
  const t = useT()
  const url = usePhotoUrl(photo.id)
  const updatePhoto = useStore((s) => s.updatePhoto)
  const deletePhoto = useStore((s) => s.deletePhoto)
  const [caption, setCaption] = useState(photo.caption ?? '')
  const [confirm, setConfirm] = useState(false)
  useEscape(!confirm, onClose)

  function remove() {
    deletePhoto(photo.id)
    deletePhotoBlob(photo.id).catch(() => undefined)
    onClose()
  }

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-black/85 p-4 [animation:fade-in_.18s]"
      onMouseDown={onClose}
    >
      <button
        onClick={onClose}
        aria-label={t.photos.close}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-md text-white/80 hover:bg-white/10 hover:text-white"
      >
        <X size={20} />
      </button>
      {url && (
        <img
          src={url}
          alt={photo.caption ?? ''}
          className="max-h-[78vh] max-w-full rounded-md object-contain"
          onMouseDown={(e) => e.stopPropagation()}
        />
      )}
      <div className="flex w-full max-w-xl items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          onBlur={() => caption !== (photo.caption ?? '') && updatePhoto(photo.id, { caption: caption.trim() || undefined })}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          placeholder={t.photos.captionPh}
          className="h-9 min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-3 text-sm text-white outline-none placeholder:text-white/50 focus:border-white/50"
        />
        <span className="shrink-0 text-xs text-white/60">
          {fmtShort(photo.takenAt)} {fmtTime(photo.takenAt)}
        </span>
        <button
          onClick={() => setConfirm(true)}
          aria-label={t.photos.delete}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-rose"
        >
          <Trash2 size={16} />
        </button>
      </div>
      <ConfirmDialog open={confirm} title={t.photos.deleteConfirm} onConfirm={remove} onCancel={() => setConfirm(false)} />
    </div>,
    document.body,
  )
}

/** the photo log of one space: add photos, see them by week, and whether this week's batch has arrived */
export function PhotosPanel({ space }: { space: Space }) {
  const t = useT()
  const photos = useStore((s) => s.data.photos)
  const mondayFirst = useStore((s) => s.data.settings.weekStartsMonday)
  const addPhoto = useStore((s) => s.addPhoto)
  const toast = useStore((s) => s.toast)
  const input = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [over, setOver] = useState(false)

  const mine = useMemo(
    () => Object.values(photos).filter((p) => p.space === space).sort((a, b) => (a.takenAt < b.takenAt ? 1 : -1)),
    [photos, space],
  )
  const weeks = useMemo(() => {
    const map = new Map<string, Photo[]>()
    for (const p of mine) {
      const k = startOfWeek(p.takenAt, mondayFirst).toISOString()
      map.set(k, [...(map.get(k) ?? []), p])
    }
    return [...map.entries()]
  }, [mine, mondayFirst])

  const thisWeek = startOfWeek(new Date(), mondayFirst)
  const thisWeekCount = weeks.find(([k]) => isSameDay(k, thisWeek))?.[1].length ?? 0

  async function upload(files: FileList | File[]) {
    const list = [...files].filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setBusy(true)
    let saved = 0
    for (const f of list) {
      try {
        const { blob, width, height } = await compressImage(f)
        const photo = addPhoto({
          space,
          takenAt: f.lastModified ? new Date(f.lastModified).toISOString() : new Date().toISOString(),
          width,
          height,
        })
        await putPhotoBlob(photo.id, blob)
        saved++
      } catch {
        toast(t.photos.failed)
      }
    }
    setBusy(false)
    if (saved) toast(t.photos.saved(saved))
  }

  const current = open ? photos[open] : undefined

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setOver(false)
        upload(e.dataTransfer.files)
      }}
      className={cn('rounded-lg transition-colors', over && 'bg-surface-2/60 outline outline-1 outline-dashed outline-line-3')}
    >
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 rounded-md border px-3.5 py-2.5 text-base',
            thisWeekCount > 0 ? 'border-line text-ink-2' : 'border-flame/40 bg-flame/5 text-ink',
          )}
        >
          {thisWeekCount > 0 ? (
            <CheckCircle2 size={16} className="shrink-0 text-ink-3" />
          ) : (
            <CircleAlert size={16} className="shrink-0 text-flame" />
          )}
          <span className="min-w-0">
            <b className="font-semibold">{t.photos.thisWeekTitle}:</b> {t.photos.weekCount(thisWeekCount)}
            <span className="text-ink-3"> · {thisWeekCount > 0 ? t.photos.weekOk : t.photos.weekMissing}</span>
          </span>
        </div>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => {
            if (e.target.files) upload(e.target.files)
            e.target.value = ''
          }}
        />
        <Button variant="accent" onClick={() => input.current?.click()} disabled={busy}>
          <Camera size={15} />
          {t.photos.add}
        </Button>
      </div>

      {weeks.length === 0 && <p className="py-12 text-center text-base text-ink-3">{t.photos.empty}</p>}

      {weeks.map(([k, list]) => (
        <section key={k} className="mb-8">
          <h3 className="mb-3 text-sm font-medium text-ink-3">
            {isSameDay(k, thisWeek) ? t.photos.thisWeekTitle : t.photos.weekOf(fmtDayMonth(k))}
            <span className="ml-2 text-ink-4">{t.photos.weekCount(list.length)}</span>
          </h3>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
            {list.map((p) => (
              <Thumb key={p.id} photo={p} onOpen={() => setOpen(p.id)} />
            ))}
          </div>
        </section>
      ))}

      <p className="pb-4 text-xs text-ink-4">{t.photos.localNote}</p>
      {current && <Lightbox photo={current} onClose={() => setOpen(null)} />}
    </div>
  )
}
