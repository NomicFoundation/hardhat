import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { MatchersContract } from "./contracts";

import { TransactionReceiptNotFoundError } from "viem";
import { AssertionError, expect } from "chai";
import { fork } from "child_process";
import getPort from "get-port";
import { resetHardhatContext } from "hardhat/plugins-testing";
import path from "path";

// we assume that all the fixture projects use the hardhat-viem plugin
import "@nomicfoundation/hardhat-viem/internal/type-extensions";

declare module "mocha" {
  interface Context {
    hre: HardhatRuntimeEnvironment;
  }
}

/**
 * Starts a HRE with the in-process hardhat network.
 */
export function useEnvironment(fixtureProjectName: string) {
  before("start hardhat in-process", async function () {
    process.chdir(
      path.resolve(__dirname, "fixture-projects", fixtureProjectName)
    );

    process.env.HARDHAT_NETWORK = "hardhat";

    this.hre = require("hardhat");
    await this.hre.run("compile", { quiet: true });
  });

  after(async function () {
    resetHardhatContext();
    delete process.env.HARDHAT_NETWORK;
  });
}

/**
 * Start a Hardhat node in a separate process, and then in this process starts a
 * HRE connected via http to that node.
 */
export function useEnvironmentWithNode(fixtureProjectName: string) {
  const fixtureProjectDir = path.resolve(
    __dirname,
    "fixture-projects",
    fixtureProjectName
  );

  // we start a shared node in a `before` hook to make tests run faster
  before("start a hardhat node", async function () {
    process.chdir(fixtureProjectDir);

    // this env var will be used both by the script that starts the hh node and
    // by the configuration of the 'localhost' network in the fixture project
    process.env.HARDHAT_NODE_PORT = String(await getPort());

    this.hhNodeProcess = fork(
      path.resolve(fixtureProjectDir, "start-node.js"),
      {
        cwd: fixtureProjectDir,
        // pipe stdout so we can check when the node it's ready
        stdio: "pipe",
      }
    );

    // start hardhat connected to the node
    process.env.HARDHAT_NETWORK = "localhost";

    this.hre = require("hardhat");
    await this.hre.run("compile", { quiet: true });

    // wait until the node is ready
    return new Promise((resolve) => {
      this.hhNodeProcess.stdout.on("data", (data: any) => {
        const nodeStarted = data
          .toString()
          .includes("Started HTTP and WebSocket JSON-RPC server at");
        if (Boolean(nodeStarted)) {
          resolve();
        }
      });
    });
  });

  after(async function () {
    resetHardhatContext();

    delete process.env.HARDHAT_NETWORK;
    delete process.env.HARDHAT_NODE_PORT;

    this.hhNodeProcess.kill();
    return new Promise((resolve) => {
      this.hhNodeProcess.on("exit", resolve);
    });
  });
}

/**
 * Call `method` as:
 *   - A write transaction
 *   - A view method
 *   - A gas estimation
 * And run the `successfulAssert` function with the result of each of these
 * calls. Since we expect this assertion to be successful, we just await its
 * result; if any of them fails, an error will be thrown.
 */
export async function runSuccessfulAsserts({
  matchers,
  method,
  args = [],
  successfulAssert,
}: {
  matchers: any;
  method: string;
  args?: any[];
  successfulAssert: (x: any) => Promise<void>;
}) {
  await successfulAssert(matchers.write[method](...args));
  await successfulAssert(matchers.read[method](...args));
  await successfulAssert(matchers.estimateGas[method](...args));
}

/**
 * Similar to runSuccessfulAsserts, but check that the result of the assertion
 * is an AssertionError with the given reason.
 */
export async function runFailedAsserts({
  matchers,
  method,
  args = [],
  failedAssert,
  failedAssertReason,
}: {
  matchers: any;
  method: string;
  args?: any[];
  failedAssert: (x: any) => Promise<void>;
  failedAssertReason: string;
}) {
  await expect(
    failedAssert(matchers.write[method](...args))
  ).to.be.rejectedWith(AssertionError, failedAssertReason);
  await expect(failedAssert(matchers.read[method](...args))).to.be.rejectedWith(
    AssertionError,
    failedAssertReason
  );
  await expect(
    failedAssert(matchers.estimateGas[method](...args))
  ).to.be.rejectedWith(AssertionError, failedAssertReason);
}

export async function mineSuccessfulTransaction(
  hre: HardhatRuntimeEnvironment
) {
  await hre.network.provider.send("evm_setAutomine", [false]);

  const [signer] = await hre.viem.getWalletClients();
  const txHash = await signer.sendTransaction({ to: signer.account.address });

  await mineBlocksUntilTxIsIncluded(hre, txHash);

  await hre.network.provider.send("evm_setAutomine", [true]);

  return txHash;
}

export async function mineRevertedTransaction(
  hre: HardhatRuntimeEnvironment,
  matchers: MatchersContract
) {
  await hre.network.provider.send("evm_setAutomine", [false]);

  const txHash = await matchers.write.revertsWithoutReason({
    gas: 1_000_000n,
  });

  await mineBlocksUntilTxIsIncluded(hre, txHash);

  await hre.network.provider.send("evm_setAutomine", [true]);

  return txHash;
}

async function mineBlocksUntilTxIsIncluded(
  hre: HardhatRuntimeEnvironment,
  txHash: `0x${string}`
) {
  let i = 0;

  while (true) {
    try {
      const publicClient = await hre.viem.getPublicClient();
      await publicClient.getTransactionReceipt({
        hash: txHash,
      });
      return;
    } catch (e) {
      if (!(e instanceof TransactionReceiptNotFoundError)) {
        throw e;
      }
    }

    await hre.network.provider.send("evm_mine", []);

    i++;
    if (i > 100) {
      throw new Error(`Transaction was not mined after mining ${i} blocks`);
    }
  }
}
