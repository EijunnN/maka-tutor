import { listDomains, touchDomain, type DomainProfile } from './domains';
import { loadProfile, type UserProfile } from './profile';
import { searchMemory, type MemoryHit } from './memory';
import { getRelevantSkills, type Skill } from './skills';

// Ventana de "sesión activa" para considerar un dominio vigente sin
// nueva detección. Si el último dominio fue tocado hace más de esto,
// arrancamos sin contexto de dominio y dejamos que el updater LLM
// decida al cierre del primer turno.
const ACTIVE_DOMAIN_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h

const BASE_PROMPT = `Eres **Maka**, una tutora personal. Acompañas al usuario en lo que esté aprendiendo —software, idiomas, materias académicas, oficios, lo que sea— enseñándole a partir de los screenshots que él te comparte de su pantalla.

Identidad y saludo:
- Tu nombre es Maka. Cuando el usuario te salude o sea evidente que es vuestra primera interacción (no hay perfil suyo, no hay dominio activo y el mensaje es genérico tipo "hola", "qué tal", "qué eres"), preséntate corto: "Hola, soy Maka, tu tutora. ¿Qué quieres aprender hoy?" o variantes equivalentes. Nunca repitas la presentación si ya estáis en mitad de un tema.
- Si el usuario llega con una pregunta concreta o un screenshot de algo, NO te presentes — ve al grano y resuélvelo. La presentación solo cuando hay señal explícita.

Reglas pedagógicas:
- Responde en español, claro y directo.
- Da pasos numerados cortos cuando enseñes un procedimiento. Cada paso debe ser una acción concreta que el usuario pueda hacer ahora mismo.
- Si necesitas ver un cambio de estado o confirmar dónde está el usuario, pídele otro screenshot ("Manda otra captura para que vea cómo te quedó").
- Usa markdown: listas, **negrita** para botones/opciones/términos clave, \`código\` para nombres de archivos, comandos, fórmulas o controles UI.
- No inventes lo que no veas. Si el screenshot o la información del usuario no es suficiente, dilo y pregunta.
- Sé breve. Mejor dos pasos correctos que diez pasos genéricos.
- Antes de avanzar a algo nuevo, verifica que el usuario entendió el paso previo cuando sea relevante.`;

export interface TurnContext {
  systemPrompt: string;
  domain: DomainProfile | null;
  profile: UserProfile;
  memoryHits: MemoryHit[];
  skills: Skill[];
}

export async function buildTurnContext(userText: string): Promise<TurnContext> {
  const profile = await loadProfile();
  // El dominio activo es el último que tocamos, si está dentro de la
  // ventana de frescura. La clasificación fina la hace el updater al
  // cierre del turno (LLM-first); aquí solo inyectamos contexto
  // cuando hay continuidad razonable.
  const recent = await listDomains();
  const candidate = recent[0];
  const isFresh =
    candidate && candidate.last_seen > 0 && Date.now() - candidate.last_seen < ACTIVE_DOMAIN_WINDOW_MS;
  const domain: DomainProfile | null = isFresh ? candidate : null;
  if (domain) {
    await touchDomain(domain.id);
  }
  const memoryHits = searchMemory(userText, { domain: domain?.id, limit: 3 });
  const skills = domain ? await getRelevantSkills(domain.id, userText, 4) : [];

  const sections: string[] = [BASE_PROMPT];

  // Perfil del usuario
  const profileBits: string[] = [];
  if (profile.level_general) profileBits.push(`Nivel general: **${profile.level_general}**.`);
  if (profile.explanation_style) profileBits.push(`Prefiere: ${profile.explanation_style}.`);
  if (profile.interests.length > 0) profileBits.push(`Le interesa: ${profile.interests.join(', ')}.`);
  if (profile.notes) profileBits.push(profile.notes);
  if (profileBits.length > 0) {
    sections.push(`## Sobre el usuario\n${profileBits.map((b) => `- ${b}`).join('\n')}`);
  }

  // Perfil del dominio activo
  if (domain) {
    const lines: string[] = [];
    if (domain.level) lines.push(`Nivel actual: **${domain.level}**.`);
    if (domain.concepts_mastered.length > 0) {
      lines.push(`Ya domina: ${domain.concepts_mastered.join(', ')}.`);
    }
    if (domain.concepts_in_progress.length > 0) {
      lines.push(`En progreso: ${domain.concepts_in_progress.join(', ')}.`);
    }
    if (domain.recurring_mistakes.length > 0) {
      lines.push(`Errores recurrentes: ${domain.recurring_mistakes.join('; ')}.`);
    }
    if (domain.notes) lines.push(domain.notes);
    if (lines.length > 0) {
      sections.push(
        `## Contexto sobre ${domain.display_name}\n${lines.map((b) => `- ${b}`).join('\n')}\n\nUsa este contexto para no repetir lo que ya sabe; si detectas que un "ya dominado" no se sostiene en este turno, corrígelo y márcalo en tu respuesta.`,
      );
    }
  }

  // Skills/playbooks pedagógicos aprendidos en este dominio.
  // Cada skill incluye su id para que el updater pueda referenciarla
  // por id en reinforce_skill_ids / weaken_skill_ids.
  if (skills.length > 0 && domain) {
    const skillBlock = skills
      .map(
        (s) =>
          `- [${s.id}] (score ${s.score.toFixed(2)}, ${s.uses} usos)\n  · trigger: ${s.trigger}\n  · approach: ${s.approach}`,
      )
      .join('\n');
    sections.push(
      `## Cómo enseñarle a este usuario en ${domain.display_name}\nApproaches que han funcionado antes; aplica el más relevante al turno actual cuando sea aplicable. Si vas a probar uno nuevo, hazlo deliberadamente para que se aprenda.\n\n${skillBlock}`,
    );
  }

  // Recuerdos relevantes de conversaciones pasadas
  if (memoryHits.length > 0) {
    const memBlock = memoryHits
      .map(
        (h, i) =>
          `[${i + 1}] (${h.role}, hace ${friendlyAgo(Date.now() - h.createdAt)}): "${truncate(
            h.text,
            220,
          )}"`,
      )
      .join('\n');
    sections.push(
      `## Conversaciones pasadas relacionadas\n${memBlock}\n\nÚsalas como contexto cuando aporten; no las cites textualmente al usuario salvo que él lo pida.`,
    );
  }

  return {
    systemPrompt: sections.join('\n\n'),
    domain,
    profile,
    memoryHits,
    skills,
  };
}

function friendlyAgo(ms: number): string {
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  return `${day}d`;
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}
