// cSpell:ignore outpt -- a deliberate misspelling testing option validation
import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { cliError, parseCliArgs } from "./cli-args.ts";

describe("parseCliArgs", () => {
  const cli = {
    command: "pnpm example",
    options: {
      output: { type: "string" },
      "dry-run": { type: "boolean" },
    },
  } as const;
  const hint = /\nRun `pnpm example --help` for usage\.$/;

  it("returns the typed values of known options", () => {
    const parsed = parseCliArgs(["--output", "x", "--dry-run"], cli);

    // parseArgs builds its values without a prototype; spread for deepEqual.
    assert.deepEqual({ ...parsed?.values }, { output: "x", "dry-run": true });
    assert.deepEqual(parsed?.positionals, []);
  });

  it("asks for the usage text with no arguments or with --help or -h anywhere", () => {
    for (const args of [
      [],
      ["--help"],
      ["-h"],
      ["--output", "x", "--help"],
      ["--help", "--bogus"],
    ]) {
      assert.equal(parseCliArgs(args, cli), undefined, args.join(" "));
    }
  });

  it("does not take -h as an option's value", () => {
    assert.throws(
      () => parseCliArgs(["--output", "-h"], cli),
      /Option '--output' argument is ambiguous/,
    );
  });

  it("takes a dash-led value only in the --option=value form", () => {
    assert.equal(parseCliArgs(["--output=-h"], cli)?.values.output, "-h");
  });

  it("takes the last value of a repeated option", () => {
    assert.equal(
      parseCliArgs(["--output", "a", "--output", "b"], cli)?.values.output,
      "b",
    );
  });

  it("skips the bare -- separator that pnpm forwards", () => {
    assert.deepEqual(
      { ...parseCliArgs(["--", "--output", "x"], cli)?.values },
      {
        output: "x",
      },
    );
  });

  it("rejects an unknown option, a missing value and a stray token with the usage hint", () => {
    assert.throws(
      () => parseCliArgs(["--outpt", "x"], cli),
      /Unknown option '--outpt'/,
    );
    assert.throws(() => parseCliArgs(["--outpt", "x"], cli), hint);
    assert.throws(() => parseCliArgs(["--output"], cli), /argument missing/);
    assert.throws(
      () => parseCliArgs(["stray"], cli),
      /Unexpected argument 'stray'/,
    );
    assert.throws(
      () => parseCliArgs(["--dry-run", "stray"], cli),
      /Unexpected argument 'stray'/,
    );
    assert.throws(
      () => parseCliArgs(["help"], cli),
      /Unexpected argument 'help'/,
    );
    assert.throws(() => parseCliArgs(["-x"], cli), /Unknown option '-x'/);
    assert.throws(
      () => parseCliArgs(["--output", "x", "--", "--dry-run"], cli),
      /Unexpected argument '--dry-run'/,
    );
  });

  it("drops Node's advice to place a positional after --", () => {
    assert.throws(
      () => parseCliArgs(["--outpt"], { ...cli, allowPositionals: true }),
      /^Error: Unknown option '--outpt'\nRun/,
    );
  });

  it("accepts positionals when the command takes them", () => {
    const parsed = parseCliArgs(["render", "--output", "o", "dir"], {
      ...cli,
      allowPositionals: true,
    });

    assert.deepEqual(parsed?.positionals, ["render", "dir"]);
  });
});

describe("cliError", () => {
  it("appends the usage hint to the message", () => {
    assert.equal(
      cliError({ command: "pnpm example" }, "--output is required").message,
      "--output is required\nRun `pnpm example --help` for usage.",
    );
  });
});
