import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Network } from 'lucide-react'
import { TopBar } from '@/components/TopBar'
import { EmptyState } from '@/components/ui'
import { useStore } from '@/lib/store'
import { noteLinks } from '@/lib/selectors'

interface Node {
  id: string
  title: string
  color: string
  x: number
  y: number
  deg: number
}

export function NotesMap() {
  const navigate = useNavigate()
  const data = useStore((s) => s.data)
  const [hover, setHover] = useState<string | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  const graph = useMemo(() => {
    const notes = Object.values(data.items).filter((it) => it.kind === 'note')
    const edgeSet = new Set<string>()
    const edges: [string, string][] = []
    const nodeIds = new Set<string>()

    for (const n of notes) {
      nodeIds.add(n.id)
      const { linksTo } = noteLinks(data, n)
      for (const t of linksTo) {
        nodeIds.add(t.id)
        const key = [n.id, t.id].sort().join('|')
        if (!edgeSet.has(key)) {
          edgeSet.add(key)
          edges.push([n.id, t.id])
        }
      }
    }

    const ids = [...nodeIds]
    const W = 900
    const H = 560
    const deg: Record<string, number> = {}
    edges.forEach(([a, b]) => {
      deg[a] = (deg[a] ?? 0) + 1
      deg[b] = (deg[b] ?? 0) + 1
    })

    const nodes: Record<string, Node> = {}
    ids.forEach((id, i) => {
      const a = (i / Math.max(ids.length, 1)) * Math.PI * 2
      const it = data.items[id]
      nodes[id] = {
        id,
        title: it?.title ?? id,
        color: it?.projectId ? data.projects[it.projectId]?.color ?? '#8d93ef' : '#8d93ef',
        x: W / 2 + Math.cos(a) * 180,
        y: H / 2 + Math.sin(a) * 140,
        deg: deg[id] ?? 0,
      }
    })

    // relax
    for (let iter = 0; iter < 220; iter++) {
      for (const a of ids) {
        for (const b of ids) {
          if (a === b) continue
          const na = nodes[a]
          const nb = nodes[b]
          let dx = na.x - nb.x
          let dy = na.y - nb.y
          let d2 = dx * dx + dy * dy || 0.01
          const rep = 5200 / d2
          na.x += dx * rep * 0.01
          na.y += dy * rep * 0.01
        }
      }
      for (const [a, b] of edges) {
        const na = nodes[a]
        const nb = nodes[b]
        const dx = nb.x - na.x
        const dy = nb.y - na.y
        const d = Math.sqrt(dx * dx + dy * dy) || 0.01
        const f = (d - 130) * 0.02
        na.x += (dx / d) * f
        na.y += (dy / d) * f
        nb.x -= (dx / d) * f
        nb.y -= (dy / d) * f
      }
      for (const id of ids) {
        nodes[id].x += (W / 2 - nodes[id].x) * 0.008
        nodes[id].y += (H / 2 - nodes[id].y) * 0.008
        nodes[id].x = Math.max(60, Math.min(W - 60, nodes[id].x))
        nodes[id].y = Math.max(40, Math.min(H - 40, nodes[id].y))
      }
    }

    return { nodes: ids.map((id) => nodes[id]), edges, W, H }
  }, [data])

  if (graph.nodes.length === 0) {
    return (
      <>
        <TopBar>
          <h1 className="text-[16px]">Notes map</h1>
        </TopBar>
        <EmptyState
          icon={<Network size={22} strokeWidth={1.5} />}
          title="No notes yet"
          hint="Write notes and link them with [[title]] — the connections show up here."
        />
      </>
    )
  }

  const connected = (id: string) =>
    hover == null ||
    hover === id ||
    graph.edges.some(([a, b]) => (a === hover && b === id) || (b === hover && a === id))

  return (
    <>
      <TopBar>
        <h1 className="text-[16px]">Notes map</h1>
        <span className="mono text-ink-3">
          {graph.nodes.length} notes · {graph.edges.length} links
        </span>
      </TopBar>
      <div ref={wrap} className="flex flex-1 items-center justify-center overflow-auto p-6">
        <svg
          viewBox={`0 0 ${graph.W} ${graph.H}`}
          className="h-full max-h-[640px] w-full max-w-[1000px]"
        >
          {graph.edges.map(([a, b], i) => {
            const na = graph.nodes.find((n) => n.id === a)!
            const nb = graph.nodes.find((n) => n.id === b)!
            const lit = hover == null || hover === a || hover === b
            return (
              <line
                key={i}
                x1={na.x}
                y1={na.y}
                x2={nb.x}
                y2={nb.y}
                stroke="currentColor"
                className={lit ? 'text-ink-3' : 'text-line-2'}
                strokeWidth={lit ? 1.4 : 1}
              />
            )
          })}
          {graph.nodes.map((n) => {
            const r = 5 + Math.min(n.deg, 6) * 1.6
            const active = connected(n.id)
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                className="cursor-pointer"
                opacity={active ? 1 : 0.28}
                onMouseEnter={() => setHover(n.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => navigate(`/item/${n.id}`)}
              >
                <circle r={r} fill={n.color} />
                <text
                  x={r + 5}
                  y={4}
                  className="fill-ink-2 text-[11px]"
                  style={{ paintOrder: 'stroke', stroke: 'var(--color-bg)', strokeWidth: 3 }}
                >
                  {n.title.length > 28 ? n.title.slice(0, 27) + '…' : n.title}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </>
  )
}
