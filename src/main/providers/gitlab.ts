import type { ProviderRepo } from '@shared/types'
import { getSettings } from '../settings'

interface GitLabProject {
  id: number
  name: string
  path_with_namespace: string
  http_url_to_repo: string
  ssh_url_to_repo: string
  visibility: string
  description: string | null
  web_url: string
}

export async function gitlabListRepos(): Promise<ProviderRepo[]> {
  const settings = await getSettings()
  if (!settings.gitlab?.token || !settings.gitlab?.instanceUrl) {
    throw new Error('GitLab is not connected. Add an instance URL and access token in Settings.')
  }
  const base = settings.gitlab.instanceUrl.replace(/\/+$/, '')
  const token = settings.gitlab.token

  const results: ProviderRepo[] = []
  let page = 1
  const perPage = 100
  for (;;) {
    const url = `${base}/api/v4/projects?membership=true&order_by=last_activity_at&per_page=${perPage}&page=${page}`
    const res = await fetch(url, { headers: { 'PRIVATE-TOKEN': token } })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`GitLab API error (${res.status}): ${body || res.statusText}`)
    }
    const projects = (await res.json()) as GitLabProject[]
    for (const p of projects) {
      results.push({
        provider: 'gitlab',
        id: p.id,
        name: p.name,
        fullName: p.path_with_namespace,
        cloneUrl: p.http_url_to_repo,
        sshUrl: p.ssh_url_to_repo,
        private: p.visibility !== 'public',
        description: p.description,
        webUrl: p.web_url
      })
    }
    if (projects.length < perPage) break
    page++
    if (page > 20) break // safety cap at 2000 projects
  }
  return results
}

export async function gitlabCloneUrlWithAuth(cloneUrl: string): Promise<string> {
  const settings = await getSettings()
  if (!settings.gitlab?.token) return cloneUrl
  try {
    const u = new URL(cloneUrl)
    u.username = 'oauth2'
    u.password = settings.gitlab.token
    return u.toString()
  } catch {
    return cloneUrl
  }
}
