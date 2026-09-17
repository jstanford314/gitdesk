import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppSettings,
  CloneOptions
} from '@shared/types'

function invoke<R>(channel: string, ...args: unknown[]): Promise<R> {
  return ipcRenderer.invoke(channel, ...args)
}

const api = {
  openRepo: (path: string) => invoke('git:openRepo', path),
  cloneRepo: (opts: CloneOptions) => invoke('git:cloneRepo', opts),
  initRepo: (path: string) => invoke('git:initRepo', path),
  pickDirectory: () => invoke<string | null>('git:pickDirectory'),

  getStatus: (repoPath: string) => invoke('git:getStatus', repoPath),
  getLog: (repoPath: string, opts?: { maxCount?: number; branch?: string }) =>
    invoke('git:getLog', repoPath, opts),
  getBranches: (repoPath: string) => invoke('git:getBranches', repoPath),
  getRemotes: (repoPath: string) => invoke('git:getRemotes', repoPath),

  getFileDiff: (repoPath: string, path: string, staged: boolean) =>
    invoke('git:getFileDiff', repoPath, path, staged),
  getCommitDiff: (repoPath: string, hash: string) => invoke('git:getCommitDiff', repoPath, hash),

  stageFile: (repoPath: string, path: string) => invoke('git:stageFile', repoPath, path),
  unstageFile: (repoPath: string, path: string) => invoke('git:unstageFile', repoPath, path),
  stageAll: (repoPath: string) => invoke('git:stageAll', repoPath),
  unstageAll: (repoPath: string) => invoke('git:unstageAll', repoPath),
  discardFile: (repoPath: string, path: string) => invoke('git:discardFile', repoPath, path),
  stageHunk: (repoPath: string, path: string, patch: string) => invoke('git:stageHunk', repoPath, path, patch),
  unstageHunk: (repoPath: string, path: string, patch: string) =>
    invoke('git:unstageHunk', repoPath, path, patch),

  commit: (repoPath: string, message: string, amend?: boolean) => invoke('git:commit', repoPath, message, amend),

  checkoutBranch: (repoPath: string, name: string) => invoke('git:checkoutBranch', repoPath, name),
  createBranch: (repoPath: string, name: string, startPoint?: string) =>
    invoke('git:createBranch', repoPath, name, startPoint),
  deleteBranch: (repoPath: string, name: string, force?: boolean) =>
    invoke('git:deleteBranch', repoPath, name, force),
  renameBranch: (repoPath: string, oldName: string, newName: string) =>
    invoke('git:renameBranch', repoPath, oldName, newName),

  fetch: (repoPath: string, remote?: string) => invoke('git:fetch', repoPath, remote),
  pull: (repoPath: string, remote?: string, branch?: string) => invoke('git:pull', repoPath, remote, branch),
  push: (repoPath: string, remote?: string, branch?: string, setUpstream?: boolean, force?: boolean) =>
    invoke('git:push', repoPath, remote, branch, setUpstream, force),

  addRemote: (repoPath: string, name: string, url: string) => invoke('git:addRemote', repoPath, name, url),
  removeRemote: (repoPath: string, name: string) => invoke('git:removeRemote', repoPath, name),

  merge: (repoPath: string, branch: string) => invoke('git:merge', repoPath, branch),
  abortMerge: (repoPath: string) => invoke('git:abortMerge', repoPath),
  rebase: (repoPath: string, branch: string) => invoke('git:rebase', repoPath, branch),
  continueRebase: (repoPath: string) => invoke('git:continueRebase', repoPath),
  abortRebase: (repoPath: string) => invoke('git:abortRebase', repoPath),

  resolveConflictOurs: (repoPath: string, path: string) => invoke('git:resolveConflictOurs', repoPath, path),
  resolveConflictTheirs: (repoPath: string, path: string) => invoke('git:resolveConflictTheirs', repoPath, path),
  markResolved: (repoPath: string, path: string) => invoke('git:markResolved', repoPath, path),

  getSettings: () => invoke<AppSettings>('git:getSettings'),
  saveSettings: (settings: AppSettings) => invoke('git:saveSettings', settings),

  githubListRepos: () => invoke('git:githubListRepos'),
  gitlabListRepos: () => invoke('git:gitlabListRepos')
}

contextBridge.exposeInMainWorld('gitApi', api)

export type PreloadApi = typeof api
