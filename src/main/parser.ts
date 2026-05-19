export type ParseOptions = {
  agents: string[];
  global: boolean;
  force: boolean;
};

export type ParsedCommand = {
  args: string[];
  display: string;
  source: string;
};

const SOURCE_FLAGS_TAKING_VALUE = new Set([
  '-a',
  '--agent',
  '--name',
  '--ref',
  '--branch',
]);

export function parseLine(line: string, opts: ParseOptions): ParsedCommand | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  let argsStr = trimmed;
  const npxMatch = trimmed.match(/^(?:npx\s+(?:-y\s+)?skills\s+add\s+)(.+)$/i);
  if (npxMatch) argsStr = npxMatch[1];
  else if (/^skills\s+add\s+/i.test(trimmed))
    argsStr = trimmed.replace(/^skills\s+add\s+/i, '');

  const tokens = tokenize(argsStr);
  if (tokens.length === 0) return null;

  if (tokens.length === 1 && /\s/.test(tokens[0])) {
    return parseLine(tokens[0], opts);
  }

  const filtered: string[] = [];
  let skipNext = false;
  let userAgents: string[] = [];
  let userGlobal: boolean | null = null;
  let userForce: boolean | null = null;
  let userYes = false;
  let source = '';

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (skipNext) {
      skipNext = false;
      continue;
    }
    if (t === '-a' || t === '--agent') {
      const next = tokens[i + 1];
      if (next) userAgents.push(next);
      skipNext = true;
      continue;
    }
    if (t === '-g' || t === '--global') {
      userGlobal = true;
      continue;
    }
    if (t === '--no-global') {
      userGlobal = false;
      continue;
    }
    if (t === '-f' || t === '--force') {
      userForce = true;
      continue;
    }
    if (t === '-y' || t === '--yes') {
      userYes = true;
      continue;
    }
    if (SOURCE_FLAGS_TAKING_VALUE.has(t)) {
      filtered.push(t);
      if (tokens[i + 1]) filtered.push(tokens[i + 1]);
      skipNext = true;
      continue;
    }
    if (!source && !t.startsWith('-')) source = t;
    filtered.push(t);
  }

  if (!source) return null;

  const finalArgs = ['-y', 'skills', 'add', ...filtered];
  if (!userYes) finalArgs.push('-y');

  const effectiveGlobal = userGlobal ?? opts.global;
  if (effectiveGlobal) finalArgs.push('-g');

  const effectiveForce = userForce ?? opts.force;
  if (effectiveForce) finalArgs.push('--force');

  const agents = userAgents.length ? userAgents : opts.agents;
  for (const a of agents) finalArgs.push('-a', a);

  return { args: finalArgs, display: 'npx ' + finalArgs.join(' '), source };
}

function tokenize(str: string): string[] {
  const out: string[] = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(str)) !== null) {
    out.push(m[1] ?? m[2] ?? m[3]);
  }
  return out;
}

const ALREADY_PATTERNS = [
  /already\s+installed/i,
  /already\s+exists/i,
  /skipping/i,
  /up[-\s]?to[-\s]?date/i,
];

export function detectAlreadyInstalled(text: string): boolean {
  return ALREADY_PATTERNS.some((re) => re.test(text));
}
