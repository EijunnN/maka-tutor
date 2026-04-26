// Stub que se llenará en 7b con el índice in-memory + retrieval.
// De momento devuelve vacío para que el orchestrator compile.

export interface MemoryHit {
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant';
  text: string;
  domain: string | null;
  createdAt: number;
  score: number;
}

export interface SearchOptions {
  domain?: string;
  limit?: number;
}

export function searchMemory(_query: string, _opts: SearchOptions = {}): MemoryHit[] {
  return [];
}

export function indexConversation(_id: string, _domain: string | null, _messages: Array<{ id: string; role: 'user' | 'assistant'; text: string; createdAt: number }>): void {
  // no-op
}

export function clearIndex(): void {
  // no-op
}
