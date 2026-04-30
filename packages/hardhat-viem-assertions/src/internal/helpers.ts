/**
 * This is a JSON.stringify function with a custom replacer that stringifies bigints as strings.
 */
export function stringifyArgs(obj: any): string {
  return JSON.stringify(obj, (key, value) =>
    typeof value === "bigint" ? value.toString() : value,
  );
}

/**
 * Awaits `promise` and returns a tagged result so callers can decide when to
 * surface a rejection.
 */
export async function settle<T>(
  promise: Promise<T>,
): Promise<{ ok: true; value: T } | { ok: false; error: unknown }> {
  return promise.then(
    (value) => ({ ok: true, value }) as const,
    (error: unknown) => ({ ok: false, error }) as const,
  );
}
