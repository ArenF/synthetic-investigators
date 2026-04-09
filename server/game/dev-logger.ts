/**
 * Development logger — writes timestamped logs to console and logs/server.log
 * Color-coded by level: INFO (cyan), WARN (yellow), ERROR (red), AI (magenta)
 */

import { appendFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const LOGS_DIR = join(__dirname, '..', '..', 'logs')
const LOG_FILE = join(LOGS_DIR, 'server.log')

// ANSI colors for console
const C = {
  reset: '\x1b[0m',
  cyan:  '\x1b[36m',
  yellow:'\x1b[33m',
  red:   '\x1b[31m',
  magenta:'\x1b[35m',
  green: '\x1b[32m',
  gray:  '\x1b[90m',
  bold:  '\x1b[1m',
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').slice(0, 23)
}

function writeToFile(line: string): void {
  try {
    if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true })
    appendFileSync(LOG_FILE, line + '\n', 'utf-8')
  } catch { /* ignore file write errors */ }
}

function format(level: string, tag: string, msg: string, color: string): void {
  const ts = timestamp()
  const plain = `[${ts}] [${level}] [${tag}] ${msg}`
  const colored = `${C.gray}[${ts}]${C.reset} ${color}${C.bold}[${level}]${C.reset} ${C.cyan}[${tag}]${C.reset} ${msg}`
  console.log(colored)
  writeToFile(plain)
}

export const log = {
  info:  (tag: string, msg: string) => format('INFO ', tag, msg, C.cyan),
  warn:  (tag: string, msg: string) => format('WARN ', tag, msg, C.yellow),
  error: (tag: string, msg: string) => format('ERROR', tag, msg, C.red),
  ai:    (tag: string, msg: string) => format('AI   ', tag, msg, C.magenta),
  ok:    (tag: string, msg: string) => format('OK   ', tag, msg, C.green),
}

/** Check which API keys are present and log the results */
export function logApiKeyStatus(): void {
  const keys: Record<string, string> = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
    GOOGLE_API_KEY:    process.env.GOOGLE_API_KEY ?? '',
    OPENAI_API_KEY:    process.env.OPENAI_API_KEY ?? '',
    OLLAMA_HOST:       process.env.OLLAMA_HOST ?? 'http://localhost:11434 (default)',
  }

  log.info('STARTUP', '─── API Key Status ───────────────────')
  for (const [name, val] of Object.entries(keys)) {
    if (name === 'OLLAMA_HOST') {
      log.ok('STARTUP', `${name}: ${val}`)
    } else if (val) {
      const masked = val.slice(0, 8) + '...' + val.slice(-4)
      log.ok('STARTUP', `${name}: ${masked} ✓`)
    } else {
      log.warn('STARTUP', `${name}: (not set)`)
    }
  }
  log.info('STARTUP', '──────────────────────────────────────')
}

/** Test Ollama connection by listing models */
export async function testOllamaConnection(): Promise<void> {
  const host = process.env.OLLAMA_HOST ?? 'http://localhost:11434'
  try {
    const res = await fetch(`${host}/api/tags`, { signal: AbortSignal.timeout(3000) })
    if (res.ok) {
      const data = await res.json() as { models?: { name: string }[] }
      const models = data.models?.map(m => m.name).join(', ') ?? '(none)'
      log.ok('OLLAMA', `연결 성공 (${host}) — 사용 가능한 모델: ${models}`)
    } else {
      log.warn('OLLAMA', `응답 오류 ${res.status} (${host})`)
    }
  } catch (e: any) {
    log.warn('OLLAMA', `연결 실패 (${host}) — ${e.message}. ollama serve 가 실행 중인지 확인하세요.`)
  }
}
