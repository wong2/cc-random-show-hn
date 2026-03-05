import fs from 'fs'
import os from 'os'
import path from 'path'

const CACHE_FILE = path.join(os.tmpdir(), 'hn-statusline-cache.json')

interface Story {
  id: number
  title: string
  url?: string
}

async function fetchJson(url: string): Promise<Story> {
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) })
  return res.json()
}

function readCache(cacheTtlMs: number): Story | null {
  try {
    const raw = fs.readFileSync(CACHE_FILE, 'utf8')
    const cache = JSON.parse(raw)
    if (Date.now() - cache.timestamp < cacheTtlMs) {
      return cache.story
    }
  } catch {
    // Cache missing or invalid
  }
  return null
}

function writeCache(story: Story): void {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify({ timestamp: Date.now(), story }), 'utf8')
  } catch {
    // Ignore write errors
  }
}

async function main() {
  const cacheIdx = process.argv.indexOf('--cache')
  const cacheTtl = cacheIdx !== -1 ? parseInt(process.argv[cacheIdx + 1], 10) : NaN
  const useCache = !isNaN(cacheTtl) && cacheTtl > 0

  try {
    let story: Story | null = null

    if (useCache) {
      story = readCache(cacheTtl * 1000)
    }

    if (!story) {
      story = await fetchJson('https://hn-api.wong2.workers.dev/random-show-hn')
      if (story && useCache) {
        writeCache(story)
      }
    }
    if (!story) return

    const hnUrl = `https://news.ycombinator.com/item?id=${story.id}`
    process.stdout.write(`\x1b]8;;${story.url || hnUrl}\x1b\\${story.title}\x1b]8;;\x1b\\\n`)
  } catch {
    // Network unavailable or any error - show nothing
  }
}

main()
