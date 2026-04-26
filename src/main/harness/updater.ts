import { query, type SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import { findClaudeExecutable } from '../claudePath';
import { getModel } from '../settings';
import { patchProfile, type UserProfile } from './profile';
import { patchDomain, type DomainProfile } from './domains';
import { addSkill, reinforceSkills, weakenSkills, type Skill } from './skills';

const UPDATER_SYSTEM = `Eres un actualizador de perfil + curador de playbooks pedagógicos de un alumno que está siendo tutorizado por otro agente.

Recibes el último turno (mensaje del usuario + respuesta del tutor) y opcionalmente el perfil/dominio/skills actuales.

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
  },
  "skill_updates": {
    "new_skills"?: Array<{ "trigger": string, "approach": string, "evidence": string }>,
    "reinforce_skill_ids"?: string[],
    "weaken_skill_ids"?: string[]
  }
}

Reglas profile/domain:
- Sé CONSERVADOR. Si no hay evidencia clara, devuelve {} (no inventes).
- Solo añade items NUEVOS, no repitas los existentes.
- "concepts_mastered" requiere evidencia de comprensión, no solo de explicación.
- "concepts_in_progress" si se mencionó pero no se confirmó dominio.
- "recurring_mistakes" solo si VIO un error específico del usuario.
- "notes" para detalles de personalidad o preferencias mencionadas explícitamente.
- "level" actualízalo solo con evidencia fuerte (varios turnos en ese nivel).
- Si el dominio_id es null, omite "domain_updates" y "skill_updates" o devuelve {} en cada uno.

Reglas skills (PLAYBOOKS PEDAGÓGICOS):
- Una "skill" es un approach didáctico replicable: "cuando el usuario X (trigger), explicarle así (approach)".
- "new_skills" SOLO si en este turno apareció un approach nuevo y notable (no algo trivial). Máx 1 por turno.
  · trigger: cuándo aplica (5-12 palabras, en infinitivo o describiendo la situación).
  · approach: cómo se hizo (10-25 palabras, accionable).
  · evidence: una frase corta de qué pasó este turno.
- "reinforce_skill_ids": ids de skills existentes que el tutor USÓ y FUNCIONARON este turno (el usuario respondió bien, entendió, avanzó). Máx 2.
- "weaken_skill_ids": ids de skills existentes que el tutor USÓ pero NO funcionaron (usuario no entendió, repitió la duda, falló). Máx 2.
- NO inventes ids; usa los que aparecen en el bloque de "Skills actuales" entre corchetes.
- Si no hay evidencia para skills, omite "skill_updates" o devuelve {}.

Sé corto en concepts/notes/triggers/approaches (máx 5-25 palabras cada string).`;

interface UpdaterInput {
  domainId: string | null;
  currentProfile: UserProfile;
  currentDomain: DomainProfile | null;
  currentSkills: Skill[];
  userText: string;
  assistantText: string;
}

interface SkillProposal {
  trigger: string;
  approach: string;
  evidence?: string;
}

interface UpdaterOutput {
  profile_updates?: Partial<UserProfile>;
  domain_updates?: Partial<DomainProfile>;
  skill_updates?: {
    new_skills?: SkillProposal[];
    reinforce_skill_ids?: string[];
    weaken_skill_ids?: string[];
  };
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

  const skillsBlock =
    input.currentSkills.length > 0
      ? input.currentSkills
          .map(
            (s) =>
              `- [${s.id}] (score ${s.score.toFixed(2)}, ${s.uses} usos) trigger: ${s.trigger} | approach: ${s.approach}`,
          )
          .join('\n')
      : '(ninguna)';

  return `## Perfil actual
${profileSummary}

## Dominio detectado
${domainSummary}

## Skills actuales del dominio
${skillsBlock}

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
        // Mismo modelo que el chat (configurable desde Settings).
        // Mantiene una sola elección de modelo para toda la app.
        model: getModel(),
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

  // Skill updates SOLO si hay dominio (los playbooks viven por
  // dominio, no son globales).
  if (input.domainId && parsed.skill_updates) {
    const su = parsed.skill_updates;
    try {
      if (Array.isArray(su.reinforce_skill_ids) && su.reinforce_skill_ids.length > 0) {
        await reinforceSkills(input.domainId, su.reinforce_skill_ids.slice(0, 2));
      }
      if (Array.isArray(su.weaken_skill_ids) && su.weaken_skill_ids.length > 0) {
        await weakenSkills(input.domainId, su.weaken_skill_ids.slice(0, 2));
      }
      if (Array.isArray(su.new_skills) && su.new_skills.length > 0) {
        // Máx 1 skill nueva por turno para no inflar el inventario.
        const proposal = su.new_skills[0];
        if (
          proposal &&
          typeof proposal.trigger === 'string' &&
          typeof proposal.approach === 'string' &&
          proposal.trigger.trim().length >= 3 &&
          proposal.approach.trim().length >= 5
        ) {
          await addSkill(input.domainId, {
            trigger: proposal.trigger,
            approach: proposal.approach,
            evidence: proposal.evidence,
          });
        }
      }
    } catch (err) {
      console.warn('[updater] skill updates failed', err);
    }
  }

  return result;
}
