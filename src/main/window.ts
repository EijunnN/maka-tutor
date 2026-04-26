import { BrowserWindow, screen } from 'electron';
import { join } from 'node:path';
import { MicaBrowserWindow, IS_WINDOWS_11 } from 'mica-electron';

export function createOverlayWindow(): BrowserWindow {
  const primary = screen.getPrimaryDisplay();
  const { x, y, width, height } = primary.workArea;

  const winOpts = {
    x,
    y,
    width,
    height,
    show: false,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    autoHideMenuBar: true,
    title: 'aprende-mierda',
    backgroundColor: '#00000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  } as const;

  // En Win11, MicaBrowserWindow expone DwmSetWindowAttribute
  // (Mica + Acrylic). El acrylic blurea el wallpaper detrás
  // de la ventana SOLO en píxeles con alfa parcial — las
  // zonas completamente transparentes del webview siguen
  // mostrando el desktop sin blur.
  const win: BrowserWindow =
    process.platform === 'win32' && IS_WINDOWS_11
      ? (new MicaBrowserWindow(winOpts) as unknown as BrowserWindow)
      : new BrowserWindow(winOpts);

  if (process.platform === 'win32' && IS_WINDOWS_11) {
    const mw = win as unknown as MicaBrowserWindow;
    try {
      mw.setDarkTheme();
      mw.setMicaAcrylicEffect();
    } catch (err) {
      console.warn('[window] acrylic setup failed', err);
    }
  }

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setContentProtection(true);
  win.setIgnoreMouseEvents(true, { forward: true });

  win.on('ready-to-show', () => win.show());

  if (process.env['ELECTRON_RENDERER_URL']) {
    win.loadURL(process.env['ELECTRON_RENDERER_URL']);
    if (process.env['OPEN_DEVTOOLS'] === '1') {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'));
  }

  return win;
}
