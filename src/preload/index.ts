import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  AgentErrorEvent,
  ApiBridge,
  AssistantMessageEvent,
  EventsBridge,
  ScreenshotError,
  ScreenshotEvent,
  SendTurnPayload,
  TurnEndEvent,
} from '@shared/types';

const api: ApiBridge = {
  ping: () => 'pong-from-preload',
  quit: () => ipcRenderer.invoke('app:quit'),
  setClickthrough: (enabled) => ipcRenderer.invoke('overlay:set-clickthrough', enabled),
  sendTurn: (payload: SendTurnPayload) => ipcRenderer.invoke('agent:send', payload),
  cancelTurn: () => ipcRenderer.invoke('agent:cancel'),
  resetSession: () => ipcRenderer.invoke('agent:reset'),
};

function subscribe<T>(channel: string, cb: (data: T) => void): () => void {
  const handler = (_e: IpcRendererEvent, data: T) => cb(data);
  ipcRenderer.on(channel, handler);
  return () => {
    ipcRenderer.removeListener(channel, handler);
  };
}

const events: EventsBridge = {
  onScreenshot: (cb) => subscribe<ScreenshotEvent>('screenshot:captured', cb),
  onScreenshotError: (cb) => subscribe<ScreenshotError>('screenshot:error', cb),
  onAgentTurnStart: (cb) => subscribe<void>('agent:turn-start', () => cb()),
  onAgentMessage: (cb) => subscribe<AssistantMessageEvent>('agent:assistant-message', cb),
  onAgentTurnEnd: (cb) => subscribe<TurnEndEvent>('agent:turn-end', cb),
  onAgentTurnCancelled: (cb) => subscribe<void>('agent:turn-cancelled', () => cb()),
  onAgentError: (cb) => subscribe<AgentErrorEvent>('agent:error', cb),
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('events', events);
contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
});
