const TAG_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Deterministically hashes user.id into a clean 4-character uppercase alphanumeric tag (e.g. #7F2A).
 */
export function getUserTag(user: { id: string; name?: string }): string {
  const id = user?.id || 'anon';
  let h1 = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h1 ^= id.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  let h = h1 >>> 0;
  let tag = '';
  for (let i = 0; i < 4; i++) {
    tag += TAG_CHARS[h % TAG_CHARS.length];
    h = Math.floor(h / TAG_CHARS.length);
  }
  return `#${tag}`;
}

/**
 * Returns formatted handle e.g. @matvii#4829
 */
export function getUserHandle(user: { id: string; name?: string }): string {
  const rawFirst = (user.name || 'user').trim().split(/\s+/)[0] || 'user';
  const firstName = rawFirst.toLowerCase().replace(/[^a-z0-9]/g, '') || 'user';
  return `@${firstName}${getUserTag(user)}`;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const al = a.length;
  const bl = b.length;
  let prev = Array.from({ length: bl + 1 }, (_, i) => i);
  let curr = new Array(bl + 1);
  for (let i = 1; i <= al; i++) {
    curr[0] = i;
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[bl];
}

/**
 * Strict search-only matching: requires at least 2 chars.
 * Matches against ID tag, handle, full name, name parts, or fuzzy Levenshtein <= 1.
 */
export function matchesUserSearch(
  user: { id: string; name: string },
  rawQuery: string
): boolean {
  const trimmed = (rawQuery || '').trim();
  if (trimmed.length < 2) {
    return false;
  }

  const cleanQuery = trimmed.toLowerCase().replace(/^[@#]+/, '').trim();
  if (cleanQuery.length === 0) {
    return false;
  }

  const tag = getUserTag(user).toLowerCase().replace('#', '');
  const handle = getUserHandle(user).toLowerCase();

  if (tag === cleanQuery || handle.includes(cleanQuery)) {
    return true;
  }

  const fullName = (user.name || '').toLowerCase();
  if (fullName.includes(cleanQuery)) {
    return true;
  }

  const nameParts = fullName.split(/\s+/).filter(Boolean);
  if (nameParts.some((part) => part.includes(cleanQuery))) {
    return true;
  }

  if (cleanQuery.length >= 3) {
    for (const part of nameParts) {
      const cleanPart = part.replace(/[^a-z0-9]/g, '');
      if (cleanPart && levenshteinDistance(cleanQuery, cleanPart) <= 1) {
        return true;
      }
    }
  }

  return false;
}
