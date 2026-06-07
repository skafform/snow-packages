#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";

// src/commands/create.ts
import { mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
var __dirname = dirname(fileURLToPath(import.meta.url));
var TEMPLATES_DIR = resolve(__dirname, "../templates");
function copyDir(src, dest, vars = {}) {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src)) {
    const srcPath = resolve(src, entry);
    const destPath = resolve(dest, entry);
    if (statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath, vars);
    } else {
      copyFile(srcPath, destPath, vars);
    }
  }
}
function copyFile(src, dest, vars) {
  const destPath = dest.endsWith(".tpl") ? dest.slice(0, -4) : dest;
  let content = readFileSync(src, "utf-8");
  for (const [key, value] of Object.entries(vars)) {
    content = content.replaceAll(`{{${key}}}`, value);
  }
  writeFileSync(destPath, content, "utf-8");
}
function create(name) {
  const dest = resolve(process.cwd(), name);
  if (existsSync(dest)) {
    console.error(`\u2717 Directory "${name}" already exists.`);
    process.exit(1);
  }
  const vars = { name };
  console.log(`
Creating Skafform project "${name}"...
`);
  for (const file of ["vite.config.ts", "react-router.config.ts", "tsconfig.json", "skafform.config.json", "skafform-bricks.json", "package.json.tpl"]) {
    const src = resolve(TEMPLATES_DIR, file);
    const destFile = resolve(dest, file);
    mkdirSync(dest, { recursive: true });
    copyFile(src, destFile, vars);
  }
  copyDir(resolve(TEMPLATES_DIR, "app"), resolve(dest, "app"), vars);
  copyDir(resolve(TEMPLATES_DIR, "themes"), resolve(dest, "themes"), vars);
  mkdirSync(resolve(dest, "bricks"), { recursive: true });
  copyDir(resolve(TEMPLATES_DIR, "public"), resolve(dest, "public"), vars);
  console.log("\u2713 Project structure created");
  console.log("\u2713 theme-light installed\n");
  console.log("Next steps:\n");
  console.log(`  cd ${name}`);
  console.log(`  yalc add @skafform/vite-plugin`);
  console.log(`  npm install`);
  console.log(`  npm run dev
`);
  console.log("Note: publish local packages to yalc first if not done yet:");
  console.log(`  cd packages/vite-plugin && yalc publish
`);
  console.log("To add auth + admin:");
  console.log(`  skafform add @skafform/core`);
  console.log(`  skafform add @skafform/auth-better-auth`);
  console.log(`  skafform add @skafform/admin
`);
}

// src/commands/init.ts
import { writeFileSync as writeFileSync2, existsSync as existsSync2 } from "fs";
import { resolve as resolve2 } from "path";
function init(cwd) {
  const configPath = resolve2(cwd, "skafform.config.json");
  const bricksPath = resolve2(cwd, "skafform-bricks.json");
  if (existsSync2(configPath)) {
    console.log("skafform.config.json already exists \u2014 skipped");
  } else {
    writeFileSync2(configPath, JSON.stringify({
      theme: "theme-light",
      nav_locations: {
        primary: "Navigation principale",
        "user-menu": "Menu utilisateur connect\xE9",
        footer: "Pied de page"
      },
      nav: {}
    }, null, 2) + "\n", "utf-8");
    console.log("\u2713 skafform.config.json created");
  }
  if (existsSync2(bricksPath)) {
    console.log("skafform-bricks.json already exists \u2014 skipped");
  } else {
    writeFileSync2(bricksPath, JSON.stringify({ adapters: {}, bricks: {} }, null, 2) + "\n", "utf-8");
    console.log("\u2713 skafform-bricks.json created");
  }
}

// src/commands/add.ts
import { existsSync as existsSync7, mkdirSync as mkdirSync3 } from "fs";
import { resolve as resolve7 } from "path";

