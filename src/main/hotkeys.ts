import { BrowserWindow, globalShortcut } from 'electron';
import { setTimeout as delay } from 'node:timers/promises';
import { captureMonitorAtCursor } from './capture';

export const HOTKEY_FULL = 'CommandOrControl+Shift+Space';
export const HOTKEY_REGION = 'CommandOrControl+Shift+A';
export const HOTKEY_TOGGLE = 'CommandOrControl+Shift+H';

const HIDE_DELAY_MS = 80;

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

    // Belt-and-suspenders: además de setContentProtection, ocultamos la
    // ventana antes de capturar por si WebView2 + transparente ignora el
    // flag en alguna combinación de Windows.
    const wasVisible = win.isVisible();
    if (wasVisible) win.hide();

    try {
      if (wasVisible) await delay(HIDE_DELAY_MS);
      const result = await captureMonitorAtCursor();
      win.webContents.send('screenshot:captured', {
        ...result,
        url: pathToShotUrl(result.path),
        mode: 'full' as const,
      });
    } catch (err) {
      console.error('[hotkey] full capture failed', err);
      win.webContents.send('screenshot:error', { message: String(err) });
    } finally {
      if (wasVisible && !win.isDestroyed()) win.show();
    }
  });

  globalShortcut.register(HOTKEY_REGION, () => {
    onRegion();
  });
}

export function unregisterHotkeys() {
  globalShortcut.unregisterAll();
}
