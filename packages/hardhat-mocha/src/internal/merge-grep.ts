// cspell:ignore imsuvy gimy -- regex flag sets, not words

import type { MochaOptions } from "mocha";

import { HardhatError } from "@nomicfoundation/hardhat-errors";

type MochaGrepFilter = Pick<MochaOptions, "grep" | "fgrep" | "invert">;

/**
 * Works out the name filter Mocha should use, from the `--grep` (include) and
 * `--grep-exclude` (exclude) CLI options plus the user's Mocha config.
 *
 * Mocha can only filter test names by ONE pattern at a time (its `grep`
 * option; `fgrep` sets that same pattern from a fixed string, and `invert`
 * flips it to run the non-matches — all one name-filter). To support
 * excluding, include + exclude are merged into a single regex, e.g.
 *   --grep Foo --grep-exclude Bar  ->  ^(?=[\s\S]*(?:Foo))(?![\s\S]*(?:Bar))
 * meaning "name contains Foo but not Bar". Merging here — instead of dropping
 * excluded tests in this process — is what makes exclusion also work in Mocha's
 * parallel mode, where each worker re-applies the filter on its own.
 *
 * A CLI `--grep` cannot be combined with a config `fgrep`: Mocha applies
 * `fgrep` after `grep`, so the config would silently defeat the CLI option.
 * Mocha's own CLI rejects the pair as mutually exclusive, and so does this
 * resolver. Beyond that, with no `--grep-exclude` there's nothing to merge:
 * a CLI `--grep` overrides the config's `grep`, and otherwise the config's
 * name filter is used as-is (Mocha's native behavior).
 */
