import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { findClaudeExecutable } from '../claudePath';
import { patchProfile, type UserProfile } from './profile';
import { patchDomain, type DomainProfile } from './domains';

// Haiku barato para clasificación + updates. ~$0.001-0.003 por turno.
const UPDATER_MODEL = 'claude-haiku-4-5-20251001';

const UPDATER_SYSTEM = `Eres un actualizador de perfil de un alumno que está siendo tutorizado por otro agente.

Recibes el último turno (mensaje del usuario + respuesta del tutor) y opcionalmente el perfil/dominio actuales.

Devuelve EXCLUSIVAMENTE un JSON con este shape (sin texto antes o después, sin markdown, sin explicaciones):

{
  "profile_updates": {
    "level_general"?: "principiante" | "intermedio" | "avanzado" | "mixto",
    "explanation_style"?: string,
    "interests"?: string[],
    "notes"?: string
  },
  "domain_updates": {
    "level"?: "principiante" | "intermedio" | "avanzado",
    "concepts_mastered"?: string[],
    "concepts_in_progress"?: string[],
    "recurring_mistakes"?: string[],
    "notes"?: string
  }
}

Reglas:
- Sé CONSERVADOR. Si no hay evidencia clara, devuelve {} (no inventes).
- Solo añade items NUEVOS, no repitas los que ya están en el perfil/dominio actuales (te los paso para que sepas).
- "concepts_mastered" requiere que el usuario haya demostrado que entendió, no solo que se le explicó.
- "concepts_in_progress" si se mencionó pero no se confirmó dominio.
- "recurring_mistakes" solo si VIO un error específico del usuario en este turno.
- "notes" para detalles de personalidad, contexto profesional o preferencias mencionadas explícitamente.
- "level_general" / domain "level" actualízalos solo si tienes evidencia fuerte de cambio (varios turnos en este nivel).
- Si el dominio_id que recibes es null, omite "domain_updates" o devuelve {} ahí.

Sé corto en concepts/notes (máx 5-7 palabras cada string).`;

interface UpdaterInput {
  domainId: string | null;
  currentProfile: UserProfile;
  currentDomain: DomainProfile | null;
  userText: string;
  assistantText: string;
}

interface UpdaterOutput {
  profile_updates?: Partial<UserProfile>;
  domain_updates?: Partial<DomainProfile>;
}

function buildPrompt(input: UpdaterInput): string {
  const profileSummary = JSON.stringify(
    {
      level_general: input.currentProfile.level_general,
      explanation_style: input.currentProfile.explanation_style,
      interests: input.currentProfile.interests,
      notes: input.currentProfile.notes,
    },
    null,
    2,
  );
  const domainSummary = input.currentDomain
    ? JSON.stringify(
        {
          id: input.currentDomain.id,
          level: input.currentDomain.level,
          concepts_mastered: input.currentDomain.concepts_mastered,
          concepts_in_progress: input.currentDomain.concepts_in_progress,
          recurring_mistakes: input.currentDomain.recurring_mistakes,
          notes: input.currentDomain.notes,
        },
        null,
        2,
      )
    : 'null';

  return `## Perfil actual
${profileSummary}

## Dominio detectado
${domainSummary}

## Último mensaje del usuario
${truncate(input.userText, 800)}

## Respuesta del tutor
${truncate(input.assistantText, 1500)}

Devuelve el JSON.`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n)}…`;
}

function tryParseJSON(raw: string): UpdaterOutput | null {
  // El modelo puede a veces envolver en ```json ... ``` aunque le pidas no.
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  try {
    return JSON.parse(cleaned) as UpdaterOutput;
  } catch {
    // Buscar el primer JSON balanceado.
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as UpdaterOutput;
    } catch {
      return null;
    }
  }
}

export async function runUpdater(input: UpdaterInput): Promise<{
  profile?: UserProfile;
  domain?: DomainProfile;
}> {
  if (!input.userText && !input.assistantText) return {};

  const prompt = buildPrompt(input);

  async function* promptStream(): AsyncGenerator<SDKUserMessage> {
    yield {
      type: 'user',
      message: { role: 'user', content: prompt },
      parent_tool_use_id: null,
    };
  }

  const userClaudeBin = findClaudeExecutable();
  let raw = '';
  try {
    const stream = query({
      prompt: promptStream(),
      options: {
        model: UPDATER_MODEL,
        systemPrompt: UPDATER_SYSTEM,
        allowedTools: [],
        settingSources: [],
        ...(userClaudeBin ? { pathToClaudeCodeExecutable: userClaudeBin } : {}),
      },
    });

    for await (const msg of stream) {
      const m = msg as {
        type: string;
        message?: { content?: Array<{ type: string; text?: string }> };
        result?: string;
      };
      if (m.type === 'assistant' && m.message?.content) {
        for (const b of m.message.content) {
          if (b.type === 'text' && typeof b.text === 'string') {
            raw += b.text;
          }
        }
      } else if (m.type === 'result' && typeof m.result === 'string') {
        if (raw.length === 0) raw = m.result;
      }
    }
  } catch (err) {
    console.warn('[updater] query failed', err);
    return {};
  }

  const parsed = tryParseJSON(raw);
  if (!parsed) {
    console.warn('[updater] could not parse JSON. Raw:', raw.slice(0, 200));
    return {};
  }

  const result: { profile?: UserProfile; domain?: DomainProfile } = {};

  if (parsed.profile_updates && Object.keys(parsed.profile_updates).length > 0) {
    try {
      result.profile = await patchProfile(parsed.profile_updates);
    } catch (err) {
      console.warn('[updater] patch profile failed', err);
    }
  }

  if (
    parsed.domain_updates &&
    input.domainId &&
    Object.keys(parsed.domain_updates).length > 0
  ) {
    try {
      const domain = await patchDomain(input.domainId, parsed.domain_updates);
      if (domain) result.domain = domain;
    } catch (err) {
      console.warn('[updater] patch domain failed', err);
    }
  }

  return result;
}
