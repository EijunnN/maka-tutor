export type ScreenshotMode = 'full' | 'region';

export interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  shots?: ScreenshotEvent[];
  createdAt: number;
}

export interface Conversation {
  id: string;
  title: string;
  sessionId?: string;
  messages: PersistedMessage[];
  createdAt: number;
  updatedAt: number;
}

export interface ConversationMeta {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

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

export interface AssistantDeltaEvent {
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
  onAgentDelta: (cb: (msg: AssistantDeltaEvent) => void) => () => void;
  onAgentFinal: (cb: (msg: AssistantMessageEvent) => void) => () => void;
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
  setActiveSession: (sessionId: string | undefined) => Promise<void>;
  getSettings: () => Promise<SettingsSnapshot>;
  setApiKey: (value: string | null) => Promise<{ ok: boolean; message?: string }>;
  setModel: (model: string) => Promise<void>;
  listConversations: () => Promise<ConversationMeta[]>;
  loadConversation: (id: string) => Promise<Conversation | null>;
  saveConversation: (conv: Conversation) => Promise<void>;
  deleteConversation: (id: string) => Promise<void>;
}
