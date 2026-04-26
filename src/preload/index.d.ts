import type { ApiBridge } from '@shared/types';

declare global {
  interface Window {
    api: ApiBridge;
    ipc: {
      invoke: <T = unknown>(channel: string, ...args: unknown[]) => Promise<T>;
    };
  }
}

export {};
