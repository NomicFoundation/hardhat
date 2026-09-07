import assert from "node:assert/strict";
import { register } from "node:module";
import { describe, it } from "node:test";

register(new URL("./edr-unavailable-loader-hooks.mjs", import.meta.url));

const SECP256K1_MODULE_URL = new URL(
  "../../../src/internal/edr/secp256k1.ts",
  import.meta.url,
).href;

// `?edr=<scenario>` tells the loader hooks how to break the EDR import, and
// makes node load a new copy of secp256k1.ts so its cached result is not
// reused.
async function getNativeSecp256k1PublicKeyFromSecretKeyUnder(scenario: string) {
  const { getNativeSecp256k1PublicKeyFromSecretKey } = await import(
    `${SECP256K1_MODULE_URL}?edr=${scenario}`
  );

  return getNativeSecp256k1PublicKeyFromSecretKey();
}

/**
 * Loading EDR's native secp256k1 derivation must never take Hardhat down, so
 * these check that every way it can be unavailable comes back as `undefined`.
 */
describe("getNativeSecp256k1PublicKeyFromSecretKey when EDR's native secp256k1 derivation is unavailable", () => {
  it("should resolve to undefined when EDR isn't installed", async () => {
    assert.equal(
      await getNativeSecp256k1PublicKeyFromSecretKeyUnder("missing"),
      undefined,
    );
  });

  it("should resolve to undefined when EDR's derivation isn't callable", async () => {
    assert.equal(
      await getNativeSecp256k1PublicKeyFromSecretKeyUnder("not-callable"),
      undefined,
    );
  });
});
