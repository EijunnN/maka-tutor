import { BrowserWindow, ipcMain, screen } from 'electron';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import {
  captureMonitorAtCursor,
  cropCapturedRegion,
  type CaptureRect,
} from './capture';
import { pathToShotUrl } from './protocol';

interface OpenArgs {
  mainWindow: BrowserWindow | null;
}

let isOpen = false;

export async function openSelectionWindow({ mainWindow }: OpenArgs) {
  if (isOpen || !mainWindow) return;
  isOpen = true;

  const wasVisible = mainWindow.isVisible();
  mainWindow.hide();
  await delay(80);

  let captured;
  try {
    captured = await captureMonitorAtCursor();
  } catch (err) {
    console.error('[selection] pre-capture failed', err);
    if (wasVisible) mainWindow.show();
    isOpen = false;
    mainWindow.webContents.send('screenshot:error', { message: String(err) });
    return;
  }

  const cursor = screen.getCursorScreenPoint();
  const display = screen.getDisplayNearestPoint(cursor);

  const win = new BrowserWindow({
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    show: false,
    frame: false,
    transparent: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    hasShadow: false,
    autoHideMenuBar: true,
    alwaysOnTop: true,
    focusable: true,
    backgroundColor: '#000000',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setContentProtection(true);

  const params = new URLSearchParams({
    source: pathToShotUrl(captured.path),
    displayId: String(display.id),
  }).toString();

  if (process.env['ELECTRON_RENDERER_URL']) {
    await win.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/selection.html?${params}`);
  } else {
    await win.loadFile(join(__dirname, '../renderer/selection.html'), { search: params });
  }

  win.show();
  win.focus();

  ipcMain.removeHandler('selection:done');
  ipcMain.removeHandler('selection:cancel');

  let resolved = false;

  const cleanup = () => {
    if (resolved) return;
    resolved = true;
    ipcMain.removeHandler('selection:done');
    ipcMain.removeHandler('selection:cancel');
    if (!win.isDestroyed()) win.close();
    if (wasVisible) mainWindow.show();
    isOpen = false;
  };

  ipcMain.handle(
    'selection:done',
    async (_event, payload: { rect: CaptureRect; displayId: number }) => {
      try {
        const result = await cropCapturedRegion(
          captured.path,
          payload.displayId,
          payload.rect,
        );
        mainWindow.webContents.send('screenshot:captured', {
          ...result,
          url: pathToShotUrl(result.path),
          mode: 'region' as const,
        });
      } catch (err) {
        console.error('[selection] crop failed', err);
        mainWindow.webContents.send('screenshot:error', { message: String(err) });
      } finally {
        cleanup();
      }
    },
  );

  ipcMain.handle('selection:cancel', () => {
    cleanup();
  });

  win.on('closed', cleanup);
}
