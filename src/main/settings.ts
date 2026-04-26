import Store from 'electron-store';
import { safeStorage } from 'electron';

interface StoreSchema {
  encryptedApiKey?: string;
  model?: string;
}

const store = new Store<StoreSchema>({
  name: 'settings',
  defaults: {},
});

export interface SettingsSnapshot {
  hasApiKey: boolean;
  model: string;
}

export const DEFAULT_MODEL = 'claude-sonnet-4-5-20250929';

export function getSnapshot(): SettingsSnapshot {
  return {
    hasApiKey: Boolean(store.get('encryptedApiKey')),
    model: store.get('model') ?? DEFAULT_MODEL,
  };
}

export function getApiKey(): string | null {
  const enc = store.get('encryptedApiKey');
  if (!enc) return null;
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(enc, 'base64'));
  } catch {
    return null;
  }
}

export function setApiKey(value: string | null): void {
  if (!value) {
    store.delete('encryptedApiKey');
    delete process.env.ANTHROPIC_API_KEY;
    return;
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('OS keychain encryption no disponible');
  }
  const encrypted = safeStorage.encryptString(value);
  store.set('encryptedApiKey', encrypted.toString('base64'));
  process.env.ANTHROPIC_API_KEY = value;
}

export function getModel(): string {
  return store.get('model') ?? DEFAULT_MODEL;
}

export function setModel(model: string): void {
  if (!model || model === DEFAULT_MODEL) {
    store.delete('model');
  } else {
    store.set('model', model);
  }
}

export function applyApiKeyToEnv(): void {
  const key = getApiKey();
  if (key) {
    process.env.ANTHROPIC_API_KEY = key;
  }
}
