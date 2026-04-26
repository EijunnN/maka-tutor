import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import { createOverlayWindow } from './window';
import { registerHotkeys, unregisterHotkeys } from './hotkeys';
import { pathToShotUrl, registerShotProtocol, SHOT_SCHEME } from './protocol';
import { openSelectionWindow } from './selectionWindow';
import { cancelCurrentTurn, resetSession, sendTurn, setActiveSession } from './agent';
import {
  applyApiKeyToEnv,
  getSnapshot,
  setApiKey,
  setModel,
} from './settings';
import {
  deleteConversation,
  listConversations,
  loadConversation,
  saveConversation,
} from './conversations';
import type { Conversation, SendTurnPayload } from '@shared/types';

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

ipcMain.handle('agent:set-session', (_event, sessionId: string | undefined) => {
  setActiveSession(sessionId);
});

ipcMain.handle('conv:list', () => listConversations());
ipcMain.handle('conv:load', (_event, id: string) => loadConversation(id));
ipcMain.handle('conv:save', (_event, conv: Conversation) => saveConversation(conv));
ipcMain.handle('conv:delete', (_event, id: string) => deleteConversation(id));

ipcMain.handle('settings:get', () => getSnapshot());

ipcMain.handle('settings:set-api-key', (_event, value: string | null) => {
  try {
    setApiKey(value);
    applyApiKeyToEnv();
    return { ok: true };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : String(err) };
  }
});

ipcMain.handle('settings:set-model', (_event, model: string) => {
  setModel(model);
});

app.whenReady().then(() => {
  applyApiKeyToEnv();
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
