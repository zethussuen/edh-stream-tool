import { app, BrowserWindow, Menu, shell } from "electron";
import { join } from "path";
import { networkInterfaces } from "os";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { startServer, type ServerInstance } from "../server/index.ts";

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

// ── Utilities ──

function getLanIp(): string {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

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
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── Main window ──

async function createWindow() {
  const distDir = join(app.getAppPath(), "dist");
  server = await startServer(distDir);

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

  // Inject a banner showing connection URLs
  const overlayBase = `http://localhost:${server.port}`;
  mainWindow.webContents.executeJavaScript(`
    (function() {
      const banner = document.createElement('div');
      banner.id = 'electron-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c8aa6e;color:#09090b;font-family:"JetBrains Mono",monospace;font-size:11px;text-align:center;padding:4px 12px;line-height:1.6;';

      function urlSpan(label, url) {
        return '<span style="user-select:none;cursor:default;font-weight:600;">' + label + '</span>' +
               '<span style="user-select:text;cursor:text;background:rgba(0,0,0,0.08);padding:1px 4px;border-radius:3px;margin-left:4px;">' + url + '</span>';
      }

      banner.innerHTML = [
        urlSpan('Casters:', '${baseUrl}/caster/'),
        urlSpan('All Overlays:', '${overlayBase}/overlay/'),
        urlSpan('Spotlight:', '${overlayBase}/spotlight/'),
        urlSpan('Player names:', '${overlayBase}/nameplates/'),
        urlSpan('Cards + Drawings:', '${overlayBase}/annotations/'),
      ].join('<span style="user-select:none;color:rgba(0,0,0,0.3);margin:0 6px;">|</span>');

      document.body.prepend(banner);
      document.body.style.paddingTop = banner.offsetHeight + 'px';
    })();
  `);

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
