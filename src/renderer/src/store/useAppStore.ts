import { create } from 'zustand'
import type {
  AppSettings,
  FileDiff,
  GitBranch,
  GitCommit,
  GitRemote,
  GitTag,
  InteractiveRebaseState,
  ProviderRepo,
  RebaseTodoItem,
  StashEntry,
  WorkingStatus
} from '@shared/types'

type SelectedFile = { path: string; staged: boolean } | null

export interface PromptField {
  key: string
  label: string
  defaultValue?: string
  placeholder?: string
}

interface PromptRequest {
  title: string
  fields: PromptField[]
  confirmLabel?: string
  resolve: (values: Record<string, string> | null) => void
}

interface AppState {
  repoPath: string | null
  repoName: string | null

  status: WorkingStatus | null
  commits: GitCommit[]
  branches: GitBranch[]
  remotes: GitRemote[]

  selectedCommitHash: string | null
  selectedCommitDiff: FileDiff[] | null
  selectedFile: SelectedFile
  selectedFileDiff: FileDiff | null
  showingChanges: boolean

  stashes: StashEntry[]
  selectedStashRef: string | null
  selectedStashDiff: FileDiff[] | null

  tags: GitTag[]

  interactiveRebase: InteractiveRebaseState | null
  rebasePlanCommits: RebaseTodoItem[]
  rebasePlanOnto: string | null

  settings: AppSettings | null
  githubRepos: ProviderRepo[]
  gitlabRepos: ProviderRepo[]

  busy: boolean
  busyLabel: string | null
  error: string | null
  toast: string | null

  promptRequest: PromptRequest | null
  openPrompt: (title: string, fields: PromptField[], confirmLabel?: string) => Promise<Record<string, string> | null>
  resolvePrompt: (values: Record<string, string> | null) => void

  loadSettings: () => Promise<void>
  saveSettings: (s: AppSettings) => Promise<void>

  openRepo: (path: string) => Promise<void>
  cloneRepo: (url: string, destParentDir: string, dirName?: string) => Promise<void>
  initRepo: (path: string) => Promise<void>
  pickAndOpen: () => Promise<void>
  pickAndClone: (url: string) => Promise<void>
  closeRepo: () => void

  refreshAll: () => Promise<void>
  refreshStatus: () => Promise<void>
  refreshLog: () => Promise<void>
  refreshBranches: () => Promise<void>
  refreshRemotes: () => Promise<void>
  refreshStashes: () => Promise<void>
  refreshTags: () => Promise<void>
  refreshInteractiveRebase: () => Promise<void>

  selectCommit: (hash: string | null) => Promise<void>
  selectFile: (path: string | null, staged: boolean) => Promise<void>
  selectStash: (ref: string | null) => Promise<void>
  showChangesView: () => void

  stashSave: (message?: string, includeUntracked?: boolean) => Promise<void>
  stashApply: (ref: string) => Promise<void>
  stashPop: (ref: string) => Promise<void>
  stashDrop: (ref: string) => Promise<void>

  createTag: (name: string, target: string, message?: string) => Promise<void>
  deleteTag: (name: string) => Promise<void>
  pushTag: (remote: string, name: string) => Promise<void>
  deleteRemoteTag: (remote: string, name: string) => Promise<void>

  cherryPick: (hash: string) => Promise<void>
  cherryPickAbort: () => Promise<void>
  cherryPickContinue: () => Promise<void>

  openRebasePlanner: (ontoRef: string) => Promise<void>
  closeRebasePlanner: () => void
  setRebasePlanCommits: (items: RebaseTodoItem[]) => void
  startInteractiveRebase: () => Promise<void>
  continueInteractiveRebase: (rewordMessage?: string) => Promise<void>
  abortInteractiveRebase: () => Promise<void>

  stageFile: (path: string) => Promise<void>
  unstageFile: (path: string) => Promise<void>
  stageAll: () => Promise<void>
  unstageAll: () => Promise<void>
  discardFile: (path: string) => Promise<void>
  stageHunk: (path: string, patch: string) => Promise<void>
  unstageHunk: (path: string, patch: string) => Promise<void>

