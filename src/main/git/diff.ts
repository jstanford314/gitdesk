import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { git, gitAllowFail } from './exec'
import type { DiffHunk, DiffHunkLine, FileDiff } from '@shared/types'

function parseHunks(diffBody: string): DiffHunk[] {
  const hunks: DiffHunk[] = []
  const lines = diffBody.split('\n')
  let current: DiffHunk | null = null
  let oldLine = 0
  let newLine = 0

  for (const line of lines) {
    const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/)
    if (hunkMatch) {
      if (current) hunks.push(current)
      const oldStart = Number(hunkMatch[1])
      const newStart = Number(hunkMatch[3])
      current = {
        header: line,
        oldStart,
        oldLines: hunkMatch[2] !== undefined ? Number(hunkMatch[2]) : 1,
        newStart,
        newLines: hunkMatch[4] !== undefined ? Number(hunkMatch[4]) : 1,
        lines: []
      }
      oldLine = oldStart
      newLine = newStart
      continue
    }
    if (!current) continue
    if (line.startsWith('\\ No newline')) continue

    if (line.startsWith('+')) {
      const l: DiffHunkLine = { type: 'add', content: line.slice(1), oldLine: null, newLine }
      current.lines.push(l)
      newLine++
    } else if (line.startsWith('-')) {
      const l: DiffHunkLine = { type: 'del', content: line.slice(1), oldLine, newLine: null }
      current.lines.push(l)
      oldLine++
    } else {
      const content = line.startsWith(' ') ? line.slice(1) : line
      const l: DiffHunkLine = { type: 'context', content, oldLine, newLine }
      current.lines.push(l)
      oldLine++
      newLine++
    }
  }
  if (current) hunks.push(current)
  return hunks
}

function parseUnifiedDiff(raw: string): FileDiff[] {
  if (!raw.trim()) return []
  const fileSections = raw.split(/^diff --git /m).filter(Boolean)
  const results: FileDiff[] = []

  for (const section of fileSections) {
    const full = 'diff --git ' + section
    const headerLine = full.split('\n')[0]
    const pathMatch = headerLine.match(/^diff --git a\/(.+?) b\/(.+)$/)
    let path = pathMatch ? pathMatch[2] : 'unknown'
    let origPath: string | undefined
    const isNew = /\nnew file mode/.test(full)
    const isDeleted = /\ndeleted file mode/.test(full)
    const renameFrom = full.match(/\nrename from (.+)/)
    const renameTo = full.match(/\nrename to (.+)/)
    const isRenamed = Boolean(renameFrom && renameTo)
    if (isRenamed) {
      origPath = renameFrom![1]
      path = renameTo![1]
    } else if (pathMatch) {
      origPath = pathMatch[1] !== pathMatch[2] ? pathMatch[1] : undefined
    }
    const binary = /\nBinary files /.test(full) || /\nGIT binary patch/.test(full)

    const hunkStart = full.indexOf('\n@@')
    const hunks = binary || hunkStart === -1 ? [] : parseHunks(full.slice(hunkStart + 1))

    results.push({ path, origPath, binary, hunks, isNew, isDeleted, isRenamed })
  }

  return results
}

export async function getFileDiff(repoPath: string, path: string, staged: boolean): Promise<FileDiff> {
  // Untracked files have no diff against HEAD/index; synthesize an all-added diff.
  const statusRes = await gitAllowFail(repoPath, 'status', '--porcelain=v2', '--', path)
  const isUntracked = statusRes.stdout.split('\n').some((l) => l.startsWith('? '))

  if (isUntracked && !staged) {
    let content: string
    try {
      content = await readFile(join(repoPath, path), 'utf8')
    } catch {
      return { path, binary: true, hunks: [], isNew: true, isDeleted: false, isRenamed: false }
    }
    const lines = content.split('\n')
    if (lines[lines.length - 1] === '') lines.pop()
    const hunk: DiffHunk = {
      header: `@@ -0,0 +1,${lines.length} @@`,
      oldStart: 0,
      oldLines: 0,
      newStart: 1,
      newLines: lines.length,
      lines: lines.map((content, i) => ({ type: 'add', content, oldLine: null, newLine: i + 1 }))
    }
    return { path, binary: false, hunks: [hunk], isNew: true, isDeleted: false, isRenamed: false }
  }

  const args = ['diff', '--no-color', '-U3']
  if (staged) args.push('--cached')
  args.push('--', path)
  const raw = await git(repoPath, ...args)
  const files = parseUnifiedDiff(raw)
  return (
    files[0] ?? { path, binary: false, hunks: [], isNew: false, isDeleted: false, isRenamed: false }
  )
}

export async function getCommitDiff(repoPath: string, hash: string): Promise<FileDiff[]> {
  const parents = await git(repoPath, 'rev-list', '--parents', '-n', '1', hash)
  const parts = parents.trim().split(' ')
  let raw: string
  if (parts.length <= 1) {
    // root commit
    raw = await git(repoPath, 'show', '--no-color', '-U3', '--root', '--pretty=format:', hash)
  } else {
    raw = await git(repoPath, 'diff', '--no-color', '-U3', `${parts[1]}`, hash)
  }
  return parseUnifiedDiff(raw)
}

export { parseUnifiedDiff, parseHunks }
