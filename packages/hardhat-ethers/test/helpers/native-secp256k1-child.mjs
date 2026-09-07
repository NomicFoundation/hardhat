// Installs the native secp256k1 derivation under the scenario named in argv[2],
// then prints the address ethers derives for a known secret key and whether the
// native implementation ended up being used, so the parent can check that
// ethers keeps working either way.
import { register } from "node:module";

const SECRET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const scenario = process.argv[2];

if (scenario === "edr-missing") {
  register(new URL("./hide-edr-loader-hooks.mjs", import.meta.url));
}

const ethers = await import("ethers");

if (scenario === "ethers-drifted") {
  // Simulates a future ethers that computes the compressed public key without
  // going through SigningKey.computePublicKey: the values it returns are still
  // correct, so only a check that the method was called can catch it.
  const { compressedPublicKey } = new ethers.SigningKey(SECRET_KEY);
  Object.defineProperty(ethers.SigningKey.prototype, "compressedPublicKey", {
    get: () => compressedPublicKey,
    configurable: true,
  });
}

// The `.ts` path is used so the test doesn't need the package to be built.
const { installNativeSecp256k1, getNativeSecp256k1CallCount } =
  await import("../../src/internal/native-secp256k1.ts");

await installNativeSecp256k1();

const callCountBefore = getNativeSecp256k1CallCount();
const address = new ethers.Wallet(SECRET_KEY).address;

console.log(
  JSON.stringify({
    address,
    native: getNativeSecp256k1CallCount() > callCountBefore,
  }),
);
