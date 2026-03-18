/**
 * Benchmark: gas estimation vs fixed gas limit
 *
 * Measures the overhead of eth_estimateGas on every transaction
 * when no explicit gasLimit is set (the default HH3 behavior).
 *
 * Run from v-next/hardhat-ethers/:
 *   node --import tsx/esm benchmark/gas-estimation.ts
 *   node --import tsx/esm benchmark/gas-estimation.ts 200   # custom tx count
 */

import type { ExampleContract } from "../test/helpers/example-contracts.js";
import type {
  BaseContract,
  BaseContractMethod,
  BigNumberish,
  ContractTransactionResponse,
} from "ethers";

import { performance } from "node:perf_hooks";

import { ContractFactory } from "ethers";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

import { initializeEthers } from "../src/internal/initialization.js";
import { EXAMPLE_CONTRACT } from "../test/helpers/example-contracts.js";
import { MockArtifactManager } from "../test/helpers/artifact-manager-mock.js";

// ---------------------------------------------------------------------------
// Heavy contract — 50 storage writes + 50 events per call (~1M gas)
// Compiled with solc 0.8.34, no optimizer.
//
// contract Heavy {
//   mapping(uint256 => uint256) public data;
//   uint256 public counter;
//   event Written(uint256 indexed slot, uint256 value);
//   function heavyWrite(uint256 n) public {
//     for (uint256 i = 0; i < n; i++) {
//       uint256 slot = counter + i;
//       data[slot] = slot * 3;
//       emit Written(slot, slot * 3);
//     }
//     counter += n;
//   }
// }
// ---------------------------------------------------------------------------
const HEAVY_CONTRACT = {
  deploymentBytecode:
    "0x6080604052348015600e575f5ffd5b506102d58061001c5f395ff3fe608060405234801561000f575f5ffd5b506004361061003f575f3560e01c806355f8cd551461004357806361bc221a1461005f578063f0ba84401461007d575b5f5ffd5b61005d600480360381019061005891906101ab565b6100ad565b005b61006761015a565b60405161007491906101e5565b60405180910390f35b610097600480360381019061009291906101ab565b610160565b6040516100a491906101e5565b60405180910390f35b5f5f90505b8181101561013e575f816001546100c9919061022b565b90506003816100d8919061025e565b5f5f8381526020019081526020015f2081905550807f3f73b8b482c055b6819642ac58b8dde6f6a563921367de658e8bf088e4f5224960038361011b919061025e565b60405161012891906101e5565b60405180910390a25080806001019150506100b2565b508060015f828254610150919061022b565b9250508190555050565b60015481565b5f602052805f5260405f205f915090505481565b5f5ffd5b5f819050919050565b61018a81610178565b8114610194575f5ffd5b50565b5f813590506101a581610181565b92915050565b5f602082840312156101c0576101bf610174565b5b5f6101cd84828501610197565b91505092915050565b6101df81610178565b82525050565b5f6020820190506101f85f8301846101d6565b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f61023582610178565b915061024083610178565b9250828201905080821115610258576102576101fe565b5b92915050565b5f61026882610178565b915061027383610178565b925082820261028181610178565b91508282048414831517610298576102976101fe565b5b509291505056fea2646970667358221220e6f548bf634b82a276fe4c2bdedadde8a759642cdd24479eb2258e2c827b98e964736f6c63430008220033",
  abi: [
    "event Written(uint256 indexed slot, uint256 value)",
    "function counter() public view returns (uint256)",
    "function data(uint256) public view returns (uint256)",
    "function heavyWrite(uint256 n) public",
  ],
};

type HeavyContract = BaseContract & {
  heavyWrite: BaseContractMethod<
    [BigNumberish],
    void,
    ContractTransactionResponse
  >;
};

const TX_COUNT = Number(process.argv[2]) || 100;
const FIXED_GAS = 16_777_216n; // EDR default tx gas cap
const WARMUP = 5;

