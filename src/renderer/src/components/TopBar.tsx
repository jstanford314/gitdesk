import { useAppStore } from '../store/useAppStore'

export default function TopBar({ onOpenSettings, onSwitchRepo }: { onOpenSettings: () => void; onSwitchRepo: () => void }): JSX.Element {
  const repoName = useAppStore((s) => s.repoName)
  const status = useAppStore((s) => s.status)
  const busy = useAppStore((s) => s.busy)
  const busyLabel = useAppStore((s) => s.busyLabel)
  const fetchRemote = useAppStore((s) => s.fetchRemote)
  const pull = useAppStore((s) => s.pull)
  const push = useAppStore((s) => s.push)

  const hasUpstream = Boolean(status?.upstream)

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="repo-switcher" onClick={onSwitchRepo} title="Switch repository">
          <span className="repo-icon">⌂</span>
          <span>{repoName ?? 'No repository'}</span>
        </button>
        {status?.branch && (
          <span className="branch-pill">
            {status.branch}
            {hasUpstream && (status.ahead > 0 || status.behind > 0) && (
              <span className="ahead-behind">
                {status.ahead > 0 && <span className="ahead">↑{status.ahead}</span>}
                {status.behind > 0 && <span className="behind">↓{status.behind}</span>}
              </span>
            )}
          </span>
        )}
      </div>

      <div className="topbar-actions">
        <button className="toolbar-btn" onClick={() => fetchRemote()} disabled={busy}>
          Fetch
        </button>
        <button className="toolbar-btn" onClick={() => pull()} disabled={busy || !hasUpstream}>
          Pull
        </button>
        <button
          className="toolbar-btn primary"
          onClick={() => push(!hasUpstream)}
          disabled={busy}
          title={hasUpstream ? 'Push' : 'Push and set upstream'}
        >
          Push
        </button>
        {busy && <span className="busy-label">{busyLabel}</span>}
        <button className="icon-btn" title="Settings" onClick={onOpenSettings}>
          ⚙
        </button>
      </div>
    </div>
  )
}
