// cspell:ignore gimy gimyx -- regex flag sets, not words

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { assertThrowsHardhatError } from "@nomicfoundation/hardhat-test-utils";
import Mocha from "mocha";

import { resolveMochaGrepFilter } from "../src/internal/merge-grep.js";

describe("resolveMochaGrepFilter", () => {
  // resolveMochaGrepFilter turns --grep (include) and --grep-exclude (exclude)
  // into a single Mocha `grep` regex: a positive lookahead for the include and
  // a negative lookahead for the exclude. So include "unit_" + exclude "sub"
  // becomes  ^(?=[\s\S]*(?:unit_))(?![\s\S]*(?:sub))  — "name contains unit_
  // but not sub" — and with no include only the negative lookahead is emitted.
  // (In the expected values below, `\\s`/`\\S` are just how those backslashes
  // are written inside a JS string.) Because everything ends up in ONE regex,
  // some patterns silently change meaning once merged — a backreference (\1,
  // \k<name>) can point at a different group, and a plain octal escape can turn
  // into a real reference as the exclude's groups are appended. Separately, a
  // /pattern/flags value that Mocha would parse as a regex literal is pasted in
  // verbatim instead. That's why many tests below guard those cases.

  it("leaves the config untouched when neither option is set", () => {
    assert.deepEqual(
      resolveMochaGrepFilter(undefined, undefined, {
        grep: "x",
        invert: true,
      }),
      { grep: "x", invert: true },
    );
  });

  it("lets --grep override the config's grep", () => {
    assert.deepEqual(
      resolveMochaGrepFilter("cli", undefined, { grep: "cfg" }),
      {
        grep: "cli",
      },
    );
  });

  it("treats empty strings as unset", () => {
    assert.deepEqual(resolveMochaGrepFilter("", "", { grep: "cfg" }), {
      grep: "cfg",
    });
  });

  it("rejects a CLI --grep combined with the config's fgrep, like Mocha's own CLI", () => {
    // Mocha applies `fgrep` after `grep`, so the config would silently defeat
    // the CLI option — the pair is rejected as mutually exclusive instead.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("cli", undefined, { fgrep: "fix" }),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL.GREP_INCOMPATIBLE_OPTION,
      {},
    );
  });

  it("keeps the config's invert when a CLI --grep replaces its grep", () => {
    // `invert` is a modifier on whatever the name filter is, not a competing
    // pattern source, so it isn't mutually exclusive with a CLI --grep.
    assert.deepEqual(
      resolveMochaGrepFilter("cli", undefined, { grep: "cfg", invert: true }),
      { grep: "cli", invert: true },
    );
  });

  it("keeps a config fgrep when there is no CLI --grep (Mocha's native behavior)", () => {
    assert.deepEqual(
      resolveMochaGrepFilter(undefined, undefined, { fgrep: "fix" }),
      { fgrep: "fix" },
    );
  });

  it("normalizes an empty config fgrep to unset in the no-exclude path", () => {
    assert.deepEqual(
      resolveMochaGrepFilter(undefined, undefined, { fgrep: "" }),
      {},
    );
  });

  it("builds a merged pattern for --grep-exclude on its own", () => {
    assert.deepEqual(resolveMochaGrepFilter(undefined, "sub", {}), {
      grep: "^(?![\\s\\S]*(?:sub))",
      invert: false,
    });
  });

  it("builds a merged pattern for --grep plus --grep-exclude", () => {
    assert.deepEqual(resolveMochaGrepFilter("unit_", "sub", {}), {
      grep: "^(?=[\\s\\S]*(?:unit_))(?![\\s\\S]*(?:sub))",
      invert: false,
    });
  });

  it("merges into a pattern matching names with the include but not the exclude", () => {
    const { grep: merged } = resolveMochaGrepFilter("unit_", "sub", {});
    assert.ok(typeof merged === "string", "expected a merged pattern string");
    const regexp = new RegExp(merged);

    assert.ok(regexp.test("suite unit_add"), "nested include should match");
    assert.ok(regexp.test("unit_mul"), "include should match");
    assert.ok(!regexp.test("unit_sub"), "exclude should win over include");
    assert.ok(!regexp.test("integration_flow"), "non-include should not match");
  });

  it("preserves a RegExp config grep (and its flags) when no option is set", () => {
    const configGrep = /unit_/i;
    assert.deepEqual(
      resolveMochaGrepFilter(undefined, undefined, { grep: configGrep }),
      { grep: configGrep },
    );
  });

  it("uses a RegExp config grep's source as the include when merging", () => {
    assert.deepEqual(
      resolveMochaGrepFilter(undefined, "sub", { grep: /unit_/ }),
      {
        grep: "^(?=[\\s\\S]*(?:unit_))(?![\\s\\S]*(?:sub))",
        invert: false,
      },
    );
  });

  it("uses the config's grep as the include when --grep is absent", () => {
    assert.deepEqual(
      resolveMochaGrepFilter(undefined, "sub", { grep: "unit_" }),
      {
        grep: "^(?=[\\s\\S]*(?:unit_))(?![\\s\\S]*(?:sub))",
        invert: false,
      },
    );
  });

  it("rejects --grep-exclude combined with the config's fgrep", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter(undefined, "sub", { fgrep: "x" }),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_INCOMPATIBLE_OPTION,
      { option: "fgrep" },
    );
  });

  it("blames --grep, not --grep-exclude, when both are passed with a config fgrep", () => {
    // With all three present the fundamental conflict is --grep vs fgrep, so
    // the mutual-exclusion error fires rather than the --grep-exclude one.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("cli", "sub", { fgrep: "fix" }),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL.GREP_INCOMPATIBLE_OPTION,
      {},
    );
  });

  it("rejects --grep-exclude combined with the config's invert", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter(undefined, "sub", { invert: true }),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_INCOMPATIBLE_OPTION,
      { option: "invert" },
    );
  });

  it("treats an empty-string config fgrep as unset (no conflict)", () => {
    assert.deepEqual(resolveMochaGrepFilter(undefined, "sub", { fgrep: "" }), {
      grep: "^(?![\\s\\S]*(?:sub))",
      invert: false,
    });
  });

  it("treats config invert:false as unset (no conflict)", () => {
    assert.deepEqual(
      resolveMochaGrepFilter(undefined, "sub", { invert: false }),
      { grep: "^(?![\\s\\S]*(?:sub))", invert: false },
    );
  });

  it("rejects an invalid regexp", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("(", undefined, {}),
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      { value: "(", name: "grep", type: "regexp" },
    );
  });

  it("rejects patterns that can't be merged, e.g. duplicate group names", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("(?<g>a)", "(?<g>b)", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .INVALID_GREP_EXCLUDE_COMBINATION,
      { name: "--grep", grep: "(?<g>a)", grepExclude: "(?<g>b)" },
    );
  });

  it("attributes a pair that can't be combined to the config when --grep is absent", () => {
    // The duplicated group name comes from the config's grep, not a --grep flag,
    // so the "cannot be combined" error must name the config too.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter(undefined, "(?<g>b)", { grep: "(?<g>a)" }),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .INVALID_GREP_EXCLUDE_COMBINATION,
      { name: "mocha config grep", grep: "(?<g>a)", grepExclude: "(?<g>b)" },
    );
  });

  it("rejects a /pattern/flags regex literal in --grep", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("/unit_/i", "sub", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep",
        pattern: "/unit_/i",
        feature: "a /pattern/flags regex literal",
      },
    );
  });

  it("rejects a /pattern/flags regex literal in --grep-exclude", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("unit_", "/sub/i", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep-exclude",
        pattern: "/sub/i",
        feature: "a /pattern/flags regex literal",
      },
    );
  });

  it("rejects a /pattern/ regex literal even without a flag", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("/unit_/", "sub", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep",
        pattern: "/unit_/",
        feature: "a /pattern/flags regex literal",
      },
    );
  });

  it("rejects a numbered backreference in --grep-exclude when --grep has a capturing group", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("(x)", "(y)\\1", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep-exclude",
        pattern: "(y)\\1",
        feature: "a numbered backreference (e.g. \\1)",
      },
    );
  });

  it("allows a backreference in --grep-exclude when --grep has no capturing group", () => {
    // The exclude's group is #1 either way, so its \1 still points at itself.
    assert.deepEqual(resolveMochaGrepFilter("unit_", "(y)\\1", {}), {
      grep: "^(?=[\\s\\S]*(?:unit_))(?![\\s\\S]*(?:(y)\\1))",
      invert: false,
    });
  });

  it("allows a backreference in --grep (include groups keep their number)", () => {
    assert.deepEqual(resolveMochaGrepFilter("(a)\\1", "sub", {}), {
      grep: "^(?=[\\s\\S]*(?:(a)\\1))(?![\\s\\S]*(?:sub))",
      invert: false,
    });
  });

  it("does not treat a non-literal pattern with slashes as a regex literal", () => {
    // "a/b" is not Mocha's /pattern/flags form, so it must merge normally.
    assert.deepEqual(resolveMochaGrepFilter("a/b", "sub", {}), {
      grep: "^(?=[\\s\\S]*(?:a/b))(?![\\s\\S]*(?:sub))",
      invert: false,
    });
  });

  // Mocha 11 parses `/(.*)/([gimy]{0,4})` as a regex literal, so each of these
  // is a literal with flags — not literal text. They must be rejected.
  for (const literal of ["/x/gi", "/x/m", "/x/y", "/x/gm", "/x/gimy"]) {
    it(`rejects the regex literal ${literal} (flag in Mocha's [gimy] set)`, () => {
      assertThrowsHardhatError(
        () => resolveMochaGrepFilter(literal, "sub", {}),
        HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
          .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
        {
          name: "--grep",
          pattern: literal,
          feature: "a /pattern/flags regex literal",
        },
      );
    });
  }

  it("does not treat /x/s as a regex literal (s is outside Mocha's flag set)", () => {
    // Mocha does not parse `s` as a flag, so /x/s is literal text in both Mocha
    // and the merge — no divergence, so it must merge normally.
    assert.deepEqual(resolveMochaGrepFilter("/x/s", "sub", {}), {
      grep: "^(?=[\\s\\S]*(?:/x/s))(?![\\s\\S]*(?:sub))",
      invert: false,
    });
  });

  it("rejects a named backreference in --grep-exclude when --grep has a named group", () => {
    // \k<g> would bind to the include's (?<g>...) once merged, silently
    // changing meaning — mirror the numbered-backreference guard.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("(?<g>alpha)", "\\k<g>", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep-exclude",
        pattern: "\\k<g>",
        feature: "a named backreference (e.g. \\k<name>)",
      },
    );
  });

  it("allows a self-contained named backreference in --grep-exclude", () => {
    // The exclude defines its own group, and the include has no named group,
    // so \k<x> stays a self-reference and merges safely.
    assert.deepEqual(resolveMochaGrepFilter("unit_", "(?<x>a)\\k<x>", {}), {
      grep: "^(?=[\\s\\S]*(?:unit_))(?![\\s\\S]*(?:(?<x>a)\\k<x>))",
      invert: false,
    });
  });

  it("does not treat an escaped backslash + k<x> as a named backreference", () => {
    // "\\\\k<x>" is an escaped backslash then literal "k<x>", not a backref.
    assert.deepEqual(resolveMochaGrepFilter("(?<g>a)", "y\\\\k<x>", {}), {
      grep: "^(?=[\\s\\S]*(?:(?<g>a)))(?![\\s\\S]*(?:y\\\\k<x>))",
      invert: false,
    });
  });

  it("does not treat an escaped backslash + digit as a backreference", () => {
    // "\\\\1" is an escaped backslash followed by a literal "1", not a backref.
    assert.deepEqual(resolveMochaGrepFilter("(x)", "y\\\\1", {}), {
      grep: "^(?=[\\s\\S]*(?:(x)))(?![\\s\\S]*(?:y\\\\1))",
      invert: false,
    });
  });

  it("rejects an include backref that overshoots into an exclude group", () => {
    // `(a)\2` has one group, so standalone `\2` is an octal escape; once merged,
    // (b) becomes group 2 and `\2` silently rebinds to it (matching empty),
    // disabling the include filter. Must be rejected on the --grep side.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("(a)\\2", "(b)", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep",
        pattern: "(a)\\2",
        feature: "a numbered backreference (e.g. \\1)",
      },
    );
  });

  it("rejects a bare include backref when the exclude introduces a group", () => {
    // `\1` with no include group is an octal escape standalone, but binds to the
    // exclude's (a) after merge — same hazard, reported on the --grep side.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("\\1", "(a)", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep",
        pattern: "\\1",
        feature: "a numbered backreference (e.g. \\1)",
      },
    );
  });

  it("rejects an include named backref that binds to an exclude group name", () => {
    // Standalone `\k<g>` (no include group named g) is the literal "k<g>"; once
    // the exclude defines (?<g>...), it becomes a real backreference.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("\\k<g>", "(?<g>a)", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep",
        pattern: "\\k<g>",
        feature: "a named backreference (e.g. \\k<name>)",
      },
    );
  });

  it("does not count a '(' inside a character class as a capturing group", () => {
    // `[(]` is a class matching a literal "(", so it has no capturing group and
    // the exclude's `\1` still self-references (a). Must merge, not be rejected.
    assert.deepEqual(resolveMochaGrepFilter("[(]", "(a)\\1", {}), {
      grep: "^(?=[\\s\\S]*(?:[(]))(?![\\s\\S]*(?:(a)\\1))",
      invert: false,
    });
  });

  it("does not treat a backref-looking escape inside a character class as a backref", () => {
    // `\1` inside `[\1]` is octal in both the standalone and merged forms, so it
    // never renumbers — the pair must merge rather than be rejected.
    assert.deepEqual(resolveMochaGrepFilter("(a)", "[\\1]", {}), {
      grep: "^(?=[\\s\\S]*(?:(a)))(?![\\s\\S]*(?:[\\1]))",
      invert: false,
    });
  });

  it("allows an exclude self-backref whose name differs from the include's group", () => {
    // `\k<b>` binds to the exclude's own (?<b>...); the include's differently
    // named (?<a>...) is irrelevant, so there is no cross-binding to reject.
    assert.deepEqual(resolveMochaGrepFilter("(?<a>foo)", "(?<b>x)\\k<b>", {}), {
      grep: "^(?=[\\s\\S]*(?:(?<a>foo)))(?![\\s\\S]*(?:(?<b>x)\\k<b>))",
      invert: false,
    });
  });

  it("rejects an include backref that renumbers past a group hidden in an exclude's \\k<...> literal", () => {
    // Neither pattern has a named group, so the exclude's `\k` is just the
    // literal "k" and the `()` inside `<...>` is a REAL capturing group — which
    // becomes group 2 in the merged regex. That silently turns the include's
    // standalone octal `\2` into a forward reference (which matches empty),
    // disabling the include filter, so it must be rejected. (Regression guard:
    // misreading `\k` as a backreference here would hide that group and wrongly
    // skip the rejection.)
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("(a)\\2", "\\k<()0>", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep",
        pattern: "(a)\\2",
        feature: "a numbered backreference (e.g. \\1)",
      },
    );
  });

  it("rejects an exclude backref that renumbers past a group hidden in an include's \\k<...> literal", () => {
    // Symmetric case: the include's `\k<()0>` is literal text with a real `()`
    // group, so the exclude's `(a)` becomes group 2 and its standalone octal
    // `\2` silently rebinds to it once merged. Must reject on the exclude side.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("\\k<()0>", "(a)\\2", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep-exclude",
        pattern: "(a)\\2",
        feature: "a numbered backreference (e.g. \\1)",
      },
    );
  });

  it("counts a capturing group inside a \\k<...> literal when no named group is present", () => {
    // `\k<(a)>` has no named group, so `\k` is the literal "k" and `(a)` is a
    // real group. With no backreference to renumber, the pair merges verbatim
    // (and no bogus named backreference is recorded).
    assert.deepEqual(resolveMochaGrepFilter("unit_", "\\k<(a)>", {}), {
      grep: "^(?=[\\s\\S]*(?:unit_))(?![\\s\\S]*(?:\\k<(a)>))",
      invert: false,
    });
  });

  it("lets the CLI --grep win over a config grep when merging with --grep-exclude", () => {
    assert.deepEqual(resolveMochaGrepFilter("cli_", "sub", { grep: "cfg_" }), {
      grep: "^(?=[\\s\\S]*(?:cli_))(?![\\s\\S]*(?:sub))",
      invert: false,
    });
  });

  it("rejects a config RegExp grep with a meaning-changing flag, which can't be carried into the merge", () => {
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter(undefined, "sub", { grep: /unit_/i }),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "mocha config grep",
        pattern: "/unit_/i",
        feature: "meaning-changing regex flags (e.g. /i)",
      },
    );
  });

  it("drops a membership-neutral config RegExp flag (g, d) rather than rejecting it", () => {
    // g (global) and d (hasIndices) don't change which names match, and the
    // merged pattern is a flagless string anyway, so these merge like /foo/.
    for (const configGrep of [/foo/g, /foo/d]) {
      assert.deepEqual(
        resolveMochaGrepFilter(undefined, "sub", { grep: configGrep }),
        { grep: "^(?=[\\s\\S]*(?:foo))(?![\\s\\S]*(?:sub))", invert: false },
      );
    }
  });

  it("ignores a config RegExp grep's flags when the CLI --grep overrides it", () => {
    // --grep replaces the config grep entirely, so the dropped-flags hazard
    // doesn't apply and the merge proceeds.
    assert.deepEqual(
      resolveMochaGrepFilter("cli_", "sub", { grep: /unit_/i }),
      {
        grep: "^(?=[\\s\\S]*(?:cli_))(?![\\s\\S]*(?:sub))",
        invert: false,
      },
    );
  });

  it("attributes an unsupported include pattern to the config when --grep is absent", () => {
    // The bad pattern comes from the config's grep, not a --grep flag the user
    // passed, so the error must name the config.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter(undefined, "(b)", { grep: "(a)\\2" }),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "mocha config grep",
        pattern: "(a)\\2",
        feature: "a numbered backreference (e.g. \\1)",
      },
    );
  });

  it("reports an invalid config grep string as invalid, not as a pair that can't be combined", () => {
    // A config grep of "(" is not a valid regex on its own; it should be flagged
    // as such rather than as an invalid --grep/--grep-exclude combination.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter(undefined, "sub", { grep: "(" }),
      HardhatError.ERRORS.CORE.ARGUMENTS.INVALID_VALUE_FOR_TYPE,
      { value: "(", name: "mocha config grep", type: "regexp" },
    );
  });

  it("rejects an escaped group name in --grep (can't be compared as text)", () => {
    // `(?<g>a)` is really the group named `g`, but stored as raw text the
    // cross-binding guards can't match it against a plain `g`, so reject it.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("(?<\\u0067>a)", "sub", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep",
        pattern: "(?<\\u0067>a)",
        feature: "an escaped group name (e.g. \\u0067)",
      },
    );
  });

  it("rejects an escaped named backreference in --grep-exclude", () => {
    // The include defines a real named group `g`; the exclude's `\k<g>` is
    // `\k<g>` in disguise and would bind to it, silently changing meaning.
    assertThrowsHardhatError(
      () => resolveMochaGrepFilter("(?<g>a)", "\\k<\\u0067>", {}),
      HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
        .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
      {
        name: "--grep-exclude",
        pattern: "\\k<\\u0067>",
        feature: "an escaped group name (e.g. \\u0067)",
      },
    );
  });
});

