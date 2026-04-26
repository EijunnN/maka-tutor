import { contextBridge, ipcRenderer } from 'electron';
import type { ApiBridge } from '@shared/types';

const api: ApiBridge = {
  ping: () => 'pong-from-preload',
  quit: () => ipcRenderer.invoke('app:quit'),
  setClickthrough: (enabled) => ipcRenderer.invoke('overlay:set-clickthrough', enabled),
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
});
