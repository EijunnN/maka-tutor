import { app } from 'electron';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface Skill {
  id: string;
  trigger: string;
  approach: string;
  evidence: string;
  score: number;
  uses: number;
  last_used: number;
  created_at: number;
}

interface SkillsFile {
  domain_id: string;
  skills: Skill[];
  updated_at: number;
}

const MAX_SKILLS_PER_DOMAIN = 30;
const MIN_SCORE_FLOOR = 0.0;
const MAX_SCORE_CEIL = 1.0;
const REINFORCE_DELTA = 0.08;
const WEAKEN_DELTA = 0.15;
const RECENCY_DECAY_DAYS = 30;

function dirPath(): string {
  return join(app.getPath('userData'), 'skills');
}

function filePath(domainId: string): string {
  return join(dirPath(), `${domainId}.json`);
}

function newId(): string {
  return `skl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export async function loadSkills(domainId: string): Promise<Skill[]> {
  try {
    const raw = await readFile(filePath(domainId), 'utf8');
    const parsed = JSON.parse(raw) as SkillsFile;
    return parsed.skills ?? [];
  } catch {
    return [];
  }
}

export async function saveSkills(domainId: string, skills: Skill[]): Promise<void> {
  await mkdir(dirPath(), { recursive: true });
  const file: SkillsFile = {
    domain_id: domainId,
    skills,
    updated_at: Date.now(),
  };
  await writeFile(filePath(domainId), JSON.stringify(file, null, 2), 'utf8');
}

export async function listAllDomainsWithSkills(): Promise<string[]> {
  try {
    const names = await readdir(dirPath());
    return names.filter((n) => n.endsWith('.json')).map((n) => n.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

interface NewSkillInput {
  trigger: string;
  approach: string;
  evidence?: string;
}

export async function addSkill(domainId: string, input: NewSkillInput): Promise<Skill> {
  const now = Date.now();
  const skill: Skill = {
    id: newId(),
    trigger: input.trigger.trim(),
    approach: input.approach.trim(),
    evidence: (input.evidence ?? '').trim(),
    score: 0.5, // arranca neutro; el updater lo refuerza/debilita con uso
    uses: 1,
    last_used: now,
    created_at: now,
  };

  const current = await loadSkills(domainId);
  const merged = [...current, skill];

  // Cap: si excede el límite, descarta los de menor score (no los que
  // acabamos de añadir; los nuevos tienen un grace period).
  const final =
    merged.length > MAX_SKILLS_PER_DOMAIN
      ? trimToMax(merged, MAX_SKILLS_PER_DOMAIN)
      : merged;
  await saveSkills(domainId, final);
  return skill;
}

export async function reinforceSkills(domainId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const skills = await loadSkills(domainId);
  const ts = Date.now();
  for (const s of skills) {
    if (ids.includes(s.id)) {
      s.score = clamp(s.score + REINFORCE_DELTA, MIN_SCORE_FLOOR, MAX_SCORE_CEIL);
      s.uses += 1;
      s.last_used = ts;
    }
  }
  await saveSkills(domainId, skills);
}

export async function weakenSkills(domainId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const skills = await loadSkills(domainId);
  const filtered: Skill[] = [];
  for (const s of skills) {
    if (ids.includes(s.id)) {
      const next = s.score - WEAKEN_DELTA;
      // Si baja de 0.1, lo descartamos; los skills muy malos no
      // siguen ocupando slots.
      if (next > 0.1) {
        filtered.push({ ...s, score: clamp(next, MIN_SCORE_FLOOR, MAX_SCORE_CEIL) });
      }
    } else {
      filtered.push(s);
    }
  }
  await saveSkills(domainId, filtered);
}

function trimToMax(skills: Skill[], max: number): Skill[] {
  const sorted = [...skills].sort(
    (a, b) => effectiveScore(b) - effectiveScore(a),
  );
  return sorted.slice(0, max);
}

function effectiveScore(s: Skill): number {
  // Score base atenuado por antigüedad: decay exponencial con
  // half-life ≈ RECENCY_DECAY_DAYS / ln(2).
  const ageDays = (Date.now() - s.last_used) / (1000 * 60 * 60 * 24);
  const decay = Math.exp(-Math.LN2 * (ageDays / RECENCY_DECAY_DAYS));
  return s.score * decay;
}

// Tokens útiles para matching simple (sin meter dependencia del
// memory.ts para no crear ciclos; misma lógica básica).
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  );
}

export async function getRelevantSkills(
  domainId: string,
  queryText: string,
  limit = 4,
): Promise<Skill[]> {
  const skills = await loadSkills(domainId);
  if (skills.length === 0) return [];

  if (!queryText || queryText.trim().length === 0) {
    return [...skills]
      .sort((a, b) => effectiveScore(b) - effectiveScore(a))
      .slice(0, limit);
  }

  const queryTokens = tokenize(queryText);
  const ranked = skills.map((s) => {
    const triggerTokens = tokenize(s.trigger);
    let overlap = 0;
    for (const t of queryTokens) {
      if (triggerTokens.has(t)) overlap += 1;
    }
    // Combine relevance with effective score.
    const relevance = overlap / Math.max(1, triggerTokens.size);
    const combined = 0.6 * effectiveScore(s) + 0.4 * relevance;
    return { skill: s, combined };
  });

  return ranked
    .sort((a, b) => b.combined - a.combined)
    .slice(0, limit)
    .map((r) => r.skill);
}
