import { useEffect, useState } from 'react'
import { useAppStore } from './store/useAppStore'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import GraphPanel from './components/GraphPanel'
import ChangesView from './components/ChangesView'
import CommitDetailsView from './components/CommitDetailsView'
import StashDetailsView from './components/StashDetailsView'
import WelcomeScreen from './components/WelcomeScreen'
import SettingsModal from './components/SettingsModal'
import InteractiveRebaseModal from './components/InteractiveRebaseModal'
import PromptModal from './components/PromptModal'

export default function App(): JSX.Element {
  const repoPath = useAppStore((s) => s.repoPath)
  const showingChanges = useAppStore((s) => s.showingChanges)
  const selectedStashRef = useAppStore((s) => s.selectedStashRef)
  const loadSettings = useAppStore((s) => s.loadSettings)
  const closeRepo = useAppStore((s) => s.closeRepo)
  const error = useAppStore((s) => s.error)
  const setError = useAppStore((s) => s.setError)
  const refreshStatus = useAppStore((s) => s.refreshStatus)
  const pickAndOpen = useAppStore((s) => s.pickAndOpen)
  const pickAndClone = useAppStore((s) => s.pickAndClone)
  const initRepo = useAppStore((s) => s.initRepo)
  const openPrompt = useAppStore((s) => s.openPrompt)

  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    loadSettings()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const unsubscribe = window.gitApi.onMenuAction(async (action) => {
      switch (action) {
        case 'open-repo':
          await pickAndOpen()
          break
        case 'clone-repo': {
          const values = await openPrompt('Clone Repository', [
            { key: 'url', label: 'Repository URL', placeholder: 'https://github.com/user/repo.git' }
          ])
          if (values?.url) await pickAndClone(values.url)
          break
        }
        case 'init-repo': {
          const dir = await window.gitApi.pickDirectory()
          if (dir) await initRepo(dir)
          break
        }
        case 'close-repo':
          closeRepo()
          break
        case 'preferences':
          setSettingsOpen(true)
          break
      }
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!repoPath) return
    // Purely a safety net for changes made outside the app (a terminal, another
    // tool); every in-app action already triggers its own explicit refresh, so
    // this can be infrequent without hurting responsiveness to your own actions.
    const id = setInterval(() => refreshStatus(), 10000)
    return () => clearInterval(id)
  }, [repoPath, refreshStatus])

  if (!repoPath) {
    return (
      <>
        <WelcomeScreen onOpenSettings={() => setSettingsOpen(true)} />
        {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
        <PromptModal />
      </>
    )
  }

  return (
    <div className="app-shell">
      <TopBar onOpenSettings={() => setSettingsOpen(true)} onSwitchRepo={closeRepo} />
      {error && (
        <div className="error-banner dismissible">
          {error}
          <button className="icon-btn" onClick={() => setError(null)}>
            ×
          </button>
        </div>
      )}
      <div className="app-body">
        <Sidebar />
        <GraphPanel />
        <div className="detail-pane">
          {selectedStashRef ? <StashDetailsView /> : showingChanges ? <ChangesView /> : <CommitDetailsView />}
        </div>
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <InteractiveRebaseModal />
      <PromptModal />
    </div>
  )
}
