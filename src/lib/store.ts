import { create } from 'zustand'
import type { ItemKind } from './types'

interface UIState {
  captureOpen: boolean
  captureKind: ItemKind
  openCapture: (kind?: ItemKind) => void
  closeCapture: () => void
  setCaptureKind: (kind: ItemKind) => void

  doneOverrides: Record<string, boolean>
  toggleDone: (id: string) => void

  leaveUnsorted: boolean
  setLeaveUnsorted: (v: boolean) => void
}

export const useUI = create<UIState>((set) => ({
  captureOpen: false,
  captureKind: 'task',
  openCapture: (kind) =>
    set((s) => ({ captureOpen: true, captureKind: kind ?? s.captureKind })),
  closeCapture: () => set({ captureOpen: false }),
  setCaptureKind: (kind) => set({ captureKind: kind }),

  doneOverrides: {},
  toggleDone: (id) =>
    set((s) => ({
      doneOverrides: { ...s.doneOverrides, [id]: !s.doneOverrides[id] },
    })),

  leaveUnsorted: false,
  setLeaveUnsorted: (v) => set({ leaveUnsorted: v }),
}))
