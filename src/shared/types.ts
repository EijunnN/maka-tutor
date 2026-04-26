export type ScreenshotMode = 'full' | 'region';

export interface ScreenshotEvent {
  path: string;
  url: string;
  width: number;
  height: number;
  displayId: number;
  mode: ScreenshotMode;
}

export interface ScreenshotError {
  message: string;
}

export interface SendTurnPayload {
  text: string;
  screenshots: Array<{ path: string; width: number; height: number }>;
}

export interface AssistantMessageEvent {
  text: string;
}

export interface TurnEndEvent {
  sessionId: string | undefined;
  subtype?: string;
}

export interface AgentErrorEvent {
  message: string;
}

export interface EventsBridge {
  onScreenshot: (cb: (data: ScreenshotEvent) => void) => () => void;
  onScreenshotError: (cb: (err: ScreenshotError) => void) => () => void;
  onAgentTurnStart: (cb: () => void) => () => void;
  onAgentMessage: (cb: (msg: AssistantMessageEvent) => void) => () => void;
  onAgentTurnEnd: (cb: (evt: TurnEndEvent) => void) => () => void;
  onAgentTurnCancelled: (cb: () => void) => () => void;
  onAgentError: (cb: (err: AgentErrorEvent) => void) => () => void;
}

export interface SettingsSnapshot {
  hasApiKey: boolean;
  model: string;
}

export interface ApiBridge {
  ping: () => string;
  quit: () => Promise<void>;
  setClickthrough: (enabled: boolean) => Promise<void>;
  sendTurn: (payload: SendTurnPayload) => Promise<void>;
  cancelTurn: () => Promise<void>;
  resetSession: () => Promise<void>;
  getSettings: () => Promise<SettingsSnapshot>;
  setApiKey: (value: string | null) => Promise<{ ok: boolean; message?: string }>;
  setModel: (model: string) => Promise<void>;
}
