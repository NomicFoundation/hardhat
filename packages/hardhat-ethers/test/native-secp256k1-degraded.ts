import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const CHILD_PATH = fileURLToPath(
  new URL("./helpers/native-secp256k1-child.mjs", import.meta.url),
);

const ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

// Each scenario needs a new process: the installation is memoized, and EDR can
// only be hidden from a process that hasn't loaded it.
async function deriveUnder(
  scenario: string,
): Promise<{ address: string; native: boolean }> {
  const { stdout } = await execFileAsync(process.execPath, [
    "--import",
    "tsx/esm",
    CHILD_PATH,
    scenario,
  ]);

  /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions --
  the child prints exactly this shape */
  return JSON.parse(stdout.trim()) as { address: string; native: boolean };
}

describe("native secp256k1 installation when it can't be used", () => {
  it("should leave ethers working when EDR isn't installed", async () => {
    assert.deepEqual(await deriveUnder("edr-missing"), {
      address: ADDRESS,
      native: false,
    });
  });

  it("should restore ethers' implementation when it stops using the replaced method", async () => {
    assert.deepEqual(await deriveUnder("ethers-drifted"), {
      address: ADDRESS,
      native: false,
    });
  });

  it("should use the native implementation when nothing is in the way", async () => {
    assert.deepEqual(await deriveUnder("installed"), {
      address: ADDRESS,
      native: true,
    });
  });
});
