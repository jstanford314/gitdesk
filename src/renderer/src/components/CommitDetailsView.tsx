import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import DiffViewer from './DiffViewer'
import { shortHash } from '../lib/format'

export default function CommitDetailsView(): JSX.Element {
  const commits = useAppStore((s) => s.commits)
  const selectedCommitHash = useAppStore((s) => s.selectedCommitHash)
  const selectedCommitDiff = useAppStore((s) => s.selectedCommitDiff)
  const status = useAppStore((s) => s.status)
  const cherryPick = useAppStore((s) => s.cherryPick)
  const createTag = useAppStore((s) => s.createTag)

  const commit = commits.find((c) => c.hash === selectedCommitHash)
  const [activePath, setActivePath] = useState<string | null>(null)

  useEffect(() => {
    setActivePath(selectedCommitDiff && selectedCommitDiff.length > 0 ? selectedCommitDiff[0].path : null)
  }, [selectedCommitDiff])

  if (!commit) return <div className="diff-empty">Select a commit to view details.</div>

  const activeDiff = selectedCommitDiff?.find((d) => d.path === activePath) ?? null

  return (
    <div className="changes-view">
      <div className="commit-detail-header">
        <div className="commit-detail-subject">{commit.subject}</div>
        {commit.body && <div className="commit-detail-body">{commit.body}</div>}
        <div className="commit-detail-meta">
          {commit.authorName} &lt;{commit.authorEmail}&gt; · {new Date(commit.authorDate).toLocaleString()}
        </div>
        <div className="commit-detail-meta">
          {shortHash(commit.hash)} {commit.parents.length > 1 ? '(merge)' : ''}
        </div>
        <div className="op-banner-actions" style={{ marginTop: 10 }}>
          <button
            className="toolbar-btn"
            onClick={() => cherryPick(commit.hash)}
            title={status?.branch ? `Apply this commit onto ${status.branch}` : 'Apply this commit onto the current branch'}
          >
            Cherry-pick
          </button>
          <button
            className="toolbar-btn"
            onClick={() => {
              const name = prompt('Tag name')
              if (!name) return
              const message = prompt('Annotation message (optional, leave blank for a lightweight tag)') ?? undefined
              createTag(name, commit.hash, message || undefined)
            }}
          >
            Tag this commit
          </button>
        </div>
      </div>

      <div className="changes-body">
        <div className="file-lists">
          <div className="file-list-section">
            <div className="file-list-header">Files changed ({selectedCommitDiff?.length ?? 0})</div>
            {selectedCommitDiff?.map((d) => (
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
        <div className="diff-pane">
          <DiffViewer diff={activeDiff} />
        </div>
      </div>
    </div>
  )
}
