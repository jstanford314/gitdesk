import { mkdir } from 'node:fs/promises'
import { join, basename } from 'node:path'
import { existsSync } from 'node:fs'
import { git, runGit } from './exec'
import type { CloneOptions, OpResult, RepoSummary } from '@shared/types'

function ok(): OpResult {
  return { ok: true }
}

function fail(e: unknown): OpResult {
  return { ok: false, error: e instanceof Error ? e.message : String(e) }
}

export async function openRepo(path: string): Promise<OpResult & { repo?: RepoSummary }> {
  try {
    if (!existsSync(path)) return { ok: false, error: 'Path does not exist' }
    await git(path, 'rev-parse', '--is-inside-work-tree')
    return { ok: true, repo: { path, name: basename(path) } }
  } catch (e) {
    return fail(e)
  }
}

export async function initRepo(path: string): Promise<OpResult> {
  try {
    await mkdir(path, { recursive: true })
    await git(path, 'init')
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function cloneRepo(opts: CloneOptions): Promise<OpResult & { path?: string }> {
  try {
    const dirName = opts.dirName || opts.url.split('/').pop()?.replace(/\.git$/, '') || 'repository'
    const dest = join(opts.destParentDir, dirName)
    await mkdir(opts.destParentDir, { recursive: true })
    await git(opts.destParentDir, 'clone', opts.url, dest)
    return { ok: true, path: dest }
  } catch (e) {
    return fail(e)
  }
}

// --- Staging ---

export async function stageFile(repoPath: string, path: string): Promise<OpResult> {
  try {
    await git(repoPath, 'add', '--', path)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function unstageFile(repoPath: string, path: string): Promise<OpResult> {
  try {
    await git(repoPath, 'reset', 'HEAD', '--', path)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function stageAll(repoPath: string): Promise<OpResult> {
  try {
    await git(repoPath, 'add', '-A')
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function unstageAll(repoPath: string): Promise<OpResult> {
  try {
    await git(repoPath, 'reset', 'HEAD')
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function discardFile(repoPath: string, path: string): Promise<OpResult> {
  try {
    // Untracked files: checkout will fail, so remove directly via clean.
    await runGit(['clean', '-f', '--', path], { cwd: repoPath, allowFail: true })
    await runGit(['checkout', 'HEAD', '--', path], { cwd: repoPath, allowFail: true })
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function stageHunk(repoPath: string, _path: string, patch: string): Promise<OpResult> {
  try {
    await runGit(['apply', '--cached', '--whitespace=nowarn', '-'], { cwd: repoPath, input: patch })
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function unstageHunk(repoPath: string, _path: string, patch: string): Promise<OpResult> {
  try {
    await runGit(['apply', '--cached', '--reverse', '--whitespace=nowarn', '-'], { cwd: repoPath, input: patch })
    return ok()
  } catch (e) {
    return fail(e)
  }
}

// --- Commit ---

export async function commit(repoPath: string, message: string, amend = false): Promise<OpResult> {
  try {
    const args = ['commit', '-m', message]
    if (amend) args.push('--amend')
    await git(repoPath, ...args)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

// --- Branches ---

export async function checkoutBranch(repoPath: string, name: string): Promise<OpResult> {
  try {
    await git(repoPath, 'checkout', name)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function createBranch(repoPath: string, name: string, startPoint?: string): Promise<OpResult> {
  try {
    const args = ['checkout', '-b', name]
    if (startPoint) args.push(startPoint)
    await git(repoPath, ...args)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function deleteBranch(repoPath: string, name: string, force = false): Promise<OpResult> {
  try {
    await git(repoPath, 'branch', force ? '-D' : '-d', name)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function renameBranch(repoPath: string, oldName: string, newName: string): Promise<OpResult> {
  try {
    await git(repoPath, 'branch', '-m', oldName, newName)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

// --- Remote sync ---

export async function fetch(repoPath: string, remote = '--all'): Promise<OpResult> {
  try {
    if (remote === '--all') await git(repoPath, 'fetch', '--all', '--prune')
    else await git(repoPath, 'fetch', remote, '--prune')
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function pull(repoPath: string, remote?: string, branch?: string): Promise<OpResult> {
  try {
    const args = ['pull']
    if (remote) args.push(remote)
    if (branch) args.push(branch)
    await git(repoPath, ...args)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function push(
  repoPath: string,
  remote?: string,
  branch?: string,
  setUpstream = false,
  force = false
): Promise<OpResult> {
  try {
    const args = ['push']
    if (setUpstream) args.push('-u')
    if (force) args.push('--force-with-lease')
    if (remote) args.push(remote)
    if (branch) args.push(branch)
    await git(repoPath, ...args)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function addRemote(repoPath: string, name: string, url: string): Promise<OpResult> {
  try {
    await git(repoPath, 'remote', 'add', name, url)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function removeRemote(repoPath: string, name: string): Promise<OpResult> {
  try {
    await git(repoPath, 'remote', 'remove', name)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

// --- Merge / rebase ---

export async function merge(repoPath: string, branch: string): Promise<OpResult> {
  try {
    await git(repoPath, 'merge', '--no-edit', branch)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function abortMerge(repoPath: string): Promise<OpResult> {
  try {
    await git(repoPath, 'merge', '--abort')
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function rebase(repoPath: string, branch: string): Promise<OpResult> {
  try {
    await git(repoPath, 'rebase', branch)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function continueRebase(repoPath: string): Promise<OpResult> {
  try {
    await git(repoPath, '-c', 'core.editor=true', 'rebase', '--continue')
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function abortRebase(repoPath: string): Promise<OpResult> {
  try {
    await git(repoPath, 'rebase', '--abort')
    return ok()
  } catch (e) {
    return fail(e)
  }
}

// --- Conflict resolution ---

export async function resolveConflictOurs(repoPath: string, path: string): Promise<OpResult> {
  try {
    await git(repoPath, 'checkout', '--ours', '--', path)
    await git(repoPath, 'add', '--', path)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function resolveConflictTheirs(repoPath: string, path: string): Promise<OpResult> {
  try {
    await git(repoPath, 'checkout', '--theirs', '--', path)
    await git(repoPath, 'add', '--', path)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function markResolved(repoPath: string, path: string): Promise<OpResult> {
  try {
    await git(repoPath, 'add', '--', path)
    return ok()
  } catch (e) {
    return fail(e)
  }
}
