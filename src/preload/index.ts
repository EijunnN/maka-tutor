import { contextBridge, ipcRenderer } from 'electron';
import type { ApiBridge } from '@shared/types';

const api: ApiBridge = {
  ping: () => 'pong-from-preload',
  quit: () => ipcRenderer.invoke('app:quit'),
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
});
