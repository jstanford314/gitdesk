import { git } from './exec'
import type { GitCommit, GitRef } from '@shared/types'

const RS = '\x1e' // record separator
const FS = '\x1f' // field separator

interface RawCommit {
  hash: string
  parents: string[]
  authorName: string
  authorEmail: string
  authorDate: string
  committerDate: string
  refsRaw: string
  subject: string
  body: string
}

function parseRefs(refsRaw: string, hash: string, headBranch: string | null): GitRef[] {
  if (!refsRaw.trim()) return []
  const refs: GitRef[] = []
  const parts = refsRaw.split(', ').map((s) => s.trim())
  for (const part of parts) {
    if (!part) continue
    if (part.startsWith('tag: ')) {
      refs.push({ name: part.slice('tag: '.length), type: 'tag' })
    } else if (part.includes(' -> ')) {
      const [, target] = part.split(' -> ')
      refs.push({ name: 'HEAD', type: 'head' })
      refs.push({ name: target, type: 'local-branch' })
    } else if (part === 'HEAD') {
      refs.push({ name: 'HEAD', type: 'head' })
    } else if (part.includes('/')) {
      refs.push({ name: part, type: 'remote-branch' })
    } else {
      refs.push({ name: part, type: 'local-branch' })
    }
  }
  void hash
  void headBranch
  return refs
}

function assignLanes(commits: RawCommit[]): Omit<GitCommit, 'refs'>[] {
  const lanes: (string | null)[] = []
  const result: Omit<GitCommit, 'refs'>[] = []

  for (const c of commits) {
    let lane = lanes.indexOf(c.hash)
    if (lane === -1) {
      lane = lanes.indexOf(null)
      if (lane === -1) {
        lane = lanes.length
        lanes.push(null)
      }
    }

    const parentLanes: { parentHash: string; lane: number }[] = []

    if (c.parents.length === 0) {
      lanes[lane] = null
    } else {
      lanes[lane] = c.parents[0]
      parentLanes.push({ parentHash: c.parents[0], lane })

      for (let i = 1; i < c.parents.length; i++) {
        const p = c.parents[i]
        let pLane = lanes.indexOf(p)
        if (pLane === -1) {
          pLane = lanes.indexOf(null)
          if (pLane === -1) {
            pLane = lanes.length
            lanes.push(null)
          }
          lanes[pLane] = p
        }
        parentLanes.push({ parentHash: p, lane: pLane })
      }
    }

    result.push({
      hash: c.hash,
      parents: c.parents,
      authorName: c.authorName,
      authorEmail: c.authorEmail,
      authorDate: c.authorDate,
      committerDate: c.committerDate,
      subject: c.subject,
      body: c.body,
      lane,
      parentLanes
    })
  }

  return result
}

export async function getLog(
  repoPath: string,
  opts: { maxCount?: number; branch?: string } = {}
): Promise<GitCommit[]> {
  const maxCount = opts.maxCount ?? 1000
  const format = ['%H', '%P', '%an', '%ae', '%aI', '%cI', '%D', '%s', '%b'].join(FS) + RS
  const args = [
    'log',
    `--max-count=${maxCount}`,
    '--date-order',
    `--pretty=format:${format}`
  ]
  if (opts.branch) {
    args.push(opts.branch)
  } else {
    args.push('--branches', '--tags', '--remotes', 'HEAD')
  }

  let headBranch: string | null = null
  try {
    const sym = await git(repoPath, 'symbolic-ref', '--short', 'HEAD')
    headBranch = sym.trim() || null
  } catch {
    headBranch = null
  }

  const raw = await git(repoPath, ...args)
  const records = raw.split(RS).map((r) => r.trim()).filter(Boolean)

  const rawCommits: RawCommit[] = records.map((rec) => {
    const [hash, parents, authorName, authorEmail, authorDate, committerDate, refsRaw, subject, ...bodyParts] =
      rec.split(FS)
    return {
      hash,
      parents: parents ? parents.split(' ').filter(Boolean) : [],
      authorName,
      authorEmail,
      authorDate,
      committerDate,
      refsRaw: refsRaw ?? '',
      subject: subject ?? '',
      body: bodyParts.join(FS) ?? ''
    }
  })

  const laned = assignLanes(rawCommits)

  return laned.map((c, i) => ({
    ...c,
    refs: parseRefs(rawCommits[i].refsRaw, c.hash, headBranch)
  }))
}
