import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import DiffViewer from './DiffViewer'
import PanelResizer from './PanelResizer'
import { useResizableWidth } from '../hooks/useResizableWidth'
import type { FileStatusEntry } from '@shared/types'

function FileRow({
  entry,
  staged,
  onSelect,
  selected
}: {
  entry: FileStatusEntry
  staged: boolean
  onSelect: () => void
  selected: boolean
}): JSX.Element {
  const stageFile = useAppStore((s) => s.stageFile)
  const unstageFile = useAppStore((s) => s.unstageFile)
  const discardFile = useAppStore((s) => s.discardFile)

  return (
    <div className={`file-row ${selected ? 'selected' : ''}`} onClick={onSelect}>
      <span className={`file-status-badge status-${entry.type}`}>{entry.type[0].toUpperCase()}</span>
      <span className="file-path">{entry.path}</span>
      <span className="file-row-actions">
        {!staged && entry.type !== 'untracked' && (
          <button
            className="icon-btn"
            title="Discard changes"
            onClick={(e) => {
              e.stopPropagation()
              if (confirm(`Discard changes to ${entry.path}?`)) discardFile(entry.path)
            }}
          >
            ↺
          </button>
        )}
        {staged ? (
          <button
            className="icon-btn"
            title="Unstage"
            onClick={(e) => {
              e.stopPropagation()
              unstageFile(entry.path)
            }}
          >
            −
          </button>
        ) : (
          <button
            className="icon-btn"
            title="Stage"
            onClick={(e) => {
              e.stopPropagation()
              stageFile(entry.path)
            }}
          >
            +
          </button>
        )}
      </span>
    </div>
  )
}

function ConflictRow({ entry }: { entry: FileStatusEntry }): JSX.Element {
  const resolveOurs = useAppStore((s) => s.resolveOurs)
  const resolveTheirs = useAppStore((s) => s.resolveTheirs)
  const markResolved = useAppStore((s) => s.markResolved)
  return (
    <div className="file-row conflict-row">
      <span className="file-status-badge status-conflicted">!</span>
      <span className="file-path">{entry.path}</span>
      <span className="file-row-actions conflict-actions">
        <button className="link-btn" onClick={() => resolveOurs(entry.path)}>
          Ours
        </button>
        <button className="link-btn" onClick={() => resolveTheirs(entry.path)}>
          Theirs
        </button>
        <button className="link-btn" onClick={() => markResolved(entry.path)}>
          Mark resolved
        </button>
      </span>
    </div>
  )
}

