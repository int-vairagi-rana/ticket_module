#!/usr/bin/env node
/**
 * install-private-packages.js
 *
 * Reads .private-packages.json, copies each private package's built dist/ +
 * package.json into node_modules/, and patches package-lock.json so that
 * future `npm install` runs don't hit the registry for private packages.
 *
 * Run automatically via `postinstall` in package.json, OR manually:
 *   node scripts/install-private-packages.js
 *
 * To specify a custom source path at runtime:
 *   INTELLISOLAR_COMMON_PATH=/your/path node scripts/install-private-packages.js
 */

"use strict";

const fs   = require("fs");
const path = require("path");

// ─── Paths ───────────────────────────────────────────────────────────────────
const PROJECT_ROOT  = path.resolve(__dirname, "..");
const CONFIG_FILE   = path.join(PROJECT_ROOT, ".private-packages.json");
const LOCK_FILE     = path.join(PROJECT_ROOT, "package-lock.json");
const NODE_MODULES  = path.join(PROJECT_ROOT, "node_modules");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Recursively copy a directory */
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/** Remove a directory recursively (safe — skips if missing) */
function removeDir(dir) {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

/** Update package-lock.json so npm won't try to fetch this pkg from registry */
function patchLockFile(pkgName, pkgJson) {
  if (!fs.existsSync(LOCK_FILE)) {
    console.warn(`  ⚠  package-lock.json not found — skipping lock patch`);
    return;
  }

  const lock = JSON.parse(fs.readFileSync(LOCK_FILE, "utf8"));

  const lockEntry = {
    version:      pkgJson.version,
    license:      pkgJson.license || "ISC",
    dependencies: pkgJson.dependencies || {},
  };

  // lockfileVersion 3 uses `packages` section
  if (!lock.packages) lock.packages = {};
  lock.packages[`node_modules/${pkgName}`] = lockEntry;

  // lockfileVersion 1/2 also uses `dependencies` section
  if (lock.lockfileVersion < 3) {
    if (!lock.dependencies) lock.dependencies = {};
    lock.dependencies[pkgName] = { ...lockEntry, resolved: "", integrity: "" };
  }

  fs.writeFileSync(LOCK_FILE, JSON.stringify(lock, null, 2) + "\n", "utf8");
  console.log(`  ✓  Patched package-lock.json for ${pkgName}@${pkgJson.version}`);
}

// ─── Main ────────────────────────────────────────────────────────────────────

function run() {
  // 1. Load config
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log("[private-packages] No .private-packages.json found — skipping.");
    return;
  }

  const config = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
  const packages = config.packages || {};

  if (Object.keys(packages).length === 0) {
    console.log("[private-packages] No packages configured — skipping.");
    return;
  }

  console.log("\n[private-packages] Installing private packages...\n");

  let installed = 0;
  let skipped   = 0;

  for (const [pkgName, opts] of Object.entries(packages)) {
    // Allow env-var override: e.g. INTELLISOLAR_COMMON_PATH=/custom/path
    const envKey    = pkgName.replace(/-/g, "_").toUpperCase() + "_PATH";
    const sourcePath = path.resolve(
      PROJECT_ROOT,
      process.env[envKey] || opts.sourcePath
    );

    console.log(`  → ${pkgName}`);
    console.log(`    source : ${sourcePath}`);

    // Validate source exists
    if (!fs.existsSync(sourcePath)) {
      console.warn(`    ⚠  Source path not found — skipping.\n`);
      skipped++;
      continue;
    }

    const srcPkgJsonPath = path.join(sourcePath, "package.json");
    const srcDistPath    = path.join(sourcePath, "dist");

    if (!fs.existsSync(srcPkgJsonPath)) {
      console.warn(`    ⚠  package.json not found in source — skipping.\n`);
      skipped++;
      continue;
    }

    if (!fs.existsSync(srcDistPath)) {
      console.warn(`    ⚠  dist/ folder not found in source — skipping.\n`);
      console.warn(`    ℹ  Run 'npm run build:prod' in ${sourcePath} first.\n`);
      skipped++;
      continue;
    }

    const pkgJson  = JSON.parse(fs.readFileSync(srcPkgJsonPath, "utf8"));
    const destPath = path.join(NODE_MODULES, pkgName);

    // 2. Clear old install
    removeDir(destPath);
    fs.mkdirSync(destPath, { recursive: true });

    // 3. Copy dist/ and package.json
    copyDir(srcDistPath, path.join(destPath, "dist"));
    fs.copyFileSync(srcPkgJsonPath, path.join(destPath, "package.json"));

    console.log(`    ✓  Copied dist/ and package.json → node_modules/${pkgName}/`);

    // 4. Patch package-lock.json
    patchLockFile(pkgName, pkgJson);

    console.log(`    ✓  Done  (v${pkgJson.version})\n`);
    installed++;
  }

  console.log(
    `[private-packages] Complete — ${installed} installed, ${skipped} skipped.\n`
  );
}

run();