describe("regex-literal detection contract with the installed Mocha", () => {
  // The resolver mirrors how `Mocha.prototype.grep` decides whether a pattern
  // is a `/pattern/flags` regex literal (flag set `[gimy]{0,4}`). Mocha is a
  // caret-ranged peer dependency, so if a Mocha release widens that flag set,
  // the mirror must be updated in lockstep. This suite compares the resolver's
  // accept/reject behavior against the real installed Mocha, so any drift
  // fails here instead of silently mis-merging a user's pattern.
  function mochaParsesAsRegexLiteral(pattern: string): boolean {
    const parsed = new Mocha().grep(pattern).options.grep;
    // When Mocha does NOT treat the string as a regex literal, it compiles the
    // whole string verbatim, i.e. equivalently to `new RegExp(pattern)`.
    return String(parsed) !== String(new RegExp(pattern));
  }

  const candidates = [
    // Every lowercase letter as a single flag: /x/a ... /x/z.
    ...Array.from(
      { length: 26 },
      (_, i) => `/x/${String.fromCharCode(97 + i)}`,
    ),
    "/x/",
    "/x/gi",
    "/x/gimy",
    "/x/gimyx",
    "a/b",
    "x",
  ];

  for (const pattern of candidates) {
    it(`agrees with Mocha on whether ${JSON.stringify(pattern)} is a regex literal`, () => {
      if (mochaParsesAsRegexLiteral(pattern)) {
        assertThrowsHardhatError(
          () => resolveMochaGrepFilter(pattern, "zzz", {}),
          HardhatError.ERRORS.HARDHAT_MOCHA.GENERAL
            .GREP_EXCLUDE_UNSUPPORTED_PATTERN,
          {
            name: "--grep",
            pattern,
            feature: "a /pattern/flags regex literal",
          },
        );
      } else {
        // Literal text in both Mocha and the merge — it must merge, not throw.
        const { grep } = resolveMochaGrepFilter(pattern, "zzz", {});
        assert.ok(typeof grep === "string", "expected a merged pattern");
      }
    });
  }
});
