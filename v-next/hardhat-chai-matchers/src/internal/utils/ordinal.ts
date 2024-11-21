/**
 * Appends the appropriate ordinal suffix ("st", "nd", "rd", "th") to a given number.
 *
 * This function correctly handles special cases such as numbers ending in 11, 12, and 13,
 * which always use the "th" suffix, and ensures the correct suffix for all other numbers.
 */
export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;

  const suffixIndex = (v - 20) % 10;
  let suffix = s[suffixIndex];

  if (suffixIndex >= 1 && suffixIndex <= 3) {
    return n + suffix;
  }

  suffix = s[v];
  if (v >= 1 && v <= 3) {
    return n + suffix;
  }

  return n + s[0];
}
