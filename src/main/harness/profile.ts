import { app } from 'electron';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export interface UserProfile {
  language: string;
  level_general: 'principiante' | 'intermedio' | 'avanzado' | 'mixto' | null;
  explanation_style: string | null;
  interests: string[];
  notes: string | null;
  updated_at: number;
}

const DEFAULT_PROFILE: UserProfile = {
  language: 'es',
  level_general: null,
  explanation_style: null,
  interests: [],
  notes: null,
  updated_at: 0,
};

function path(): string {
  return join(app.getPath('userData'), 'profile.json');
}

export async function loadProfile(): Promise<UserProfile> {
  try {
    const raw = await readFile(path(), 'utf8');
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await mkdir(app.getPath('userData'), { recursive: true });
  await writeFile(
    path(),
    JSON.stringify({ ...profile, updated_at: Date.now() }, null, 2),
    'utf8',
  );
}

export async function patchProfile(patch: Partial<UserProfile>): Promise<UserProfile> {
  const current = await loadProfile();
  const next: UserProfile = {
    ...current,
    ...patch,
    interests: dedupe([...(current.interests ?? []), ...(patch.interests ?? [])]),
    updated_at: Date.now(),
  };
  await saveProfile(next);
  return next;
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
