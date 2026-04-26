import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';
import type {
  AgentErrorEvent,
  ApiBridge,
  AssistantDeltaEvent,
  AssistantMessageEvent,
  EventsBridge,
  ScreenshotError,
  ScreenshotEvent,
  SendTurnPayload,
  SettingsSnapshot,
  TurnEndEvent,
} from '@shared/types';

const api: ApiBridge = {
  ping: () => 'pong-from-preload',
  quit: () => ipcRenderer.invoke('app:quit'),
  setClickthrough: (enabled) => ipcRenderer.invoke('overlay:set-clickthrough', enabled),
  sendTurn: (payload: SendTurnPayload) => ipcRenderer.invoke('agent:send', payload),
  cancelTurn: () => ipcRenderer.invoke('agent:cancel'),
  resetSession: () => ipcRenderer.invoke('agent:reset'),
  getSettings: () => ipcRenderer.invoke('settings:get') as Promise<SettingsSnapshot>,
  setApiKey: (value) => ipcRenderer.invoke('settings:set-api-key', value),
  setModel: (model) => ipcRenderer.invoke('settings:set-model', model),
};

// Un solo ipcRenderer.on por canal; los suscriptores se mantienen
// en una Set local. Esto evita que el cleanup vía contextBridge falle
// (las funciones devueltas por funciones expuestas no siempre liberan
// el listener real, lo que duplica callbacks bajo React StrictMode).
const channelHandlers = new Map<string, Set<(data: unknown) => void>>();

function subscribe<T>(channel: string, cb: (data: T) => void): () => void {
  let bucket = channelHandlers.get(channel);
  if (!bucket) {
    bucket = new Set();
    channelHandlers.set(channel, bucket);
    ipcRenderer.on(channel, (_e: IpcRendererEvent, data: unknown) => {
      const handlers = channelHandlers.get(channel);
      if (!handlers) return;
      for (const h of handlers) h(data);
    });
  }
  const handler = cb as (data: unknown) => void;
  bucket.add(handler);
  return () => {
    channelHandlers.get(channel)?.delete(handler);
  };
}

const events: EventsBridge = {
  onScreenshot: (cb) => subscribe<ScreenshotEvent>('screenshot:captured', cb),
  onScreenshotError: (cb) => subscribe<ScreenshotError>('screenshot:error', cb),
  onAgentTurnStart: (cb) => subscribe<void>('agent:turn-start', () => cb()),
  onAgentDelta: (cb) => subscribe<AssistantDeltaEvent>('agent:assistant-delta', cb),
  onAgentFinal: (cb) => subscribe<AssistantMessageEvent>('agent:assistant-final', cb),
  onAgentTurnEnd: (cb) => subscribe<TurnEndEvent>('agent:turn-end', cb),
  onAgentTurnCancelled: (cb) => subscribe<void>('agent:turn-cancelled', () => cb()),
  onAgentError: (cb) => subscribe<AgentErrorEvent>('agent:error', cb),
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('events', events);
contextBridge.exposeInMainWorld('ipc', {
  invoke: (channel: string, ...args: unknown[]) => ipcRenderer.invoke(channel, ...args),
});
