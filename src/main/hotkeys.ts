import { BrowserWindow, globalShortcut } from 'electron';
import { captureMonitorAtCursor } from './capture';

export const HOTKEY_FULL = 'CommandOrControl+Shift+Space';
export const HOTKEY_REGION = 'CommandOrControl+Shift+A';
export const HOTKEY_TOGGLE = 'CommandOrControl+Shift+H';

interface RegisterArgs {
  getMainWindow: () => BrowserWindow | null;
  onRegion: () => void;
  pathToShotUrl: (absolutePath: string) => string;
}

export function registerHotkeys({ getMainWindow, onRegion, pathToShotUrl }: RegisterArgs) {
  globalShortcut.register(HOTKEY_TOGGLE, () => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.showInactive();
    }
  });

  globalShortcut.register(HOTKEY_FULL, async () => {
    const win = getMainWindow();
    if (!win) return;

    // El overlay ya está excluido de la captura via setContentProtection
    // (window.ts). No ocultamos la ventana para evitar el parpadeo durante
    // los ~500-1500ms que tarda desktopCapturer.getSources() a alta resolución.
    try {
      const result = await captureMonitorAtCursor();
      win.webContents.send('screenshot:captured', {
        ...result,
        url: pathToShotUrl(result.path),
        mode: 'full' as const,
      });
    } catch (err) {
      console.error('[hotkey] full capture failed', err);
      win.webContents.send('screenshot:error', { message: String(err) });
    }
  });

  globalShortcut.register(HOTKEY_REGION, () => {
    onRegion();
  });
}

export function unregisterHotkeys() {
  globalShortcut.unregisterAll();
}
