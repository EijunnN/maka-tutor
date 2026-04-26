import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  ApiBridge,
  EventsBridge,
  ScreenshotError,
  ScreenshotEvent,
} from '@shared/types';

const api: ApiBridge = {
  ping: () => 'pong-from-preload',
  quit: () => ipcRenderer.invoke('app:quit'),
  setClickthrough: (enabled) => ipcRenderer.invoke('overlay:set-clickthrough', enabled),
};

const events: EventsBridge = {
  onScreenshot: (cb) => {
    const handler = (_e: IpcRendererEvent, data: ScreenshotEvent) => cb(data);
    ipcRenderer.on('screenshot:captured', handler);
    return () => {
      ipcRenderer.removeListener('screenshot:captured', handler);
    };
  },
  onScreenshotError: (cb) => {
    const handler = (_e: IpcRendererEvent, err: ScreenshotError) => cb(err);
    ipcRenderer.on('screenshot:error', handler);
    return () => {
      ipcRenderer.removeListener('screenshot:error', handler);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('events', events);
contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
});
