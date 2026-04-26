import { listDomains, type DomainProfile } from './domains';

export type NudgeType = 'continuar' | 'repasar' | 'practicar';

export interface Nudge {
  id: string;
  domain_id: string;
  domain_name: string;
  type: NudgeType;
  label: string;
  prompt: string;
  rank_score: number;
  age_days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_AGE_DAYS = 0.5; // no nudgear cosas de hace menos de 12h
const MAX_AGE_DAYS = 45;
const REVIEW_THRESHOLD_DAYS = 7; // a partir de ahí proponemos repasar mastered
const PRACTICE_MIN_TURNS = 5; // mínimo de turns en el dominio para sugerir práctica

function ageDays(ts: number): number {
  if (!ts) return Infinity;
  return (Date.now() - ts) / DAY_MS;
}

function continuarNudge(d: DomainProfile, age: number): Nudge | null {
  if (d.concepts_in_progress.length === 0) return null;
  const concept = d.concepts_in_progress[0];
  if (!concept) return null;
  return {
    id: `nudge-cont-${d.id}`,
    domain_id: d.id,
    domain_name: d.display_name,
    type: 'continuar',
    label: `Continuar con ${concept} en ${d.display_name}`,
    prompt: `Sigamos donde lo dejamos: **${concept}**. Recuérdame en una línea qué cubrimos y demos el siguiente paso.`,
    // Más fresco = mejor; más turnos previos = mejor
    rank_score: 1.2 - age / MAX_AGE_DAYS + Math.min(d.message_count, 20) * 0.02,
    age_days: age,
  };
}

function repasarNudge(d: DomainProfile, age: number): Nudge | null {
  if (age < REVIEW_THRESHOLD_DAYS) return null;
  if (d.concepts_mastered.length === 0) return null;
  const concept = d.concepts_mastered[0];
  if (!concept) return null;
  return {
    id: `nudge-rep-${d.id}`,
    domain_id: d.id,
    domain_name: d.display_name,
    type: 'repasar',
    label: `Repasar ${concept} en ${d.display_name}`,
    prompt: `Quiero repasar **${concept}**. Hazme una pregunta corta para verificar que sigo dominándolo.`,
    rank_score: 0.7 - age / 60,
    age_days: age,
  };
}

function practicarNudge(d: DomainProfile, age: number): Nudge | null {
  if (d.message_count < PRACTICE_MIN_TURNS) return null;
  if (d.concepts_in_progress.length === 0 && d.concepts_mastered.length === 0) return null;
  const concept = d.concepts_in_progress[0] ?? d.concepts_mastered[0];
  if (!concept) return null;
  return {
    id: `nudge-pract-${d.id}`,
    domain_id: d.id,
    domain_name: d.display_name,
    type: 'practicar',
    label: `Ejercicio de ${concept} en ${d.display_name}`,
    prompt: `Mándame un ejercicio práctico corto sobre **${concept}** para que yo lo intente. Espera mi respuesta antes de dar la solución.`,
    rank_score: 0.55 - age / 90,
    age_days: age,
  };
}

export async function computeNudges(limit = 4): Promise<Nudge[]> {
  const domains = await listDomains();
  const candidates: Nudge[] = [];

  for (const d of domains) {
    const age = ageDays(d.last_seen);
    if (age < MIN_AGE_DAYS || age > MAX_AGE_DAYS) continue;

    const c = continuarNudge(d, age);
    if (c) candidates.push(c);

    const r = repasarNudge(d, age);
    if (r) candidates.push(r);

    const p = practicarNudge(d, age);
    if (p) candidates.push(p);
  }

  // Limitar a 1 nudge por dominio: el de mayor rank_score gana.
  const byDomain = new Map<string, Nudge>();
  for (const n of candidates) {
    const existing = byDomain.get(n.domain_id);
    if (!existing || n.rank_score > existing.rank_score) {
      byDomain.set(n.domain_id, n);
    }
  }

  return [...byDomain.values()]
    .sort((a, b) => b.rank_score - a.rank_score)
    .slice(0, limit);
}
