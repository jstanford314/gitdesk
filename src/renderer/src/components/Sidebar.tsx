import { useMemo, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

function BranchRow({ name, isCurrent, isRemote }: { name: string; isCurrent: boolean; isRemote: boolean }): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const checkoutBranch = useAppStore((s) => s.checkoutBranch)
  const deleteBranch = useAppStore((s) => s.deleteBranch)
  const renameBranch = useAppStore((s) => s.renameBranch)
  const merge = useAppStore((s) => s.merge)
  const rebase = useAppStore((s) => s.rebase)
  const openRebasePlanner = useAppStore((s) => s.openRebasePlanner)
  const status = useAppStore((s) => s.status)
  const openPrompt = useAppStore((s) => s.openPrompt)

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
            {!isCurrent && status?.branch && (
              <button onClick={() => { openRebasePlanner(name); setMenuOpen(false) }}>
                Interactive rebase {status.branch} onto this…
              </button>
            )}
            {!isRemote && (
              <button
                onClick={async () => {
                  setMenuOpen(false)
                  const values = await openPrompt('Rename branch', [
                    { key: 'name', label: 'New branch name', defaultValue: name }
                  ])
                  if (values?.name && values.name !== name) renameBranch(name, values.name)
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

function StashRow({ stashRef, message }: { stashRef: string; message: string }): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const selectedStashRef = useAppStore((s) => s.selectedStashRef)
  const selectStash = useAppStore((s) => s.selectStash)
  const stashApply = useAppStore((s) => s.stashApply)
  const stashPop = useAppStore((s) => s.stashPop)
  const stashDrop = useAppStore((s) => s.stashDrop)

  return (
    <div className={`branch-row ${selectedStashRef === stashRef ? 'current' : ''}`}>
      <button className="branch-row-main" onClick={() => selectStash(stashRef)} title="View stash diff">
        <span className="branch-name">{message}</span>
        <span className="remote-url">{stashRef}</span>
      </button>
      <div className="branch-row-actions">
        <button className="icon-btn" onClick={() => setMenuOpen((v) => !v)} title="Actions">
          ⋯
        </button>
        {menuOpen && (
          <div className="dropdown" onMouseLeave={() => setMenuOpen(false)}>
            <button onClick={() => { stashApply(stashRef); setMenuOpen(false) }}>Apply</button>
            <button onClick={() => { stashPop(stashRef); setMenuOpen(false) }}>Pop (apply &amp; drop)</button>
            <button
              className="danger"
              onClick={() => {
                if (confirm(`Drop stash "${message}"? This cannot be undone.`)) stashDrop(stashRef)
                setMenuOpen(false)
              }}
            >
              Drop
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function TagRow({ name, targetHash }: { name: string; targetHash: string }): JSX.Element {
  const [menuOpen, setMenuOpen] = useState(false)
  const remotes = useAppStore((s) => s.remotes)
  const deleteTag = useAppStore((s) => s.deleteTag)
  const pushTag = useAppStore((s) => s.pushTag)
  const deleteRemoteTag = useAppStore((s) => s.deleteRemoteTag)

  return (
    <div className="branch-row">
      <button className="branch-row-main" title={targetHash}>
        <span className="branch-name">{name}</span>
        <span className="remote-url">{targetHash.slice(0, 7)}</span>
      </button>
      <div className="branch-row-actions">
        <button className="icon-btn" onClick={() => setMenuOpen((v) => !v)} title="Actions">
          ⋯
        </button>
        {menuOpen && (
          <div className="dropdown" onMouseLeave={() => setMenuOpen(false)}>
            {remotes.map((r) => (
              <button key={r.name} onClick={() => { pushTag(r.name, name); setMenuOpen(false) }}>
                Push to {r.name}
              </button>
            ))}
            {remotes.map((r) => (
              <button
                key={`del-${r.name}`}
                className="danger"
                onClick={() => {
                  if (confirm(`Delete tag "${name}" from ${r.name}?`)) deleteRemoteTag(r.name, name)
                  setMenuOpen(false)
                }}
              >
                Delete from {r.name}
              </button>
            ))}
            <button
              className="danger"
              onClick={() => {
                if (confirm(`Delete local tag "${name}"?`)) deleteTag(name)
                setMenuOpen(false)
              }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Sidebar(): JSX.Element {
  const branches = useAppStore((s) => s.branches)
  const remotes = useAppStore((s) => s.remotes)
  const stashes = useAppStore((s) => s.stashes)
  const tags = useAppStore((s) => s.tags)
  const createBranch = useAppStore((s) => s.createBranch)
  const fetchRemote = useAppStore((s) => s.fetchRemote)
  const addRemote = useAppStore((s) => s.addRemote)
  const removeRemote = useAppStore((s) => s.removeRemote)
  const stashSave = useAppStore((s) => s.stashSave)
  const createTag = useAppStore((s) => s.createTag)
  const openPrompt = useAppStore((s) => s.openPrompt)

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
            onClick={async () => {
              const values = await openPrompt('New branch', [{ key: 'name', label: 'Branch name' }])
              if (values?.name) createBranch(values.name)
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
          <span>STASHES</span>
          <button
            className="icon-btn"
            title="Stash current changes"
            onClick={async () => {
              const values = await openPrompt('Stash changes', [{ key: 'message', label: 'Stash message (optional)' }])
              if (values === null) return
              const includeUntracked = confirm('Include untracked files in the stash?')
              stashSave(values.message || undefined, includeUntracked)
            }}
          >
            +
          </button>
        </div>
        {stashes.length === 0 && <div className="empty-hint small">No stashes.</div>}
        {stashes.map((s) => (
          <StashRow key={s.ref} stashRef={s.ref} message={s.message} />
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>TAGS</span>
          <button
            className="icon-btn"
            title="Tag current commit (HEAD)"
            onClick={async () => {
              const values = await openPrompt('New tag', [
                { key: 'name', label: 'Tag name' },
                {
                  key: 'message',
                  label: 'Annotation message (optional, leave blank for a lightweight tag)'
                }
              ])
              if (!values?.name) return
              createTag(values.name, 'HEAD', values.message || undefined)
            }}
          >
            +
          </button>
        </div>
        {tags.length === 0 && <div className="empty-hint small">No tags.</div>}
        {tags.map((t) => (
          <TagRow key={t.name} name={t.name} targetHash={t.targetHash} />
        ))}
      </div>

      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <span>REMOTES</span>
          <button
            className="icon-btn"
            title="Add remote"
            onClick={async () => {
              const values = await openPrompt('Add remote', [
                { key: 'name', label: 'Remote name', defaultValue: 'origin' },
                { key: 'url', label: 'Remote URL' }
              ])
              if (values?.name && values.url) addRemote(values.name, values.url)
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
