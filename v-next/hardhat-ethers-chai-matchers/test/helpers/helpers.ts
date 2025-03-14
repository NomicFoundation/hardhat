import type { MatchersContract } from "./contracts.js";
import type { HardhatEthers } from "@nomicfoundation/hardhat-ethers/types";
import type { ContractTransactionResponse } from "ethers/contract";
import type { EthereumProvider } from "hardhat/types/providers";

import { randomUUID } from "node:crypto";
import { cpSync, rmSync } from "node:fs";
import path from "node:path";
import { before, after } from "node:test";
import { pathToFileURL } from "node:url";

import { useFixtureProject } from "@nomicfoundation/hardhat-test-utils";
import { AssertionError, expect } from "chai";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";

// This helper function is necessary because multiple test files operate on the same fixture project.
// Since these test files run in parallel, concurrency issues can arise: one test file might attempt
// to access artifacts while another is deleting them.
// To prevent this, each test file uses a temporary copy of the fixture project.
// The temporary folder is named using a randomly generated UUID.
export function useTmpFixtureProject(projectName: string): void {
  const basePath = path.join(process.cwd(), "test", "fixture-projects");
  const tmpProjectPath = path.join("tmp-generated", randomUUID());

  before(() => {
    cpSync(
      path.join(basePath, projectName),
      path.join(basePath, tmpProjectPath),
      {
        recursive: true,
        force: true,
      },
    );
  });

  useFixtureProject(tmpProjectPath);

  after(() => {
    rmSync(path.join(basePath, tmpProjectPath), { recursive: true });
  });
}

export async function initEnvironment(_artifactsPath: string): Promise<{
  provider: EthereumProvider;
  ethers: HardhatEthers;
}> {
  const configPath = pathToFileURL(
    `${process.cwd()}/hardhat.config.ts`,
  ).toString();
  const config = (await import(configPath)).default;

  const hre = await createHardhatRuntimeEnvironment(config);

  await hre.tasks.getTask("compile").run({ force: false });

  const { ethers, provider } = await hre.network.connect();

  return { provider, ethers };
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
}): Promise<void> {
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
}): Promise<void> {
  await expect(failedAssert(matchers[method](...args))).to.be.rejectedWith(
    AssertionError,
    failedAssertReason,
  );
  await expect(
    failedAssert(matchers[`${method}View`](...args)),
  ).to.be.rejectedWith(AssertionError, failedAssertReason);
  await expect(
    failedAssert(matchers[method].estimateGas(...args)),
  ).to.be.rejectedWith(AssertionError, failedAssertReason);
  await expect(
    failedAssert(matchers[method].staticCall(...args)),
  ).to.be.rejectedWith(AssertionError, failedAssertReason);
}

export async function mineSuccessfulTransaction(
  provider: EthereumProvider,
  ethers: HardhatEthers,
): Promise<any> {
  await provider.request({ method: "evm_setAutomine", params: [false] });

  const [signer] = await ethers.getSigners();
  const tx = await signer.sendTransaction({ to: signer.address });

  await mineBlocksUntilTxIsIncluded(provider, ethers, tx.hash);

  await provider.request({ method: "evm_setAutomine", params: [true] });

  return tx;
}

export async function mineRevertedTransaction(
  provider: EthereumProvider,
  ethers: HardhatEthers,
  matchers: MatchersContract,
): Promise<ContractTransactionResponse> {
  await provider.request({ method: "evm_setAutomine", params: [false] });

  const tx = await matchers.revertsWithoutReason({
    gasLimit: 1_000_000,
  });

  await mineBlocksUntilTxIsIncluded(provider, ethers, tx.hash);

  await provider.request({ method: "evm_setAutomine", params: [true] });

  return tx;
}

async function mineBlocksUntilTxIsIncluded(
  provider: EthereumProvider,
  ethers: HardhatEthers,
  txHash: string,
) {
  let i = 0;

  while (true) {
    const receipt = await ethers.provider.getTransactionReceipt(txHash);

    if (receipt !== null) {
      return;
    }

    await provider.request({ method: "hardhat_mine", params: [] });

    i++;
    if (i > 100) {
      throw new Error(`Transaction was not mined after mining ${i} blocks`);
    }
  }
}
