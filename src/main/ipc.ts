import { ipcMain, dialog, BrowserWindow } from 'electron'
import { getStatus } from './git/status'
import { getLog } from './git/log'
import { getBranches, getRemotes } from './git/branches'
import { getFileDiff, getCommitDiff } from './git/diff'
import * as ops from './git/ops'
import * as stash from './git/stash'
import { getSettings, saveSettings, addRecentRepo } from './settings'
import { githubListRepos, githubCloneUrlWithAuth } from './providers/github'
import { gitlabListRepos, gitlabCloneUrlWithAuth } from './providers/gitlab'
import type { AppSettings, CloneOptions } from '@shared/types'

function handle<Args extends unknown[], R>(channel: string, fn: (...args: Args) => Promise<R>): void {
  ipcMain.handle(channel, async (_event, ...args: Args) => fn(...args))
}

export function registerIpcHandlers(): void {
  handle('git:openRepo', async (path: string) => {
    const res = await ops.openRepo(path)
    if (res.ok) await addRecentRepo(path)
    return res
  })
  handle('git:initRepo', ops.initRepo)
  handle('git:cloneRepo', async (opts: CloneOptions) => {
    let url = opts.url
    try {
      if (/github\.com/i.test(url)) url = await githubCloneUrlWithAuth(url)
      else {
        const settings = await getSettings()
        if (settings.gitlab?.instanceUrl && url.startsWith(settings.gitlab.instanceUrl)) {
          url = await gitlabCloneUrlWithAuth(url)
        }
      }
    } catch {
      // fall back to unauthenticated URL
    }
    const res = await ops.cloneRepo({ ...opts, url })
    if (res.ok && res.path) await addRecentRepo(res.path)
    return res
  })
  handle('git:pickDirectory', async () => {
    const win = BrowserWindow.getFocusedWindow()
    const result = win
      ? await dialog.showOpenDialog(win, { properties: ['openDirectory', 'createDirectory'] })
      : await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  handle('git:getStatus', getStatus)
  handle('git:getLog', getLog)
  handle('git:getBranches', getBranches)
  handle('git:getRemotes', getRemotes)

  handle('git:getFileDiff', getFileDiff)
  handle('git:getCommitDiff', getCommitDiff)

  handle('git:stageFile', ops.stageFile)
  handle('git:unstageFile', ops.unstageFile)
  handle('git:stageAll', ops.stageAll)
  handle('git:unstageAll', ops.unstageAll)
  handle('git:discardFile', ops.discardFile)
  handle('git:stageHunk', ops.stageHunk)
  handle('git:unstageHunk', ops.unstageHunk)

  handle('git:commit', ops.commit)

  handle('git:checkoutBranch', ops.checkoutBranch)
  handle('git:createBranch', ops.createBranch)
  handle('git:deleteBranch', ops.deleteBranch)
  handle('git:renameBranch', ops.renameBranch)

  handle('git:fetch', ops.fetch)
  handle('git:pull', ops.pull)
  handle('git:push', ops.push)

  handle('git:addRemote', ops.addRemote)
  handle('git:removeRemote', ops.removeRemote)

  handle('git:merge', ops.merge)
  handle('git:abortMerge', ops.abortMerge)
  handle('git:rebase', ops.rebase)
  handle('git:continueRebase', ops.continueRebase)
  handle('git:abortRebase', ops.abortRebase)

  handle('git:resolveConflictOurs', ops.resolveConflictOurs)
  handle('git:resolveConflictTheirs', ops.resolveConflictTheirs)
  handle('git:markResolved', ops.markResolved)

  handle('git:getStashes', stash.getStashes)
  handle('git:getStashDiff', stash.getStashDiff)
  handle('git:stashSave', stash.stashSave)
  handle('git:stashApply', stash.stashApply)
  handle('git:stashPop', stash.stashPop)
  handle('git:stashDrop', stash.stashDrop)

  handle('git:getSettings', getSettings)
  handle('git:saveSettings', async (settings: AppSettings) => {
    await saveSettings(settings)
    return { ok: true }
  })

  handle('git:githubListRepos', githubListRepos)
  handle('git:gitlabListRepos', gitlabListRepos)
}
