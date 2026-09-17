import type {
  AppSettings,
  CloneOptions,
  FileDiff,
  GitBranch,
  GitCommit,
  GitRemote,
  OpResult,
  ProviderRepo,
  RepoSummary,
  StashEntry,
  WorkingStatus
} from '@shared/types'

export interface GitApiClient {
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

  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<OpResult>

  githubListRepos(): Promise<ProviderRepo[]>
  gitlabListRepos(): Promise<ProviderRepo[]>
}

declare global {
  interface Window {
    gitApi: GitApiClient
  }
}

export {}
