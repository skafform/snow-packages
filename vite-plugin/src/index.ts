import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import type { Plugin, ResolvedConfig } from "vite"

const __dirname = dirname(fileURLToPath(import.meta.url))

const VIRTUAL_CONFIG = "virtual:skafform/config"
const RESOLVED_CONFIG = "\0virtual:skafform/config"
const VIRTUAL_SERVER_INIT = "virtual:skafform/server-init"
const RESOLVED_SERVER_INIT = "\0virtual:skafform/server-init"
const VIRTUAL_NAV = "virtual:skafform/nav"
const RESOLVED_NAV = "\0virtual:skafform/nav"

const norm = (p: string) => p.replace(/\\/g, "/")

function loadBrickIndex(root: string): Set<string> {
  const bricksDir = resolve(root, "bricks")
  const names = new Set<string>()
  if (!existsSync(bricksDir)) return names

  for (const entry of readdirSync(bricksDir)) {
    if (entry.startsWith("@")) {
      const scopeDir = resolve(bricksDir, entry)
      for (const pkg of readdirSync(scopeDir)) {
        names.add(`${entry}/${pkg}`)
      }
    } else {
      names.add(entry)
    }
  }
  return names
}

function resolveBrick(id: string, root: string, index: Set<string>): string | null {
  const parts = id.split("/")
  let brickName: string
  let subPath: string | null = null

  if (id.startsWith("@")) {
    brickName = parts.slice(0, 2).join("/")
    subPath = parts.length > 2 ? parts.slice(2).join("/") : null
  } else {
    brickName = parts[0]
    subPath = parts.length > 1 ? parts.slice(1).join("/") : null
  }

  if (!index.has(brickName)) return null

  const brickDir = resolve(root, "bricks", brickName)
  const pkgPath = resolve(brickDir, "package.json")
  if (!existsSync(pkgPath)) return null

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
  const exportKey = subPath ? `./${subPath}` : "."
  const exportEntry = pkg.exports?.[exportKey]

  if (exportEntry) {
    const entry = typeof exportEntry === "string" ? exportEntry : exportEntry.import ?? exportEntry.default
    if (entry) return resolve(brickDir, entry)
  }

  const fallback = resolve(brickDir, subPath ? `src/${subPath}/index.ts` : "src/index.ts")
  if (existsSync(fallback)) return fallback

  return null
}

