import type { HardhatRuntimeEnvironment } from "hardhat/types";
import type { MatchersContract } from "./contracts";

import { AssertionError, expect } from "chai";
import { fork } from "child_process";
import getPort from "get-port";
import { resetHardhatContext } from "hardhat/plugins-testing";
import path from "path";

// we assume that all the fixture projects use the hardhat-ethers plugin
import "@nomicfoundation/hardhat-ethers/internal/type-extensions";

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
 *   - A static call
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
  await successfulAssert(matchers[method](...args));
  await successfulAssert(matchers[`${method}View`](...args));
  await successfulAssert(matchers[method].estimateGas(...args));
  await successfulAssert(matchers[method].staticCall(...args));
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
  await expect(failedAssert(matchers[method](...args))).to.be.rejectedWith(
    AssertionError,
    failedAssertReason
  );
  await expect(
    failedAssert(matchers[`${method}View`](...args))
  ).to.be.rejectedWith(AssertionError, failedAssertReason);
  await expect(
    failedAssert(matchers[method].estimateGas(...args))
  ).to.be.rejectedWith(AssertionError, failedAssertReason);
  await expect(
    failedAssert(matchers[method].staticCall(...args))
  ).to.be.rejectedWith(AssertionError, failedAssertReason);
}

export async function mineSuccessfulTransaction(
  hre: HardhatRuntimeEnvironment
) {
  await hre.network.provider.send("evm_setAutomine", [false]);

  const [signer] = await hre.ethers.getSigners();
  const tx = await signer.sendTransaction({ to: signer.address });

  await mineBlocksUntilTxIsIncluded(hre, tx.hash);

  await hre.network.provider.send("evm_setAutomine", [true]);

  return tx;
}

export async function mineRevertedTransaction(
  hre: HardhatRuntimeEnvironment,
  matchers: MatchersContract
) {
  await hre.network.provider.send("evm_setAutomine", [false]);

  const tx = await matchers.revertsWithoutReason({
    gasLimit: 1_000_000,
  });

  await mineBlocksUntilTxIsIncluded(hre, tx.hash);

  await hre.network.provider.send("evm_setAutomine", [true]);

  return tx;
}

async function mineBlocksUntilTxIsIncluded(
  hre: HardhatRuntimeEnvironment,
  txHash: string
) {
  let i = 0;

  while (true) {
    const receipt = await hre.ethers.provider.getTransactionReceipt(txHash);

    if (receipt !== null) {
      return;
    }

    await hre.network.provider.send("hardhat_mine", []);

    i++;
    if (i > 100) {
      throw new Error(`Transaction was not mined after mining ${i} blocks`);
    }
  }
}
