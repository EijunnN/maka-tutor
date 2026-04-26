// Índice in-memory de TODOS los mensajes de TODAS las conversaciones.
// Búsqueda por overlap de tokens con score idf-like simple.
// Para datasets pequeños (<10k mensajes) es suficientemente rápido y
// evita una dep nativa (better-sqlite3 con node-gyp). Si más adelante
// crecemos, migramos a SQLite FTS5 sin tocar la API.

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
  minScore?: number;
}

interface IndexedMessage {
  conversationId: string;
  messageId: string;
  role: 'user' | 'assistant';
  text: string;
  domain: string | null;
  createdAt: number;
  tokens: Set<string>;
  tokenCount: number;
}

const STOPWORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'al',
  'a', 'en', 'y', 'o', 'que', 'qué', 'es', 'son', 'lo', 'con', 'por', 'para',
  'me', 'te', 'se', 'no', 'sí', 'mi', 'tu', 'su', 'le', 'les', 'pero', 'si',
  'esto', 'eso', 'esta', 'este', 'ese', 'aquel', 'como', 'cómo', 'más', 'menos',
  'también', 'cuando', 'donde', 'porque', 'aunque', 'desde', 'hasta',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'and', 'or', 'of',
  'in', 'on', 'at', 'for', 'to', 'with', 'as', 'by', 'this', 'that', 'these',
  'those', 'it', 'i', 'you', 'we', 'they', 'he', 'she', 'how', 'what', 'why',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !STOPWORDS.has(t));
}

// Map { token → number of indexed messages containing it } para idf.
const docFreq = new Map<string, number>();
// Index: { conversationId → IndexedMessage[] }
const byConv = new Map<string, IndexedMessage[]>();
let totalDocs = 0;

function idf(token: string): number {
  const df = docFreq.get(token) ?? 0;
  if (df === 0) return 0;
  return Math.log(1 + (totalDocs - df + 0.5) / (df + 0.5));
}

export function clearIndex(): void {
  docFreq.clear();
  byConv.clear();
  totalDocs = 0;
}

export function indexConversation(
  conversationId: string,
  domain: string | null,
  messages: Array<{ id: string; role: 'user' | 'assistant'; text: string; createdAt: number }>,
): void {
  // Si la conversación ya estaba indexada, descontarla primero.
  const previous = byConv.get(conversationId);
  if (previous) {
    for (const m of previous) {
      for (const tok of m.tokens) {
        const cur = docFreq.get(tok) ?? 0;
        if (cur <= 1) docFreq.delete(tok);
        else docFreq.set(tok, cur - 1);
      }
      totalDocs -= 1;
    }
  }

  const indexed: IndexedMessage[] = [];
  for (const m of messages) {
    if (!m.text || m.text.trim().length === 0) continue;
    const tokens = new Set(tokenize(m.text));
    if (tokens.size === 0) continue;
    indexed.push({
      conversationId,
      messageId: m.id,
      role: m.role,
      text: m.text,
      domain,
      createdAt: m.createdAt,
      tokens,
      tokenCount: tokens.size,
    });
    for (const tok of tokens) {
      docFreq.set(tok, (docFreq.get(tok) ?? 0) + 1);
    }
    totalDocs += 1;
  }
  byConv.set(conversationId, indexed);
}

export function removeConversation(conversationId: string): void {
  const previous = byConv.get(conversationId);
  if (!previous) return;
  for (const m of previous) {
    for (const tok of m.tokens) {
      const cur = docFreq.get(tok) ?? 0;
      if (cur <= 1) docFreq.delete(tok);
      else docFreq.set(tok, cur - 1);
    }
    totalDocs -= 1;
  }
  byConv.delete(conversationId);
}

export function searchMemory(query: string, opts: SearchOptions = {}): MemoryHit[] {
  const { domain, limit = 3, minScore = 0.5 } = opts;
  const queryTokens = new Set(tokenize(query));
  if (queryTokens.size === 0) return [];

  const hits: MemoryHit[] = [];
  for (const messages of byConv.values()) {
    for (const m of messages) {
      if (domain && m.domain !== domain) continue;
      let score = 0;
      let overlap = 0;
      for (const qt of queryTokens) {
        if (m.tokens.has(qt)) {
          overlap += 1;
          score += idf(qt);
        }
      }
      if (overlap === 0) continue;
      // Pequeña penalización por mensajes muy largos (sesgo a precision).
      score = score / Math.sqrt(m.tokenCount);
      if (score < minScore) continue;
      hits.push({
        conversationId: m.conversationId,
        messageId: m.messageId,
        role: m.role,
        text: m.text,
        domain: m.domain,
        createdAt: m.createdAt,
        score,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score);
  return hits.slice(0, limit);
}

export function indexStats(): { docs: number; uniqueTokens: number; conversations: number } {
  return { docs: totalDocs, uniqueTokens: docFreq.size, conversations: byConv.size };
}
