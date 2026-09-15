// Runs registerNativeKeccak256 under the scenario named in argv[2], then prints
// the keccak256 of the empty input so the parent can check ethers still hashes.
const scenario = process.argv[2];

const ethers = await import("ethers");

if (scenario === "ethers-locked") {
  ethers.keccak256.lock();
}

// The `.ts` path is used so the test doesn't need the package to be built.
const { registerNativeKeccak256 } =
  await import("../../src/internal/native-keccak256.ts");

registerNativeKeccak256();

console.log(ethers.keccak256("0x"));
