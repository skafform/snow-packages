# CLAUDE.md — @skafform/vite-plugin

## Rôle

Plugin Vite qui est le **cœur du framework Skafform**. Il fait trois choses :
1. **Résout les imports** de bricks et de composants overridés
2. **Génère les modules virtuels** (config, nav, server-init)
3. **Écrit le CSS du thème** au démarrage

Publié sur npmjs : `@skafform/vite-plugin@0.1.0`

## Fichiers

```
src/index.ts   ← tout le plugin (205 lignes)
base.css       ← styles de base injectés dans skafform-theme.css
types.d.ts     ← déclarations TypeScript pour les virtual modules
```

## Architecture interne

### État du plugin (module-level)

```ts
let root = process.cwd()
let brickIndex: Set<string> = new Set()
let config: Record<string, any> = {}
```

- **`root`** — chemin absolu de la racine du projet Vite
- **`brickIndex`** — Set des noms de bricks installés (`@skafform/core`, `@skafform/auth-better-auth`, etc.) chargé une seule fois dans `configResolved`
- **`config`** — contenu de `skafform.config.json`, mis en cache après `configResolved`

### `enforce: "pre"`

**Critique.** Le plugin doit s'exécuter **avant** `reactRouter()` car React Router intercepterait les imports relatifs dans les composants du thème. Sans `enforce: "pre"`, le child/ override ne fonctionne pas.

### Normalisation des chemins Windows

```ts
const norm = (p: string) => p.replace(/\\/g, "/")
```

Vite utilise des slashes `/` mais `node:path` retourne des backslashes `\` sur Windows. `norm()` est appliqué sur tous les chemins avant comparaison de strings. **Ne pas supprimer.**

## Hook `configResolved`

S'exécute une seule fois au démarrage :
1. Lit `skafform.config.json`
2. Charge le `brickIndex` (scan du dossier `bricks/`)
3. Écrit `app/skafform-theme.css` = base.css + theme.css + tokens CSS générés depuis `child/theme.json`

## Hook `resolveId`

Ordre de priorité :

### 1. Virtual modules
```ts
if (id === "virtual:skafform/config") return "\0virtual:skafform/config"
if (id === "virtual:skafform/server-init") return "\0virtual:skafform/server-init"
if (id === "virtual:skafform/nav") return "\0virtual:skafform/nav"
```
Convention Vite : les resolved IDs de virtuels commencent par `\0`.

### 2. Child/ override (imports relatifs depuis les composants du thème)
```ts
if (id.startsWith(".") && importer) {
  const themeDir = norm(resolve(root, `themes/${config.theme}`))
  const componentsDir = themeDir + "/components"
  const childDir = themeDir + "/child"
  const resolved = norm(resolve(norm(dirname(importer)), id))
  if (resolved.startsWith(componentsDir)) {
    // cherche le fichier dans child/ avec les extensions .tsx .ts .jsx .js
    for (const ext of ["", ".tsx", ".ts", ".jsx", ".js"]) {
      const childFile = resolve(childDir, filename + ext)
      if (existsSync(childFile)) return childFile
    }
  }
  return // laisser Vite gérer les autres imports relatifs
}
```
Si un composant du thème importe `./Hero`, et que `themes/theme-light/child/Hero.tsx` existe → retourner ce fichier au lieu de `themes/theme-light/components/Hero.tsx`.

### 3. Bricks
```ts
const brick = resolveBrick(id, root, brickIndex)
if (brick) return brick
```
`resolveBrick` cherche dans `brickIndex`, lit le `package.json` du brick, résout via `exports` ou fallback vers `src/index.ts`.

## Hook `load`

### `virtual:skafform/config`
Retourne `skafform.config.json` fusionné avec `customize` depuis `child/theme.json`. Les customize du thème sont la base, les customize de `skafform.config.json` ont priorité.

### `virtual:skafform/nav`
Construit le registre de navigation :
1. `nav_locations` depuis `child/theme.json` → structure les emplacements
2. Items des bricks depuis `skafform-bricks.json` → bricks nav items
3. Items custom depuis `child/theme.json` nav → surcharges utilisateur
4. Tri par `order` dans chaque emplacement

### `virtual:skafform/server-init`
Génère le code d'initialisation de l'adapter auth :
```ts
import { setAdapter } from "@skafform/core/runtime"
import { authAdapter } from "<chemin absolu vers adapter.server.ts>"
setAdapter(authAdapter)
```
Importé dans `app/entry.server.tsx`.

## `loadBrickIndex`

Scan O(1) mémoire — lit `bricks/` une seule fois, construit un `Set<string>`.
- Détecte les scoped bricks `@scope/nom`
- Non-scoped : juste le nom du dossier
- Résultat mis en cache dans `brickIndex`

## `resolveBrick`

Pour un import `@skafform/core/db` :
1. Extrait `brickName = "@skafform/core"`, `subPath = "db"`
2. Vérifie `brickIndex.has("@skafform/core")` — O(1)
3. Lit `bricks/@skafform/core/package.json`
4. Cherche `exports["./db"]` → retourne le chemin résolu
5. Fallback : `bricks/@skafform/core/src/db/index.ts`

## CSS du thème

`getCssString()` assemble dans l'ordre :
1. `base.css` (styles de base du framework)
2. `themes/<theme>/styles/theme.css` (styles custom du thème, peut être vide)
3. Tokens CSS générés depuis `child/theme.json` → variables `:root { --skafform-<key>: <value>; }`

Résultat écrit dans `app/skafform-theme.css` à chaque `configResolved`.

## Hot Reload

Si un fichier dans `skafform.config`, `themes/`, ou `bricks/` change :
- Recharge `config` et `brickIndex`
- `server.moduleGraph.invalidateAll()` + `full-reload`

## Types (`types.d.ts`)

```ts
declare module "virtual:skafform/server-init" {}
declare module "virtual:skafform/nav" {
  const nav: Record<string, SkafformNavItem[]>
  export default nav
}
declare module "virtual:skafform/config" {
  const config: Record<string, unknown>
  export default config
}
```

## Build

```
tsup.config.ts → ESM, external: ["vite"], outdir: "dist/"
```

Après modification :
```
npm run build
```

Après modification + publication :
```
npm run build
npm publish --access public
```

## Cas edge connus

| Problème | Cause | Solution |
|---------|-------|---------|
| child/ override ne fonctionne pas | `enforce: "pre"` absent | Ne jamais retirer `enforce: "pre"` |
| Chemins non résolus sur Windows | `node:path` retourne `\` | `norm()` sur tous les chemins avant comparaison |
| `resolveId` appelé pour node_modules | Guards manquants | `if (id.startsWith("/") \|\| id.startsWith("\0") \|\| id.startsWith("node:")) return` |
