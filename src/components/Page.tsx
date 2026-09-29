import type { ReactNode } from 'react'
import { cn } from './ui'

/**
 * A page: big display title with an optional eyebrow, lede and actions,
 * then the content. `fill` gives full-height views (calendar, board) the rest
 * of the viewport instead of a scrolling column.
 */
export function Page({
  eyebrow,
  title,
  lede,
  actions,
  before,
  children,
  width = 'default',
  fill,
  className,
}: {
  eyebrow?: ReactNode
  title: ReactNode
  lede?: ReactNode
  actions?: ReactNode
  /** breadcrumb or anything above the title */
  before?: ReactNode
  children: ReactNode
  width?: 'default' | 'narrow' | 'wide'
  fill?: boolean
  className?: string
}) {
  const max = width === 'narrow' ? 'max-w-[760px]' : width === 'wide' ? 'max-w-[1400px]' : 'max-w-[1080px]'
  const header = (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0 flex-1 max-md:basis-full">
        {before}
        {eyebrow && <div className="text-sm text-ink-3">{eyebrow}</div>}
        <h1 className="display text-2xl">{title}</h1>
        {lede && <div className="mt-1 max-w-[64ch] text-base text-ink-3">{lede}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
  if (fill)
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col px-4 pb-4 pt-5 md:px-7 md:pb-5 md:pt-[22px]', className)}>
        {header}
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    )
  return (
    <div className="flex-1 overflow-y-auto">
      <div className={cn('mx-auto w-full px-4 pb-12 pt-5 md:px-7 md:pb-20 md:pt-[22px]', max, className)}>
        {header}
        {children}
      </div>
    </div>
  )
}

/** a titled group of content inside a page */
export function Section({
  title,
  count,
  icon,
  hint,
  tone,
  action,
  children,
  className,
}: {
  title: ReactNode
  count?: number
  icon?: ReactNode
  hint?: ReactNode
  tone?: 'hot'
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('mb-6', className)}>
      <div
        className={cn(
          'flex items-center gap-2 px-2.5 pb-1.5 text-sm font-medium',
          tone === 'hot' ? 'text-flame' : 'text-ink-2',
        )}
      >
        {icon}
        {title}
        {count != null && <span className="font-normal text-ink-4">{count}</span>}
        <i className="h-px flex-1 bg-line" />
        {hint && <span className="text-sm font-normal text-ink-4">{hint}</span>}
        {action && <span>{action}</span>}
      </div>
      {children}
    </section>
  )
}

/** a raised panel — for summaries and side rails, not for lists */
export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: ReactNode
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-lg border border-line bg-surface p-3.5', className)}>
      {(title || action) && (
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-ink-2">
          {title}
          {action && <span className="ml-auto text-sm font-medium">{action}</span>}
        </h3>
      )}
      {children}
    </section>
  )
}
