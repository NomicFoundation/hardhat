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

  if (!matchesAny(path, include)) {
    return false;
  }

  if (exclude.length > 0 && matchesAny(path, exclude)) {
    return false;
  }

  return true;
}

/**
 * Returns true if `value` matches at least one of the given glob patterns.
 */
function matchesAny(value: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (globToRegExp(pattern).test(value)) {
      return true;
    }
  }

  return false;
}

/**
 * Compiles a glob pattern into a regular expression. Supports:
 *   - `*`  : zero or more non-slash characters
 *   - `**` : zero or more characters (including slashes)
 *   - `?`  : exactly one non-slash character
 * All other regex metacharacters are escaped. Slashes are matched literally.
 */
function globToRegExp(pattern: string): RegExp {
  let regex = "^";
  let i = 0;
  while (i < pattern.length) {
    const c = pattern[i];

    if (c === "*") {
      if (pattern[i + 1] === "*") {
        regex += ".*";
        i += 2;
      } else {
        regex += "[^/]*";
        i += 1;
      }
    } else if (c === "?") {
      regex += "[^/]";
      i += 1;
    } else if (/[.+^${}()|[\]\\]/.test(c)) {
      regex += `\\${c}`;
      i += 1;
    } else {
      regex += c;
      i += 1;
    }
  }

  regex += "$";

  return new RegExp(regex);
}
