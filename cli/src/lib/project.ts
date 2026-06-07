import { readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

export function mergePackageDeps(
  cwd: string,
  deps: Record<string, string>,
  devDeps: Record<string, string>,
): boolean {
  const pkgPath = resolve(cwd, "package.json")
  if (!existsSync(pkgPath)) return false

  const pkg = JSON.parse(readFileSync(pkgPath, "utf-8")) as {
    dependencies?: Record<string, string>
    devDependencies?: Record<string, string>
  }

  pkg.dependencies = { ...(pkg.dependencies ?? {}), ...deps }
  pkg.devDependencies = { ...(pkg.devDependencies ?? {}), ...devDeps }

  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")
  return true
}

export function addTsconfigPaths(
  cwd: string,
  brickName: string,
  exports: Record<string, string>,
): void {
  const tsconfigPath = resolve(cwd, "tsconfig.json")
  if (!existsSync(tsconfigPath)) return

  const tsconfig = JSON.parse(readFileSync(tsconfigPath, "utf-8")) as {
    compilerOptions?: { paths?: Record<string, string[]> }
  }

  if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {}
  if (!tsconfig.compilerOptions.paths) tsconfig.compilerOptions.paths = {}

  for (const [exportKey, exportPath] of Object.entries(exports)) {
    // "." → "@skafform/core", "./db" → "@skafform/core/db"
    const importKey = exportKey === "." ? brickName : `${brickName}${exportKey.slice(1)}`
    // "./src/index.ts" → "./bricks/@skafform/core/src/index.ts"
    const resolvedPath = `./bricks/${brickName}/${exportPath.replace(/^\.\//, "")}`
    tsconfig.compilerOptions.paths[importKey] = [resolvedPath]
  }

  writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n", "utf-8")
}
