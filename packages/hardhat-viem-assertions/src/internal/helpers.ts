/**
 * This is a JSON.stringify function with a custom replacer that stringifies bigints as strings.
 */
export function stringifyArgs(obj: any): string {
  return JSON.stringify(obj, (key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

/**
 * Awaits `value` (which may already be a resolved value) and returns a tagged
 * result so callers can decide when to surface a rejection.
 */
export async function settle<T>(
  value: T | Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  return await Promise.resolve(value).then(
    (v) => ({ ok: true, value: v }) as const,
    (error: unknown) => ({ ok: false, error }) as const,
  );
}
