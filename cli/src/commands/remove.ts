import { readBricksJson, writeBricksJson } from "../lib/bricks-json.js"

export function remove(brickName: string, cwd: string): void {
  const registry = readBricksJson(cwd)

  if (!registry.bricks[brickName]) {
    console.error(`✗ "${brickName}" is not registered in skafform-bricks.json`)
    process.exit(1)
  }

  // Remove adapter if it belongs to this brick
  for (const [key, path] of Object.entries(registry.adapters)) {
    if (path.startsWith(`bricks/${brickName}/`)) {
      delete registry.adapters[key]
    }
  }

  delete registry.bricks[brickName]
  writeBricksJson(cwd, registry)

  console.log(`✓ ${brickName} removed from skafform-bricks.json`)
  console.log(`\n  Don't forget:`)
  console.log(`  npm uninstall ${brickName}`)
}
