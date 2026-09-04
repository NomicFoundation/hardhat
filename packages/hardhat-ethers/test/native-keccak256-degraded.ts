import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CHILD_PATH = fileURLToPath(
  new URL("./helpers/native-keccak256-child.mjs", import.meta.url),
);

const EMPTY_DIGEST =
  "0xc5d2460186f7233c927e7db2dcc703c0e500b653ca82273b7bfad8045d85a470";

// Each scenario needs a new process: the registration is memoized, lock() is
// irreversible, and EDR can only be hidden from a process that hasn't loaded it.
async function keccak256OfEmptyUnder(scenario: string): Promise<string> {
  const { stdout } = await execFileAsync(process.execPath, [
    "--import",
    "tsx/esm",
    CHILD_PATH,
    scenario,
  ]);

  return stdout.trim();
}

describe("native keccak256 registration when it can't be installed", () => {
  it("should leave ethers working when EDR isn't installed", async () => {
    assert.equal(await keccak256OfEmptyUnder("edr-missing"), EMPTY_DIGEST);
  });

  it("should leave ethers working when its keccak256 is locked", async () => {
    assert.equal(await keccak256OfEmptyUnder("ethers-locked"), EMPTY_DIGEST);
  });
});
