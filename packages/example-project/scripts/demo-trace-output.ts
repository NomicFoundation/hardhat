/**
 * Comprehensive demo of all trace output features.
 *
 * Run with dedup (normal):
 *   pnpm hardhat run scripts/demo-trace-output.ts -vvvv
 *
 * Run without dedup (all traces):
 *   pnpm hardhat run scripts/demo-trace-output.ts -vvvvv
 *
 * For ANSI color output (red headers on failure, dim on success):
 *   FORCE_COLOR=3 pnpm hardhat run scripts/demo-trace-output.ts -vvvv
 *
 * What to look for:
 *   - All call kinds: CALL, CREATE, STATICCALL, DELEGATECALL
 *   - Connection labels: "Trace from connection #0 (default)", "#1 (node)"
 *   - -vvvv: dedup active — single counter.write.inc() → 1 trace (not 3)
 *   - -vvvvv: no dedup — estimateGas + sendTx both shown per write
 *   - Red header on failed RPC, dim on success
 *   - Batch-mined txs grouped under 1 "Traces from" header
 */
import hre from "hardhat";

// ═══════════════════════════════════════════════════════════════════════
//  Setup: two connections to two independent EDR-simulated networks
// ═══════════════════════════════════════════════════════════════════════
const connA = await hre.network.connect("default");
const connB = await hre.network.connect("node");

const [counterA, counterB, revertContract] = await Promise.all([
  connA.viem.deployContract("Counter", []),
  connB.viem.deployContract("Counter", []),
  connA.viem.deployContract("Revert", []),
]);

const logic = await connA.viem.deployContract("Logic", []);
const orchestrator = await connA.viem.deployContract("Orchestrator", [
  logic.address,
]);
const factory = await connA.viem.deployContract("CallTypesFactory", []);

// ═══════════════════════════════════════════════════════════════════════
//  1. All call kinds — CALL, CREATE, STATICCALL, DELEGATECALL, events
// ═══════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  1 — All call kinds                                 ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

// CALL + event: Orchestrator → Logic.setValue (external CALL, emits ValueSet)
console.log("  1a. CALL + event: Orchestrator.doCall(42)\n");
await orchestrator.write.doCall([42n]);

// STATICCALL: Orchestrator → Logic.getValue (view → STATICCALL)
console.log("\n  1b. STATICCALL: Orchestrator.doStaticCall()\n");
await orchestrator.read.doStaticCall();

// CREATE: deploy new contracts inline (via CallTypesFactory)
console.log("\n  1c. CREATE: CallTypesFactory.deploy()\n");
await factory.write.deploy();

// Mixed: DELEGATECALL + CALL + STATICCALL + event in one transaction
console.log(
  "\n  1d. Mixed (all types in 1 tx): Orchestrator.doAllCallTypes(7, 3)\n",
);
await orchestrator.write.doAllCallTypes([7n, 3n]);

// DELEGATECALL: Orchestrator → Logic.setValue via delegatecall
// NOTE: This must come last — delegatecall overwrites Orchestrator's storage
// (slot 0 = logic address), making subsequent calls to logic.* fail.
console.log("\n  1e. DELEGATECALL: Orchestrator.doDelegateCall(42)\n");
await orchestrator.write.doDelegateCall([42n]);

// ═══════════════════════════════════════════════════════════════════════
//  2. Multi-connection — sequential txs on two networks
//     Headers should show different connection labels / colors
// ═══════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  2 — Multi-connection, sequential                   ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

await counterA.write.inc();
await counterB.write.inc();

// ═══════════════════════════════════════════════════════════════════════
//  3. Multi-connection — concurrent txs on both networks
//     Traces from each connection are atomic (no interleaving)
// ═══════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  3 — Multi-connection, concurrent (3 txs each)      ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

await Promise.all([
  counterA.write.inc(),
  counterA.write.inc(),
  counterA.write.inc(),
  counterB.write.inc(),
  counterB.write.inc(),
  counterB.write.inc(),
]);

// ═══════════════════════════════════════════════════════════════════════
//  4. Batch mining with evm_mine — grouped traces under a single header
//     "Traces from connection #N (network): evm_mine" (plural)
// ═══════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  4 — evm_mine: 5 txs in one block (grouping demo)   ║");
console.log("╚══════════════════════════════════════════════════════╝\n");
console.log('  → expect 1 "Traces from" header + 5 traces below it\n');

await connA.provider.request({ method: "evm_setAutomine", params: [false] });
await Promise.all(Array.from({ length: 5 }, () => counterA.write.inc()));
await connA.provider.request({ method: "evm_mine", params: [] });
await connA.provider.request({ method: "evm_setAutomine", params: [true] });

// ═══════════════════════════════════════════════════════════════════════
//  5. Failed RPC calls — header should be red, method name highlighted
// ═══════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  5 — Failing calls (red header / method name)       ║");
console.log("╚══════════════════════════════════════════════════════╝\n");

// 5a. Revert contract with known error message
console.log("  5a. Revert.boom() — reverts with 'Boom':\n");
try {
  await revertContract.read.boom();
} catch (e: any) {
  console.log(`  → Reverted: ${e.details ?? e.message}\n`);
}

// 5b. Invalid selector on Counter (no fallback)
console.log("  5b. Invalid selector 0xdeadbeef on Counter:\n");
try {
  await connA.provider.request({
    method: "eth_call",
    params: [{ to: counterA.address, data: "0xdeadbeef" }, "latest"],
  });
} catch {
  console.log("  → Reverted as expected\n");
}

// 5c. Orchestrator.doCallThatReverts(0) — nested revert
// Deploy fresh orchestrator since the earlier doDelegateCall corrupted storage
console.log("  5c. Orchestrator.doCallThatReverts(0) — nested revert:\n");
const logic2 = await connA.viem.deployContract("Logic", []);
const orch2 = await connA.viem.deployContract("Orchestrator", [logic2.address]);
try {
  await orch2.write.doCallThatReverts([0n]);
} catch (e: any) {
  console.log(`  → Reverted: ${e.details ?? e.message}\n`);
}

// ═══════════════════════════════════════════════════════════════════════
//  6. Deduplication — single write triggers estimateGas + sendTx + receipt
//     but only ONE trace should appear
// ═══════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  6 — Deduplication                                   ║");
console.log("╚══════════════════════════════════════════════════════╝\n");
console.log("  A single counter.write.inc() triggers 3 RPC calls:");
console.log("    1. eth_estimateGas  → suppressed at -vvvv, shown at -vvvvv");
console.log("    2. eth_sendTransaction  → always shown (this is the real tx)");
console.log("    3. eth_getTransactionReceipt  → no traces (read-only)");
console.log(
  "  At -vvvv: 1 trace.  At -vvvvv: 2 traces (estimateGas + sendTx).\n",
);

await counterA.write.inc();

// ═══════════════════════════════════════════════════════════════════════
//  Summary
// ═══════════════════════════════════════════════════════════════════════
console.log("\n╔══════════════════════════════════════════════════════╗");
console.log("║  Summary                                             ║");
console.log("╚══════════════════════════════════════════════════════╝");
console.log("");
console.log("  -vvvv:  dedup + suppression active (1 trace per write)");
console.log("  -vvvvv: no dedup (estimateGas + sendTx both shown)");
console.log("");
console.log("Done.");
