import { BrowserWindow, globalShortcut } from 'electron';
import { captureMonitorAtCursor } from './capture';

export const HOTKEY_FULL = 'CommandOrControl+Shift+Space';
export const HOTKEY_REGION = 'CommandOrControl+Shift+A';

interface RegisterArgs {
  getMainWindow: () => BrowserWindow | null;
  onRegion: () => void;
  pathToShotUrl: (absolutePath: string) => string;
}

export function registerHotkeys({ getMainWindow, onRegion, pathToShotUrl }: RegisterArgs) {
  globalShortcut.register(HOTKEY_FULL, async () => {
    const win = getMainWindow();
    if (!win) return;
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
