import type { ReactNode } from 'react'

export function TopBar({ children }: { children: ReactNode }) {
  return (
    <header className="flex min-h-16 shrink-0 flex-wrap items-center gap-3.5 border-b border-line px-4 py-3 md:px-10 [&_h1]:display [&_h1]:text-xl">
      {children}
    </header>
  )
}
