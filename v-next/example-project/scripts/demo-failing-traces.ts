/**
 * Demo: Failing transactions to test trace output at -vvv (failing only).
 *
 * Run with different verbosity levels to compare:
 *
 *   pnpm hardhat run scripts/demo-failing-traces.ts -vvv    # only failing traces
 *   pnpm hardhat run scripts/demo-failing-traces.ts -vvvv   # all traces
 */
import hre from "hardhat";

const connection = await hre.network.connect();
const publicClient = await connection.viem.getPublicClient();

console.log("=== Deploying contracts ===\n");
const logic = await connection.viem.deployContract("Logic", []);
const orch = await connection.viem.deployContract("Orchestrator", [
  logic.address,
]);
console.log(`Logic at: ${logic.address}`);
console.log(`Orchestrator at: ${orch.address}\n`);

console.log("=== Successful call: doCall(42) ===\n");
let hash = await orch.write.doCall([42n]);
await publicClient.waitForTransactionReceipt({ hash });

console.log("=== Failing call: doCallThatReverts(0) ===\n");
try {
  hash = await orch.write.doCallThatReverts([0n]);
  await publicClient.waitForTransactionReceipt({ hash });
} catch (e: any) {
  console.log(`Reverted as expected: ${e.details ?? e.message}\n`);
}

console.log("=== Successful call: doCall(100) ===\n");
hash = await orch.write.doCall([100n]);
await publicClient.waitForTransactionReceipt({ hash });

console.log("=== Failing static call: reading after revert ===\n");
try {
  // This calls Logic.mustBePositive(0) which will revert
  await publicClient.call({
    to: orch.address,
    data: "0x" as `0x${string}`,
    // Intentionally malformed call data to trigger a revert
  });
} catch (e: any) {
  console.log(`Static call failed as expected: ${e.details ?? e.message}\n`);
}

console.log("\n=== Done ===");