export function skafform(): Plugin {
  const baseCssPath = resolve(__dirname, "../base.css")
  let root = process.cwd()
  let brickIndex: Set<string> = new Set()
  let config: Record<string, any> = {}

  function getThemeJson(theme: string): Record<string, any> {
    const childPath = resolve(root, `themes/${theme}/child/theme.json`)
    if (!existsSync(childPath)) return {}
    return JSON.parse(readFileSync(childPath, "utf-8"))
  }

  function readCss(path: string): string {
    return readFileSync(path, "utf-8").replace(/^﻿/, "")
  }

  function generateTokensCss(tokens: Record<string, string>): string {
    const entries = Object.entries(tokens)
    if (entries.length === 0) return ""
    const vars = entries.map(([key, value]) => `  --skafform-${key}: ${value};`).join("\n")
    return `:root {\n${vars}\n}`
  }

  function getCssString(): string {
    const themeJson = getThemeJson(config.theme)
    const themeCssPath = resolve(root, `themes/${config.theme}/styles/theme.css`)
    const base = readCss(baseCssPath)
    const theme = existsSync(themeCssPath) ? readCss(themeCssPath) : ""
    const tokens = generateTokensCss(themeJson.tokens ?? {})
    return base + "\n" + theme + (tokens ? "\n" + tokens : "")
  }

  return {
    name: "skafform",
    enforce: "pre",

    configResolved(resolved: ResolvedConfig) {
      root = resolved.root
      config = JSON.parse(readFileSync(resolve(root, "skafform.config.json"), "utf-8"))
      brickIndex = loadBrickIndex(root)
      writeFileSync(resolve(root, "app/skafform-theme.css"), getCssString(), "utf-8")
    },

    resolveId(id, importer) {
      if (id === VIRTUAL_CONFIG) return RESOLVED_CONFIG
      if (id === VIRTUAL_SERVER_INIT) return RESOLVED_SERVER_INIT
      if (id === VIRTUAL_NAV) return RESOLVED_NAV

      if (id.startsWith(".") && importer) {
        const themeDir = norm(resolve(root, `themes/${config.theme}`))
        const componentsDir = themeDir + "/components"
        const childDir = themeDir + "/child"
        const resolved = norm(resolve(norm(dirname(importer)), id))
        if (resolved.startsWith(componentsDir)) {
          const filename = resolved.slice(componentsDir.length + 1)
          for (const ext of ["", ".tsx", ".ts", ".jsx", ".js"]) {
            const childFile = resolve(childDir, filename + ext)
            if (existsSync(childFile)) return childFile
          }
        }
        return
      }

      if (id.startsWith("/") || id.startsWith("\0") || id.startsWith("node:")) return

      const brick = resolveBrick(id, root, brickIndex)
      if (brick) return brick
    },

    load(id) {
      if (id === RESOLVED_CONFIG) {
        const themeJson = getThemeJson(config.theme)
        return `export default ${JSON.stringify({
          ...config,
          customize: { ...(themeJson.customize ?? {}), ...(config.customize ?? {}) },
        })}`
      }

      if (id === RESOLVED_NAV) {
        const bricksConfigPath = resolve(root, "skafform-bricks.json")
        const themeJson = getThemeJson(config.theme)
        const navLocations: Record<string, string> = themeJson.nav_locations ?? config.nav_locations ?? {}
        const customNav: Record<string, { label: string; href: string; visibility: string; order?: number }[]> = themeJson.nav ?? config.nav ?? {}
        const bricksConfig = existsSync(bricksConfigPath)
          ? JSON.parse(readFileSync(bricksConfigPath, "utf-8"))
          : { bricks: {} }

        const registry: Record<string, { label: string; href: string; visibility: string; order: number; brick: string }[]> = {}
        for (const loc of Object.keys(navLocations)) registry[loc] = []

        for (const [brickName, brick] of Object.entries(bricksConfig.bricks ?? {})) {
          for (const item of (brick as any).nav ?? []) {
            if (registry[item.location] !== undefined) {
              registry[item.location].push({ ...item, order: item.order ?? 0, brick: brickName })
            }
          }
        }

        for (const [loc, items] of Object.entries(customNav)) {
          if (registry[loc] !== undefined) {
            registry[loc].push(...items.map(i => ({ ...i, order: i.order ?? 0, brick: "config" })))
          }
        }

        for (const loc of Object.keys(registry)) {
          registry[loc].sort((a, b) => a.order - b.order)
        }

        return `export default ${JSON.stringify(registry)}`
      }

      if (id === RESOLVED_SERVER_INIT) {
        const bricksConfigPath = resolve(root, "skafform-bricks.json")
        if (!existsSync(bricksConfigPath)) return ""
        const bricksConfig = JSON.parse(readFileSync(bricksConfigPath, "utf-8"))
        const adapters: Record<string, string> = bricksConfig.adapters ?? {}
        if (!adapters.auth) return ""
        const adapterPath = resolve(root, adapters.auth).replace(/\\/g, "/")
        return [
          `import { setAdapter } from "@skafform/core/runtime"`,
          `import { authAdapter } from "${adapterPath}"`,
          `setAdapter(authAdapter)`,
        ].join("\n")
      }
    },

    handleHotUpdate({ file, server }) {
      if (file.includes("skafform.config") || file.includes("themes") || file.includes("bricks")) {
        config = JSON.parse(readFileSync(resolve(root, "skafform.config.json"), "utf-8"))
        brickIndex = loadBrickIndex(root)
        server.moduleGraph.invalidateAll()
        server.ws.send({ type: "full-reload" })
      }
    },
  }
}
