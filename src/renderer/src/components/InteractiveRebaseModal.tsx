import { useAppStore } from '../store/useAppStore'
import Modal from './Modal'
import { shortHash } from '../lib/format'
import type { RebaseTodoAction, RebaseTodoItem } from '@shared/types'

const ACTIONS: RebaseTodoAction[] = ['pick', 'squash', 'fixup', 'reword', 'edit', 'drop']

export default function InteractiveRebaseModal(): JSX.Element | null {
  const rebasePlanOnto = useAppStore((s) => s.rebasePlanOnto)
  const rebasePlanCommits = useAppStore((s) => s.rebasePlanCommits)
  const closeRebasePlanner = useAppStore((s) => s.closeRebasePlanner)
  const setRebasePlanCommits = useAppStore((s) => s.setRebasePlanCommits)
  const startInteractiveRebase = useAppStore((s) => s.startInteractiveRebase)

  if (rebasePlanOnto === null) return null

  const updateItem = (index: number, patch: Partial<RebaseTodoItem>) => {
    const next = rebasePlanCommits.slice()
    next[index] = { ...next[index], ...patch }
    setRebasePlanCommits(next)
  }

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir
    if (target < 0 || target >= rebasePlanCommits.length) return
    const next = rebasePlanCommits.slice()
    ;[next[index], next[target]] = [next[target], next[index]]
    setRebasePlanCommits(next)
  }

  const firstSurviving = rebasePlanCommits.find((c) => c.action !== 'drop')
  const startBlockedReason =
    !firstSurviving
      ? 'Cannot drop every commit.'
      : firstSurviving.action === 'squash' || firstSurviving.action === 'fixup'
        ? `The first commit can't be ${firstSurviving.action} — there's nothing before it to combine into. Change it to pick.`
        : null

  return (
    <Modal title={`Interactive rebase onto ${rebasePlanOnto}`} onClose={closeRebasePlanner} wide>
      {rebasePlanCommits.length === 0 ? (
        <div className="empty-hint">No commits to rebase — you're already up to date with {rebasePlanOnto}.</div>
      ) : (
        <>
          <p className="hint" style={{ marginBottom: 10 }}>
            Order runs top to bottom (oldest first). <code>squash</code> and <code>fixup</code> combine a commit
            into the one above it — use them on a commit right after the one you want to merge it into.
          </p>
          <div className="rebase-plan-list">
            {rebasePlanCommits.map((item, i) => (
              <div className="rebase-plan-row" key={item.hash}>
                <div className="rebase-plan-reorder">
                  <button className="icon-btn" disabled={i === 0} onClick={() => move(i, -1)} title="Move up">
                    ↑
                  </button>
                  <button
                    className="icon-btn"
                    disabled={i === rebasePlanCommits.length - 1}
                    onClick={() => move(i, 1)}
                    title="Move down"
                  >
                    ↓
                  </button>
                </div>
                <select
                  className="rebase-plan-action"
                  value={item.action}
                  onChange={(e) => updateItem(i, { action: e.target.value as RebaseTodoAction })}
                >
                  {ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
                <span className="rebase-plan-hash">{shortHash(item.hash)}</span>
                <span className={`rebase-plan-subject ${item.action === 'drop' ? 'dropped' : ''}`}>
                  {item.subject}
                </span>
              </div>
            ))}
          </div>
          {startBlockedReason && <div className="error-banner" style={{ marginTop: 10 }}>{startBlockedReason}</div>}
          <button
            className="toolbar-btn primary full-width"
            disabled={!!startBlockedReason}
            onClick={startInteractiveRebase}
            style={{ marginTop: 14 }}
          >
            Start Rebase
          </button>
        </>
      )}
    </Modal>
  )
}
