import type { ReactNode } from 'react'

export function TopBar({ children }: { children: ReactNode }) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3.5 border-b border-line px-5">
      {children}
    </header>
  )
}
