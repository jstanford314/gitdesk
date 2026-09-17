import type { DiffHunk, FileDiff } from '@shared/types'

/** Builds a minimal valid unified-diff patch for a single hunk, suitable for `git apply --cached`. */
export function buildHunkPatch(diff: FileDiff, hunk: DiffHunk): string {
  const path = diff.path
  const origPath = diff.origPath ?? path
  const lines: string[] = []

  lines.push(`diff --git a/${origPath} b/${path}`)
  if (diff.isNew) lines.push('new file mode 100644')
  if (diff.isDeleted) lines.push('deleted file mode 100644')
  lines.push(diff.isNew ? '--- /dev/null' : `--- a/${origPath}`)
  lines.push(diff.isDeleted ? '+++ /dev/null' : `+++ b/${path}`)
  lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`)

  for (const l of hunk.lines) {
    const prefix = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '
    lines.push(prefix + l.content)
  }

  return lines.join('\n') + '\n'
}
