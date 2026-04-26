import { app } from 'electron';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { detectDomain } from './harness/domains';
import { indexConversation, removeConversation } from './harness/memory';

export interface PersistedScreenshot {
  path: string;
  url: string;
  width: number;
  height: number;
  displayId: number;
  mode: 'full' | 'region';
}

export interface PersistedMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  shots?: PersistedScreenshot[];
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

function dir() {
  return join(app.getPath('userData'), 'conversations');
}

async function ensureDir(): Promise<string> {
  const d = dir();
  await mkdir(d, { recursive: true });
  return d;
}

function pathFor(id: string): string {
  return join(dir(), `${id}.json`);
}

export function newConversationId(): string {
  return `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function deriveTitle(firstUserText: string): string {
  const trimmed = firstUserText.trim().replace(/\s+/g, ' ');
  if (trimmed.length === 0) return 'Nueva conversación';
  return trimmed.length > 60 ? `${trimmed.slice(0, 57)}…` : trimmed;
}

export async function listConversations(): Promise<ConversationMeta[]> {
  await ensureDir();
  let names: string[] = [];
  try {
    names = await readdir(dir());
  } catch {
    return [];
  }
  const out: ConversationMeta[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try {
      const raw = await readFile(join(dir(), name), 'utf8');
      const conv = JSON.parse(raw) as Conversation;
      out.push({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        messageCount: conv.messages.length,
      });
    } catch {
      // archivo corrupto: ignorar
    }
  }
  out.sort((a, b) => b.updatedAt - a.updatedAt);
  return out;
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  try {
    const raw = await readFile(pathFor(id), 'utf8');
    return JSON.parse(raw) as Conversation;
  } catch {
    return null;
  }
}

function detectConvDomain(conv: Conversation): string | null {
  // Domain por la concatenación de los primeros 4 mensajes del usuario.
  const userText = conv.messages
    .filter((m) => m.role === 'user')
    .slice(0, 4)
    .map((m) => m.text)
    .join(' ');
  return detectDomain(userText)?.id ?? null;
}

export async function saveConversation(conv: Conversation): Promise<void> {
  await ensureDir();
  await writeFile(pathFor(conv.id), JSON.stringify(conv, null, 2), 'utf8');
  // Re-index la conversación al guardar.
  indexConversation(
    conv.id,
    detectConvDomain(conv),
    conv.messages.map((m) => ({
      id: m.id,
      role: m.role,
      text: m.text,
      createdAt: m.createdAt,
    })),
  );
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    await unlink(pathFor(id));
  } catch {
    // ignore
  }
  removeConversation(id);
}

// Carga todas las conversaciones del disco al boot del proceso main
// y las indexa para retrieval semántico. Llamar una vez después de
// app.whenReady().
export async function indexAllConversations(): Promise<void> {
  await ensureDir();
  let names: string[] = [];
  try {
    names = await readdir(dir());
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    try {
      const raw = await readFile(join(dir(), name), 'utf8');
      const conv = JSON.parse(raw) as Conversation;
      indexConversation(
        conv.id,
        detectConvDomain(conv),
        conv.messages.map((m) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          createdAt: m.createdAt,
        })),
      );
    } catch {
      // skip corrupt
    }
  }
}