// ---------------------------------------------------------------------------
// Setup helpers
// ---------------------------------------------------------------------------

async function createEthers(gasConfig: "auto" | bigint) {
  const config =
    gasConfig === "auto"
      ? {}
      : { networks: { default: { gas: gasConfig } } };

  const hre = await createHardhatRuntimeEnvironment(config);
  const connection = await hre.network.connect("default");

  const ethers = await initializeEthers(
    connection.provider,
    connection.networkName,
    connection.networkConfig,
    new MockArtifactManager([]),
  );

  return { ethers, provider: connection.provider };
}

async function deployExample(
  ethers: Awaited<ReturnType<typeof createEthers>>["ethers"],
) {
  const signer = await ethers.provider.getSigner(0);
  const factory = new ContractFactory<[], ExampleContract>(
    EXAMPLE_CONTRACT.abi,
    EXAMPLE_CONTRACT.deploymentBytecode,
    signer,
  );
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

async function deployHeavy(
  ethers: Awaited<ReturnType<typeof createEthers>>["ethers"],
) {
  const signer = await ethers.provider.getSigner(0);
  const factory = new ContractFactory<[], HeavyContract>(
    HEAVY_CONTRACT.abi,
    HEAVY_CONTRACT.deploymentBytecode,
    signer,
  );
  const contract = await factory.deploy();
  await contract.waitForDeployment();
  return contract;
}

// ---------------------------------------------------------------------------
// Statistics helpers
// ---------------------------------------------------------------------------

function median(sorted: number[]): number {
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ---------------------------------------------------------------------------
// Benchmark runners
// ---------------------------------------------------------------------------

interface Result {
  label: string;
  timings: number[]; // per-tx times in ms, sorted
  total: number;
  median: number;
  p95: number;
  avg: number;
}

function buildResult(label: string, timings: number[]): Result {
  const sorted = [...timings].sort((a, b) => a - b);
  const total = sorted.reduce((s, v) => s + v, 0);
  return {
    label,
    timings: sorted,
    total,
    median: median(sorted),
    p95: percentile(sorted, 95),
    avg: total / sorted.length,
  };
}

async function benchContractCalls(
  label: string,
  gasConfig: "auto" | bigint,
  method: "inc" | "emitsTwoEvents" = "inc",
): Promise<Result> {
  const { ethers } = await createEthers(gasConfig);
  const contract = await deployExample(ethers);

  for (let i = 0; i < WARMUP; i++) {
    await contract[method]();
  }

  const timings: number[] = [];
  for (let i = 0; i < TX_COUNT; i++) {
    const t0 = performance.now();
    await contract[method]();
    timings.push(performance.now() - t0);
  }

  return buildResult(label, timings);
}

async function benchPlainTransfers(
  label: string,
  gasConfig: "auto" | bigint,
): Promise<Result> {
  const { ethers } = await createEthers(gasConfig);
  const [sender, receiver] = await ethers.getSigners();

  for (let i = 0; i < WARMUP; i++) {
    await sender.sendTransaction({ to: receiver, value: 1n });
  }

  const timings: number[] = [];
  for (let i = 0; i < TX_COUNT; i++) {
    const t0 = performance.now();
    await sender.sendTransaction({ to: receiver, value: 1n });
    timings.push(performance.now() - t0);
  }

  return buildResult(label, timings);
}

async function benchDeployments(
  label: string,
  gasConfig: "auto" | bigint,
): Promise<Result> {
  const { ethers } = await createEthers(gasConfig);
  const signer = await ethers.provider.getSigner(0);

  for (let i = 0; i < WARMUP; i++) {
    const f = new ContractFactory(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );
    await f.deploy();
  }

  const timings: number[] = [];
  for (let i = 0; i < TX_COUNT; i++) {
    const t0 = performance.now();
    const f = new ContractFactory(
      EXAMPLE_CONTRACT.abi,
      EXAMPLE_CONTRACT.deploymentBytecode,
      signer,
    );
    await f.deploy();
    timings.push(performance.now() - t0);
  }

  return buildResult(label, timings);
}

async function benchHeavyWrite(
  label: string,
  gasConfig: "auto" | bigint,
  slotsPerCall: number,
): Promise<Result> {
  const { ethers } = await createEthers(gasConfig);
  const contract = await deployHeavy(ethers);

  for (let i = 0; i < WARMUP; i++) {
    await contract.heavyWrite(slotsPerCall);
  }

  const timings: number[] = [];
  for (let i = 0; i < TX_COUNT; i++) {
    const t0 = performance.now();
    await contract.heavyWrite(slotsPerCall);
    timings.push(performance.now() - t0);
  }

  return buildResult(label, timings);
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

function printResult(r: Result) {
  console.log(
    `  ${r.label.padEnd(32)} | median ${r.median.toFixed(2).padStart(7)} ms/tx | avg ${r.avg.toFixed(2).padStart(7)} ms/tx | p95 ${r.p95.toFixed(2).padStart(7)} ms/tx | total ${r.total.toFixed(0).padStart(6)} ms`,
  );
}

function printComparison(fixed: Result, auto: Result) {
  const medianRatio = auto.median / fixed.median;
  const medianOverhead = auto.median - fixed.median;
  console.log(
    `  → auto is ${medianRatio.toFixed(2)}x slower (median +${medianOverhead.toFixed(2)} ms/tx)`,
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(
    `\nGas estimation benchmark — ${TX_COUNT} txs per scenario, ${WARMUP} warmup\n`,
  );

  // --- Plain ETH transfers ---
  console.log("1) Plain ETH transfers");
  const transferFixed = await benchPlainTransfers(
    "fixed gas",
    FIXED_GAS,
  );
  const transferAuto = await benchPlainTransfers(
    "auto gas (estimateGas)",
    "auto",
  );
  printResult(transferFixed);
  printResult(transferAuto);
  printComparison(transferFixed, transferAuto);

  // --- Contract calls (inc()) ---
  console.log("\n2) Contract calls (inc())");
  const callFixed = await benchContractCalls(
    "fixed gas",
    FIXED_GAS,
  );
  const callAuto = await benchContractCalls(
    "auto gas (estimateGas)",
    "auto",
  );
  printResult(callFixed);
  printResult(callAuto);
  printComparison(callFixed, callAuto);

  // --- Contract calls (emitsTwoEvents()) ---
  console.log("\n3) Contract calls (emitsTwoEvents())");
  const eventsFixed = await benchContractCalls(
    "fixed gas",
    FIXED_GAS,
    "emitsTwoEvents",
  );
  const eventsAuto = await benchContractCalls(
    "auto gas (estimateGas)",
    "auto",
    "emitsTwoEvents",
  );
  printResult(eventsFixed);
  printResult(eventsAuto);
  printComparison(eventsFixed, eventsAuto);

  // --- Heavy contract (50 storage writes + events per call) ---
  console.log("\n4) Heavy contract (heavyWrite(50))");
  const heavyFixed = await benchHeavyWrite("fixed gas", FIXED_GAS, 50);
  const heavyAuto = await benchHeavyWrite("auto gas (estimateGas)", "auto", 50);
  printResult(heavyFixed);
  printResult(heavyAuto);
  printComparison(heavyFixed, heavyAuto);

  // --- Contract deployments ---
  console.log("\n5) Contract deployments");
  const deployFixed = await benchDeployments(
    "fixed gas",
    FIXED_GAS,
  );
  const deployAuto = await benchDeployments(
    "auto gas (estimateGas)",
    "auto",
  );
  printResult(deployFixed);
  printResult(deployAuto);
  printComparison(deployFixed, deployAuto);

  console.log("");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
