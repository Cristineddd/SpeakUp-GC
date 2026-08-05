/**
 * Resolve unique complainant aliases (case-insensitive), appending (1), (2), …
 * when the desired name is already taken — same idea as duplicate file names.
 */
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { nextAvailableAlias } from '../utils/aliasDisplay';

export async function collectTakenAliases(excludeUid?: string): Promise<Set<string>> {
  const snapshot = await getDocs(collection(db, 'users'));
  const taken = new Set<string>();

  snapshot.forEach((docSnap) => {
    if (excludeUid && docSnap.id === excludeUid) return;
    const alias = docSnap.data()?.alias;
    if (typeof alias === 'string' && alias.trim() && alias.trim() !== 'N/A') {
      taken.add(alias.trim().toLowerCase());
    }
  });

  return taken;
}

/** Returns the desired alias, or Alias(n) if that name is already in use. */
export async function resolveUniqueAlias(
  desired: string,
  excludeUid?: string
): Promise<{ alias: string; wasAdjusted: boolean }> {
  const trimmed = desired.trim();
  const taken = await collectTakenAliases(excludeUid);
  const alias = nextAvailableAlias(trimmed, taken);
  return { alias, wasAdjusted: alias !== trimmed };
}
