import { afterEach, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveEnv } from "./env.ts";

describe("resolveEnv", () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = {};
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("passes through values with no tokens", () => {
    const resolved = resolveEnv(
      { FOO: "bar", BAZ: "qux" },
      "scenarios/test.json",
    );

    assert.deepEqual(resolved, { FOO: "bar", BAZ: "qux" });
  });

  it("substitutes a single ${localEnv:NAME} token", () => {
    process.env.ALCHEMY_URL = "https://example.com/key";

    const resolved = resolveEnv(
      { FOUNDRY_RPC_URL: "${localEnv:ALCHEMY_URL}" },
      "scenarios/test.json",
    );

    assert.deepEqual(resolved, { FOUNDRY_RPC_URL: "https://example.com/key" });
  });

  it("substitutes multiple tokens within a single value", () => {
    process.env.SCHEME = "https";
    process.env.HOST = "example.com";

    const resolved = resolveEnv(
      { URL: "${localEnv:SCHEME}://${localEnv:HOST}/path" },
      "scenarios/test.json",
    );

    assert.deepEqual(resolved, { URL: "https://example.com/path" });
  });

  it("substitutes tokens across multiple keys", () => {
    process.env.ALCHEMY_URL = "https://alchemy.example/key";
    process.env.INFURA_URL = "https://infura.example/key";

    const resolved = resolveEnv(
      {
        FOUNDRY_RPC_URL: "${localEnv:ALCHEMY_URL}",
        BACKUP_RPC_URL: "${localEnv:INFURA_URL}",
      },
      "scenarios/test.json",
    );

    assert.deepEqual(resolved, {
      FOUNDRY_RPC_URL: "https://alchemy.example/key",
      BACKUP_RPC_URL: "https://infura.example/key",
    });
  });

  it("substitutes an explicitly empty string", () => {
    process.env.MAYBE_EMPTY = "";

    const resolved = resolveEnv(
      { VALUE: "prefix-${localEnv:MAYBE_EMPTY}-suffix" },
      "scenarios/test.json",
    );

    assert.deepEqual(resolved, { VALUE: "prefix--suffix" });
  });

  it("throws when a referenced host variable is unset", () => {
    assert.throws(
      () =>
        resolveEnv(
          { FOUNDRY_RPC_URL: "${localEnv:MISSING_VAR}" },
          "scenarios/test.json",
        ),
      (err: Error) =>
        err.message.includes("scenarios/test.json") &&
        err.message.includes("MISSING_VAR"),
    );
  });

  it("leaves unrecognized ${...} tokens untouched", () => {
    const resolved = resolveEnv(
      {
        A: "${containerEnv:FOO}",
        B: "${something}",
      },
      "scenarios/test.json",
    );

    assert.deepEqual(resolved, {
      A: "${containerEnv:FOO}",
      B: "${something}",
    });
  });

  it("does not substitute keys", () => {
    process.env.FOO = "value";

    const resolved = resolveEnv(
      { "${localEnv:FOO}": "literal" },
      "scenarios/test.json",
    );

    assert.deepEqual(resolved, { "${localEnv:FOO}": "literal" });
  });
});
