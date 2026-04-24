import assert from "node:assert/strict";
import {
  afterEach,
  beforeEach,
  describe,
  it,
  type TestContext,
} from "node:test";

import { createDebug } from "../src/debug.js";
import {
  NOOP,
  colorize,
  isEnabled,
  parsePatterns,
  selectColor,
  useColors,
} from "../src/internal/debug.js";

function captureStderr(t: TestContext): string[] {
  const chunks: string[] = [];
  t.mock.method(process.stderr, "write", (chunk: unknown) => {
    chunks.push(typeof chunk === "string" ? chunk : String(chunk));
    return true;
  });
  return chunks;
}

function setIsTTY(value: boolean | undefined): void {
  Object.defineProperty(process.stderr, "isTTY", {
    value,
    configurable: true,
    writable: true,
  });
}

function setEnv(
  key: "DEBUG" | "DEBUG_COLORS",
  value: string | undefined,
): void {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
}

describe("debug", () => {
  describe("createDebug", () => {
    let savedDebug: string | undefined;
    let savedDebugColors: string | undefined;
    let savedIsTTY: boolean | undefined;

    beforeEach(() => {
      savedDebug = process.env.DEBUG;
      savedDebugColors = process.env.DEBUG_COLORS;
      savedIsTTY = process.stderr.isTTY;
      delete process.env.DEBUG;
      delete process.env.DEBUG_COLORS;
      setIsTTY(false);
    });

    afterEach(() => {
      setEnv("DEBUG", savedDebug);
      setEnv("DEBUG_COLORS", savedDebugColors);
      setIsTTY(savedIsTTY);
    });

    it("returns the shared NOOP when DEBUG is unset", () => {
      const a = createDebug("hardhat:foo");
      const b = createDebug("hardhat:bar");
      assert.equal(a, NOOP);
      assert.equal(b, NOOP);
    });

    it("returns the shared NOOP when the namespace is not matched", () => {
      process.env.DEBUG = "other:*";
      assert.equal(createDebug("hardhat:foo"), NOOP);
    });

    describe("enabled", () => {
      it("is true for a matched namespace", () => {
        process.env.DEBUG = "hardhat:foo";
        assert.equal(createDebug("hardhat:foo").enabled, true);
      });

      it("is true for a wildcard-matched namespace", () => {
        process.env.DEBUG = "hardhat:*";
        assert.equal(createDebug("hardhat:core:foo").enabled, true);
      });

      it("is false when DEBUG is unset", () => {
        assert.equal(createDebug("hardhat:foo").enabled, false);
      });

      it("is false when the namespace does not match", () => {
        process.env.DEBUG = "other:*";
        assert.equal(createDebug("hardhat:foo").enabled, false);
      });

      it("is false for a negated namespace", () => {
        process.env.DEBUG = "hardhat:*,-hardhat:noisy";
        assert.equal(createDebug("hardhat:noisy").enabled, false);
      });
    });

    it("writes to stderr when the namespace matches", (t) => {
      process.env.DEBUG = "hardhat:foo";
      const chunks = captureStderr(t);

      const log = createDebug("hardhat:foo");
      log("hello");

      assert.match(chunks.join(""), /  hardhat:foo hello \+0ms\n$/);
    });

    it("supports wildcard patterns", (t) => {
      process.env.DEBUG = "hardhat:*";
      const chunks = captureStderr(t);

      const log = createDebug("hardhat:core:foo");
      log("x");

      assert.match(chunks.join(""), /hardhat:core:foo x \+0ms/);
    });

    it("supports negation patterns", (t) => {
      process.env.DEBUG = "hardhat:*,-hardhat:noisy";
      const chunks = captureStderr(t);

      const enabled = createDebug("hardhat:foo");
      const disabled = createDebug("hardhat:noisy");
      enabled("included");
      disabled("excluded");

      assert.equal(disabled, NOOP);
      const output = chunks.join("");
      assert.match(output, /hardhat:foo included/);
      assert.doesNotMatch(output, /excluded/);
    });

    it("renders the %O format specifier", (t) => {
      process.env.DEBUG = "hardhat:foo";
      const chunks = captureStderr(t);

      const log = createDebug("hardhat:foo");
      log("got %O", { a: 1 });

      assert.match(chunks.join(""), /got \{ a: 1 \}/);
    });

    it("formats multiple positional args", (t) => {
      process.env.DEBUG = "hardhat:foo";
      const chunks = captureStderr(t);

      const log = createDebug("hardhat:foo");
      log("saved", 42, "/tmp/a");

      assert.match(chunks.join(""), /saved 42 \/tmp\/a/);
    });

    it("emits ANSI escape codes when stderr is a TTY", (t) => {
      process.env.DEBUG = "hardhat:foo";
      setIsTTY(true);
      const chunks = captureStderr(t);

      const log = createDebug("hardhat:foo");
      log("x");

      assert.match(chunks.join(""), /\x1b\[/);
    });

    it("omits ANSI escape codes when DEBUG_COLORS=no", (t) => {
      process.env.DEBUG = "hardhat:foo";
      process.env.DEBUG_COLORS = "no";
      setIsTTY(true);
      const chunks = captureStderr(t);

      const log = createDebug("hardhat:foo");
      log("x");

      assert.doesNotMatch(chunks.join(""), /\x1b/);
    });

    it("omits ANSI escape codes when DEBUG_COLORS=false", (t) => {
      process.env.DEBUG = "hardhat:foo";
      process.env.DEBUG_COLORS = "false";
      setIsTTY(true);
      const chunks = captureStderr(t);

      const log = createDebug("hardhat:foo");
      log("x");

      assert.doesNotMatch(chunks.join(""), /\x1b/);
    });

    it("appends the elapsed-diff suffix", (t) => {
      process.env.DEBUG = "hardhat:foo";
      const chunks = captureStderr(t);

      const log = createDebug("hardhat:foo");
      log("first");
      log("second");

      const lines = chunks.join("").trimEnd().split("\n");
      assert.match(lines[0], /\+0ms$/);
      assert.match(lines[1], /\+\d+ms$/);
    });
  });

  describe("parsePatterns", () => {
    it("returns empty lists for empty input", () => {
      const result = parsePatterns("");
      assert.deepEqual(result.include, []);
      assert.deepEqual(result.exclude, []);
    });

    it("parses a single include pattern", () => {
      const result = parsePatterns("hardhat:foo");
      assert.equal(result.include.length, 1);
      assert.equal(result.exclude.length, 0);
      assert.ok(
        result.include[0].test("hardhat:foo"),
        "include pattern should match its own namespace",
      );
    });

    it("routes negated patterns into exclude", () => {
      const result = parsePatterns("-hardhat:noisy");
      assert.equal(result.include.length, 0);
      assert.equal(result.exclude.length, 1);
      assert.ok(
        result.exclude[0].test("hardhat:noisy"),
        "exclude pattern should match its own namespace",
      );
    });

    it("splits on both commas and whitespace", () => {
      const result = parsePatterns("a, b  c");
      assert.equal(result.include.length, 3);
    });

    it("translates * into a glob wildcard", () => {
      const result = parsePatterns("hardhat:*");
      assert.ok(
        result.include[0].test("hardhat:core:foo"),
        "wildcard should match nested namespace",
      );
      assert.ok(
        !result.include[0].test("other:foo"),
        "wildcard should not match unrelated prefix",
      );
    });

    it("escapes regex metacharacters", () => {
      const result = parsePatterns("hardhat.foo");
      assert.ok(
        result.include[0].test("hardhat.foo"),
        "literal dot should match a literal dot",
      );
      assert.ok(
        !result.include[0].test("hardhat_foo"),
        "literal dot should not match an arbitrary character",
      );
    });
  });

  describe("isEnabled", () => {
    it("returns false for an empty pattern string", () => {
      assert.equal(isEnabled("hardhat:foo", ""), false);
    });

    it("returns true on exact match", () => {
      assert.equal(isEnabled("hardhat:foo", "hardhat:foo"), true);
    });

    it("returns false for unmatched namespaces", () => {
      assert.equal(isEnabled("hardhat:foo", "other"), false);
    });

    it("honours wildcard patterns", () => {
      assert.equal(isEnabled("hardhat:core:foo", "hardhat:*"), true);
    });

    it("excludes take precedence over includes", () => {
      assert.equal(
        isEnabled("hardhat:noisy", "hardhat:*,-hardhat:noisy"),
        false,
      );
    });
  });

  describe("selectColor", () => {
    it("is deterministic for the same namespace", () => {
      assert.equal(selectColor("hardhat:foo"), selectColor("hardhat:foo"));
    });

    it("returns a value from the palette", () => {
      const palette = [1, 2, 3, 4, 5, 6];
      for (const namespace of ["hardhat:foo", "hardhat:noisy", ""]) {
        const color = selectColor(namespace);
        assert.ok(
          palette.includes(color),
          `color ${color} for "${namespace}" must be in the palette`,
        );
      }
    });
  });

  describe("useColors", () => {
    let savedDebugColors: string | undefined;
    let savedIsTTY: boolean | undefined;

    beforeEach(() => {
      savedDebugColors = process.env.DEBUG_COLORS;
      savedIsTTY = process.stderr.isTTY;
      delete process.env.DEBUG_COLORS;
    });

    afterEach(() => {
      setEnv("DEBUG_COLORS", savedDebugColors);
      setIsTTY(savedIsTTY);
    });

    it("returns true when stderr is a TTY and DEBUG_COLORS is unset", () => {
      setIsTTY(true);
      assert.equal(useColors(), true);
    });

    it("returns false when stderr is not a TTY", () => {
      setIsTTY(false);
      assert.equal(useColors(), false);
    });

    it("returns false when DEBUG_COLORS=no", () => {
      setIsTTY(true);
      process.env.DEBUG_COLORS = "no";
      assert.equal(useColors(), false);
    });

    it("returns false when DEBUG_COLORS=false", () => {
      setIsTTY(true);
      process.env.DEBUG_COLORS = "false";
      assert.equal(useColors(), false);
    });
  });

  describe("colorize", () => {
    it("returns the text unchanged when color is undefined", () => {
      assert.equal(colorize("text", undefined), "text");
      assert.equal(colorize("text", undefined, true), "text");
    });

    it("wraps the text with ANSI codes when color is provided", () => {
      assert.equal(colorize("text", 6), "\x1b[36mtext\x1b[0m");
    });

    it("applies bold when bold=true", () => {
      assert.equal(colorize("text", 6, true), "\x1b[36;1mtext\x1b[0m");
    });
  });

  describe("NOOP", () => {
    it("returns undefined and does not throw", () => {
      assert.equal(NOOP("anything"), undefined);
      assert.equal(NOOP("with", "args", 42), undefined);
    });
  });
});
