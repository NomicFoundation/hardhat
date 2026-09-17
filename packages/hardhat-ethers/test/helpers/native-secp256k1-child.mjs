// Installs the native secp256k1 derivation under the scenario named in argv[2],
// then prints the address ethers derives for a known secret key and whether the
// native implementation ended up being used, so the parent can check that
// ethers keeps working either way.
const SECRET_KEY =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const scenario = process.argv[2];

const ethers = await import("ethers");

if (scenario === "ethers-frozen") {
  // Simulates an ethers that freezes `SigningKey`, which makes the assignment
  // that installs the replacement throw.
  Object.freeze(ethers.SigningKey);
}

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
const { installNativeSecp256k1 } =
  await import("../../src/internal/native-secp256k1.ts");

// The installation restores this method whenever it can't use the native
// derivation, so the method having changed is what tells a working installation
// from a silent fallback.
const jsComputePublicKey = ethers.SigningKey.computePublicKey;

installNativeSecp256k1();

console.log(
  JSON.stringify({
    address: new ethers.Wallet(SECRET_KEY).address,
    native: ethers.SigningKey.computePublicKey !== jsComputePublicKey,
  }),
);
