export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const AVATAR_TINTS = [
  { bg: '#3a3252', fg: '#c9c4e4' },
  { bg: '#33404a', fg: '#a9c6d4' },
  { bg: '#3d3a2e', fg: '#d6c9a2' },
  { bg: '#3a2e3a', fg: '#d8bcd0' },
  { bg: '#2e3d38', fg: '#aed4c5' },
  { bg: '#3d3230', fg: '#d8b9ac' },
]

export function tintFor(seed: string) {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return AVATAR_TINTS[Math.abs(h) % AVATAR_TINTS.length]
}

export function pluralize(n: number, one: string, many = one + 's') {
  return `${n} ${n === 1 ? one : many}`
}
