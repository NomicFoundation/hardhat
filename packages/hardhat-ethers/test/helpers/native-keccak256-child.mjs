// Runs registerNativeKeccak256 under the scenario named in argv[2], then prints
// the keccak256 of the empty input so the parent can check ethers still hashes.
import { register } from "node:module";

const scenario = process.argv[2];

if (scenario === "edr-missing") {
  register(new URL("./hide-edr-loader-hooks.mjs", import.meta.url));
}

const ethers = await import("ethers");

if (scenario === "ethers-locked") {
  ethers.keccak256.lock();
}

// The `.ts` path is used so the test doesn't need the package to be built.
const { registerNativeKeccak256 } =
  await import("../../src/internal/native-keccak256.ts");

await registerNativeKeccak256();

console.log(ethers.keccak256("0x"));
