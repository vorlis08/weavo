/** the Weavo mark: two threads crossing — monochrome */
export function WeavoMark({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
      <path d="M3 8.5c3.5 0 5.5 7 9 7s5.5-7 9-7" stroke="currentColor" />
      {/* the work thread passes over the personal one — a dark halo reads as a weave */}
      <path d="M3 15.5c3.5 0 5.5-7 9-7s5.5 7 9 7" stroke="var(--color-side)" strokeWidth={5} />
      <path d="M3 15.5c3.5 0 5.5-7 9-7s5.5 7 9 7" stroke="currentColor" strokeOpacity={0.55} />
    </svg>
  )
}

export function WeavoLogo() {
  return (
    <span className="flex items-center gap-2 text-ink">
      <WeavoMark size={18} />
      <span className="display text-lg">Weavo</span>
    </span>
  )
}
