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
/** @type {string[]} */
const serverLogLines = [];
const MAX_LOG_LINES = 80;

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
  return DEFAULT_PORT;
}

function getServerLogPath() {
  return path.join(app.getPath('userData'), 'server.log');
}

function appendServerLog(chunk) {
  const text = String(chunk);
  process.stdout.write(`[server] ${text}`);
  for (const line of text.split(/\r?\n/)) {
    if (!line) continue;
    serverLogLines.push(line);
    if (serverLogLines.length > MAX_LOG_LINES) {
      serverLogLines.shift();
    }
  }
  try {
    fs.appendFileSync(getServerLogPath(), text);
  } catch {
    // ignore log write failures
  }
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
      const req = http.get(`http://localhost:${port}/health`, (res) => {
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

  const nodeModules = path.join(serverRoot, 'node_modules');
  if (!fs.existsSync(nodeModules)) {
    throw new Error(
      `Server dependencies missing:\n${nodeModules}\n` +
        'Rebuild with npm run dist:win (includeSubNodeModules).'
    );
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
  try {
    fs.writeFileSync(getServerLogPath(), `Starting server ${new Date().toISOString()}\nPORT=${port}\nROOT=${serverRoot}\n`);
  } catch {
    // ignore
  }

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

  serverProcess.stdout?.on('data', appendServerLog);
  serverProcess.stderr?.on('data', appendServerLog);

  serverProcess.on('exit', (code, signal) => {
    serverProcess = null;
    if (!isQuitting) {
      const tail = serverLogLines.slice(-25).join('\n');
      const detail = tail
        ? `\n\nLast server output:\n${tail}\n\nFull log:\n${getServerLogPath()}`
        : `\n\nNo server output captured.\nLog file:\n${getServerLogPath()}`;
      dialog.showErrorBox(
        'Obs Trivia game',
        `The local server stopped unexpectedly (${signal || code || 'unknown'}).${detail}`
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

  await mainWindow.loadURL(`http://localhost:${port}/`);

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
    const tail = serverLogLines.slice(-25).join('\n');
    dialog.showErrorBox(
      'Obs Trivia game failed to start',
      tail ? `${message}\n\nLast server output:\n${tail}` : message
    );
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
