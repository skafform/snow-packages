import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

export interface NavItem {
  label: string
  href: string
  location: string
  visibility: "public" | "guest" | "authenticated" | "admin"
  order?: number
}

export interface RouteItem {
  path: string
  file: string
  layout?: boolean
}

export interface BrickEntry {
  nav?: NavItem[]
  layout?: string
  routes?: RouteItem[]
}

export interface BricksJson {
  adapters: Record<string, string>
  bricks: Record<string, BrickEntry>
}

export function readBricksJson(cwd: string): BricksJson {
  const path = resolve(cwd, "skafform-bricks.json")
  if (!existsSync(path)) return { adapters: {}, bricks: {} }
  return JSON.parse(readFileSync(path, "utf-8")) as BricksJson
}

export function writeBricksJson(cwd: string, data: BricksJson): void {
  const path = resolve(cwd, "skafform-bricks.json")
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8")
}
