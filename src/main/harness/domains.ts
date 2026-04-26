import { app } from 'electron';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface DomainProfile {
  id: string;
  display_name: string;
  level: 'principiante' | 'intermedio' | 'avanzado' | null;
  concepts_mastered: string[];
  concepts_in_progress: string[];
  recurring_mistakes: string[];
  notes: string | null;
  last_seen: number;
  message_count: number;
}

function dirPath(): string {
  return join(app.getPath('userData'), 'domains');
}

function filePath(id: string): string {
  return join(dirPath(), `${id}.json`);
}

// kebab-case ASCII slug. Acepta español: las tildes se normalizan vía NFD.
export function slugifyDomainId(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function freshDomain(id: string, displayName: string): DomainProfile {
  return {
    id,
    display_name: displayName,
    level: null,
    concepts_mastered: [],
    concepts_in_progress: [],
    recurring_mistakes: [],
    notes: null,
    last_seen: 0,
    message_count: 0,
  };
}

export async function loadDomain(id: string): Promise<DomainProfile | null> {
  try {
    const raw = await readFile(filePath(id), 'utf8');
    return JSON.parse(raw) as DomainProfile;
  } catch {
    return null;
  }
}

export async function saveDomain(domain: DomainProfile): Promise<void> {
  await mkdir(dirPath(), { recursive: true });
  await writeFile(filePath(domain.id), JSON.stringify(domain, null, 2), 'utf8');
}

// Crea el dominio si no existe; si ya existe y el display_name actual está
// vacío o por defecto, lo refresca. Es el único punto de creación de dominios:
// el updater LLM decide qué temas merecen tener perfil propio.
export async function ensureDomain(id: string, displayName: string): Promise<DomainProfile> {
  const existing = await loadDomain(id);
  if (existing) {
    if (displayName && existing.display_name !== displayName && !existing.display_name) {
      existing.display_name = displayName;
      await saveDomain(existing);
    }
    return existing;
  }
  const fresh = freshDomain(id, displayName || id);
  await saveDomain(fresh);
  return fresh;
}

export async function touchDomain(id: string): Promise<DomainProfile | null> {
  const domain = await loadDomain(id);
  if (!domain) return null;
  domain.last_seen = Date.now();
  domain.message_count += 1;
  await saveDomain(domain);
  return domain;
}

export async function patchDomain(
  id: string,
  patch: Partial<DomainProfile>,
): Promise<DomainProfile | null> {
  const current = await loadDomain(id);
  if (!current) return null;
  const next: DomainProfile = {
    ...current,
    ...patch,
    concepts_mastered: dedupe([
      ...(current.concepts_mastered ?? []),
      ...(patch.concepts_mastered ?? []),
    ]),
    concepts_in_progress: dedupe([
      ...(current.concepts_in_progress ?? []),
      ...(patch.concepts_in_progress ?? []),
    ]),
    recurring_mistakes: dedupe([
      ...(current.recurring_mistakes ?? []),
      ...(patch.recurring_mistakes ?? []),
    ]),
  };
  await saveDomain(next);
  return next;
}

export async function listDomains(): Promise<DomainProfile[]> {
  try {
    const names = await readdir(dirPath());
    const out: DomainProfile[] = [];
    for (const name of names) {
      if (!name.endsWith('.json')) continue;
      try {
        const raw = await readFile(join(dirPath(), name), 'utf8');
        out.push(JSON.parse(raw) as DomainProfile);
      } catch {
        // skip
      }
    }
    return out.sort((a, b) => b.last_seen - a.last_seen);
  } catch {
    return [];
  }
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
