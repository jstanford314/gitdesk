import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

type Tab = 'recent' | 'github' | 'gitlab'

export default function WelcomeScreen({ onOpenSettings }: { onOpenSettings: () => void }): JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const githubRepos = useAppStore((s) => s.githubRepos)
  const gitlabRepos = useAppStore((s) => s.gitlabRepos)
  const loadGithubRepos = useAppStore((s) => s.loadGithubRepos)
  const loadGitlabRepos = useAppStore((s) => s.loadGitlabRepos)
  const openRepo = useAppStore((s) => s.openRepo)
  const pickAndOpen = useAppStore((s) => s.pickAndOpen)
  const pickAndClone = useAppStore((s) => s.pickAndClone)
  const initRepo = useAppStore((s) => s.initRepo)
  const error = useAppStore((s) => s.error)
  const busy = useAppStore((s) => s.busy)
  const busyLabel = useAppStore((s) => s.busyLabel)

  const [tab, setTab] = useState<Tab>('recent')

  useEffect(() => {
    if (tab === 'github' && settings?.github?.token) loadGithubRepos()
    if (tab === 'gitlab' && settings?.gitlab?.token) loadGitlabRepos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <h1>GitDesk</h1>
        <p className="welcome-sub">A fast, visual Git client — commit graph, staging, branching, and remotes.</p>

        <div className="welcome-actions">
          <button className="toolbar-btn primary" onClick={pickAndOpen}>
            Open Repository
          </button>
          <button
            className="toolbar-btn"
            onClick={() => {
              const url = prompt('Repository URL to clone')
              if (url) pickAndClone(url)
            }}
          >
            Clone Repository
          </button>
          <button
            className="toolbar-btn"
            onClick={async () => {
              const dir = await window.gitApi.pickDirectory()
              if (dir) initRepo(dir)
            }}
          >
            New Repository
          </button>
          <button className="toolbar-btn" onClick={onOpenSettings}>
            Settings
          </button>
        </div>

        {error && <div className="error-banner">{error}</div>}
        {busy && <div className="busy-label">{busyLabel}</div>}

        <div className="welcome-tabs">
          <button className={tab === 'recent' ? 'active' : ''} onClick={() => setTab('recent')}>
            Recent
          </button>
          <button className={tab === 'github' ? 'active' : ''} onClick={() => setTab('github')}>
            GitHub
          </button>
          <button className={tab === 'gitlab' ? 'active' : ''} onClick={() => setTab('gitlab')}>
            GitLab
          </button>
        </div>

        <div className="welcome-list">
          {tab === 'recent' &&
            (settings?.recentRepos?.length ? (
              settings.recentRepos.map((p) => (
                <button key={p} className="welcome-list-row" onClick={() => openRepo(p)}>
                  {p}
                </button>
              ))
            ) : (
              <div className="empty-hint">No recent repositories.</div>
            ))}

          {tab === 'github' &&
            (!settings?.github?.token ? (
              <div className="empty-hint">
                Connect GitHub in Settings to browse your repositories.
              </div>
            ) : githubRepos.length === 0 ? (
              <div className="empty-hint">No repositories found.</div>
            ) : (
              githubRepos.map((r) => (
                <button
                  key={r.id}
                  className="welcome-list-row"
                  onClick={() => pickAndClone(r.cloneUrl)}
                  title={r.description ?? ''}
                >
                  {r.fullName} {r.private && <span className="private-badge">private</span>}
                </button>
              ))
            ))}

          {tab === 'gitlab' &&
            (!settings?.gitlab?.token ? (
              <div className="empty-hint">
                Connect a GitLab instance in Settings to browse your projects.
              </div>
            ) : gitlabRepos.length === 0 ? (
              <div className="empty-hint">No projects found.</div>
            ) : (
              gitlabRepos.map((r) => (
                <button
                  key={r.id}
                  className="welcome-list-row"
                  onClick={() => pickAndClone(r.cloneUrl)}
                  title={r.description ?? ''}
                >
                  {r.fullName} {r.private && <span className="private-badge">private</span>}
                </button>
              ))
            ))}
        </div>
      </div>
    </div>
  )
}
