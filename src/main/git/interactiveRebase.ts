import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { git, gitAllowFail } from './exec'
import type { InteractiveRebaseState, OpResult, RebaseTodoAction, RebaseTodoItem } from '@shared/types'

const FS = '\x1f'
const RS = '\x1e'

function statePath(repoPath: string): string {
  return join(repoPath, '.git', 'gitdesk-interactive-rebase.json')
}

export function readRebaseState(repoPath: string): InteractiveRebaseState | null {
  const p = statePath(repoPath)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as InteractiveRebaseState
  } catch {
    return null
  }
}

function writeRebaseState(repoPath: string, state: InteractiveRebaseState): void {
  writeFileSync(statePath(repoPath), JSON.stringify(state, null, 2), 'utf8')
}

function clearRebaseState(repoPath: string): void {
  const p = statePath(repoPath)
  if (existsSync(p)) unlinkSync(p)
}

export async function getCommitsForRebase(repoPath: string, ontoRef: string): Promise<RebaseTodoItem[]> {
  const format = ['%H', '%s'].join(FS) + RS
  const raw = await git(repoPath, 'log', `--pretty=format:${format}`, '--reverse', `${ontoRef}..HEAD`)
  return raw
    .split(RS)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((rec) => {
      const [hash, subject] = rec.split(FS)
      return { hash, subject, action: 'pick' as RebaseTodoAction }
    })
}

/** After a cherry-pick lands (clean or via --continue), decide whether to pause for reword/edit or keep going. */
function pauseOrAdvance(
  state: InteractiveRebaseState,
  item: RebaseTodoItem
): { paused: boolean } {
  if (item.action === 'reword' || item.action === 'edit') {
    state.paused = true
    state.pauseReason = item.action
    return { paused: true }
  }
  state.currentIndex++
  return { paused: false }
}

async function finalize(repoPath: string, state: InteractiveRebaseState): Promise<OpResult> {
  const newTip = (await git(repoPath, 'rev-parse', 'HEAD')).trim()
  await git(repoPath, 'checkout', state.originalBranch)
  await git(repoPath, 'reset', '--hard', newTip)
  clearRebaseState(repoPath)
  return { ok: true }
}

async function runLoop(repoPath: string, state: InteractiveRebaseState): Promise<OpResult> {
  while (state.currentIndex < state.todo.length) {
    const item = state.todo[state.currentIndex]

    if (item.action === 'drop') {
      state.currentIndex++
      continue
    }

    if (item.action === 'squash' || item.action === 'fixup') {
      const res = await gitAllowFail(repoPath, 'cherry-pick', '--no-commit', item.hash)
      if (res.code !== 0) {
        state.paused = true
        state.pauseReason = 'conflict'
        writeRebaseState(repoPath, state)
        return { ok: false, error: 'Conflict applying this commit. Resolve the conflicted files, then continue.' }
      }
      if (item.action === 'squash') {
        const prevMsg = (await git(repoPath, 'log', '-1', '--format=%B', 'HEAD')).trim()
        await git(repoPath, 'commit', '--amend', '-m', `${prevMsg}\n\n${item.subject}`)
      } else {
        await git(repoPath, 'commit', '--amend', '--no-edit')
      }
      state.currentIndex++
      continue
    }

    // pick / reword / edit
    const res = await gitAllowFail(repoPath, 'cherry-pick', item.hash)
    if (res.code !== 0) {
      state.paused = true
      state.pauseReason = 'conflict'
      writeRebaseState(repoPath, state)
      return { ok: false, error: 'Conflict applying this commit. Resolve the conflicted files, then continue.' }
    }
    const { paused } = pauseOrAdvance(state, item)
    if (paused) {
      writeRebaseState(repoPath, state)
      return { ok: true }
    }
  }

  return finalize(repoPath, state)
}

export async function startInteractiveRebase(
  repoPath: string,
  ontoRef: string,
  todo: RebaseTodoItem[]
): Promise<OpResult> {
  try {
    const branch = (await git(repoPath, 'rev-parse', '--abbrev-ref', 'HEAD')).trim()
    if (branch === 'HEAD') {
      return { ok: false, error: 'Cannot start an interactive rebase from a detached HEAD.' }
    }
    await git(repoPath, 'checkout', '--detach', ontoRef)
    const state: InteractiveRebaseState = {
      originalBranch: branch,
      todo,
      currentIndex: 0,
      paused: false,
      pauseReason: null
    }
    writeRebaseState(repoPath, state)
    return await runLoop(repoPath, state)
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export async function continueInteractiveRebase(repoPath: string, rewordMessage?: string): Promise<OpResult> {
  const state = readRebaseState(repoPath)
  if (!state) return { ok: false, error: 'No interactive rebase in progress.' }
  const item = state.todo[state.currentIndex]

  if (state.pauseReason === 'conflict') {
    if (item.action === 'squash' || item.action === 'fixup') {
      // `cherry-pick --no-commit` conflicts leave no resumable sequencer state
      // (--continue errors "no cherry-pick in progress"); the conflicted files
      // are already staged by the user, so just finish the amend directly.
      if (item.action === 'squash') {
        const prevMsg = (await git(repoPath, 'log', '-1', '--format=%B', 'HEAD')).trim()
        await git(repoPath, 'commit', '--amend', '-m', `${prevMsg}\n\n${item.subject}`)
      } else {
        await git(repoPath, 'commit', '--amend', '--no-edit')
      }
      state.currentIndex++
    } else {
      const res = await gitAllowFail(repoPath, '-c', 'core.editor=true', 'cherry-pick', '--continue')
      if (res.code !== 0) return { ok: false, error: res.stderr || 'Failed to continue cherry-pick.' }
      const { paused } = pauseOrAdvance(state, item)
      if (paused) {
        writeRebaseState(repoPath, state)
        return { ok: true }
      }
    }
  } else if (state.pauseReason === 'reword') {
    if (!rewordMessage || !rewordMessage.trim()) {
      return { ok: false, error: 'A commit message is required to reword.' }
    }
    await git(repoPath, 'commit', '--amend', '-m', rewordMessage)
    state.currentIndex++
  } else if (state.pauseReason === 'edit') {
    state.currentIndex++
  } else {
    return { ok: false, error: 'Rebase is not currently paused.' }
  }

  state.paused = false
  state.pauseReason = null
  writeRebaseState(repoPath, state)
  return runLoop(repoPath, state)
}

export async function abortInteractiveRebase(repoPath: string): Promise<OpResult> {
  const state = readRebaseState(repoPath)
  if (!state) return { ok: false, error: 'No interactive rebase in progress.' }
  // `cherry-pick --abort` handles a real in-progress cherry-pick (pick/reword/
  // edit conflicts). It no-ops on a `--no-commit` squash/fixup conflict, which
  // has no resumable sequencer state, so also hard-reset the working tree back
  // to the last good commit before switching away.
  await gitAllowFail(repoPath, 'cherry-pick', '--abort')
  await gitAllowFail(repoPath, 'reset', '--hard', 'HEAD')
  await gitAllowFail(repoPath, 'checkout', state.originalBranch)
  clearRebaseState(repoPath)
  return { ok: true }
}
