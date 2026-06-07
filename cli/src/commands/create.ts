import { mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const TEMPLATES_DIR = resolve(__dirname, "../templates")

function copyDir(src: string, dest: string, vars: Record<string, string> = {}): void {
  mkdirSync(dest, { recursive: true })
  for (const entry of readdirSync(src)) {
    const srcPath = resolve(src, entry)
    const destPath = resolve(dest, entry)
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath, vars)
    } else {
      copyFile(srcPath, destPath, vars)
    }
  }
}

function copyFile(src: string, dest: string, vars: Record<string, string>): void {
  const destPath = dest.endsWith(".tpl") ? dest.slice(0, -4) : dest
  let content = readFileSync(src, "utf-8")
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value)
  }
  writeFileSync(destPath, content, "utf-8")
}

export function create(name: string): void {
  const dest = resolve(process.cwd(), name)

  if (existsSync(dest)) {
    console.error(`✗ Directory "${name}" already exists.`)
    process.exit(1)
  }

  const vars = { name }

  console.log(`\nCreating Skafform project "${name}"...\n`)

  // Root config files
  for (const file of ["vite.config.ts", "react-router.config.ts", "tsconfig.json", "skafform.config.json", "skafform-bricks.json", "package.json.tpl"]) {
    const src = resolve(TEMPLATES_DIR, file)
    const destFile = resolve(dest, file)
    mkdirSync(dest, { recursive: true })
    copyFile(src, destFile, vars)
  }

  // app/
  copyDir(resolve(TEMPLATES_DIR, "app"), resolve(dest, "app"), vars)

  // themes/theme-light/
  copyDir(resolve(TEMPLATES_DIR, "themes"), resolve(dest, "themes"), vars)

  // bricks/ (empty) and public/ (from templates)
  mkdirSync(resolve(dest, "bricks"), { recursive: true })
  copyDir(resolve(TEMPLATES_DIR, "public"), resolve(dest, "public"), vars)

  console.log("✓ Project structure created")
  console.log("✓ theme-light installed\n")
  console.log("Next steps:\n")
  console.log(`  cd ${name}`)
  console.log(`  yalc add @skafform/vite-plugin`)
  console.log(`  npm install`)
  console.log(`  npm run dev\n`)
  console.log("Note: publish local packages to yalc first if not done yet:")
  console.log(`  cd packages/vite-plugin && yalc publish\n`)
  console.log("To add auth + admin:")
  console.log(`  skafform add @skafform/core`)
  console.log(`  skafform add @skafform/auth-better-auth`)
  console.log(`  skafform add @skafform/admin\n`)
}
