const { app, BrowserWindow, dialog, shell } = require('electron');
const { spawn } = require('child_process');
const fs = require('fs');
const http = require('http');
const path = require('path');

const DEFAULT_PORT = 4000;

/** @type {import('child_process').ChildProcess | null} */
let serverProcess = null;
/** @type {BrowserWindow | null} */
let mainWindow = null;
let isQuitting = false;

function isPackaged() {
  return app.isPackaged;
}

function getServerRoot() {
  if (isPackaged()) {
    return path.join(process.resourcesPath, 'server');
  }
  return path.join(__dirname, '..');
}

function getPort() {
  const fromEnv = Number(process.env.PORT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : DEFAULT_PORT;
}

function readTwitchClientId(serverRoot) {
  const envPath = path.join(serverRoot, '.env');
  if (!fs.existsSync(envPath)) return null;
  const text = fs.readFileSync(envPath, 'utf8');
  const match = text.match(/^\s*TWITCH_CLIENT_ID\s*=\s*(.+)\s*$/m);
  if (!match) return null;
  const value = match[1].trim().replace(/^["']|["']$/g, '');
  if (!value || value === 'your_twitch_client_id') return null;
  return value;
}

function waitForHealth(port, timeoutMs = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const req = http.get(`http://127.0.0.1:${port}/health`, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });
      req.on('error', retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    const retry = () => {
      if (Date.now() - started > timeoutMs) {
        reject(new Error(`Server did not become ready on port ${port}`));
        return;
      }
      setTimeout(tryOnce, 400);
    };

    tryOnce();
  });
}

function startNestServer() {
  const serverRoot = getServerRoot();
  const entry = path.join(serverRoot, 'dist', 'main.js');
  const port = getPort();

  if (!fs.existsSync(entry)) {
    throw new Error(`Server entry not found:\n${entry}\nRun npm run build first.`);
  }

  const clientId = readTwitchClientId(serverRoot);
  if (!clientId) {
    throw new Error(
      'TWITCH_CLIENT_ID is missing or still a placeholder in .env.\n' +
        'Set it before packaging or place a valid .env next to the server files.'
    );
  }

  const userData = app.getPath('userData');
  const databasePath = path.join(userData, 'data', 'obs-trivia-game.db');
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const env = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    PORT: String(port),
    DATABASE_PATH: databasePath,
  };

  serverProcess = spawn(process.execPath, [entry], {
    cwd: serverRoot,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  serverProcess.stdout?.on('data', (chunk) => {
    process.stdout.write(`[server] ${chunk}`);
  });
  serverProcess.stderr?.on('data', (chunk) => {
    process.stderr.write(`[server] ${chunk}`);
  });

  serverProcess.on('exit', (code, signal) => {
    serverProcess = null;
    if (!isQuitting) {
      dialog.showErrorBox(
        'Obs Trivia game',
        `The local server stopped unexpectedly (${signal || code || 'unknown'}).`
      );
      app.quit();
    }
  });

  return { port, serverRoot };
}

function stopNestServer() {
  if (!serverProcess || serverProcess.killed) return;
  const child = serverProcess;
  serverProcess = null;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/f', '/t'], {
      stdio: 'ignore',
      windowsHide: true,
    });
  } else {
    child.kill('SIGTERM');
  }
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    title: 'Obs Trivia game',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  await mainWindow.loadURL(`http://127.0.0.1:${port}/`);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

async function bootstrap() {
  try {
    const { port } = startNestServer();
    await waitForHealth(port);
    await createWindow(port);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    dialog.showErrorBox('Obs Trivia game failed to start', message);
    stopNestServer();
    app.quit();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(bootstrap);

  app.on('before-quit', () => {
    isQuitting = true;
    stopNestServer();
  });

  app.on('window-all-closed', () => {
    isQuitting = true;
    stopNestServer();
    app.quit();
  });
}
