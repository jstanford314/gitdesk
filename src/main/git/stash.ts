import { git, gitAllowFail } from './exec'
import { parseUnifiedDiff } from './diff'
import type { FileDiff, OpResult, StashEntry } from '@shared/types'

const RS = '\x1e'
const FS = '\x1f'

function ok(): OpResult {
  return { ok: true }
}

function fail(e: unknown): OpResult {
  return { ok: false, error: e instanceof Error ? e.message : String(e) }
}

export async function getStashes(repoPath: string): Promise<StashEntry[]> {
  const format = ['%gd', '%s', '%an', '%ai'].join(FS) + RS
  const res = await gitAllowFail(repoPath, 'stash', 'list', `--pretty=format:${format}`)
  const records = res.stdout
    .split(RS)
    .map((r) => r.trim())
    .filter(Boolean)
  return records.map((rec) => {
    const [ref, message, authorName, date] = rec.split(FS)
    return { ref, message, authorName, date }
  })
}

export async function getStashDiff(repoPath: string, ref: string): Promise<FileDiff[]> {
  let res = await gitAllowFail(repoPath, 'stash', 'show', '-p', '--include-untracked', ref)
  if (res.code !== 0) {
    res = await gitAllowFail(repoPath, 'stash', 'show', '-p', ref)
  }
  return parseUnifiedDiff(res.stdout)
}

export async function stashSave(repoPath: string, message?: string, includeUntracked = false): Promise<OpResult> {
  try {
    const args = ['stash', 'push']
    if (includeUntracked) args.push('--include-untracked')
    if (message) args.push('-m', message)
    await git(repoPath, ...args)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function stashApply(repoPath: string, ref: string): Promise<OpResult> {
  try {
    await git(repoPath, 'stash', 'apply', ref)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function stashPop(repoPath: string, ref: string): Promise<OpResult> {
  try {
    await git(repoPath, 'stash', 'pop', ref)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function stashDrop(repoPath: string, ref: string): Promise<OpResult> {
  try {
    await git(repoPath, 'stash', 'drop', ref)
    return ok()
  } catch (e) {
    return fail(e)
  }
}
