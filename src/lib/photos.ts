/**
 * Photo blobs live in IndexedDB (localStorage is far too small); the store only
 * keeps the metadata. Images are downscaled to a JPEG before they are saved.
 */
const DB = 'weavo-photos'
const STORE = 'blobs'
const MAX_SIDE = 1800

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open()
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export const putPhotoBlob = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id)).then(() => undefined)
export const getPhotoBlob = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id))
export const deletePhotoBlob = (id: string) => tx('readwrite', (s) => s.delete(id)).then(() => undefined)

/** downscale and re-encode so a phone photo costs ~300 kB instead of 5 MB */
export async function compressImage(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const width = Math.round(bmp.width * k)
  const height = Math.round(bmp.height * k)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, width, height)
  bmp.close()
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/jpeg', 0.85),
  )
  return { blob, width, height }
}
