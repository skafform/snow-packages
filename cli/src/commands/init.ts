import { writeFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

export function init(cwd: string): void {
  const configPath = resolve(cwd, "skafform.config.json")
  const bricksPath = resolve(cwd, "skafform-bricks.json")

  if (existsSync(configPath)) {
    console.log("skafform.config.json already exists — skipped")
  } else {
    writeFileSync(configPath, JSON.stringify({
      theme: "theme-light",
      nav_locations: {
        primary: "Navigation principale",
        "user-menu": "Menu utilisateur connecté",
        footer: "Pied de page",
      },
      nav: {},
    }, null, 2) + "\n", "utf-8")
    console.log("✓ skafform.config.json created")
  }

  if (existsSync(bricksPath)) {
    console.log("skafform-bricks.json already exists — skipped")
  } else {
    writeFileSync(bricksPath, JSON.stringify({ adapters: {}, bricks: {} }, null, 2) + "\n", "utf-8")
    console.log("✓ skafform-bricks.json created")
  }
}
