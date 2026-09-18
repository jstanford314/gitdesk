import { git, gitAllowFail } from './exec'
import type { GitTag, OpResult } from '@shared/types'

const FS = '\x1f'

function ok(): OpResult {
  return { ok: true }
}

function fail(e: unknown): OpResult {
  return { ok: false, error: e instanceof Error ? e.message : String(e) }
}

export async function getTags(repoPath: string): Promise<GitTag[]> {
  const format = ['%(refname:short)', '%(objectname)', '%(*objectname)', '%(contents:subject)', '%(objecttype)'].join(
    FS
  )
  const res = await gitAllowFail(repoPath, 'for-each-ref', `--format=${format}`, '--sort=-creatordate', 'refs/tags')
  return res.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [name, objectname, derefObjectname, message, objecttype] = line.split(FS)
      const isAnnotated = objecttype === 'tag'
      return {
        name,
        targetHash: derefObjectname || objectname,
        message: isAnnotated ? message || null : null,
        isAnnotated
      }
    })
}

export async function createTag(repoPath: string, name: string, target: string, message?: string): Promise<OpResult> {
  try {
    if (message) await git(repoPath, 'tag', '-a', name, target, '-m', message)
    else await git(repoPath, 'tag', name, target)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function deleteTag(repoPath: string, name: string): Promise<OpResult> {
  try {
    await git(repoPath, 'tag', '-d', name)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function pushTag(repoPath: string, remote: string, name: string): Promise<OpResult> {
  try {
    await git(repoPath, 'push', remote, name)
    return ok()
  } catch (e) {
    return fail(e)
  }
}

export async function deleteRemoteTag(repoPath: string, remote: string, name: string): Promise<OpResult> {
  try {
    await git(repoPath, 'push', remote, '--delete', name)
    return ok()
  } catch (e) {
    return fail(e)
  }
}
