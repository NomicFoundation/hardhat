// The same patterns are reused for every source file, so compile each one once.
const compiledGlobCache = new Map<string, RegExp>();

/**
 * Returns true when `path` should be included given user-supplied include and
 * exclude glob lists. `include` is the gate: an empty `include` matches
 * nothing. `exclude` then narrows the included set.
 */
export function isPathSelected(
  path: string,
  include: string[],
  exclude: string[],
): boolean {
  if (include.length === 0) {
    return false;
  }

  if (!matchesAnyGlob(path, include)) {
    return false;
  }

  if (exclude.length > 0 && matchesAnyGlob(path, exclude)) {
    return false;
  }

  return true;
}

/**
 * Returns true if `value` matches at least one of the given glob patterns.
 */
export function matchesAnyGlob(value: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (getCompiledGlob(pattern).test(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Compiles a glob pattern into a regular expression. Supports `*`, `**`,
 * `?`, `[abc]` (including `[a-z]` ranges and `[!abc]` / `[^abc]` negation),
 * and `{a,b,c}` alternation.
 */
function globToRegExp(pattern: string): RegExp {
  return new RegExp(`^${translateGlob(pattern)}$`);
}

function translateGlob(pattern: string): string {
  let regex = "";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];

    if (c === "*") {
      if (pattern[i + 1] === "*") {
        // `**` as a full path segment matches zero or more directories,
        // e.g. `**/x.sol` matches both `x.sol` and `a/b/x.sol`.
        const afterSlash = i === 0 || pattern[i - 1] === "/";
        const beforeSlash = pattern[i + 2] === "/";
        if (afterSlash && beforeSlash) {
          regex += "(?:.*/)?";
          i += 3;
        } else {
          regex += ".*";
          i += 2;
        }
      } else {
        regex += "[^/]*";
        i += 1;
      }
    } else if (c === "?") {
      regex += "[^/]";
      i += 1;
    } else if (c === "[") {
      const end = findCharClassEnd(pattern, i);
      if (end !== -1) {
        regex += translateCharClass(pattern.slice(i + 1, end));
        i = end + 1;
        continue;
      }

      regex += "\\[";
      i += 1;
    } else if (c === "{") {
      const end = findBraceEnd(pattern, i);
      if (end !== -1) {
        const alternatives = splitBraceAlternatives(
          pattern.slice(i + 1, end),
        ).map(translateGlob);

        regex += `(?:${alternatives.join("|")})`;
        i = end + 1;

        continue;
      }

      regex += "\\{";
      i += 1;
    } else if (/[.+^$()|\\\]}]/.test(c)) {
      regex += `\\${c}`;
      i += 1;
    } else {
      regex += c;
      i += 1;
    }
  }

  return regex;
}

/**
 * Returns the index of the `]` that closes the character class opened at
 * `start`, or -1 if none is found. E.g. for `a[bc]d` starting at 1, returns 4.
 */
function findCharClassEnd(pattern: string, start: number): number {
  for (let i = start + 1; i < pattern.length; i++) {
    if (pattern[i] === "]") {
      return i;
    }
  }

  return -1;
}

/**
 * Returns the index of the `}` that closes the brace group opened at `start`,
 * handling nested groups and skipping character classes, or -1 if unterminated.
 * E.g. `{a,{b,c}}` returns the outer `}`; `{a[}]b}` skips the bracketed `}`.
 */
function findBraceEnd(pattern: string, start: number): number {
  let depth = 1;
  let i = start + 1;
  while (i < pattern.length) {
    const c = pattern[i];
    if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
      if (depth === 0) {
        return i;
      }
    } else if (c === "[") {
      const end = findCharClassEnd(pattern, i);
      if (end !== -1) {
        i = end;
      }
    }

    i += 1;
  }

  return -1;
}

/**
 * Splits a brace group's body on top-level commas, leaving commas inside
 * nested braces or character classes untouched. E.g. `a,{b,c},[d,e]` →
 * `["a", "{b,c}", "[d,e]"]`.
 */
function splitBraceAlternatives(inside: string): string[] {
  const result: string[] = [];
  let depth = 0;
  let start = 0;
  let i = 0;
  while (i < inside.length) {
    const c = inside[i];

    if (c === "{") {
      depth += 1;
    } else if (c === "}") {
      depth -= 1;
    } else if (c === "[") {
      const end = findCharClassEnd(inside, i);
      if (end !== -1) {
        i = end;
      }
    } else if (c === "," && depth === 0) {
      result.push(inside.slice(start, i));
      start = i + 1;
    }

    i += 1;
  }

  result.push(inside.slice(start));
  return result;
}

/**
 * Translates a glob character class body into a regex character class.
 * E.g. `Mm` → `[Mm]`, `!ab` → `[^ab]`, `a-z` → `[a-z]`.
 */
function translateCharClass(content: string): string {
  let negated = false;
  let body = content;
  if (body.startsWith("!") || body.startsWith("^")) {
    negated = true;
    body = body.slice(1);
  }

  let escaped = "";
  for (const ch of body) {
    if (ch === "\\" || ch === "]") {
      escaped += `\\${ch}`;
    } else {
      escaped += ch;
    }
  }

  return `(?!/)[${negated ? "^" : ""}${escaped}]`;
}

function getCompiledGlob(pattern: string): RegExp {
  let compiled = compiledGlobCache.get(pattern);

  if (compiled === undefined) {
    compiled = globToRegExp(pattern);
    compiledGlobCache.set(pattern, compiled);
  }

  return compiled;
}
