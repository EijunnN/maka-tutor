import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { readFile } from 'node:fs/promises';
import type { BrowserWindow } from 'electron';

interface ScreenshotInput {
  path: string;
  width: number;
  height: number;
}

interface SendTurnArgs {
  text: string;
  screenshots: ScreenshotInput[];
}

const MODEL = 'claude-sonnet-4-5-20250929';

const SYSTEM_PROMPT = `Eres un tutor experto en software, productividad y herramientas digitales. El usuario te comparte screenshots de su pantalla y te pide que le enseñes a usar lo que está viendo o a hacer una tarea específica.

Reglas:
- Responde en español, claro y directo.
- Da pasos numerados cortos. Cada paso debe ser una acción concreta que el usuario pueda hacer ahora mismo.
- Si necesitas ver un cambio de estado o confirmar dónde está el usuario, pídele otro screenshot ("Manda otra captura para que vea cómo te quedó").
- Usa markdown: listas, **negrita** para botones/opciones, \`código\` para nombres de archivos, comandos o controles UI.
- No inventes UI que no veas. Si el screenshot no es suficiente, dilo.
- Sé breve. Mejor dos pasos correctos que diez pasos genéricos.`;

let lastSessionId: string | undefined;
let currentAbort: AbortController | null = null;

export function resetSession(): void {
  lastSessionId = undefined;
}

export function cancelCurrentTurn(): void {
  if (currentAbort) {
    currentAbort.abort();
    currentAbort = null;
  }
}

export function getSessionId(): string | undefined {
  return lastSessionId;
}

interface ContentBlock {
  type: string;
  text?: string;
  source?: { type: string; media_type: string; data: string };
}

async function buildUserContent(args: SendTurnArgs): Promise<ContentBlock[]> {
  const content: ContentBlock[] = [];
  for (const shot of args.screenshots) {
    const buffer = await readFile(shot.path);
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/png',
        data: buffer.toString('base64'),
      },
    });
  }
  if (args.text.trim().length > 0 || content.length === 0) {
    content.push({ type: 'text', text: args.text });
  }
  return content;
}

export async function sendTurn(args: SendTurnArgs, win: BrowserWindow): Promise<void> {
  const content = await buildUserContent(args);

  async function* promptStream(): AsyncGenerator<SDKUserMessage> {
    yield {
      type: 'user',
      message: { role: 'user', content: content as never },
      parent_tool_use_id: null,
    };
  }

  const abort = new AbortController();
  currentAbort = abort;

  win.webContents.send('agent:turn-start');

  try {
    const stream = query({
      prompt: promptStream(),
      options: {
        model: MODEL,
        systemPrompt: SYSTEM_PROMPT,
        allowedTools: [],
        resume: lastSessionId,
        abortController: abort,
        settingSources: [],
      },
    });

    for await (const msg of stream) {
      const m = msg as { type: string; subtype?: string; session_id?: string; message?: { content?: ContentBlock[] } };

      if (m.type === 'system' && m.subtype === 'init') {
        if (typeof m.session_id === 'string') lastSessionId = m.session_id;
        continue;
      }

      if (m.type === 'assistant' && m.message?.content) {
        const text = m.message.content
          .filter((b) => b.type === 'text' && typeof b.text === 'string')
          .map((b) => b.text!)
          .join('');
        if (text.length > 0) {
          win.webContents.send('agent:assistant-message', { text });
        }
        continue;
      }

      if (m.type === 'result') {
        win.webContents.send('agent:turn-end', {
          sessionId: lastSessionId,
          subtype: m.subtype,
        });
      }
    }
  } catch (err) {
    const isAbort =
      err instanceof Error && (err.name === 'AbortError' || /aborted/i.test(err.message));
    if (isAbort) {
      win.webContents.send('agent:turn-cancelled');
    } else {
      console.error('[agent] turn failed', err);
      const message = err instanceof Error ? err.message : String(err);
      win.webContents.send('agent:error', { message });
    }
  } finally {
    if (currentAbort === abort) currentAbort = null;
  }
}