export function resolveMochaGrepFilter(
  grep: string | undefined,
  grepExclude: string | undefined,
  config: MochaGrepFilter,
): MochaGrepFilter {
  const include = emptyToUndefined(grep);
  const exclude = emptyToUndefined(grepExclude);
  // An empty `fgrep` does nothing in Mocha, so treat it as unset — the same
  // way empty grep/grep-exclude are normalized to undefined above.
  const configFgrep = emptyToUndefined(config.fgrep);

  assertValidPattern("grep", include);
  assertValidPattern("grepExclude", exclude);

  // A CLI `--grep` and a config `fgrep` are competing name filters, and Mocha
  // applies `fgrep` last (it would silently win). Reject the pair as mutually
  // exclusive, exactly like Mocha's own CLI does.
  if (include !== undefined && configFgrep !== undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL.GREP_INCOMPATIBLE_OPTION,
    );
  }

  if (exclude === undefined) {
    const resolved: MochaGrepFilter = { ...config };

    if (include !== undefined) {
      resolved.grep = include;
    }
    if (configFgrep === undefined) {
      // Drop an absent-or-empty `fgrep` so it doesn't linger as "". A real
      // config `fgrep` only gets here with no CLI `--grep` (see the guard
      // above), and passes through untouched — Mocha's native behavior.
      delete resolved.fgrep;
    }

    return resolved;
  }

  // The include pattern comes from the CLI's `--grep` or, when that's absent,
  // from the Mocha config's `grep`. Errors about the include side should say
  // which of the two it was, so name it once here.
  const includeName = include !== undefined ? "--grep" : "mocha config grep";

  // The merged pattern is about to take over Mocha's one filter slot, so a
  // config that ALSO sets `fgrep` (fixed-string filter) or `invert` (run the
  // non-matches) can't be honored at the same time — reject it.
  if (configFgrep !== undefined) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL.GREP_EXCLUDE_INCOMPATIBLE_OPTION,
      { option: "fgrep" },
    );
  }
  if (config.invert === true) {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL.GREP_EXCLUDE_INCOMPATIBLE_OPTION,
      { option: "invert" },
    );
  }

  // The config's `grep` can be a RegExp object rather than a string. Only its
  // source text can be merged; there is nowhere on the single merged (flagless)
  // pattern to carry a flag that changes which names match — i, m, s, u, v, y.
  // Rather than silently drop such a flag and change the filter's meaning,
  // reject the config RegExp when one of them is set and it actually feeds the
  // merge (i.e. no CLI --grep overrides it). The `g` and `d` flags don't affect
  // membership on a fresh test, so they are simply dropped, like before. A CLI
  // --grep is always a plain string, so it never has this problem.
  if (
    include === undefined &&
    typeof config.grep !== "string" &&
    config.grep !== undefined &&
    MEANING_CHANGING_REGEXP_FLAGS.test(config.grep.flags)
  ) {
    rejectUnsupportedPattern(
      includeName,
      String(config.grep),
      "meaning-changing regex flags (e.g. /i)",
    );
  }

  // A CLI --grep takes precedence over the config's grep when present.
  const configGrep =
    typeof config.grep === "string" ? config.grep : config.grep?.source;
  const effectiveInclude = include ?? emptyToUndefined(configGrep);

  // The CLI options are validated up top, but a config `grep` given as a string
  // isn't checked by Hardhat's argument layer. Validate it here when it feeds
  // the merge, so an invalid config grep is reported as invalid rather than
  // surfacing later as the misleading "cannot be combined" error.
  if (include === undefined) {
    assertValidPattern(includeName, emptyToUndefined(configGrep));
  }

  // The merged regex is built by pasting each pattern in as-is. A few kinds of
  // pattern change meaning when pasted like that, so they are rejected up front
  // (with a clear error) rather than silently building a wrong regex:
  //   - a Mocha `/pattern/flags` regex literal (see MOCHA_REGEX_LITERAL),
  //   - a backreference such as \1 or \k<name>, whose target can shift once
  //     the two patterns share one regex (checked in the blocks below), and
  //   - an escaped group/backreference name that can't be compared as text
  //     (also checked below).
  assertMergeableGrepPattern(includeName, effectiveInclude);
  assertMergeableGrepPattern("--grep-exclude", exclude);

  // In the merged regex, INCLUDE's capturing groups come first and EXCLUDE's
  // are numbered after them. That renumbering is the risk: a backreference
  // (\1, \k<name>) that pointed at one group on its own can end up pointing at
  // a different group — or turn from plain text into a real reference — once
  // the two patterns are joined. The blocks below reject only the ones whose
  // meaning would actually change; safe self-references are kept, and
  // group-looking text inside a [character class] is ignored.
  //
  // Each sub-pattern is scanned twice: first just to learn whether the MERGED
  // pattern contains any named group (that flips how `\k<...>` is read — see
  // analyzePattern), then again with that answer to collect the real facts.
  const mergedHasNamedGroup =
    analyzePattern(effectiveInclude ?? "", false).hasNamedGroup ||
    analyzePattern(exclude, false).hasNamedGroup;
  const includeInfo = analyzePattern(
    effectiveInclude ?? "",
    mergedHasNamedGroup,
  );
  const excludeInfo = analyzePattern(exclude, mergedHasNamedGroup);
  const totalCapturingGroups =
    includeInfo.capturingGroups + excludeInfo.capturingGroups;

  // A capturing-group or backreference NAME that itself contains an escape
  // (e.g. `(?<\u0067>`, which is really the group named `g`) can't be compared
  // as raw text, so the cross-binding guards below can't reliably tell whether
  // it collides once merged. Reject these outright rather than resolve escapes;
  // they are pathological in a test-name filter.
  if (includeInfo.hasEscapedName) {
    rejectUnsupportedPattern(
      includeName,
      effectiveInclude ?? "",
      "an escaped group name (e.g. \\u0067)",
    );
  }
  if (excludeInfo.hasEscapedName) {
    rejectUnsupportedPattern(
      "--grep-exclude",
      exclude,
      "an escaped group name (e.g. \\u0067)",
    );
  }

  // INCLUDE side: a number like \2 that is larger than INCLUDE's own group
  // count is just a literal (octal) escape on its own, but once EXCLUDE's
  // groups are appended that number can land on a real group — silently
  // becoming a reference and weakening the include filter. A \n that already
  // matches one of INCLUDE's own groups is fine and left alone.
  if (
    includeInfo.numberedBackreferences.some(
      (n) => n > includeInfo.capturingGroups && n <= totalCapturingGroups,
    )
  ) {
    rejectUnsupportedPattern(
      includeName,
      effectiveInclude ?? "",
      "a numbered backreference (e.g. \\1)",
    );
  }

  // EXCLUDE side: EXCLUDE's groups are renumbered by however many groups
  // INCLUDE added, so a \n inside EXCLUDE now points at a different group than
  // it did alone; likewise a \n that was a bare literal escape (above EXCLUDE's
  // own group count) can land on a real group once INCLUDE's groups precede it.
  // Two cases stay inert and are left alone: INCLUDE has no groups at all
  // (nothing renumbers), or \n is larger than the merged total group count
  // (still just a literal escape) — hence the `n <= totalCapturingGroups` bound.
  if (
    includeInfo.capturingGroups > 0 &&
    excludeInfo.numberedBackreferences.some((n) => n <= totalCapturingGroups)
  ) {
    rejectUnsupportedPattern(
      "--grep-exclude",
      exclude,
      "a numbered backreference (e.g. \\1)",
    );
  }

  // Named backreferences (\k<name>) resolve by name across the whole merged
  // pattern. On its own, a sub-pattern with no named group treats \k<x> as
  // literal text; but in the merge the OTHER pattern may contribute named
  // groups, turning \k<x> into a live reference to a group that only the other
  // side defines — changing its meaning. Reject that in both directions;
  // referring to a name your own pattern defines is safe. (If BOTH patterns
  // define the same name, the merged regex is outright invalid — caught below
  // as INVALID_GREP_EXCLUDE_COMBINATION.)
  if (
    includeInfo.namedBackreferences.some(
      (name) =>
        !includeInfo.groupNames.has(name) && excludeInfo.groupNames.has(name),
    )
  ) {
    rejectUnsupportedPattern(
      includeName,
      effectiveInclude ?? "",
      "a named backreference (e.g. \\k<name>)",
    );
  }
  if (
    excludeInfo.namedBackreferences.some(
      (name) =>
        !excludeInfo.groupNames.has(name) && includeInfo.groupNames.has(name),
    )
  ) {
    rejectUnsupportedPattern(
      "--grep-exclude",
      exclude,
      "a named backreference (e.g. \\k<name>)",
    );
  }

  const merged = buildMergedGrep(effectiveInclude, exclude);

  try {
    new RegExp(merged);
  } catch {
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL.INVALID_GREP_EXCLUDE_COMBINATION,
      { name: includeName, grep: effectiveInclude ?? "", grepExclude: exclude },
    );
  }

  return { grep: merged, invert: false };
}

