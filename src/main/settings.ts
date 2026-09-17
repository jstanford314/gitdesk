import { app, safeStorage } from 'electron'
import { join } from 'node:path'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import type { AppSettings } from '@shared/types'

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json')
}

interface StoredSettings {
  githubTokenEnc?: string // base64 of encrypted buffer
  gitlabInstanceUrl?: string
  gitlabTokenEnc?: string
  recentRepos: string[]
}

function encrypt(plain: string): string {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(plain).toString('base64')
  }
  return Buffer.from(plain, 'utf8').toString('base64')
}

function decrypt(enc: string): string {
  const buf = Buffer.from(enc, 'base64')
  if (safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(buf)
    } catch {
      // fall through to treat as plain base64 (e.g. moved machines)
    }
  }
  return buf.toString('utf8')
}

async function readStored(): Promise<StoredSettings> {
  const p = settingsPath()
  if (!existsSync(p)) return { recentRepos: [] }
  try {
    const raw = await readFile(p, 'utf8')
    const parsed = JSON.parse(raw) as StoredSettings
    return { ...parsed, recentRepos: parsed.recentRepos ?? [] }
  } catch {
    return { recentRepos: [] }
  }
}

async function writeStored(s: StoredSettings): Promise<void> {
  const p = settingsPath()
  await mkdir(join(app.getPath('userData')), { recursive: true })
  await writeFile(p, JSON.stringify(s, null, 2), 'utf8')
}

export async function getSettings(): Promise<AppSettings> {
  const stored = await readStored()
  const settings: AppSettings = { recentRepos: stored.recentRepos ?? [] }
  if (stored.githubTokenEnc) {
    settings.github = { token: decrypt(stored.githubTokenEnc) }
  }
  if (stored.gitlabTokenEnc && stored.gitlabInstanceUrl) {
    settings.gitlab = { instanceUrl: stored.gitlabInstanceUrl, token: decrypt(stored.gitlabTokenEnc) }
  }
  return settings
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const stored: StoredSettings = { recentRepos: settings.recentRepos ?? [] }
  if (settings.github?.token) {
    stored.githubTokenEnc = encrypt(settings.github.token)
  }
  if (settings.gitlab?.token) {
    stored.gitlabTokenEnc = encrypt(settings.gitlab.token)
    stored.gitlabInstanceUrl = settings.gitlab.instanceUrl
  }
  await writeStored(stored)
}

export async function addRecentRepo(path: string): Promise<void> {
  const stored = await readStored()
  const recents = [path, ...(stored.recentRepos ?? []).filter((p) => p !== path)].slice(0, 10)
  stored.recentRepos = recents
  await writeStored(stored)
}
