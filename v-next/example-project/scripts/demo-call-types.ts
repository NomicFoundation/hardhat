/**
 * Demo: Different EVM call types producing distinct trace tags.
 *
 * Run with high verbosity to see all call-kind tags:
 *
 *   pnpm hardhat run scripts/demo-call-types.ts -vvvvv
 *
 * This exercises all EVM call types:
 * - External calls → [CALL]
 * - External view/pure calls → [STATICCALL]
 * - Library calls → [DELEGATECALL]
 * - Inline assembly callcode → [CALLCODE]
 * - Contract creation → [CREATE]
 */
import hre from "hardhat";

const connection = await hre.network.connect();
const publicClient = await connection.viem.getPublicClient();

console.log("=== [CREATE] Deploying Logic contract ===\n");
const logic = await connection.viem.deployContract("Logic", []);
console.log(`Logic at: ${logic.address}\n`);

console.log("=== [CREATE] Deploying MathLib (library) ===\n");
const mathLib = await connection.viem.deployContract("MathLib", []);
console.log(`MathLib at: ${mathLib.address}\n`);

console.log("=== [CREATE] Deploying Orchestrator ===\n");
const orch = await connection.viem.deployContract("Orchestrator", [
  logic.address,
], {
  libraries: { MathLib: mathLib.address },
});
console.log(`Orchestrator at: ${orch.address}\n`);

console.log("=== [CALL] Orchestrator.doCall(42) → Logic.setValue(42) ===\n");
// Orchestrator makes a regular CALL to Logic.setValue
// Trace: [CALL] Orchestrator → [CALL] Logic → [EVENT] ValueSet
let hash = await orch.write.doCall([42n]);
await publicClient.waitForTransactionReceipt({ hash });

console.log(
  "=== [STATICCALL] Orchestrator.doStaticCall() → Logic.getValue() ===\n",
);
// External view call uses STATICCALL
// Trace: [CALL] Orchestrator → [STATICCALL] Logic
const val = await orch.read.doStaticCall();
console.log(`Read value: ${val}\n`);

console.log("=== [DELEGATECALL] Orchestrator.doDelegateCall(10, 20) ===\n");
// Library call uses DELEGATECALL
// Trace: [CALL] Orchestrator → [DELEGATECALL] MathLib → [EVENT] Orchestrated
hash = await orch.write.doDelegateCall([10n, 20n]);
await publicClient.waitForTransactionReceipt({ hash });

console.log("=== [CALLCODE] Orchestrator.doCallCode() ===\n");
// Inline assembly CALLCODE (deprecated opcode, predecessor to DELEGATECALL)
// Trace: [CALL] Orchestrator → [CALLCODE] Logic
hash = await orch.write.doCallCode();
await publicClient.waitForTransactionReceipt({ hash });
console.log("");

console.log("=== [ALL] Orchestrator.doAllCallTypes(5, 7) ===\n");
// Single tx with DELEGATECALL (lib) + CALL (setValue) + STATICCALL (getValue)
// Trace: [CALL] Orchestrator
//          ├─ [DELEGATECALL] MathLib.add
//          ├─ [CALL] Logic.setValue → [EVENT] ValueSet
//          ├─ [STATICCALL] Logic.getValue
//          └─ [EVENT] Orchestrated
hash = await orch.write.doAllCallTypes([5n, 7n]);
await publicClient.waitForTransactionReceipt({ hash });

console.log("=== [CREATE inside CALL] Factory.deploy() ===\n");
// Factory deploys Logic + Orchestrator in a single tx
// Trace: [CALL] Factory → [CREATE] Logic, [CREATE] Orchestrator, [EVENT]
const factory = await connection.viem.deployContract("CallTypesFactory", [], {
  libraries: { MathLib: mathLib.address },
});
hash = await factory.write.deploy();
await publicClient.waitForTransactionReceipt({ hash });

console.log("\n=== Done ===");
