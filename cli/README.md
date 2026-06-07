# @skafform/cli

CLI Skafform — scaffolde des projets et gère les bricks.

## Prérequis

- Node.js 18+
- [yalc](https://github.com/wclr/yalc) pour les packages locaux : `npm i -g yalc`

## Setup dev (première fois)

Publier les packages locaux dans le store yalc :

```bash
cd packages/vite-plugin
npm install
npm run build
yalc publish
```

Builder le CLI :

```bash
cd packages/cli
npm install
npm run build
```

## Commandes

### `skafform create <nom>`

Scaffolde un nouveau projet Skafform avec `theme-light` installé.

```bash
node packages/cli/dist/index.js create mon-site
cd mon-site
yalc add @skafform/vite-plugin
npm install
npm run dev
```

### `skafform init`

Initialise `skafform.config.json` et `skafform-bricks.json` dans un projet existant.

```bash
skafform init
```

### `skafform add <brick>`

Enregistre un brick depuis `bricks/` dans `skafform-bricks.json`.
Vérifie les dépendances déclarées dans `package.json → skafform.requires`.

```bash
skafform add @skafform/core
skafform add @skafform/auth-better-auth
skafform add @skafform/admin
```

### `skafform remove <brick>`

Retire un brick du registre et nettoie l'adapter si applicable.

```bash
skafform remove @skafform/admin
```

## Workflow complet — nouveau projet avec auth

```bash
# 1. Créer le projet
node packages/cli/dist/index.js create mon-site
cd mon-site

# 2. Installer les packages locaux via yalc
yalc add @skafform/vite-plugin

# 3. Installer les dépendances npm
npm install

# 4. Copier les bricks dans bricks/
# (copier @skafform/core, @skafform/auth-better-auth, @skafform/admin)

# 5. Enregistrer les bricks
skafform add @skafform/core
skafform add @skafform/auth-better-auth
skafform add @skafform/admin

# 6. Démarrer
npm run dev
```

## Structure d'un brick compatible

Le `package.json` d'un brick doit déclarer une clé `skafform` :

```json
{
  "name": "@skafform/admin",
  "skafform": {
    "requires": ["core", "auth"],
    "nav": [
      { "label": "Administration", "href": "/admin", "location": "user-menu", "visibility": "admin", "order": 20 }
    ],
    "layout": "src/layouts/AdminLayout.tsx",
    "routes": [
      { "path": "admin", "file": "src/routes/admin.tsx" },
      { "path": "admin/users", "file": "src/routes/admin.users.tsx" }
    ]
  }
}
```

| Clé | Description |
|-----|-------------|
| `requires` | Bricks à installer avant celui-ci (`"core"`, `"auth"`) |
| `adapter` | Chemin vers l'adapter auth (pour les bricks auth uniquement) |
| `nav` | Items de navigation à enregistrer dans les emplacements nommés |
| `layout` | Layout React Router qui wrappera les routes du brick |
| `routes` | Routes à ajouter dans `skafform-bricks.json` |

## Mise à jour yalc après modification du vite-plugin

```bash
cd packages/vite-plugin
npm run build
yalc publish --push
```

`--push` propage automatiquement la mise à jour dans tous les projets qui ont fait `yalc add`.
