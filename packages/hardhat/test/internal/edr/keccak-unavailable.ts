import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register(new URL("./edr-unavailable-loader-hooks.mjs", import.meta.url));

const KECCAK_MODULE_URL = new URL(
  "../../../src/internal/edr/keccak.ts",
  import.meta.url,
).href;

// `?edr=<scenario>` tells the loader hooks how to break the EDR import, and
// makes node load a new copy of keccak.ts so its cached result is not reused.
async function getNativeKeccak256Under(scenario: string) {
  const { getNativeKeccak256 } = await import(
    `${KECCAK_MODULE_URL}?edr=${scenario}`
  );

  return getNativeKeccak256();
}

/**
 * Loading EDR's native keccak256 must never take Hardhat down, so these check
 * that every way it can be unavailable comes back as `undefined`.
 */
describe("getNativeKeccak256 when EDR's native keccak256 is unavailable", () => {
  it("should resolve to undefined when EDR isn't installed", async () => {
    assert.equal(await getNativeKeccak256Under("missing"), undefined);
  });

  it("should resolve to undefined when EDR's keccak256 isn't callable", async () => {
    assert.equal(await getNativeKeccak256Under("not-callable"), undefined);
  });
});
