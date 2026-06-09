import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync } from "node:fs"
import { resolve, join } from "node:path"
import { readBrickMeta, readBrickPackageJson, prefixPaths } from "../lib/registry.js"
import { readBricksJson, writeBricksJson } from "../lib/bricks-json.js"
import { fetchBrick, resolveRegistryPath } from "../lib/fetch-brick.js"
import { mergePackageDeps, addTsconfigPaths } from "../lib/project.js"

function copyDir(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = join(src, entry)
    const destPath = join(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath)
    } else {
      copyFileSync(srcPath, destPath)
    }
  }
}

const REQUIRES_MAP: Record<string, string> = {
  core: "@skafform/core",
  auth: "@skafform/auth-better-auth",
}

export async function add(brickName: string, cwd: string): Promise<void> {
  const brickDir = resolve(cwd, "bricks", brickName)

  // Si le brick n'est pas déjà présent, on le télécharge depuis le registre
  if (!existsSync(brickDir)) {
    console.log(`Fetching ${brickName} from registry...`)
    try {
      const registryPath = resolveRegistryPath(cwd)
      mkdirSync(brickDir, { recursive: true })
      await fetchBrick(registryPath, brickName, brickDir)
      console.log(`✓ ${brickName} downloaded`)
    } catch (err) {
      console.error(`✗ ${(err as Error).message}`)
      process.exit(1)
    }
  }

  const raw = readBrickMeta(cwd, brickName)
  if (!raw) {
    console.error(`✗ Could not read package.json for "${brickName}"`)
    process.exit(1)
  }

  const meta = prefixPaths(brickName, raw)
  const registry = readBricksJson(cwd)

  // Vérifier les requires
  const missing: string[] = []
  for (const req of raw.requires ?? []) {
    const dep = REQUIRES_MAP[req] ?? req
    if (!registry.bricks[dep]) missing.push(dep)
  }

  if (missing.length > 0) {
    console.error(`✗ "${brickName}" requires the following bricks to be installed first:`)
    for (const dep of missing) {
      console.error(`    skafform add ${dep}`)
    }
    process.exit(1)
  }

  // Enregistrer l'adapter
  if (meta.adapter) {
    registry.adapters.auth = meta.adapter
  }

  // Enregistrer le brick
  registry.bricks[meta.name] = {
    ...(meta.nav    ? { nav:    meta.nav    } : {}),
    ...(meta.layout ? { layout: meta.layout } : {}),
    ...(meta.routes ? { routes: meta.routes } : {}),
  }

  writeBricksJson(cwd, registry)

  // Merge npm deps + tsconfig paths
  const pkg = readBrickPackageJson(cwd, brickName)
  if (pkg) {
    const hasDeps = Object.keys(pkg.dependencies ?? {}).length > 0
    const hasDevDeps = Object.keys(pkg.devDependencies ?? {}).length > 0
    if (hasDeps || hasDevDeps) {
      mergePackageDeps(cwd, pkg.dependencies ?? {}, pkg.devDependencies ?? {})
    }
    if (pkg.exports) {
      addTsconfigPaths(cwd, brickName, pkg.exports)
    }
  }

  // Copier les dossiers scaffold déclarés dans skafform.scaffold
  for (const dir of raw.scaffold ?? []) {
    const srcDir = resolve(brickDir, dir)
    const destDir = resolve(cwd, dir)
    if (existsSync(srcDir) && !existsSync(destDir)) {
      copyDir(srcDir, destDir)
      console.log(`  → ${dir}/ scaffolded to project root`)
    }
  }

  console.log(`✓ ${meta.name} registered in skafform-bricks.json`)
  if (meta.adapter) console.log(`  → auth adapter registered`)
  if (meta.nav?.length)    console.log(`  → ${meta.nav.length} nav item(s)`)
  if (meta.routes?.length) console.log(`  → ${meta.routes.length} route(s)`)
  if (pkg?.dependencies && Object.keys(pkg.dependencies).length > 0) {
    console.log(`  → deps added to package.json: ${Object.keys(pkg.dependencies).join(", ")}`)
  }
  if (pkg?.exports) {
    console.log(`  → tsconfig paths updated`)
  }
  console.log(`\n  Don't forget: npm install`)
}
