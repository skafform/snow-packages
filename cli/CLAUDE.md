# CLAUDE.md — @skafform/cli

## Rôle

Outil CLI `skafform` pour créer et gérer des projets Skafform.

```
skafform create <nom>     ← scaffolde un nouveau projet
skafform init             ← initialise skafform.config.json + skafform-bricks.json
skafform add <brick>      ← installe un brick depuis le registry
skafform remove <brick>   ← retire un brick de skafform-bricks.json
```

## Structure

```
src/
  index.ts           ← entrée Commander.js
  commands/
    create.ts        ← copie templates/, substitue {{name}}
    init.ts          ← crée skafform.config.json + skafform-bricks.json
    add.ts           ← télécharge brick + enregistre routes/nav + merge deps
    remove.ts        ← retire brick de skafform-bricks.json
  lib/
    registry.ts      ← lit package.json d'un brick, interface BrickMeta
    fetch-brick.ts   ← télécharge depuis registry local ou GitHub raw
    project.ts       ← mergePackageDeps + addTsconfigPaths
    bricks-json.ts   ← lecture/écriture skafform-bricks.json
templates/
  package.json.tpl   ← template avec {{name}}, référence @skafform/vite-plugin@^0.1.0
  vite.config.ts
  tsconfig.json
  skafform.config.json
  skafform-bricks.json
  app/
  themes/theme-light/
  public/
```

## Commande `add` — flux complet

1. **`fetchBrick`** — copie `registry/bricks/<nom>/<version>/` → `project/bricks/<nom>/`
2. **`readBrickMeta`** — lit `skafform` dans le `package.json` du brick installé
3. **`prefixPaths`** — préfixe les chemins de fichiers avec `bricks/<nom>/` (routes, layout, adapter)
4. **Auto-install requires** — installe récursivement les bricks requis manquants (voir ci-dessous)
5. **`writeBricksJson`** — enregistre nav + routes + layout dans `skafform-bricks.json`
6. **`mergePackageDeps`** — ajoute les dépendances npm du brick dans `package.json` du projet
7. **`addTsconfigPaths`** — ajoute les paths TypeScript pour les exports du brick
8. **scaffold** — copie les dossiers déclarés dans `skafform.scaffold[]` si absents du projet

## Interface `BrickMeta` (dans `lib/registry.ts`)

```ts
interface BrickMeta {
  name: string
  requires?: string[]         // bricks auto-installés si absents
  requiresAdapters?: string[] // adaptateurs requis — avertissement seulement, pas auto-install
  adapter?: string            // chemin vers adapter.server.ts (auth)
  nav?: NavItem[]             // items de navigation
  layout?: string             // layout du brick
  routes?: RouteItem[]        // routes déclarées
  scaffold?: string[]         // dossiers à copier à la racine du projet
}
```

### Distinction `requires` vs `requiresAdapters`

| Champ | Comportement CLI | Exemple |
|-------|-----------------|---------|
| `requires` | Auto-install silencieux | `auth-better-auth` requires `core` |
| `requiresAdapters` | Avertissement seulement | `admin` requiresAdapters `auth` |

`requiresAdapters` vérifie `registry.adapters[x]` dans `skafform-bricks.json`. Le brick qui fournit l'adaptateur est agnostique — n'importe quel brick auth peut enregistrer `adapters.auth`.

## Auto-install des requires

La fonction `add(brickName, cwd, _installing?)` est récursive :

```ts
export async function add(brickName: string, cwd: string, _installing = new Set<string>()): Promise<void> {
  if (_installing.has(brickName)) return   // protection anti-circulaire
  _installing.add(brickName)
  // ...
  for (const req of raw.requires ?? []) {
    const dep = REQUIRES_MAP[req] ?? req
    if (!registry.bricks[dep]) {
      await add(dep, cwd, _installing)     // auto-install silencieux
    }
  }
}
```

`REQUIRES_MAP` mappe les noms courts aux noms complets :
```ts
const REQUIRES_MAP = {
  core: "@skafform/core",
  auth: "@skafform/auth-better-auth",
}
```

Résultat : `skafform add @skafform/auth-better-auth` installe automatiquement `@skafform/core` s'il manque.

## Champ `scaffold`

Si un brick déclare `"scaffold": ["docs"]` dans son `skafform`, le CLI copie le dossier `docs/` du brick vers la racine du projet — **uniquement si le dossier n'existe pas déjà**. Exemple : `@skafform/lite-docs` copie ses fichiers MDX d'exemple.

## Registry local vs distant

`resolveRegistryPath(cwd)` lit `skafform.config.json`:
- `registry` est un **chemin local** → `cpSync` direct
- `registry` est une **URL `https://`** → fetch GitHub raw API + download fichier par fichier

## `mergePackageDeps`

Fusionne les dépendances npm du brick dans le `package.json` du projet. Les versions existantes ne sont **pas** écrasées (spread `...deps` après les dépendances existantes, donc le projet garde sa version si elle existait déjà).

## `addTsconfigPaths`

Pour chaque export du brick :
- `"."` → `"@skafform/core": ["./bricks/@skafform/core/src/index.ts"]`
- `"./db"` → `"@skafform/core/db": ["./bricks/@skafform/core/src/db/index.ts"]`

## Build et installation globale

```
npm run build        ← tsup, ESM, target node18, outdir dist/
npm install -g .     ← installe globalement depuis le dossier source
```

**Toujours rebuilder avant de tester** — le CLI global exécute `dist/index.js`, pas `src/`.

## Template `package.json.tpl`

- `{{name}}` est remplacé par le nom du projet lors de `skafform create`
- Référence `@skafform/vite-plugin: "^0.1.0"` (npmjs, pas yalc)
- `npm install` suffit après `skafform create` — plus besoin de yalc
