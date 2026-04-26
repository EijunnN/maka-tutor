import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import { createOverlayWindow } from './window';
import { registerHotkeys, unregisterHotkeys } from './hotkeys';
import { pathToShotUrl, registerShotProtocol, SHOT_SCHEME } from './protocol';
import { openSelectionWindow } from './selectionWindow';
import { cancelCurrentTurn, resetSession, sendTurn } from './agent';
import type { SendTurnPayload } from '@shared/types';

let mainWindow: BrowserWindow | null = null;

protocol.registerSchemesAsPrivileged([
  {
    scheme: SHOT_SCHEME,
    privileges: { secure: true, supportFetchAPI: true, stream: true, bypassCSP: false },
  },
]);

ipcMain.handle('ping', () => 'pong');

ipcMain.handle('app:quit', () => {
  app.quit();
});

ipcMain.handle('overlay:set-clickthrough', (_event, enabled: boolean) => {
  if (!mainWindow) return;
  mainWindow.setIgnoreMouseEvents(enabled, { forward: true });
});

ipcMain.handle('agent:send', async (_event, payload: SendTurnPayload) => {
  if (!mainWindow) return;
  await sendTurn(payload, mainWindow);
});

ipcMain.handle('agent:cancel', () => {
  cancelCurrentTurn();
});

ipcMain.handle('agent:reset', () => {
  resetSession();
});

app.whenReady().then(() => {
  registerShotProtocol();

  mainWindow = createOverlayWindow();

  registerHotkeys({
    getMainWindow: () => mainWindow,
    pathToShotUrl,
    onRegion: () => {
      void openSelectionWindow({ mainWindow });
    },
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createOverlayWindow();
    }
  });
});

app.on('will-quit', () => {
  unregisterHotkeys();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
