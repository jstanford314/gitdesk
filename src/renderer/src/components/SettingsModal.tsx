import { useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import Modal from './Modal'

export default function SettingsModal({ onClose }: { onClose: () => void }): JSX.Element {
  const settings = useAppStore((s) => s.settings)
  const saveSettings = useAppStore((s) => s.saveSettings)

  const [githubToken, setGithubToken] = useState(settings?.github?.token ?? '')
  const [gitlabUrl, setGitlabUrl] = useState(settings?.gitlab?.instanceUrl ?? '')
  const [gitlabToken, setGitlabToken] = useState(settings?.gitlab?.token ?? '')

  const save = async () => {
    await saveSettings({
      recentRepos: settings?.recentRepos ?? [],
      github: githubToken ? { token: githubToken } : undefined,
      gitlab: gitlabUrl && gitlabToken ? { instanceUrl: gitlabUrl, token: gitlabToken } : undefined
    })
    onClose()
  }

  return (
    <Modal title="Settings" onClose={onClose}>
      <div className="settings-section">
        <h3>GitHub</h3>
        <label>Personal access token</label>
        <input
          type="password"
          value={githubToken}
          onChange={(e) => setGithubToken(e.target.value)}
          placeholder="ghp_…"
        />
        <p className="hint">
          Generate one at github.com → Settings → Developer settings → Personal access tokens (needs
          <code>repo</code> scope).
        </p>
      </div>

      <div className="settings-section">
        <h3>GitLab (self-hosted or gitlab.com)</h3>
        <label>Instance URL</label>
        <input
          type="text"
          value={gitlabUrl}
          onChange={(e) => setGitlabUrl(e.target.value)}
          placeholder="https://gitlab.mycompany.com"
        />
        <label>Personal access token</label>
        <input
          type="password"
          value={gitlabToken}
          onChange={(e) => setGitlabToken(e.target.value)}
          placeholder="glpat-…"
        />
        <p className="hint">Create one under User Settings → Access Tokens (needs the <code>api</code> or <code>read_api</code> scope).</p>
      </div>

      <button className="toolbar-btn primary full-width" onClick={save}>
        Save
      </button>
    </Modal>
  )
}
