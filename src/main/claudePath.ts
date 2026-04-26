import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

let cached: string | null | undefined = undefined;

function detect(): string | null {
  if (process.env.CLAUDE_PATH && existsSync(process.env.CLAUDE_PATH)) {
    return process.env.CLAUDE_PATH;
  }

  const home = homedir();
  const isWin = process.platform === 'win32';
  const exe = isWin ? 'claude.exe' : 'claude';

  const candidates = [
    join(home, '.local', 'bin', exe),
    join(home, '.claude', 'local', exe),
    join(home, '.claude', 'bin', exe),
  ];

  for (const p of candidates) {
    if (existsSync(p)) return p;
  }

  try {
    const out = isWin
      ? execFileSync('where.exe', [exe], { encoding: 'utf8', windowsHide: true })
      : execFileSync('which', [exe], { encoding: 'utf8' });
    const first = out
      .split(/\r?\n/)
      .map((s) => s.trim())
      .find(Boolean);
    if (first && existsSync(first)) return first;
  } catch {
    // not found via shell
  }

  return null;
}

export function findClaudeExecutable(): string | null {
  if (cached !== undefined) return cached;
  cached = detect();
  if (cached) {
    console.log('[claudePath] using user CLI:', cached);
  } else {
    console.log('[claudePath] no user CLI found, falling back to SDK-embedded binary');
  }
  return cached;
}
