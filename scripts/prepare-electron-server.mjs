import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'electron-resources', 'server');

function copyDir(from, to) {
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

rmSync(out, { recursive: true, force: true });
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
execSync('npm install --omit=dev', { cwd: out, stdio: 'inherit' });
console.log('Electron server resources ready:', out);
