import { app, BrowserWindow, ipcMain } from 'electron';
import { createOverlayWindow } from './window';

let mainWindow: BrowserWindow | null = null;

ipcMain.handle('ping', () => 'pong');

ipcMain.handle('app:quit', () => {
  app.quit();
});

ipcMain.handle('overlay:set-clickthrough', (_event, enabled: boolean) => {
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
});

app.whenReady().then(() => {
  mainWindow = createOverlayWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createOverlayWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
