import type { FileDiff } from '@shared/types'
import { buildHunkPatch } from '../lib/patch'
import { useAppStore } from '../store/useAppStore'

export default function DiffViewer({
  diff,
  editable
}: {
  diff: FileDiff | null
  editable?: 'staged' | 'unstaged'
}): JSX.Element {
  const stageHunk = useAppStore((s) => s.stageHunk)
  const unstageHunk = useAppStore((s) => s.unstageHunk)

  if (!diff) return <div className="diff-empty">Select a file to view its diff.</div>
  if (diff.binary) return <div className="diff-empty">Binary file not shown.</div>
  if (diff.hunks.length === 0) return <div className="diff-empty">No changes to display.</div>

  return (
    <div className="diff-viewer">
      {diff.hunks.map((hunk, hi) => (
        <div className="diff-hunk" key={hi}>
          <div className="diff-hunk-header">
            <span>{hunk.header}</span>
            {editable === 'unstaged' && (
              <button className="link-btn" onClick={() => stageHunk(diff.path, buildHunkPatch(diff, hunk))}>
                Stage hunk
              </button>
            )}
            {editable === 'staged' && (
              <button className="link-btn" onClick={() => unstageHunk(diff.path, buildHunkPatch(diff, hunk))}>
                Unstage hunk
              </button>
            )}
          </div>
          <table className="diff-table">
            <tbody>
              {hunk.lines.map((line, li) => (
                <tr key={li} className={`diff-line diff-${line.type}`}>
                  <td className="diff-lineno">{line.oldLine ?? ''}</td>
                  <td className="diff-lineno">{line.newLine ?? ''}</td>
                  <td className="diff-marker">{line.type === 'add' ? '+' : line.type === 'del' ? '-' : ''}</td>
                  <td className="diff-content">{line.content}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
