import { type RouteConfig, index, route, layout } from "@react-router/dev/routes"
import { readdirSync, existsSync, readFileSync } from "node:fs"
import { resolve, basename, extname } from "node:path"

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), "skafform.config.json"), "utf-8")
)
const themeName: string = config.theme
const pagesDir = resolve(process.cwd(), `themes/${themeName}/pages`)
const userRoutesDir = resolve(process.cwd(), "app/routes")

function buildRoutes(): RouteConfig {
  const themePageFiles = existsSync(pagesDir)
    ? readdirSync(pagesDir).filter(f => /\.[jt]sx?$/.test(f))
    : []

  const themePageNames = new Set(themePageFiles.map(f => basename(f, extname(f))))

  // Theme pages — app/routes/<name>.tsx prend priorité si présent
  const themeChildren = themePageFiles.map(f => {
    const name = basename(f, extname(f))
    const override = resolve(userRoutesDir, `${name}.tsx`)
    const file = existsSync(override)
      ? `routes/${name}.tsx`
      : `../themes/${themeName}/pages/${f}`
    return name === "home" ? index(file) : route(name, file)
  })

  // Routes custom du dev — fichiers dans app/routes/ qui ne sont pas des overrides
  const userOnlyRoutes: RouteConfig = existsSync(userRoutesDir)
    ? readdirSync(userRoutesDir)
        .filter(f => /\.[jt]sx?$/.test(f))
        .filter(f => !themePageNames.has(basename(f, extname(f))))
        .map(f => route(basename(f, extname(f)), `routes/${f}`))
    : []

  const bricksRegistry = JSON.parse(
    readFileSync(resolve(process.cwd(), "skafform-bricks.json"), "utf-8")
  ) as {
    adapters: Record<string, string>
    bricks: Record<string, { layout?: string; routes?: { path: string; file: string }[] }>
  }

  const brickRoutes: RouteConfig = Object.values(bricksRegistry.bricks).flatMap(brick => {
    const routes = (brick.routes ?? []).map(r => route(r.path, `../${r.file}`))
    return brick.layout ? [layout(`../${brick.layout}`, routes)] : routes
  })

  return [
    layout(`../themes/${themeName}/layouts/default.tsx`, themeChildren),
    ...userOnlyRoutes,
    ...brickRoutes,
  ]
}

export default buildRoutes() satisfies RouteConfig
