import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"

export interface RegistryBrickEntry {
  description: string
  latest: string
  free: boolean
  versions: string[]
  requires?: string[]
}

export interface Registry {
  version: string
  bricks: Record<string, RegistryBrickEntry>
}

// ─── Local registry ───────────────────────────────────────────────────────────

function readLocalRegistry(registryPath: string): Registry {
  const indexPath = resolve(registryPath, "registry.json")
  if (!existsSync(indexPath)) throw new Error(`Registry not found at ${registryPath}`)
  return JSON.parse(readFileSync(indexPath, "utf-8")) as Registry
}

function copyLocalBrick(registryPath: string, brickName: string, version: string, destDir: string): void {
  const srcPath = resolve(registryPath, "bricks", brickName, version)
  if (!existsSync(srcPath)) throw new Error(`Brick ${brickName}@${version} not found in registry`)
  cpSync(srcPath, destDir, { recursive: true })
}

// ─── Remote registry (GitHub raw) ────────────────────────────────────────────

function rawUrlToApiBase(rawUrl: string): { apiBase: string; branch: string } {
  // https://raw.githubusercontent.com/skafform/skafform-registry/main
  // → apiBase: https://api.github.com/repos/skafform/skafform-registry
  // → branch: main
  const url = new URL(rawUrl)
  const parts = url.pathname.replace(/^\//, "").split("/")
  const owner = parts[0]
  const repo = parts[1]
  const branch = parts[2] ?? "main"
  return {
    apiBase: `https://api.github.com/repos/${owner}/${repo}`,
    branch,
  }
}

async function fetchRemoteRegistry(rawUrl: string): Promise<Registry> {
  const res = await fetch(`${rawUrl}/registry.json`)
  if (!res.ok) throw new Error(`Failed to fetch registry.json: ${res.status} ${res.statusText}`)
  return res.json() as Promise<Registry>
}

async function downloadRemoteBrick(
  rawUrl: string,
  brickName: string,
  version: string,
  destDir: string,
): Promise<void> {
  const { apiBase, branch } = rawUrlToApiBase(rawUrl)

  // Get file tree in one request
  const treeRes = await fetch(`${apiBase}/git/trees/${branch}?recursive=1`)
  if (!treeRes.ok) throw new Error(`Failed to fetch file tree: ${treeRes.status}`)
  const tree = (await treeRes.json()) as { tree: { path: string; type: string }[] }

  const prefix = `bricks/${brickName}/${version}/`
  const files = tree.tree.filter(f => f.type === "blob" && f.path.startsWith(prefix))

  if (files.length === 0) throw new Error(`Brick ${brickName}@${version} not found in remote registry`)

  for (const file of files) {
    const relativePath = file.path.slice(prefix.length)
    const fileUrl = `${rawUrl}/${file.path}`
    const fileRes = await fetch(fileUrl)
    if (!fileRes.ok) throw new Error(`Failed to download ${file.path}: ${fileRes.status}`)
    const content = await fileRes.text()
    const filePath = resolve(destDir, relativePath)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, content, "utf-8")
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function resolveRegistryPath(cwd: string): string {
  if (process.env.SKAFFORM_REGISTRY) return process.env.SKAFFORM_REGISTRY

  const configPath = resolve(cwd, "skafform.config.json")
  if (existsSync(configPath)) {
    const config = JSON.parse(readFileSync(configPath, "utf-8")) as { registry?: string }
    if (config.registry) return config.registry
  }

  throw new Error(
    "No registry configured. Add \"registry\": \"<path or url>\" to skafform.config.json or set SKAFFORM_REGISTRY."
  )
}

function isRemote(path: string): boolean {
  return path.startsWith("https://") || path.startsWith("http://")
}

export async function fetchRegistryIndex(registryPath: string): Promise<Registry> {
  if (isRemote(registryPath)) return fetchRemoteRegistry(registryPath)
  return readLocalRegistry(registryPath)
}

export async function fetchBrick(registryPath: string, brickName: string, destDir: string): Promise<void> {
  const registry = await fetchRegistryIndex(registryPath)

  const entry = registry.bricks[brickName]
  if (!entry) {
    const available = Object.keys(registry.bricks).join(", ")
    throw new Error(`Brick "${brickName}" not found in registry.\nAvailable: ${available}`)
  }

  const version = entry.latest

  if (isRemote(registryPath)) {
    await downloadRemoteBrick(registryPath, brickName, version, destDir)
  } else {
    copyLocalBrick(registryPath, brickName, version, destDir)
  }
}

export async function listRegistry(registryPath: string): Promise<Registry> {
  return fetchRegistryIndex(registryPath)
}
