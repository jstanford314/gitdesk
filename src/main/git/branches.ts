import { git } from './exec'
import type { GitBranch, GitRemote } from '@shared/types'

export async function getBranches(repoPath: string): Promise<GitBranch[]> {
  const format = ['%(refname)', '%(HEAD)', '%(upstream:short)', '%(upstream:track)', '%(objectname)'].join('\x1f')
  const raw = await git(
    repoPath,
    'for-each-ref',
    `--format=${format}`,
    'refs/heads',
    'refs/remotes'
  )

  const branches: GitBranch[] = []
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue
    const [refname, head, upstream, track, tip] = line.split('\x1f')
    const isRemote = refname.startsWith('refs/remotes/')
    if (isRemote && refname.endsWith('/HEAD')) continue
    const name = isRemote ? refname.replace('refs/remotes/', '') : refname.replace('refs/heads/', '')

    let ahead = 0
    let behind = 0
    const aheadMatch = track.match(/ahead (\d+)/)
    const behindMatch = track.match(/behind (\d+)/)
    if (aheadMatch) ahead = Number(aheadMatch[1])
    if (behindMatch) behind = Number(behindMatch[1])

    branches.push({
      name,
      isCurrent: head === '*',
      isRemote,
      upstream: upstream || null,
      ahead,
      behind,
      tip
    })
  }
  return branches
}

export async function getRemotes(repoPath: string): Promise<GitRemote[]> {
  const raw = await git(repoPath, 'remote', '-v')
  const map = new Map<string, GitRemote>()
  for (const line of raw.split('\n')) {
    const m = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/)
    if (!m) continue
    const [, name, url, kind] = m
    const existing = map.get(name) ?? { name, url: '', pushUrl: '' }
    if (kind === 'fetch') existing.url = url
    else existing.pushUrl = url
    map.set(name, existing)
  }
  return Array.from(map.values())
}
