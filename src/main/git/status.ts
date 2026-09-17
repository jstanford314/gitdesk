import { existsSync, readFileSync, statSync } from 'node:fs'
import { isAbsolute, join } from 'node:path'
import { git } from './exec'
import type { FileChangeType, FileStatusEntry, WorkingStatus } from '@shared/types'

function classify(indexCode: string, worktreeCode: string): { type: FileChangeType; staged: boolean } {
  if (indexCode === '?' || worktreeCode === '?') return { type: 'untracked', staged: false }
  if (indexCode === 'A' || worktreeCode === 'A') return { type: 'added', staged: indexCode === 'A' }
  if (indexCode === 'D' || worktreeCode === 'D') return { type: 'deleted', staged: indexCode === 'D' }
  if (indexCode === 'R' || worktreeCode === 'R') return { type: 'renamed', staged: indexCode === 'R' }
  if (indexCode === 'C' || worktreeCode === 'C') return { type: 'copied', staged: indexCode === 'C' }
  return { type: 'modified', staged: indexCode !== '.' && indexCode !== ' ' }
}

/**
 * Parses `git status --porcelain=v2 --branch` output, which gives
 * unambiguous machine-readable status including rename scores and
 * merge-conflict stage info.
 */
export function parsePorcelainV2(raw: string): WorkingStatus {
  const lines = raw.split('\n').filter((l) => l.length > 0)
  const status: WorkingStatus = {
    branch: null,
    upstream: null,
    ahead: 0,
    behind: 0,
    staged: [],
    unstaged: [],
    conflicted: [],
    inMerge: false,
    inRebase: false,
    inCherryPick: false
  }

  for (const line of lines) {
    if (line.startsWith('# branch.head ')) {
      const head = line.slice('# branch.head '.length)
      status.branch = head === '(detached)' ? null : head
    } else if (line.startsWith('# branch.upstream ')) {
      status.upstream = line.slice('# branch.upstream '.length)
    } else if (line.startsWith('# branch.ab ')) {
      const m = line.match(/\+(\d+) -(\d+)/)
      if (m) {
        status.ahead = Number(m[1])
        status.behind = Number(m[2])
      }
    } else if (line.startsWith('1 ')) {
      // ordinary changed entry: 1 XY sub mH mI mW hH hI <path>
      const parts = line.split(' ')
      const xy = parts[1]
      const path = parts.slice(8).join(' ')
      const [indexCode, worktreeCode] = xy.split('')
      const { type, staged } = classify(indexCode, worktreeCode)
      const entry: FileStatusEntry = { path, index: indexCode, worktree: worktreeCode, type, staged, conflicted: false }
      if (indexCode !== '.') status.staged.push(entry)
      if (worktreeCode !== '.') status.unstaged.push({ ...entry, staged: false })
    } else if (line.startsWith('2 ')) {
      // rename/copy: 2 XY sub mH mI mW hH hI X<score> <path>\t<origPath>
      const tabIdx = line.indexOf('\t')
      const head = tabIdx >= 0 ? line.slice(0, tabIdx) : line
      const origPath = tabIdx >= 0 ? line.slice(tabIdx + 1) : undefined
      const parts = head.split(' ')
      const xy = parts[1]
      const path = parts.slice(9).join(' ')
      const [indexCode, worktreeCode] = xy.split('')
      const { type, staged } = classify(indexCode, worktreeCode)
      const entry: FileStatusEntry = {
        path,
        origPath,
        index: indexCode,
        worktree: worktreeCode,
        type,
        staged,
        conflicted: false
      }
      if (indexCode !== '.') status.staged.push(entry)
      if (worktreeCode !== '.') status.unstaged.push({ ...entry, staged: false })
    } else if (line.startsWith('u ')) {
      // unmerged: u XY sub m1 m2 m3 mW h1 h2 h3 <path>
      const parts = line.split(' ')
      const path = parts.slice(10).join(' ')
      const xy = parts[1]
      status.conflicted.push({
        path,
        index: xy[0],
        worktree: xy[1],
        type: 'conflicted',
        staged: false,
        conflicted: true
      })
    } else if (line.startsWith('? ')) {
      const path = line.slice(2)
      status.unstaged.push({ path, index: '?', worktree: '?', type: 'untracked', staged: false, conflicted: false })
    }
  }

  return status
}

/**
 * Resolves the repo's .git directory without spawning `git rev-parse
 * --git-dir` in the common case, since getStatus runs very frequently
 * (every poll, every mutating action) and process spawns are relatively
 * expensive on Windows. Falls back to the git subprocess for worktrees,
 * submodules, or anything else that doesn't match the plain-directory case.
 */
async function resolveGitDir(repoPath: string): Promise<string> {
  const plain = join(repoPath, '.git')
  if (existsSync(plain)) {
    if (statSync(plain).isDirectory()) return plain
    // Worktree/submodule: .git is a file containing "gitdir: <path>"
    const contents = readFileSync(plain, 'utf8').trim()
    const match = contents.match(/^gitdir:\s*(.+)$/)
    if (match) return isAbsolute(match[1]) ? match[1] : join(repoPath, match[1])
  }
  const gitDir = (await git(repoPath, 'rev-parse', '--git-dir')).trim()
  return isAbsolute(gitDir) ? gitDir : join(repoPath, gitDir)
}

export async function getStatus(repoPath: string): Promise<WorkingStatus> {
  // --no-optional-locks avoids git status opportunistically refreshing/writing
  // the index, which can contend with other git processes touching this repo.
  const raw = await git(repoPath, '--no-optional-locks', 'status', '--porcelain=v2', '--branch')
  const status = parsePorcelainV2(raw)

  const abs = await resolveGitDir(repoPath)
  status.inMerge = existsSync(join(abs, 'MERGE_HEAD'))
  status.inRebase = existsSync(join(abs, 'rebase-merge')) || existsSync(join(abs, 'rebase-apply'))
  status.inCherryPick = existsSync(join(abs, 'CHERRY_PICK_HEAD'))

  return status
}
