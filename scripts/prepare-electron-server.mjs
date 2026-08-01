import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'electron-resources', 'server');

function copyDir(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

function rmQuiet(target) {
  rmSync(target, { recursive: true, force: true });
}

/** Drop docs/tests/maps and unused TypeORM / sql.js variants to shrink the installer. */
function pruneServerNodeModules(nodeModules) {
  if (!existsSync(nodeModules)) return;

  const killNames = new Set([
    'readme',
    'readme.md',
    'readme.txt',
    'changelog',
    'changelog.md',
    'history.md',
    'license',
    'license.md',
    'license.txt',
    'licence',
    'licence.md',
    'authors',
    'authors.md',
    'contributing',
    'contributing.md',
    'security.md',
    'tsconfig.json',
    'tsconfig.base.json',
    '.npmignore',
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.cjs',
    '.prettierrc',
    'makefile',
  ]);

  const killDirNames = new Set([
    'test',
    'tests',
    '__tests__',
    'docs',
    'doc',
    'example',
    'examples',
    'benchmark',
    'benchmarks',
    '.github',
    'coverage',
  ]);

  /** @param {string} dir */
  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const full = join(dir, entry.name);
      const lower = entry.name.toLowerCase();

      if (entry.isDirectory()) {
        if (killDirNames.has(lower)) {
          rmQuiet(full);
          continue;
        }
        walk(full);
        continue;
      }

      if (
        killNames.has(lower) ||
        lower.endsWith('.map') ||
        lower.endsWith('.d.ts') ||
        (lower.endsWith('.ts') && !lower.endsWith('.d.ts')) ||
        lower.endsWith('.md')
      ) {
        if (lower === 'package.json') continue;
        rmQuiet(full);
      }
    }
  }

  walk(nodeModules);

  // TypeORM browser build is unused in Nest Node
  rmQuiet(join(nodeModules, 'typeorm', 'browser'));

  // sql.js: keep wasm (+ matching js); drop asm / debug / unused workers
  const sqlDist = join(nodeModules, 'sql.js', 'dist');
  if (existsSync(sqlDist)) {
    for (const name of readdirSync(sqlDist)) {
      const keep =
        name === 'sql-wasm.js' ||
        name === 'sql-wasm.wasm' ||
        name === 'sql-wasm-browser.js' ||
        name === 'sql-wasm-browser.wasm';
      if (!keep) rmQuiet(join(sqlDist, name));
    }
  }
}

function dirSizeMb(dir) {
  if (!existsSync(dir)) return 0;
  let total = 0;
  /** @param {string} d */
  function walk(d) {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else {
        try {
          total += statSync(full).size;
        } catch {
          // ignore
        }
      }
    }
  }
  walk(dir);
  return total / (1024 * 1024);
}

rmQuiet(out);
mkdirSync(out, { recursive: true });

const distDir = join(root, 'dist');
const frontendDist = join(root, 'frontend', 'dist');
if (!existsSync(distDir)) {
  throw new Error('Missing dist/. Run npm run build:server first.');
}
if (!existsSync(frontendDist)) {
  throw new Error('Missing frontend/dist/. Run npm run build --prefix frontend first.');
}

copyDir(distDir, join(out, 'dist'));
copyDir(frontendDist, join(out, 'frontend', 'dist'));

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
writeFileSync(
  join(out, 'package.json'),
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      private: true,
      dependencies: pkg.dependencies,
    },
    null,
    2
  )
);

const envSrc = join(root, '.env');
if (existsSync(envSrc)) {
  cpSync(envSrc, join(out, '.env'));
} else {
  console.warn('Warning: no root .env found — packaged app will need TWITCH_CLIENT_ID.');
}

console.log('Installing production dependencies into electron-resources/server ...');
execSync('npm install --omit=dev --no-fund --no-audit', { cwd: out, stdio: 'inherit' });

const nm = join(out, 'node_modules');
const before = dirSizeMb(nm);
console.log(`Pruning server node_modules (was ${before.toFixed(1)} MB) ...`);
pruneServerNodeModules(nm);
const after = dirSizeMb(nm);
console.log(
  `Server node_modules: ${after.toFixed(1)} MB (saved ${(before - after).toFixed(1)} MB)`
);
console.log('Electron server resources ready:', out);
