import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"
import type { NavItem, RouteItem } from "./bricks-json.js"

export interface BrickMeta {
  name: string
  requires?: string[]
  adapter?: string
  nav?: NavItem[]
  layout?: string
  routes?: RouteItem[]
  scaffold?: string[]
}

interface BrickPackageJson {
  name: string
  exports?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  skafform?: Omit<BrickMeta, "name">
}

export function readBrickMeta(cwd: string, brickName: string): BrickMeta | null {
  const pkg = readBrickPackageJson(cwd, brickName)
  if (!pkg) return null
  return { name: pkg.name, ...(pkg.skafform ?? {}) }
}

export function readBrickPackageJson(cwd: string, brickName: string): BrickPackageJson | null {
  const brickDir = resolve(cwd, "bricks", brickName)
  const pkgPath = resolve(brickDir, "package.json")
  if (!existsSync(pkgPath)) return null
  return JSON.parse(readFileSync(pkgPath, "utf-8")) as BrickPackageJson
}

export function brickExists(cwd: string, brickName: string): boolean {
  return existsSync(resolve(cwd, "bricks", brickName, "package.json"))
}

export function prefixPaths(brickName: string, meta: BrickMeta): BrickMeta {
  const prefix = `bricks/${brickName}/`
  const p = (path: string) => path.startsWith("bricks/") ? path : prefix + path

  return {
    ...meta,
    adapter: meta.adapter ? p(meta.adapter) : undefined,
    layout: meta.layout ? p(meta.layout) : undefined,
    routes: meta.routes?.map(r => ({ ...r, file: p(r.file) })),
  }
}
