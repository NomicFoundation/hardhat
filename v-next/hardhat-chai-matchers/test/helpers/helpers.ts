import type { MatchersContract } from "./contracts.js";
import type { EthereumProvider } from "@ignored/hardhat-vnext/types/providers";
import type { HardhatEthers } from "@ignored/hardhat-vnext-ethers/types";
import type { ContractTransactionResponse } from "ethers/contract";

import { pathToFileURL } from "node:url";

import { createHardhatRuntimeEnvironment } from "@ignored/hardhat-vnext/hre";
import { AssertionError, expect } from "chai";

export async function initEnvironment(_artifactsPath: string): Promise<{
  provider: EthereumProvider;
  ethers: HardhatEthers;
}> {
  const configPath = pathToFileURL(
    `${process.cwd()}/hardhat.config.ts`,
  ).toString();
  const config = (await import(configPath)).default;

  const hre = await createHardhatRuntimeEnvironment(config);

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