  commitChanges: (message: string, amend?: boolean) => Promise<void>

  checkoutBranch: (name: string) => Promise<void>
  createBranch: (name: string, startPoint?: string) => Promise<void>
  deleteBranch: (name: string, force?: boolean) => Promise<void>
  renameBranch: (oldName: string, newName: string) => Promise<void>

  fetchRemote: (remote?: string) => Promise<void>
  pull: () => Promise<void>
  push: (setUpstream?: boolean, force?: boolean) => Promise<void>

  addRemote: (name: string, url: string) => Promise<void>
  removeRemote: (name: string) => Promise<void>

  merge: (branch: string) => Promise<void>
  abortMerge: () => Promise<void>
  rebase: (branch: string) => Promise<void>
  continueRebase: () => Promise<void>
  abortRebase: () => Promise<void>

  resolveOurs: (path: string) => Promise<void>
  resolveTheirs: (path: string) => Promise<void>
  markResolved: (path: string) => Promise<void>

  loadGithubRepos: () => Promise<void>
  loadGitlabRepos: () => Promise<void>

  setError: (e: string | null) => void
  setToast: (t: string | null) => void
  runOp: (label: string, fn: () => Promise<{ ok: boolean; error?: string }>) => Promise<boolean>
}

export const useAppStore = create<AppState>((set, get) => ({
  repoPath: null,
  repoName: null,

  status: null,
  commits: [],
  branches: [],
  remotes: [],

  selectedCommitHash: null,
  selectedCommitDiff: null,
  selectedFile: null,
  selectedFileDiff: null,
  showingChanges: false,

  stashes: [],
  selectedStashRef: null,
  selectedStashDiff: null,

  tags: [],

  interactiveRebase: null,
  rebasePlanCommits: [],
  rebasePlanOnto: null,

  settings: null,
  githubRepos: [],
  gitlabRepos: [],

  busy: false,
  busyLabel: null,
  error: null,
  toast: null,

  promptRequest: null,
  openPrompt: (title, fields, confirmLabel) =>
    new Promise((resolve) => {
      set({ promptRequest: { title, fields, confirmLabel, resolve } })
    }),
  resolvePrompt: (values) => {
    const req = get().promptRequest
    set({ promptRequest: null })
    req?.resolve(values)
  },

  setError: (e) => set({ error: e }),
  setToast: (t) => set({ toast: t }),

  runOp: async (label, fn) => {
    set({ busy: true, busyLabel: label, error: null })
    try {
      const res = await fn()
      if (!res.ok) {
        set({ error: res.error ?? 'Operation failed' })
        return false
      }
      return true
    } catch (e) {
      set({ error: e instanceof Error ? e.message : String(e) })
      return false
    } finally {
      set({ busy: false, busyLabel: null })
    }
  },

  loadSettings: async () => {
    const settings = await window.gitApi.getSettings()
    set({ settings })
  },
  saveSettings: async (s) => {
    await window.gitApi.saveSettings(s)
    set({ settings: s })
  },

  openRepo: async (path) => {
    const res = await window.gitApi.openRepo(path)
    if (!res.ok || !res.repo) {
      set({ error: res.error ?? 'Could not open repository' })
      return
    }
    set({
      repoPath: res.repo.path,
      repoName: res.repo.name,
      selectedCommitHash: null,
      selectedCommitDiff: null,
      selectedFile: null,
      selectedFileDiff: null,
      showingChanges: true
    })
    await get().refreshAll()
  },

  cloneRepo: async (url, destParentDir, dirName) => {
    const ok = await get().runOp('Cloning repository…', () =>
      window.gitApi.cloneRepo({ url, destParentDir, dirName })
    )
    if (ok) {
      const settings = await window.gitApi.getSettings()
      set({ settings })
      const path = settings.recentRepos[0]
      if (path) await get().openRepo(path)
    }
  },

  initRepo: async (path) => {
    const ok = await get().runOp('Creating repository…', () => window.gitApi.initRepo(path))
    if (ok) await get().openRepo(path)
  },

  pickAndOpen: async () => {
    const dir = await window.gitApi.pickDirectory()
    if (dir) await get().openRepo(dir)
  },

  pickAndClone: async (url) => {
    const dir = await window.gitApi.pickDirectory()
    if (dir) await get().cloneRepo(url, dir)
  },

  closeRepo: () =>
    set({
      repoPath: null,
      repoName: null,
      status: null,
      commits: [],
      branches: [],
      remotes: [],
      stashes: [],
      tags: [],
      interactiveRebase: null
    }),

  refreshAll: async () => {
    await Promise.all([
      get().refreshStatus(),
      get().refreshLog(),
      get().refreshBranches(),
      get().refreshRemotes(),
      get().refreshStashes(),
      get().refreshTags(),
      get().refreshInteractiveRebase()
    ])
  },

  refreshStatus: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const status = await window.gitApi.getStatus(repoPath)
    set({ status })
  },

  refreshLog: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const commits = await window.gitApi.getLog(repoPath, { maxCount: 500 })
    set({ commits })
  },

  refreshBranches: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const branches = await window.gitApi.getBranches(repoPath)
    set({ branches })
  },

  refreshRemotes: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const remotes = await window.gitApi.getRemotes(repoPath)
    set({ remotes })
  },

  refreshStashes: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const stashes = await window.gitApi.getStashes(repoPath)
    set({ stashes })
  },

  refreshTags: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const tags = await window.gitApi.getTags(repoPath)
    set({ tags })
  },

  refreshInteractiveRebase: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const interactiveRebase = await window.gitApi.getInteractiveRebaseState(repoPath)
    set({ interactiveRebase })
  },

  selectCommit: async (hash) => {
    const { repoPath } = get()
    set({
      selectedCommitHash: hash,
      selectedFile: null,
      selectedFileDiff: null,
      selectedCommitDiff: null,
      showingChanges: false,
      selectedStashRef: null,
      selectedStashDiff: null
    })
    if (!repoPath || !hash) return
    const diff = await window.gitApi.getCommitDiff(repoPath, hash)
    set({ selectedCommitDiff: diff })
  },

  selectFile: async (path, staged) => {
    const { repoPath } = get()
    if (!path) {
      set({ selectedFile: null, selectedFileDiff: null })
      return
    }
    set({ selectedFile: { path, staged }, selectedCommitHash: null, selectedCommitDiff: null })
    if (!repoPath) return
    const diff = await window.gitApi.getFileDiff(repoPath, path, staged)
    set({ selectedFileDiff: diff })
  },

  selectStash: async (ref) => {
    const { repoPath } = get()
    set({
      selectedStashRef: ref,
      showingChanges: false,
      selectedCommitHash: null,
      selectedCommitDiff: null,
      selectedFile: null,
      selectedFileDiff: null,
      selectedStashDiff: null
    })
    if (!repoPath || !ref) return
    const diff = await window.gitApi.getStashDiff(repoPath, ref)
    set({ selectedStashDiff: diff })
  },

  showChangesView: () => {
    set({
      showingChanges: true,
      selectedCommitHash: null,
      selectedCommitDiff: null,
      selectedStashRef: null,
      selectedStashDiff: null
    })
  },

  stageFile: async (path) => {
    const { repoPath } = get()
    if (!repoPath) return
    await window.gitApi.stageFile(repoPath, path)
    await get().refreshStatus()
  },
  unstageFile: async (path) => {
    const { repoPath } = get()
    if (!repoPath) return
    await window.gitApi.unstageFile(repoPath, path)
    await get().refreshStatus()
  },
  stageAll: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    await window.gitApi.stageAll(repoPath)
    await get().refreshStatus()
  },
  unstageAll: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    await window.gitApi.unstageAll(repoPath)
    await get().refreshStatus()
  },
  discardFile: async (path) => {
    const { repoPath } = get()
    if (!repoPath) return
    await window.gitApi.discardFile(repoPath, path)
    await get().refreshStatus()
    if (get().selectedFile?.path === path) set({ selectedFile: null, selectedFileDiff: null })
  },
  stageHunk: async (path, patch) => {
    const { repoPath, selectedFile } = get()
    if (!repoPath) return
    const res = await window.gitApi.stageHunk(repoPath, path, patch)
    if (!res.ok) set({ error: res.error ?? 'Failed to stage hunk' })
    await get().refreshStatus()
    if (selectedFile) await get().selectFile(selectedFile.path, selectedFile.staged)
  },
  unstageHunk: async (path, patch) => {
    const { repoPath, selectedFile } = get()
    if (!repoPath) return
    const res = await window.gitApi.unstageHunk(repoPath, path, patch)
    if (!res.ok) set({ error: res.error ?? 'Failed to unstage hunk' })
    await get().refreshStatus()
    if (selectedFile) await get().selectFile(selectedFile.path, selectedFile.staged)
  },

  commitChanges: async (message, amend) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Committing…', () => window.gitApi.commit(repoPath, message, amend))
    if (ok) {
      set({ selectedFile: null, selectedFileDiff: null })
      await get().refreshAll()
    }
  },

  checkoutBranch: async (name) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp(`Checking out ${name}…`, () => window.gitApi.checkoutBranch(repoPath, name))
    if (ok) await get().refreshAll()
  },
  createBranch: async (name, startPoint) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp(`Creating branch ${name}…`, () =>
      window.gitApi.createBranch(repoPath, name, startPoint)
    )
    if (ok) await get().refreshAll()
  },
  deleteBranch: async (name, force) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp(`Deleting ${name}…`, () => window.gitApi.deleteBranch(repoPath, name, force))
    if (ok) await get().refreshBranches()
  },
  renameBranch: async (oldName, newName) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Renaming branch…', () => window.gitApi.renameBranch(repoPath, oldName, newName))
    if (ok) await get().refreshBranches()
  },

  fetchRemote: async (remote) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Fetching…', () => window.gitApi.fetch(repoPath, remote))
    if (ok) await get().refreshAll()
  },
  pull: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Pulling…', () => window.gitApi.pull(repoPath))
    if (ok) await get().refreshAll()
  },
  push: async (setUpstream, force) => {
    const { repoPath, status } = get()
    if (!repoPath) return
    const ok = await get().runOp('Pushing…', () =>
      window.gitApi.push(repoPath, undefined, status?.branch ?? undefined, setUpstream, force)
    )
    if (ok) await get().refreshAll()
  },

  addRemote: async (name, url) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Adding remote…', () => window.gitApi.addRemote(repoPath, name, url))
    if (ok) await get().refreshRemotes()
  },
  removeRemote: async (name) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Removing remote…', () => window.gitApi.removeRemote(repoPath, name))
    if (ok) await get().refreshRemotes()
  },

  merge: async (branch) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp(`Merging ${branch}…`, () => window.gitApi.merge(repoPath, branch))
    if (ok) await get().refreshAll()
    else await get().refreshAll()
  },
  abortMerge: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp('Aborting merge…', () => window.gitApi.abortMerge(repoPath))
    await get().refreshAll()
  },
  rebase: async (branch) => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp(`Rebasing onto ${branch}…`, () => window.gitApi.rebase(repoPath, branch))
    await get().refreshAll()
  },
  continueRebase: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp('Continuing rebase…', () => window.gitApi.continueRebase(repoPath))
    await get().refreshAll()
  },
  abortRebase: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp('Aborting rebase…', () => window.gitApi.abortRebase(repoPath))
    await get().refreshAll()
  },

  resolveOurs: async (path) => {
    const { repoPath } = get()
    if (!repoPath) return
    await window.gitApi.resolveConflictOurs(repoPath, path)
    await get().refreshStatus()
  },
  resolveTheirs: async (path) => {
    const { repoPath } = get()
    if (!repoPath) return
    await window.gitApi.resolveConflictTheirs(repoPath, path)
    await get().refreshStatus()
  },
  markResolved: async (path) => {
    const { repoPath } = get()
    if (!repoPath) return
    await window.gitApi.markResolved(repoPath, path)
    await get().refreshStatus()
  },

  stashSave: async (message, includeUntracked) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Stashing changes…', () =>
      window.gitApi.stashSave(repoPath, message, includeUntracked)
    )
    if (ok) {
      set({ selectedFile: null, selectedFileDiff: null })
      await Promise.all([get().refreshStatus(), get().refreshStashes()])
    }
  },
  stashApply: async (ref) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Applying stash…', () => window.gitApi.stashApply(repoPath, ref))
    if (ok) await get().refreshStatus()
  },
  stashPop: async (ref) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Popping stash…', () => window.gitApi.stashPop(repoPath, ref))
    if (ok) {
      if (get().selectedStashRef === ref) set({ selectedStashRef: null, selectedStashDiff: null })
      await Promise.all([get().refreshStatus(), get().refreshStashes()])
    }
  },
  stashDrop: async (ref) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp('Dropping stash…', () => window.gitApi.stashDrop(repoPath, ref))
    if (ok) {
      if (get().selectedStashRef === ref) set({ selectedStashRef: null, selectedStashDiff: null })
      await get().refreshStashes()
    }
  },

  createTag: async (name, target, message) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp(`Creating tag ${name}…`, () => window.gitApi.createTag(repoPath, name, target, message))
    if (ok) await get().refreshTags()
  },
  deleteTag: async (name) => {
    const { repoPath } = get()
    if (!repoPath) return
    const ok = await get().runOp(`Deleting tag ${name}…`, () => window.gitApi.deleteTag(repoPath, name))
    if (ok) await get().refreshTags()
  },
  pushTag: async (remote, name) => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp(`Pushing tag ${name}…`, () => window.gitApi.pushTag(repoPath, remote, name))
  },
  deleteRemoteTag: async (remote, name) => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp(`Deleting ${name} from ${remote}…`, () => window.gitApi.deleteRemoteTag(repoPath, remote, name))
  },

  cherryPick: async (hash) => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp('Cherry-picking…', () => window.gitApi.cherryPick(repoPath, hash))
    await get().refreshAll()
  },
  cherryPickAbort: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp('Aborting cherry-pick…', () => window.gitApi.cherryPickAbort(repoPath))
    await get().refreshAll()
  },
  cherryPickContinue: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp('Continuing cherry-pick…', () => window.gitApi.cherryPickContinue(repoPath))
    await get().refreshAll()
  },

  openRebasePlanner: async (ontoRef) => {
    const { repoPath } = get()
    if (!repoPath) return
    const commits = await window.gitApi.getCommitsForRebase(repoPath, ontoRef)
    set({ rebasePlanOnto: ontoRef, rebasePlanCommits: commits })
  },
  closeRebasePlanner: () => set({ rebasePlanOnto: null, rebasePlanCommits: [] }),
  setRebasePlanCommits: (items) => set({ rebasePlanCommits: items }),

  startInteractiveRebase: async () => {
    const { repoPath, rebasePlanOnto, rebasePlanCommits } = get()
    if (!repoPath || !rebasePlanOnto) return
    set({ rebasePlanOnto: null, rebasePlanCommits: [] })
    await get().runOp('Starting interactive rebase…', () =>
      window.gitApi.startInteractiveRebase(repoPath, rebasePlanOnto, rebasePlanCommits)
    )
    await get().refreshAll()
  },
  continueInteractiveRebase: async (rewordMessage) => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp('Continuing rebase…', () => window.gitApi.continueInteractiveRebase(repoPath, rewordMessage))
    await get().refreshAll()
  },
  abortInteractiveRebase: async () => {
    const { repoPath } = get()
    if (!repoPath) return
    await get().runOp('Aborting rebase…', () => window.gitApi.abortInteractiveRebase(repoPath))
    await get().refreshAll()
  },

  loadGithubRepos: async () => {
    const ok = await get().runOp('Loading GitHub repositories…', async () => {
      try {
        const repos = await window.gitApi.githubListRepos()
        set({ githubRepos: repos })
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    })
    void ok
  },
  loadGitlabRepos: async () => {
    const ok = await get().runOp('Loading GitLab repositories…', async () => {
      try {
        const repos = await window.gitApi.gitlabListRepos()
        set({ gitlabRepos: repos })
        return { ok: true }
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) }
      }
    })
    void ok
  }
}))
