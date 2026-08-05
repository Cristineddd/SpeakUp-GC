/**
 * Alias helpers — disambiguate duplicate aliases for staff display
 * (like file(1), file(2) in a folder) and reserve unique aliases on save.
 */

export type AliasEntry = {
  id: string;
  alias?: string | null;
  createdAt?: string | Date | null;
};

function normalizeAliasKey(alias: string): string {
  return alias.trim().toLowerCase();
}

function isBlankAlias(alias?: string | null): boolean {
  const trimmed = (alias || '').trim();
  return !trimmed || trimmed === 'N/A';
}

/**
 * Build uid → display alias. Unique aliases stay as-is; collisions become
 * Alias(1), Alias(2), … ordered by createdAt then id (stable).
 */
export function buildDisambiguatedAliasMap(entries: AliasEntry[]): Map<string, string> {
  const result = new Map<string, string>();
  const groups = new Map<string, AliasEntry[]>();

  for (const entry of entries) {
    if (isBlankAlias(entry.alias)) {
      result.set(entry.id, (entry.alias || '').trim());
      continue;
    }
    const key = normalizeAliasKey(entry.alias!);
    const list = groups.get(key);
    if (list) list.push(entry);
    else groups.set(key, [entry]);
  }

  for (const group of groups.values()) {
    if (group.length === 1) {
      result.set(group[0].id, group[0].alias!.trim());
      continue;
    }

    const sorted = [...group].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return a.id.localeCompare(b.id);
    });

    sorted.forEach((entry, index) => {
      result.set(entry.id, `${entry.alias!.trim()}(${index + 1})`);
    });
  }

  return result;
}

export function getDisambiguatedAlias(
  map: Map<string, string>,
  id: string,
  fallback?: string | null
): string {
  return map.get(id) || (fallback || '').trim() || 'Anonymous User';
}

/** Pick the next free alias: "BlueStar" or "BlueStar(1)", "BlueStar(2)", … */
export function nextAvailableAlias(desired: string, takenLower: Set<string>): string {
  const base = desired.trim();
  if (!base) return base;
  if (!takenLower.has(normalizeAliasKey(base))) return base;

  let n = 1;
  while (takenLower.has(normalizeAliasKey(`${base}(${n})`))) {
    n += 1;
  }
  return `${base}(${n})`;
}
