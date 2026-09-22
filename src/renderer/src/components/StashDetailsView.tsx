import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import DiffViewer from './DiffViewer'
import PanelResizer from './PanelResizer'
import { useResizableWidth } from '../hooks/useResizableWidth'

export default function StashDetailsView(): JSX.Element {
  const stashes = useAppStore((s) => s.stashes)
  const selectedStashRef = useAppStore((s) => s.selectedStashRef)
  const selectedStashDiff = useAppStore((s) => s.selectedStashDiff)
  const stashApply = useAppStore((s) => s.stashApply)
  const stashPop = useAppStore((s) => s.stashPop)
  const stashDrop = useAppStore((s) => s.stashDrop)

  const stash = stashes.find((s) => s.ref === selectedStashRef)
  const [activePath, setActivePath] = useState<string | null>(null)
  const resizeFileLists = useResizableWidth('--file-lists-width', 'gitdesk:fileListsWidth', 200, 600)

  useEffect(() => {
    setActivePath(selectedStashDiff && selectedStashDiff.length > 0 ? selectedStashDiff[0].path : null)
  }, [selectedStashDiff])

  if (!stash) return <div className="diff-empty">Select a stash to view details.</div>

  const activeDiff = selectedStashDiff?.find((d) => d.path === activePath) ?? null

  return (
    <div className="changes-view">
      <div className="commit-detail-header">
        <div className="commit-detail-subject">{stash.message}</div>
        <div className="commit-detail-meta">
          {stash.authorName} · {new Date(stash.date).toLocaleString()} · {stash.ref}
        </div>
        <div className="op-banner-actions" style={{ marginTop: 10 }}>
          <button className="toolbar-btn" onClick={() => stashApply(stash.ref)}>
            Apply
          </button>
          <button className="toolbar-btn" onClick={() => stashPop(stash.ref)}>
            Pop
          </button>
          <button
            className="toolbar-btn"
            onClick={() => {
              if (confirm(`Drop stash "${stash.message}"? This cannot be undone.`)) stashDrop(stash.ref)
            }}
          >
            Drop
          </button>
        </div>
      </div>

      <div className="changes-body">
        <div className="file-lists">
          <div className="file-list-section">
            <div className="file-list-header">Files changed ({selectedStashDiff?.length ?? 0})</div>
            {selectedStashDiff?.map((d) => (
              <div
                key={d.path}
                className={`file-row ${activePath === d.path ? 'selected' : ''}`}
                onClick={() => setActivePath(d.path)}
              >
                <span
                  className={`file-status-badge status-${d.isNew ? 'added' : d.isDeleted ? 'deleted' : d.isRenamed ? 'renamed' : 'modified'}`}
                >
                  {d.isNew ? 'A' : d.isDeleted ? 'D' : d.isRenamed ? 'R' : 'M'}
                </span>
                <span className="file-path">{d.path}</span>
              </div>
            ))}
          </div>
        </div>
        <PanelResizer onMouseDown={resizeFileLists} />
        <div className="diff-pane">
          <DiffViewer diff={activeDiff} />
        </div>
      </div>
    </div>
  )
}
