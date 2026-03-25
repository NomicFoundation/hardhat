// cSpell:ignore ABCAB ABCA BCAB
/**
 * Builds the LPS (Longest Prefix Suffix) table used by the Knuth-Morris-Pratt
 * string search algorithm. For each index `i` in the pattern, `lps[i]` holds
 * the length of the longest prefix of `pattern[0..i]` that is also a suffix
 * of that substring.
 *
 * For example, given the pattern `ABCABD`, the substring at index 4 is
 * `ABCAB`. Its prefixes include `A`, `AB`, `ABC`, `ABCA` and its suffixes
 * include `B`, `AB`, `CAB`, `BCAB`. The longest prefix that is also a
 * suffix is `AB` (length 2), so `lps[4] = 2`.
 *
 * @param pattern The pattern to build the table for.
 * @returns An array where entry `i` is the LPS length for `pattern[0..i]`.
 */
export function buildLpsTable(pattern: Uint8Array): number[] {
  const lps = new Array(pattern.length).fill(0);
  let matchLen = 0;
  let i = 1;

  while (i < pattern.length) {
    if (pattern[i] === pattern[matchLen]) {
      lps[i++] = ++matchLen;
    } else if (matchLen > 0) {
      matchLen = lps[matchLen - 1];
    } else {
      lps[i++] = 0;
    }
  }

  return lps;
}
