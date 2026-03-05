import hre from "hardhat";

// Open TWO separate connections to the same network.
// There is no label or identifier visible in the trace output,
// so when both produce traces, the user can't tell them apart.
const connA = await hre.network.connect("network1");
const connB = await hre.network.connect("network2");

const publicClientA = await connA.viem.getPublicClient();
const publicClientB = await connB.viem.getPublicClient();

// --- ISSUE 1: Duplicate traces from polling ---
// deployContract internally does eth_sendTransaction (trace #1),
// then polls eth_getTransactionReceipt (trace #2, #3, ...).
// Each poll reprints the SAME trace.

console.log("=== Deploying Rocket on Connection A ===\n");
const rocketA = await connA.viem.deployContract("Rocket", ["Saturn V"]);
console.log(`Connection A: Rocket deployed at ${rocketA.address}\n`);

console.log("=== Deploying Rocket on Connection B ===\n");
const rocketB = await connB.viem.deployContract("Rocket", ["Falcon 9"]);
console.log(`Connection B: Rocket deployed at ${rocketB.address}\n`);

// --- ISSUE 2: Interleaved traces from concurrent transactions ---
// Both connections send transactions and poll at the same time.
// Traces from conn A and conn B appear interleaved with no attribution.
// The user sees 6x Rocket::launch() and can't tell which is which.

console.log("=== Launching both rockets concurrently ===\n");

const [hashA, hashB] = await Promise.all([
  rocketA.write.launch(),
  rocketB.write.launch(),
]);

const [receiptA, receiptB] = await Promise.all([
  publicClientA.waitForTransactionReceipt({ hash: hashA }),
  publicClientB.waitForTransactionReceipt({ hash: hashB }),
]);

console.log(`Connection A: launch() mined in block ${receiptA.blockNumber}`);
console.log(`Connection B: launch() mined in block ${receiptB.blockNumber}\n`);

// --- ISSUE 3: No attribution on eth_call traces ---
// Four concurrent reads produce four "Call Traces:" blocks.
// All look identical — the user can't match them to connections.

console.log("=== Reading view functions from both connections ===\n");

const [nameA, statusA, nameB, statusB] = await Promise.all([
  rocketA.read.name(),
  rocketA.read.status(),
  rocketB.read.name(),
  rocketB.read.status(),
]);

console.log(`Connection A: Rocket "${nameA}" status: ${statusA}`);
console.log(`Connection B: Rocket "${nameB}" status: ${statusB}`);
console.log("\n=== Done ===");
