import { Octokit } from '@octokit/rest'
import type { ProviderRepo } from '@shared/types'
import { getSettings } from '../settings'

export async function githubListRepos(): Promise<ProviderRepo[]> {
  const settings = await getSettings()
  if (!settings.github?.token) {
    throw new Error('GitHub is not connected. Add a personal access token in Settings.')
  }
  const octokit = new Octokit({ auth: settings.github.token })

  const repos = await octokit.paginate(octokit.repos.listForAuthenticatedUser, {
    per_page: 100,
    sort: 'updated',
    affiliation: 'owner,collaborator,organization_member'
  })

  return repos.map((r) => ({
    provider: 'github' as const,
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    cloneUrl: r.clone_url ?? '',
    sshUrl: r.ssh_url ?? '',
    private: Boolean(r.private),
    description: r.description ?? null,
    webUrl: r.html_url
  }))
}

export async function githubCloneUrlWithAuth(cloneUrl: string): Promise<string> {
  const settings = await getSettings()
  if (!settings.github?.token) return cloneUrl
  try {
    const u = new URL(cloneUrl)
    u.username = 'x-access-token'
    u.password = settings.github.token
    return u.toString()
  } catch {
    return cloneUrl
  }
}