/**
 * Builds the single regex source meaning "name contains `include` but not
 * `exclude`": a positive lookahead for include and a negative lookahead for
 * exclude, e.g.  ^(?=[\s\S]*(?:include))(?![\s\S]*(?:exclude)) .
 * With no include, only the negative (exclude) lookahead is emitted.
 */
function buildMergedGrep(include: string | undefined, exclude: string): string {
  const includeAssertion =
    include === undefined ? "" : `(?=[\\s\\S]*(?:${include}))`;
  return `^${includeAssertion}(?![\\s\\S]*(?:${exclude}))`;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  return value === undefined || value === "" ? undefined : value;
}

// The regex flags that change which names a pattern matches, and so can't be
// dropped when a config RegExp `grep` is merged into the single flagless
// pattern: ignoreCase (i), multiline (m), dotAll (s), unicode (u), unicodeSets
// (v) and sticky (y). The remaining flags — global (g) and hasIndices (d) —
// don't affect a fresh `.test()`, so they can be dropped safely.
const MEANING_CHANGING_REGEXP_FLAGS = /[imsuvy]/;

// When a --grep value looks like `/pattern/flags` with a non-empty pattern,
// Mocha treats it as a regex literal: it strips the slashes and applies the
// flags (`new RegExp(arg[1] || arg[0], arg[2])`). The merge instead pastes the
// value in verbatim (slashes and all), so its meaning would differ — so those
// shapes are rejected. This mirrors the regex-literal branch of Mocha's own
// parser, `/^\/(.*)\/([gimy]{0,4})$|.*/`, including its flag set (g, i, m, y).
// The guard is a touch broader: because it uses `.*` it also rejects
// empty-pattern shapes like `//` or `//g`, which Mocha's `arg[1] || arg[0]`
// fallback keeps verbatim — those would merge with the same meaning anyway, so
// rejecting them is harmless. Something like `/x/s` is NOT a literal to Mocha
// either, so it stays plain text in both places and needs no guard.
const MOCHA_REGEX_LITERAL = /^\/(.*)\/([gimy]{0,4})$/;

function assertMergeableGrepPattern(
  name: string,
  pattern: string | undefined,
): void {
  if (pattern !== undefined && MOCHA_REGEX_LITERAL.test(pattern)) {
    rejectUnsupportedPattern(name, pattern, "a /pattern/flags regex literal");
  }
}

