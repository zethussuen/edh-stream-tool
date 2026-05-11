import { app, BrowserWindow, Menu, shell } from "electron";
import { join } from "path";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { startServer, getLanIp, type ServerInstance } from "../server/index.ts";

// ── Single instance lock ──
// Prevents multiple copies (port 3000 would conflict)
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let server: ServerInstance | null = null;

// ── Window state persistence ──

interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
}

const stateFile = join(app.getPath("userData"), "window-state.json");

function loadWindowState(): WindowState {
  try {
    return JSON.parse(readFileSync(stateFile, "utf-8"));
  } catch {
    return { width: 1400, height: 900, isMaximized: false };
  }
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveWindowState(win: BrowserWindow) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const bounds = win.getBounds();
    const state: WindowState = {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      isMaximized: win.isMaximized(),
    };
    try {
      mkdirSync(app.getPath("userData"), { recursive: true });
      writeFileSync(stateFile, JSON.stringify(state));
    } catch {
      // non-critical
    }
  }, 500);
}

// ── OBS output directory ──

const obsDir = join(app.getPath("documents"), "cEDH Stream Tool");

// ── Native menu ──

function buildMenu(baseUrl: string) {
  const isMac = process.platform === "darwin";
  const appName = "cEDH Stream Tool";

  const template: Electron.MenuItemConstructorOptions[] = [
    // App menu (macOS only)
    ...(isMac
      ? [
          {
            label: appName,
            submenu: [
              { role: "about" as const },
              { type: "separator" as const },
              { role: "hide" as const },
              { role: "hideOthers" as const },
              { role: "unhide" as const },
              { type: "separator" as const },
              { role: "quit" as const },
            ],
          },
        ]
      : []),
    // Edit menu (enables copy/paste keyboard shortcuts)
    {
      label: "Edit",
      submenu: [
        { role: "undo" },
        { role: "redo" },
        { type: "separator" },
        { role: "cut" },
        { role: "copy" },
        { role: "paste" },
        { role: "selectAll" },
      ],
    },
    // View
    {
      label: "View",
      submenu: [
        { role: "reload" },
        { role: "forceReload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    // Window
    {
      label: "Window",
      submenu: [
        { role: "minimize" },
        { role: "zoom" },
        ...(isMac
          ? [{ type: "separator" as const }, { role: "front" as const }]
          : [{ role: "close" as const }]),
      ],
    },
    // Help
    {
      label: "Help",
      submenu: [
        {
          label: "Caster URL",
          click: () => {
            shell.openExternal(`${baseUrl}/caster/`);
          },
        },
        {
          label: "Overlay URL",
          click: () => {
            if (server) {
              shell.openExternal(`http://localhost:${server.port}/overlay/`);
            }
          },
        },
        { type: "separator" },
        {
          label: "Reveal OBS Files",
          click: () => {
            mkdirSync(obsDir, { recursive: true });
            shell.openPath(obsDir);
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Main window ──

async function createWindow() {
  const distDir = join(app.getAppPath(), "dist");
  server = await startServer(distDir, obsDir);

  const lanIp = getLanIp();
  const baseUrl = `http://${lanIp}:${server.port}`;

  buildMenu(baseUrl);

  const savedState = loadWindowState();

  mainWindow = new BrowserWindow({
    ...savedState,
    title: `cEDH Stream Tool — Producer`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  // Load the control panel
  await mainWindow.loadURL(`http://localhost:${server.port}/control/`);

  // Save window state on move/resize
  mainWindow.on("resize", () => mainWindow && saveWindowState(mainWindow));
  mainWindow.on("move", () => mainWindow && saveWindowState(mainWindow));
  mainWindow.on("maximize", () => mainWindow && saveWindowState(mainWindow));
  mainWindow.on("unmaximize", () => mainWindow && saveWindowState(mainWindow));

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ── App lifecycle ──

app.whenReady().then(createWindow);

// macOS: re-create window when clicking dock icon
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Second instance: focus existing window
app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on("window-all-closed", () => {
  // macOS: keep app running in dock when windows are closed
  if (process.platform !== "darwin") {
    shutdownServer();
    app.quit();
  }
});

app.on("before-quit", () => {
  shutdownServer();
});

function shutdownServer() {
  if (server) {
    server.httpServer.close();
    server = null;
  }
}