// src/lib/registry.ts
import { readFileSync as readFileSync2, existsSync as existsSync3 } from "fs";
import { resolve as resolve3 } from "path";
function readBrickMeta(cwd, brickName) {
  const pkg = readBrickPackageJson(cwd, brickName);
  if (!pkg) return null;
  return { name: pkg.name, ...pkg.skafform ?? {} };
}
function readBrickPackageJson(cwd, brickName) {
  const brickDir = resolve3(cwd, "bricks", brickName);
  const pkgPath = resolve3(brickDir, "package.json");
  if (!existsSync3(pkgPath)) return null;
  return JSON.parse(readFileSync2(pkgPath, "utf-8"));
}
function prefixPaths(brickName, meta) {
  const prefix = `bricks/${brickName}/`;
  const p = (path) => path.startsWith("bricks/") ? path : prefix + path;
  return {
    ...meta,
    adapter: meta.adapter ? p(meta.adapter) : void 0,
    layout: meta.layout ? p(meta.layout) : void 0,
    routes: meta.routes?.map((r) => ({ ...r, file: p(r.file) }))
  };
}

// src/lib/bricks-json.ts
import { readFileSync as readFileSync3, writeFileSync as writeFileSync3, existsSync as existsSync4 } from "fs";
import { resolve as resolve4 } from "path";
function readBricksJson(cwd) {
  const path = resolve4(cwd, "skafform-bricks.json");
  if (!existsSync4(path)) return { adapters: {}, bricks: {} };
  return JSON.parse(readFileSync3(path, "utf-8"));
}
function writeBricksJson(cwd, data) {
  const path = resolve4(cwd, "skafform-bricks.json");
  writeFileSync3(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

// src/lib/fetch-brick.ts
import { cpSync, existsSync as existsSync5, mkdirSync as mkdirSync2, readFileSync as readFileSync4, writeFileSync as writeFileSync4 } from "fs";
import { resolve as resolve5, dirname as dirname2 } from "path";
function readLocalRegistry(registryPath) {
  const indexPath = resolve5(registryPath, "registry.json");
  if (!existsSync5(indexPath)) throw new Error(`Registry not found at ${registryPath}`);
  return JSON.parse(readFileSync4(indexPath, "utf-8"));
}
function copyLocalBrick(registryPath, brickName, version, destDir) {
  const srcPath = resolve5(registryPath, "bricks", brickName, version);
  if (!existsSync5(srcPath)) throw new Error(`Brick ${brickName}@${version} not found in registry`);
  cpSync(srcPath, destDir, { recursive: true });
}
function rawUrlToApiBase(rawUrl) {
  const url = new URL(rawUrl);
  const parts = url.pathname.replace(/^\//, "").split("/");
  const owner = parts[0];
  const repo = parts[1];
  const branch = parts[2] ?? "main";
  return {
    apiBase: `https://api.github.com/repos/${owner}/${repo}`,
    branch
  };
}
async function fetchRemoteRegistry(rawUrl) {
  const res = await fetch(`${rawUrl}/registry.json`);
  if (!res.ok) throw new Error(`Failed to fetch registry.json: ${res.status} ${res.statusText}`);
  return res.json();
}
async function downloadRemoteBrick(rawUrl, brickName, version, destDir) {
  const { apiBase, branch } = rawUrlToApiBase(rawUrl);
  const treeRes = await fetch(`${apiBase}/git/trees/${branch}?recursive=1`);
  if (!treeRes.ok) throw new Error(`Failed to fetch file tree: ${treeRes.status}`);
  const tree = await treeRes.json();
  const prefix = `bricks/${brickName}/${version}/`;
  const files = tree.tree.filter((f) => f.type === "blob" && f.path.startsWith(prefix));
  if (files.length === 0) throw new Error(`Brick ${brickName}@${version} not found in remote registry`);
  for (const file of files) {
    const relativePath = file.path.slice(prefix.length);
    const fileUrl = `${rawUrl}/${file.path}`;
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) throw new Error(`Failed to download ${file.path}: ${fileRes.status}`);
    const content = await fileRes.text();
    const filePath = resolve5(destDir, relativePath);
    mkdirSync2(dirname2(filePath), { recursive: true });
    writeFileSync4(filePath, content, "utf-8");
  }
}
function resolveRegistryPath(cwd) {
  if (process.env.SKAFFORM_REGISTRY) return process.env.SKAFFORM_REGISTRY;
  const configPath = resolve5(cwd, "skafform.config.json");
  if (existsSync5(configPath)) {
    const config = JSON.parse(readFileSync4(configPath, "utf-8"));
    if (config.registry) return config.registry;
  }
  throw new Error(
    'No registry configured. Add "registry": "<path or url>" to skafform.config.json or set SKAFFORM_REGISTRY.'
  );
}
function isRemote(path) {
  return path.startsWith("https://") || path.startsWith("http://");
}
async function fetchRegistryIndex(registryPath) {
  if (isRemote(registryPath)) return fetchRemoteRegistry(registryPath);
  return readLocalRegistry(registryPath);
}
async function fetchBrick(registryPath, brickName, destDir) {
  const registry = await fetchRegistryIndex(registryPath);
  const entry = registry.bricks[brickName];
  if (!entry) {
    const available = Object.keys(registry.bricks).join(", ");
    throw new Error(`Brick "${brickName}" not found in registry.
Available: ${available}`);
  }
  const version = entry.latest;
  if (isRemote(registryPath)) {
    await downloadRemoteBrick(registryPath, brickName, version, destDir);
  } else {
    copyLocalBrick(registryPath, brickName, version, destDir);
  }
}

// src/lib/project.ts
import { readFileSync as readFileSync5, writeFileSync as writeFileSync5, existsSync as existsSync6 } from "fs";
import { resolve as resolve6 } from "path";
function mergePackageDeps(cwd, deps, devDeps) {
  const pkgPath = resolve6(cwd, "package.json");
  if (!existsSync6(pkgPath)) return false;
  const pkg = JSON.parse(readFileSync5(pkgPath, "utf-8"));
  pkg.dependencies = { ...pkg.dependencies ?? {}, ...deps };
  pkg.devDependencies = { ...pkg.devDependencies ?? {}, ...devDeps };
  writeFileSync5(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
  return true;
}
function addTsconfigPaths(cwd, brickName, exports) {
  const tsconfigPath = resolve6(cwd, "tsconfig.json");
  if (!existsSync6(tsconfigPath)) return;
  const tsconfig = JSON.parse(readFileSync5(tsconfigPath, "utf-8"));
  if (!tsconfig.compilerOptions) tsconfig.compilerOptions = {};
  if (!tsconfig.compilerOptions.paths) tsconfig.compilerOptions.paths = {};
  for (const [exportKey, exportPath] of Object.entries(exports)) {
    const importKey = exportKey === "." ? brickName : `${brickName}${exportKey.slice(1)}`;
    const resolvedPath = `./bricks/${brickName}/${exportPath.replace(/^\.\//, "")}`;
    tsconfig.compilerOptions.paths[importKey] = [resolvedPath];
  }
  writeFileSync5(tsconfigPath, JSON.stringify(tsconfig, null, 2) + "\n", "utf-8");
}

// src/commands/add.ts
var REQUIRES_MAP = {
  core: "@skafform/core",
  auth: "@skafform/auth-better-auth"
};
async function add(brickName, cwd) {
  const brickDir = resolve7(cwd, "bricks", brickName);
  if (!existsSync7(brickDir)) {
    console.log(`Fetching ${brickName} from registry...`);
    try {
      const registryPath = resolveRegistryPath(cwd);
      mkdirSync3(brickDir, { recursive: true });
      await fetchBrick(registryPath, brickName, brickDir);
      console.log(`\u2713 ${brickName} downloaded`);
    } catch (err) {
      console.error(`\u2717 ${err.message}`);
      process.exit(1);
    }
  }
  const raw = readBrickMeta(cwd, brickName);
  if (!raw) {
    console.error(`\u2717 Could not read package.json for "${brickName}"`);
    process.exit(1);
  }
  const meta = prefixPaths(brickName, raw);
  const registry = readBricksJson(cwd);
  const missing = [];
  for (const req of raw.requires ?? []) {
    const dep = REQUIRES_MAP[req] ?? req;
    if (!registry.bricks[dep]) missing.push(dep);
  }
  if (missing.length > 0) {
    console.error(`\u2717 "${brickName}" requires the following bricks to be installed first:`);
    for (const dep of missing) {
      console.error(`    skafform add ${dep}`);
    }
    process.exit(1);
  }
  if (meta.adapter) {
    registry.adapters.auth = meta.adapter;
  }
  registry.bricks[meta.name] = {
    ...meta.nav ? { nav: meta.nav } : {},
    ...meta.layout ? { layout: meta.layout } : {},
    ...meta.routes ? { routes: meta.routes } : {}
  };
  writeBricksJson(cwd, registry);
  const pkg = readBrickPackageJson(cwd, brickName);
  if (pkg) {
    const hasDeps = Object.keys(pkg.dependencies ?? {}).length > 0;
    const hasDevDeps = Object.keys(pkg.devDependencies ?? {}).length > 0;
    if (hasDeps || hasDevDeps) {
      mergePackageDeps(cwd, pkg.dependencies ?? {}, pkg.devDependencies ?? {});
    }
    if (pkg.exports) {
      addTsconfigPaths(cwd, brickName, pkg.exports);
    }
  }
  console.log(`\u2713 ${meta.name} registered in skafform-bricks.json`);
  if (meta.adapter) console.log(`  \u2192 auth adapter registered`);
  if (meta.nav?.length) console.log(`  \u2192 ${meta.nav.length} nav item(s)`);
  if (meta.routes?.length) console.log(`  \u2192 ${meta.routes.length} route(s)`);
  if (pkg?.dependencies && Object.keys(pkg.dependencies).length > 0) {
    console.log(`  \u2192 deps added to package.json: ${Object.keys(pkg.dependencies).join(", ")}`);
  }
  if (pkg?.exports) {
    console.log(`  \u2192 tsconfig paths updated`);
  }
  console.log(`
  Don't forget: npm install`);
}

// src/commands/remove.ts
function remove(brickName, cwd) {
  const registry = readBricksJson(cwd);
  if (!registry.bricks[brickName]) {
    console.error(`\u2717 "${brickName}" is not registered in skafform-bricks.json`);
    process.exit(1);
  }
  for (const [key, path] of Object.entries(registry.adapters)) {
    if (path.startsWith(`bricks/${brickName}/`)) {
      delete registry.adapters[key];
    }
  }
  delete registry.bricks[brickName];
  writeBricksJson(cwd, registry);
  console.log(`\u2713 ${brickName} removed from skafform-bricks.json`);
  console.log(`
  Don't forget:`);
  console.log(`  npm uninstall ${brickName}`);
}

// src/index.ts
var program = new Command();
program.name("skafform").description("Skafform CLI \u2014 manage bricks and project configuration").version("0.1.0");
program.command("create <name>").description("Scaffold a new Skafform project with theme-light").action((name) => create(name));
program.command("init").description("Initialize skafform.config.json and skafform-bricks.json").action(() => init(process.cwd()));
program.command("add <brick>").description("Register a brick from the bricks/ folder into skafform-bricks.json").action((brick) => add(brick, process.cwd()).catch((e) => {
  console.error(e.message);
  process.exit(1);
}));
program.command("remove <brick>").description("Remove a brick from skafform-bricks.json").action((brick) => remove(brick, process.cwd()));
program.parse();