export default function ChangesView(): JSX.Element {
  const status = useAppStore((s) => s.status)
  const selectedFile = useAppStore((s) => s.selectedFile)
  const selectedFileDiff = useAppStore((s) => s.selectedFileDiff)
  const selectFile = useAppStore((s) => s.selectFile)
  const stageAll = useAppStore((s) => s.stageAll)
  const unstageAll = useAppStore((s) => s.unstageAll)
  const commitChanges = useAppStore((s) => s.commitChanges)
  const abortMerge = useAppStore((s) => s.abortMerge)
  const abortRebase = useAppStore((s) => s.abortRebase)
  const continueRebase = useAppStore((s) => s.continueRebase)
  const cherryPickAbort = useAppStore((s) => s.cherryPickAbort)
  const cherryPickContinue = useAppStore((s) => s.cherryPickContinue)
  const interactiveRebase = useAppStore((s) => s.interactiveRebase)
  const continueInteractiveRebase = useAppStore((s) => s.continueInteractiveRebase)
  const abortInteractiveRebase = useAppStore((s) => s.abortInteractiveRebase)
  const stashSave = useAppStore((s) => s.stashSave)
  const openPrompt = useAppStore((s) => s.openPrompt)

  const [message, setMessage] = useState('')
  const [amend, setAmend] = useState(false)
  const [rewordMessage, setRewordMessage] = useState('')

  const resizeFileLists = useResizableWidth('--file-lists-width', 'gitdesk:fileListsWidth', 200, 600)

  if (!status) return <div className="diff-empty">Loading…</div>

  const hasConflicts = status.conflicted.length > 0

  return (
    <div className="changes-view">
      {interactiveRebase ? (
        <div className="op-banner op-banner-column">
          <div className="op-banner-row">
            <span className="rebase-progress">
              Interactive rebase — step {interactiveRebase.currentIndex + 1} of {interactiveRebase.todo.length}:{' '}
              {interactiveRebase.todo[interactiveRebase.currentIndex]?.action}{' '}
              {interactiveRebase.todo[interactiveRebase.currentIndex]?.subject}
              {interactiveRebase.pauseReason === 'conflict' &&
                (hasConflicts ? ' — resolve conflicts to continue.' : ' — ready to continue.')}
              {interactiveRebase.pauseReason === 'reword' && ' — enter a new commit message below.'}
              {interactiveRebase.pauseReason === 'edit' && ' — amend as needed, then continue.'}
            </span>
            <div className="op-banner-actions">
              {interactiveRebase.pauseReason !== 'conflict' || !hasConflicts ? (
                <button
                  className="toolbar-btn"
                  disabled={interactiveRebase.pauseReason === 'reword' && !rewordMessage.trim()}
                  onClick={() => {
                    continueInteractiveRebase(interactiveRebase.pauseReason === 'reword' ? rewordMessage : undefined)
                    setRewordMessage('')
                  }}
                >
                  Continue
                </button>
              ) : null}
              <button className="toolbar-btn" onClick={abortInteractiveRebase}>
                Abort
              </button>
            </div>
          </div>
          {interactiveRebase.pauseReason === 'reword' && (
            <input
              className="reword-input"
              placeholder="New commit message…"
              value={rewordMessage}
              onChange={(e) => setRewordMessage(e.target.value)}
              autoFocus
            />
          )}
        </div>
      ) : (
        (status.inMerge || status.inRebase || status.inCherryPick) && (
          <div className="op-banner">
            <span>
              {status.inMerge ? 'Merge in progress.' : status.inRebase ? 'Rebase in progress.' : 'Cherry-pick in progress.'}{' '}
              {hasConflicts ? 'Resolve conflicts to continue.' : 'Ready to continue.'}
            </span>
            <div className="op-banner-actions">
              {!hasConflicts && (status.inRebase || status.inCherryPick) && (
                <button className="toolbar-btn" onClick={status.inRebase ? continueRebase : cherryPickContinue}>
                  Continue
                </button>
              )}
              <button
                className="toolbar-btn"
                onClick={status.inMerge ? abortMerge : status.inRebase ? abortRebase : cherryPickAbort}
              >
                Abort
              </button>
            </div>
          </div>
        )
      )}

      <div className="changes-body">
        <div className="file-lists">
          {hasConflicts && (
            <div className="file-list-section">
              <div className="file-list-header">Conflicted ({status.conflicted.length})</div>
              {status.conflicted.map((f) => (
                <ConflictRow key={f.path} entry={f} />
              ))}
            </div>
          )}

          <div className="file-list-section">
            <div className="file-list-header">
              <span>Staged ({status.staged.length})</span>
              {status.staged.length > 0 && (
                <button className="link-btn" onClick={unstageAll}>
                  Unstage all
                </button>
              )}
            </div>
            {status.staged.map((f) => (
              <FileRow
                key={f.path}
                entry={f}
                staged
                selected={selectedFile?.path === f.path && selectedFile.staged}
                onSelect={() => selectFile(f.path, true)}
              />
            ))}
          </div>

          <div className="file-list-section">
            <div className="file-list-header">
              <span>Unstaged ({status.unstaged.length})</span>
              {status.unstaged.length > 0 && (
                <button className="link-btn" onClick={stageAll}>
                  Stage all
                </button>
              )}
            </div>
            {status.unstaged.map((f) => (
              <FileRow
                key={f.path}
                entry={f}
                staged={false}
                selected={selectedFile?.path === f.path && !selectedFile.staged}
                onSelect={() => selectFile(f.path, false)}
              />
            ))}
          </div>

          <div className="commit-composer">
            <textarea
              placeholder="Commit message…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
            <label className="amend-check">
              <input type="checkbox" checked={amend} onChange={(e) => setAmend(e.target.checked)} />
              Amend previous commit
            </label>
            <button
              className="toolbar-btn primary full-width"
              disabled={!message.trim() || status.staged.length === 0}
              onClick={() => {
                commitChanges(message, amend)
                setMessage('')
                setAmend(false)
              }}
            >
              Commit
            </button>
            <button
              className="toolbar-btn full-width"
              disabled={status.staged.length === 0 && status.unstaged.length === 0}
              onClick={async () => {
                const values = await openPrompt('Stash all changes', [
                  { key: 'message', label: 'Stash message (optional)' }
                ])
                if (values === null) return
                const includeUntracked = confirm('Include untracked files in the stash?')
                stashSave(values.message || undefined, includeUntracked)
              }}
            >
              Stash all changes
            </button>
          </div>
        </div>

        <PanelResizer onMouseDown={resizeFileLists} />

        <div className="diff-pane">
          <DiffViewer diff={selectedFileDiff} editable={selectedFile ? (selectedFile.staged ? 'staged' : 'unstaged') : undefined} />
        </div>
      </div>
    </div>
  )
}
