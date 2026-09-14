import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { shellQuote } from "./shell.ts";

// What a shell reads back from the quoted string — the property that matters.
function roundTrip(value: string): string {
  const result = spawnSync("sh", ["-c", `printf '%s' ${shellQuote(value)}`], {
    encoding: "utf-8",
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

describe("shellQuote", () => {
  it("passes simple words through unquoted", () => {
    assert.equal(shellQuote("npx"), "npx");
    assert.equal(shellQuote("/tmp/report.json"), "/tmp/report.json");
  });

  it("quotes spaces and shell operators", () => {
    assert.equal(shellQuote("npx hardhat clean"), "'npx hardhat clean'");
    assert.equal(roundTrip("a && b > c"), "a && b > c");
  });

  it("survives embedded single quotes (the aave forge --skip cell)", () => {
    const command =
      "FOUNDRY_SOLC=0.8.34 ./.foundry/forge build --skip 'tests/**' --offline";
    assert.equal(roundTrip(command), command);
  });
});
