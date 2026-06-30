export const MAX_INSTALL_CONCURRENCY = 16;
const DEFAULT_CAP = 8;

export function resolveConcurrency(
  planLength: number,
  opts: { env?: string; cpuCount: number },
): number {
  if (planLength <= 0) return 0;

  const fromEnv = parseEnv(opts.env);
  const desired =
    fromEnv ?? Math.max(1, Math.min(DEFAULT_CAP, opts.cpuCount - 1));

  return Math.min(desired, MAX_INSTALL_CONCURRENCY, planLength);
}

function parseEnv(env: string | undefined): number | null {
  if (!env) return null;
  if (!/^\d+$/.test(env.trim())) return null;
  const n = Number(env.trim());
  return n >= 1 ? n : null;
}
