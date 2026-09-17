import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

function BranchRow({ name, isCurrent, isRemote }: { name: string; isCurrent: boolean; isRemote: boolean }): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const checkoutBranch = useAppStore((s) => s.checkoutBranch)
  const deleteBranch = useAppStore((s) => s.deleteBranch)
  const renameBranch = useAppStore((s) => s.renameBranch)
  const merge = useAppStore((s) => s.merge)
  const rebase = useAppStore((s) => s.rebase)
  const status = useAppStore((s) => s.status)

  const localCheckoutName = isRemote ? name.split('/').slice(1).join('/') : name

  return (
    <div className={`branch-row ${isCurrent ? 'current' : ''}`}>
      <button
        className="branch-row-main"
        onDoubleClick={() => !isCurrent && checkoutBranch(localCheckoutName)}
        title={isRemote ? 'Double-click to check out a local branch tracking this' : 'Double-click to check out'}
      >
        {isCurrent && <span className="current-dot" />}
        <span className="branch-name">{name}</span>
      </button>
      <div className="branch-row-actions">
        <button className="icon-btn" onClick={() => setMenuOpen((v) => !v)} title="Actions">
          ⋯
        </button>
        {menuOpen && (
          <div className="dropdown" onMouseLeave={() => setMenuOpen(false)}>
            {!isCurrent && (
              <button onClick={() => { checkoutBranch(localCheckoutName); setMenuOpen(false) }}>Checkout</button>
            )}
            {!isCurrent && !isRemote && status?.branch && (
              <button onClick={() => { merge(name); setMenuOpen(false) }}>Merge into {status.branch}</button>
            )}
            {!isCurrent && !isRemote && status?.branch && (
              <button onClick={() => { rebase(name); setMenuOpen(false) }}>Rebase {status.branch} onto this</button>
            )}
            {!isRemote && (
              <button
                onClick={() => {
                  const newName = prompt('New branch name', name)
                  if (newName && newName !== name) renameBranch(name, newName)
                  setMenuOpen(false)
                }}
              >
                Rename
              </button>
            )}
            {!isRemote && !isCurrent && (
              <button
                className="danger"
                onClick={() => {
                  if (confirm(`Delete branch "${name}"?`)) deleteBranch(name, true)
                  setMenuOpen(false)
                }}
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Sidebar(): JSX.Element {
  const branches = useAppStore((s) => s.branches)
  const remotes = useAppStore((s) => s.remotes)
  const createBranch = useAppStore((s) => s.createBranch)
  const fetchRemote = useAppStore((s) => s.fetchRemote)
  const addRemote = useAppStore((s) => s.addRemote)
  const removeRemote = useAppStore((s) => s.removeRemote)

  const local = useMemo(() => branches.filter((b) => !b.isRemote), [branches])
  const remoteBranches = useMemo(() => branches.filter((b) => b.isRemote), [branches])
  const remoteGroups = useMemo(() => {
    const groups = new Map<string, typeof remoteBranches>()
    for (const b of remoteBranches) {
      const [remoteName] = b.name.split('/')
      if (!groups.has(remoteName)) groups.set(remoteName, [])
      groups.get(remoteName)!.push(b)
    }
    return groups
  }, [remoteBranches])

  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>BRANCHES</span>
          <button
            className="icon-btn"
            title="New branch"
            onClick={() => {
              const name = prompt('New branch name')
              if (name) createBranch(name)
            }}
          >
            +
          </button>
        </div>
        {local.map((b) => (
          <BranchRow key={b.name} name={b.name} isCurrent={b.isCurrent} isRemote={false} />
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>REMOTES</span>
          <button
            className="icon-btn"
            title="Add remote"
            onClick={() => {
              const name = prompt('Remote name', 'origin')
              if (!name) return
              const url = prompt('Remote URL')
              if (url) addRemote(name, url)
            }}
          >
            +
          </button>
        </div>
        {remotes.map((r) => (
          <div key={r.name} className="remote-row">
            <button className="branch-row-main" onDoubleClick={() => fetchRemote(r.name)} title="Double-click to fetch">
              <span className="branch-name">{r.name}</span>
              <span className="remote-url">{r.url}</span>
            </button>
            <button className="icon-btn danger" title="Remove remote" onClick={() => removeRemote(r.name)}>
              ×
            </button>
          </div>
        ))}
        {Array.from(remoteGroups.entries()).map(([remoteName, list]) => (
          <div key={remoteName} className="remote-branch-group">
            {list.map((b) => (
              <BranchRow key={b.name} name={b.name} isCurrent={false} isRemote />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
