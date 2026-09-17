import { useMemo } from 'react'
import { useAppStore } from '../store/useAppStore'
import { laneColor, relativeTime, shortHash } from '../lib/format'
import type { GitCommit } from '@shared/types'

const ROW_H = 30
const LANE_W = 16

function GraphSvg({ commits }: { commits: GitCommit[] }): JSX.Element {
  const indexOf = useMemo(() => {
    const m = new Map<string, number>()
    commits.forEach((c, i) => m.set(c.hash, i))
    return m
  }, [commits])

  const maxLane = useMemo(() => {
    let max = 0
    for (const c of commits) {
      max = Math.max(max, c.lane)
      for (const p of c.parentLanes) max = Math.max(max, p.lane)
    }
    return max
  }, [commits])

  const width = (maxLane + 1) * LANE_W + LANE_W
  const height = commits.length * ROW_H

  const edges: JSX.Element[] = []
  const nodes: JSX.Element[] = []

  commits.forEach((c, i) => {
    const cx = LANE_W / 2 + c.lane * LANE_W
    const cy = i * ROW_H + ROW_H / 2

    for (const p of c.parentLanes) {
      const j = indexOf.get(p.parentHash)
      if (j === undefined) continue
      const px = LANE_W / 2 + p.lane * LANE_W
      const py = j * ROW_H + ROW_H / 2
      const color = laneColor(p.lane === c.lane ? c.lane : p.lane)
      const d =
        px === cx
          ? `M ${cx} ${cy} L ${px} ${py}`
          : `M ${cx} ${cy} C ${cx} ${(cy + py) / 2}, ${px} ${(cy + py) / 2}, ${px} ${py}`
      edges.push(<path key={`${c.hash}-${p.parentHash}`} d={d} stroke={color} strokeWidth={2} fill="none" />)
    }

    const isHead = c.refs.some((r) => r.type === 'head')
    nodes.push(
      <circle
        key={c.hash}
        cx={cx}
        cy={cy}
        r={isHead ? 5.5 : 4}
        fill={laneColor(c.lane)}
        stroke={isHead ? '#fff' : 'none'}
        strokeWidth={isHead ? 2 : 0}
      />
    )
  })

  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {edges}
      {nodes}
    </svg>
  )
}

function RefBadge({ name, type }: { name: string; type: string }): JSX.Element {
  const cls =
    type === 'local-branch' ? 'ref-badge ref-local' : type === 'remote-branch' ? 'ref-badge ref-remote' : type === 'tag' ? 'ref-badge ref-tag' : 'ref-badge ref-head'
  if (type === 'head') return <span className="ref-badge ref-head">HEAD</span>
  return <span className={cls}>{name}</span>
}

export default function GraphPanel(): JSX.Element {
  const commits = useAppStore((s) => s.commits)
  const status = useAppStore((s) => s.status)
  const selectedCommitHash = useAppStore((s) => s.selectedCommitHash)
  const showingChanges = useAppStore((s) => s.showingChanges)
  const selectCommit = useAppStore((s) => s.selectCommit)
  const showChangesView = useAppStore((s) => s.showChangesView)

  const changeCount = (status?.staged.length ?? 0) + (status?.unstaged.length ?? 0) + (status?.conflicted.length ?? 0)

  return (
    <div className="graph-panel">
      <div className="graph-scroll">
        {changeCount > 0 && (
          <div
            className={`graph-row uncommitted-row ${showingChanges ? 'selected' : ''}`}
            style={{ height: ROW_H }}
            onClick={showChangesView}
          >
            <div className="graph-row-graphic" style={{ width: LANE_W * 2 }}>
              <span className="uncommitted-dot" />
            </div>
            <div className="graph-row-text">
              <span className="commit-subject italic">Uncommitted changes</span>
              <span className="change-count-badge">{changeCount}</span>
            </div>
          </div>
        )}
        <div style={{ position: 'relative' }}>
          <div style={{ position: 'absolute', top: 0, left: 0 }}>
            <GraphSvg commits={commits} />
          </div>
          <div>
            {commits.map((c) => (
              <div
                key={c.hash}
                className={`graph-row ${selectedCommitHash === c.hash ? 'selected' : ''}`}
                style={{ height: ROW_H }}
                onClick={() => selectCommit(c.hash)}
              >
                <div className="graph-row-graphic" style={{ width: (Math.max(c.lane, 0) + 2) * LANE_W }} />
                <div className="graph-row-text">
                  {c.refs
                    .filter((r) => r.type !== 'head')
                    .map((r) => (
                      <RefBadge key={r.type + r.name} name={r.name} type={r.type} />
                    ))}
                  <span className="commit-subject">{c.subject}</span>
                  <span className="commit-meta">
                    {c.authorName} · {relativeTime(c.authorDate)} · {shortHash(c.hash)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        {commits.length === 0 && changeCount === 0 && <div className="empty-hint">No commits yet.</div>}
      </div>
    </div>
  )
}
