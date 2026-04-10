import { app, BrowserWindow } from "electron";
import { join } from "path";
import { networkInterfaces } from "os";
import { startServer, type ServerInstance } from "../server/index.ts";

let mainWindow: BrowserWindow | null = null;
let server: ServerInstance | null = null;

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

async function createWindow() {
  // Start the embedded server
  const distDir = join(app.getAppPath(), "dist");
  server = await startServer(distDir);

  const lanIp = getLanIp();
  const baseUrl = `http://${lanIp}:${server.port}`;

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: `cEDH Stream Tool — Producer`,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // Load the control panel
  await mainWindow.loadURL(`http://localhost:${server.port}/control/`);

  // Inject a banner showing the caster URL
  mainWindow.webContents.executeJavaScript(`
    (function() {
      const banner = document.createElement('div');
      banner.id = 'electron-banner';
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;background:#c8aa6e;color:#09090b;font-family:"JetBrains Mono",monospace;font-size:13px;font-weight:600;text-align:center;padding:6px 12px;user-select:all;cursor:text;';
      banner.textContent = 'Casters connect to: ${baseUrl}/caster/    |    OBS overlay: http://localhost:${server.port}/overlay/';
      document.body.prepend(banner);
      document.body.style.paddingTop = '32px';
    })();
  `);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (server) {
    server.httpServer.close();
  }
  app.quit();
});
