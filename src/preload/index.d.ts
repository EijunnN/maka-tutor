import type { ApiBridge, EventsBridge } from '@shared/types';

declare global {
  interface Window {
    api: ApiBridge;
    events: EventsBridge;
    ipc: {
      invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
    };
  }
}

export {};
