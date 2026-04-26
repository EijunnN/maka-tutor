import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { nativeImage, type BrowserWindow } from 'electron';
import { getModel } from './settings';
import { findClaudeExecutable } from './claudePath';
import { buildTurnContext } from './harness/orchestrator';

const MAX_IMAGE_DIMENSION = 1568;
const JPEG_QUALITY = 85;

interface ScreenshotInput {
  path: string;
  width: number;
  height: number;
}

interface SendTurnArgs {
  text: string;
  screenshots: ScreenshotInput[];
}

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

export function setActiveSession(sessionId: string | undefined): void {
  lastSessionId = sessionId;
}

interface ContentBlock {
  type: string;
  text?: string;
  source?: { type: string; media_type: string; data: string };
}

function compressForVision(absolutePath: string): { data: string; mediaType: string } {
  const img = nativeImage.createFromPath(absolutePath);
  if (img.isEmpty()) {
    throw new Error(`Could not load image at ${absolutePath}`);
  }
  const { width, height } = img.getSize();
  const longest = Math.max(width, height);
  const scale = longest > MAX_IMAGE_DIMENSION ? MAX_IMAGE_DIMENSION / longest : 1;
  const resized = scale < 1
    ? img.resize({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        quality: 'best',
      })
    : img;
  const jpeg = resized.toJPEG(JPEG_QUALITY);
  return { data: jpeg.toString('base64'), mediaType: 'image/jpeg' };
}

async function buildUserContent(args: SendTurnArgs): Promise<ContentBlock[]> {
  const content: ContentBlock[] = [];
  for (const shot of args.screenshots) {
    const { data, mediaType } = compressForVision(shot.path);
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: mediaType,
        data,
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
  const turnCtx = await buildTurnContext(args.text);

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

  // Watchdog: si en 8s no llega el primer mensaje del SDK, asumimos
  // que el binario no encontró credenciales y abortamos.
  let firstMessageSeen = false;
  let watchdogFired = false;
  const watchdog = setTimeout(() => {
    if (!firstMessageSeen) {
      watchdogFired = true;
      console.error('[agent] watchdog fired — no SDK messages in 8s');
      win.webContents.send('agent:error', {
        message:
          'El agente no respondió en 8s. Mira la terminal de bun run dev: si hay líneas [claude stderr], ahí está la pista. Si no, configura una API key en Ajustes.',
      });
      abort.abort();
    }
  }, 8_000);

  try {
    const userClaudeBin = findClaudeExecutable();
    const stream = query({
      prompt: promptStream(),
      options: {
        model: getModel(),
        systemPrompt: turnCtx.systemPrompt,
        allowedTools: [],
        resume: lastSessionId,
        abortController: abort,
        settingSources: [],
        includePartialMessages: true,
        stderr: (data: string) => {
          console.error('[claude stderr]', data.trim());
        },
        ...(userClaudeBin ? { pathToClaudeCodeExecutable: userClaudeBin } : {}),
      },
    });

    for await (const msg of stream) {
      firstMessageSeen = true;
      const m = msg as {
        type: string;
        subtype?: string;
        session_id?: string;
        message?: { content?: ContentBlock[] };
        event?: { type?: string; delta?: { type?: string; text?: string } };
        result?: string;
      };

      if (m.type === 'system' && m.subtype === 'init') {
        if (typeof m.session_id === 'string') lastSessionId = m.session_id;
        continue;
      }

      if (m.type === 'stream_event' && m.event?.type === 'content_block_delta') {
        const delta = m.event.delta;
        if (delta?.type === 'text_delta' && typeof delta.text === 'string' && delta.text.length > 0) {
          win.webContents.send('agent:assistant-delta', { text: delta.text });
        }
        continue;
      }

      if (m.type === 'assistant' && m.message?.content) {
        const text = m.message.content
          .filter((b) => b.type === 'text' && typeof b.text === 'string')
          .map((b) => b.text!)
          .join('');
        if (text.length > 0) {
          // Mensaje completo final del turno: lo emitimos para que el
          // renderer pueda corregir el placeholder por si algún delta
          // se perdió (el handler hace replace, no append).
          win.webContents.send('agent:assistant-final', { text });
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
    if (watchdogFired) {
      // ya emitimos el error específico desde el watchdog, no duplicar
    } else {
      const isAbort =
        err instanceof Error && (err.name === 'AbortError' || /aborted/i.test(err.message));
      if (isAbort) {
        win.webContents.send('agent:turn-cancelled');
      } else {
        console.error('[agent] turn failed', err);
        const message = err instanceof Error ? err.message : String(err);
        win.webContents.send('agent:error', { message });
      }
    }
  } finally {
    clearTimeout(watchdog);
    if (currentAbort === abort) currentAbort = null;
  }
}