function rejectUnsupportedPattern(
  name: string,
  pattern: string,
  feature: string,
): never {
  throw new HardhatError(
    HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL.GREP_EXCLUDE_UNSUPPORTED_PATTERN,
    { name, pattern, feature },
  );
}

interface PatternInfo {
  capturingGroups: number;
  hasNamedGroup: boolean;
  hasEscapedName: boolean;
  groupNames: Set<string>;
  numberedBackreferences: number[];
  namedBackreferences: string[];
}

/**
 * Scans a regex source string and reports the facts the merge needs: how many
 * capturing groups it has, any named groups (with their names), and the
 * numbered/named backreferences it uses.
 *
 * It is aware of [character classes] because inside them the normal rules
 * don't apply — `(` is a literal and `\1` is an octal escape — so a naive scan
 * would miscount those and reject valid patterns.
 *
 * `namedGroupsPresent` tells the scan whether the pattern runs in a context
 * that has a named group (here, the MERGED pattern). It matters because
 * `\k<...>` is a backreference only when some named group exists; otherwise
 * `\k` is a literal "k" and the following `<...>` is ordinary text that may
 * itself contain a real `(` group to count. Callers discover this with a first
 * pass using `namedGroupsPresent: false` (which safely sees every `(?<`), then
 * run the real pass with the answer.
 */
function analyzePattern(
  pattern: string,
  namedGroupsPresent: boolean,
): PatternInfo {
  const info: PatternInfo = {
    capturingGroups: 0,
    hasNamedGroup: false,
    hasEscapedName: false,
    groupNames: new Set(),
    numberedBackreferences: [],
    namedBackreferences: [],
  };
  let inCharacterClass = false;

  for (let i = 0; i < pattern.length; i++) {
    const char = pattern[i];

    if (char === "\\") {
      const next = pattern[i + 1];
      if (next === undefined) {
        break;
      }
      // Backreferences only exist outside a character class; inside one, `\1` is
      // an octal escape and `\k` is a literal "k".
      if (!inCharacterClass) {
        if (next >= "1" && next <= "9") {
          let digits = "";
          let j = i + 1;
          while (j < pattern.length && pattern[j] >= "0" && pattern[j] <= "9") {
            digits += pattern[j];
            j++;
          }
          info.numberedBackreferences.push(Number(digits));
          i = j - 1;
          continue;
        }
        // `\k<name>` is a named backreference only when a named group exists in
        // the (merged) pattern; otherwise `\k` is a literal "k" and the loop
        // must keep scanning `<...>` so any capturing group inside it is counted.
        if (namedGroupsPresent && next === "k" && pattern[i + 2] === "<") {
          const end = pattern.indexOf(">", i + 3);
          if (end !== -1) {
            const backrefName = pattern.slice(i + 3, end);
            if (backrefName.includes("\\")) {
              info.hasEscapedName = true;
            }
            info.namedBackreferences.push(backrefName);
            i = end;
            continue;
          }
        }
      }
      // Skip the escaped character (whatever it is).
      i++;
      continue;
    }

    if (inCharacterClass) {
      if (char === "]") {
        inCharacterClass = false;
      }
      continue;
    }

    if (char === "[") {
      inCharacterClass = true;
      continue;
    }

    if (char === "(") {
      if (pattern[i + 1] !== "?") {
        // A plain "(" opens a capturing group.
        info.capturingGroups++;
        continue;
      }
      // "(?<name>" is a named capturing group; "(?<=" / "(?<!" are lookbehind
      // assertions (not groups); "(?:", "(?=", "(?!" are non-capturing.
      if (
        pattern[i + 2] === "<" &&
        pattern[i + 3] !== "=" &&
        pattern[i + 3] !== "!"
      ) {
        info.hasNamedGroup = true;
        info.capturingGroups++;
        const end = pattern.indexOf(">", i + 3);
        if (end !== -1) {
          const groupName = pattern.slice(i + 3, end);
          if (groupName.includes("\\")) {
            info.hasEscapedName = true;
          }
          info.groupNames.add(groupName);
          i = end;
        }
      }
    }
  }

  return info;
}

function assertValidPattern(name: string, pattern: string | undefined): void {
  if (pattern === undefined) {
    return;
  }

  try {
    new RegExp(pattern);
  } catch {
    throw new HardhatError(
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      { value: pattern, name, type: "regexp" },
    );
  }
}
