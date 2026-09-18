// Shared type contracts between the Electron main process and the renderer UI.

export interface GitCommit {
  hash: string
  parents: string[]
  authorName: string
  authorEmail: string
  authorDate: string // ISO string
  committerDate: string
  subject: string
  body: string
  refs: GitRef[]
  lane: number
  parentLanes: { parentHash: string; lane: number }[]
}

export interface GitRef {
  name: string
  type: 'local-branch' | 'remote-branch' | 'tag' | 'head'
}

export interface GitBranch {
  name: string
  isCurrent: boolean
  isRemote: boolean
  upstream: string | null
  ahead: number
  behind: number
  tip: string
}

export interface GitRemote {
  name: string
  url: string
  pushUrl: string
}

export type FileChangeType = 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflicted'

export interface FileStatusEntry {
  path: string
  origPath?: string
  index: string // status code in the index (staged)
  worktree: string // status code in the working tree (unstaged)
  type: FileChangeType
  staged: boolean
  conflicted: boolean
}

export interface WorkingStatus {
  branch: string | null
  upstream: string | null
  ahead: number
  behind: number
  staged: FileStatusEntry[]
  unstaged: FileStatusEntry[]
  conflicted: FileStatusEntry[]
  inMerge: boolean
  inRebase: boolean
  inCherryPick: boolean
}

export interface DiffHunkLine {
  type: 'context' | 'add' | 'del'
  content: string
  oldLine: number | null
  newLine: number | null
}

export interface DiffHunk {
  header: string
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffHunkLine[]
}

export interface FileDiff {
  path: string
  origPath?: string
  binary: boolean
  hunks: DiffHunk[]
  isNew: boolean
  isDeleted: boolean
  isRenamed: boolean
}

export interface StashEntry {
  ref: string // e.g. "stash@{0}"
  message: string
  authorName: string
  date: string
}

export interface GitTag {
  name: string
  targetHash: string
  message: string | null
  isAnnotated: boolean
}

export type RebaseTodoAction = 'pick' | 'squash' | 'fixup' | 'reword' | 'edit' | 'drop'

export interface RebaseTodoItem {
  hash: string
  subject: string
  action: RebaseTodoAction
}

export interface InteractiveRebaseState {
  originalBranch: string
  todo: RebaseTodoItem[]
  currentIndex: number
  paused: boolean
  pauseReason: 'conflict' | 'reword' | 'edit' | null
}

export interface RepoSummary {
  path: string
  name: string
}

export interface OpResult {
  ok: boolean
  error?: string
}

export interface CloneOptions {
  url: string
  destParentDir: string
  dirName?: string
}

// --- Provider (GitHub / GitLab) types ---

export interface GitHubConfig {
  token: string
}

export interface GitLabConfig {
  instanceUrl: string
  token: string
}

export interface ProviderRepo {
  provider: 'github' | 'gitlab'
  id: string | number
  name: string
  fullName: string
  cloneUrl: string
  sshUrl: string
  private: boolean
  description: string | null
  webUrl: string
}

export interface AppSettings {
  github?: GitHubConfig
  gitlab?: GitLabConfig
  recentRepos: string[]
}

// --- IPC channel argument/return maps (for documentation / renderer typing) ---

export interface GitApi {
  openRepo(path: string): Promise<OpResult & { repo?: RepoSummary }>
  cloneRepo(opts: CloneOptions): Promise<OpResult & { path?: string }>
  initRepo(path: string): Promise<OpResult>
  pickDirectory(): Promise<string | null>

  getStatus(repoPath: string): Promise<WorkingStatus>
  getLog(repoPath: string, opts?: { maxCount?: number; branch?: string }): Promise<GitCommit[]>
  getBranches(repoPath: string): Promise<GitBranch[]>
  getRemotes(repoPath: string): Promise<GitRemote[]>

  getFileDiff(repoPath: string, path: string, staged: boolean): Promise<FileDiff>
  getCommitDiff(repoPath: string, hash: string): Promise<FileDiff[]>

  stageFile(repoPath: string, path: string): Promise<OpResult>
  unstageFile(repoPath: string, path: string): Promise<OpResult>
  stageAll(repoPath: string): Promise<OpResult>
  unstageAll(repoPath: string): Promise<OpResult>
  discardFile(repoPath: string, path: string): Promise<OpResult>
  stageHunk(repoPath: string, path: string, patch: string): Promise<OpResult>
  unstageHunk(repoPath: string, path: string, patch: string): Promise<OpResult>

  commit(repoPath: string, message: string, amend?: boolean): Promise<OpResult>

  checkoutBranch(repoPath: string, name: string): Promise<OpResult>
  createBranch(repoPath: string, name: string, startPoint?: string): Promise<OpResult>
  deleteBranch(repoPath: string, name: string, force?: boolean): Promise<OpResult>
  renameBranch(repoPath: string, oldName: string, newName: string): Promise<OpResult>

  fetch(repoPath: string, remote?: string): Promise<OpResult>
  pull(repoPath: string, remote?: string, branch?: string): Promise<OpResult>
  push(repoPath: string, remote?: string, branch?: string, setUpstream?: boolean, force?: boolean): Promise<OpResult>

  addRemote(repoPath: string, name: string, url: string): Promise<OpResult>
  removeRemote(repoPath: string, name: string): Promise<OpResult>

  merge(repoPath: string, branch: string): Promise<OpResult>
  abortMerge(repoPath: string): Promise<OpResult>
  rebase(repoPath: string, branch: string): Promise<OpResult>
  continueRebase(repoPath: string): Promise<OpResult>
  abortRebase(repoPath: string): Promise<OpResult>

  resolveConflictOurs(repoPath: string, path: string): Promise<OpResult>
  resolveConflictTheirs(repoPath: string, path: string): Promise<OpResult>
  markResolved(repoPath: string, path: string): Promise<OpResult>

  getStashes(repoPath: string): Promise<StashEntry[]>
  getStashDiff(repoPath: string, ref: string): Promise<FileDiff[]>
  stashSave(repoPath: string, message?: string, includeUntracked?: boolean): Promise<OpResult>
  stashApply(repoPath: string, ref: string): Promise<OpResult>
  stashPop(repoPath: string, ref: string): Promise<OpResult>
  stashDrop(repoPath: string, ref: string): Promise<OpResult>

  getTags(repoPath: string): Promise<GitTag[]>
  createTag(repoPath: string, name: string, target: string, message?: string): Promise<OpResult>
  deleteTag(repoPath: string, name: string): Promise<OpResult>
  pushTag(repoPath: string, remote: string, name: string): Promise<OpResult>
  deleteRemoteTag(repoPath: string, remote: string, name: string): Promise<OpResult>

  cherryPick(repoPath: string, hash: string): Promise<OpResult>
  cherryPickAbort(repoPath: string): Promise<OpResult>
  cherryPickContinue(repoPath: string): Promise<OpResult>

  getCommitsForRebase(repoPath: string, ontoRef: string): Promise<RebaseTodoItem[]>
  getInteractiveRebaseState(repoPath: string): Promise<InteractiveRebaseState | null>
  startInteractiveRebase(repoPath: string, ontoRef: string, todo: RebaseTodoItem[]): Promise<OpResult>
  continueInteractiveRebase(repoPath: string, rewordMessage?: string): Promise<OpResult>
  abortInteractiveRebase(repoPath: string): Promise<OpResult>

  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<OpResult>

  githubListRepos(): Promise<ProviderRepo[]>
  gitlabListRepos(): Promise<ProviderRepo[]>
}
