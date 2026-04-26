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

interface DomainSpec {
  id: string;
  display_name: string;
  keywords: string[];
}

// Catálogo de dominios reconocidos. Keyword-based; en el futuro
// podemos delegar al updater LLM una clasificación más fina.
const CATALOG: DomainSpec[] = [
  {
    id: 'power-bi',
    display_name: 'Power BI',
    keywords: ['power bi', 'powerbi', ' dax', 'pbix', 'medida dax', 'measure dax'],
  },
  {
    id: 'excel',
    display_name: 'Excel',
    keywords: ['excel', 'xlsx', 'vlookup', 'buscarv', 'tabla dinámica', 'pivot table', 'xlookup'],
  },
  {
    id: 'tableau',
    display_name: 'Tableau',
    keywords: ['tableau', 'twbx', 'twb', 'dashboard tableau'],
  },
  {
    id: 'looker',
    display_name: 'Looker / Studio',
    keywords: ['looker', 'looker studio', 'data studio'],
  },
  {
    id: 'figma',
    display_name: 'Figma',
    keywords: ['figma', 'auto layout', 'frame figma', 'componente figma', 'variants figma'],
  },
  {
    id: 'photoshop',
    display_name: 'Photoshop',
    keywords: ['photoshop', '.psd', 'capa photoshop', 'pincel photoshop'],
  },
  {
    id: 'illustrator',
    display_name: 'Illustrator',
    keywords: ['illustrator', '.ai illustrator', 'pluma illustrator'],
  },
  {
    id: 'amazon-seller',
    display_name: 'Amazon Seller',
    keywords: ['amazon seller', 'seller central', 'fba', 'asin', 'a+ content', 'listing amazon'],
  },
  {
    id: 'shopify',
    display_name: 'Shopify',
    keywords: ['shopify', 'liquid theme', 'shopify admin'],
  },
  {
    id: 'sql',
    display_name: 'SQL',
    keywords: [' select ', ' join ', ' where ', ' group by ', 'sql', 'postgres', 'mysql', 'sqlite'],
  },
  {
    id: 'aws',
    display_name: 'AWS',
    keywords: [' aws', ' ec2', ' lambda', ' s3 ', 'cloudwatch', ' iam ', 'cloudformation', 'eks'],
  },
  {
    id: 'kubernetes',
    display_name: 'Kubernetes',
    keywords: ['kubectl', 'kubernetes', ' k8s', 'helm chart', 'pod kubernetes'],
  },
  {
    id: 'docker',
    display_name: 'Docker',
    keywords: ['docker', 'dockerfile', 'docker compose', 'container docker'],
  },
  {
    id: 'git',
    display_name: 'Git',
    keywords: ['git rebase', 'git merge', 'git stash', 'pull request', 'cherry-pick'],
  },
  {
    id: 'vscode',
    display_name: 'VS Code',
    keywords: ['vscode', 'visual studio code', 'extension code', 'launch.json'],
  },
  {
    id: 'salesforce',
    display_name: 'Salesforce',
    keywords: ['salesforce', 'apex salesforce', 'lightning component'],
  },
  {
    id: 'hubspot',
    display_name: 'HubSpot',
    keywords: ['hubspot', 'workflow hubspot'],
  },
  {
    id: 'notion',
    display_name: 'Notion',
    keywords: ['notion', 'notion database', 'notion formula'],
  },
];

function dirPath(): string {
  return join(app.getPath('userData'), 'domains');
}

function filePath(id: string): string {
  return join(dirPath(), `${id}.json`);
}

function defaultDomain(spec: DomainSpec): DomainProfile {
  return {
    id: spec.id,
    display_name: spec.display_name,
    level: null,
    concepts_mastered: [],
    concepts_in_progress: [],
    recurring_mistakes: [],
    notes: null,
    last_seen: 0,
    message_count: 0,
  };
}

export function detectDomain(text: string): DomainSpec | null {
  if (!text) return null;
  const padded = ` ${text.toLowerCase()} `;
  // Score por número de keywords matcheadas; gana el que más matchea.
  let best: { spec: DomainSpec; score: number } | null = null;
  for (const spec of CATALOG) {
    let score = 0;
    for (const kw of spec.keywords) {
      if (padded.includes(kw.toLowerCase())) score += 1;
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { spec, score };
    }
  }
  return best?.spec ?? null;
}

export async function loadDomain(id: string): Promise<DomainProfile | null> {
  try {
    const raw = await readFile(filePath(id), 'utf8');
    return JSON.parse(raw) as DomainProfile;
  } catch {
    const spec = CATALOG.find((s) => s.id === id);
    return spec ? defaultDomain(spec) : null;
  }
}

export async function saveDomain(domain: DomainProfile): Promise<void> {
  await mkdir(dirPath(), { recursive: true });
  await writeFile(filePath(domain.id), JSON.stringify(domain, null, 2), 'utf8');
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
