import { execFile } from 'node:child_process'

export interface GitExecOptions {
  cwd: string
  input?: string
  allowFail?: boolean // if true, resolve with stderr instead of throwing on non-zero exit
}

export interface GitExecResult {
  stdout: string
  stderr: string
  code: number
}

const MAX_BUFFER = 1024 * 1024 * 64

/**
 * Runs `git <args>` with argv passed as an array (never a shell string), so
 * paths/branch names/messages containing spaces or shell metacharacters are
 * safe by construction.
 */
export function runGit(args: string[], opts: GitExecOptions): Promise<GitExecResult> {
  return new Promise((resolve, reject) => {
    const child = execFile(
      'git',
      args,
      { cwd: opts.cwd, maxBuffer: MAX_BUFFER, encoding: 'utf8' },
      (error, stdout, stderr) => {
        const code = (error as NodeJS.ErrnoException & { code?: number })?.code
          ? Number((error as unknown as { code: number }).code)
          : 0
        if (error && !opts.allowFail) {
          const err = new Error(stderr?.trim() || error.message)
          ;(err as Error & { stdout?: string; stderr?: string }).stdout = stdout
          ;(err as Error & { stdout?: string; stderr?: string }).stderr = stderr
          reject(err)
          return
        }
        resolve({ stdout, stderr, code: error ? code || 1 : 0 })
      }
    )
    if (opts.input !== undefined) {
      child.stdin?.write(opts.input)
      child.stdin?.end()
    }
  })
}

export async function git(cwd: string, ...args: string[]): Promise<string> {
  const res = await runGit(args, { cwd })
  return res.stdout
}

export async function gitAllowFail(cwd: string, ...args: string[]): Promise<GitExecResult> {
  return runGit(args, { cwd, allowFail: true })
}
