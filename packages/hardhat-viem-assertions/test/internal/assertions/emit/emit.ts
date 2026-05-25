import type { HardhatViemHelpers } from "@nomicfoundation/hardhat-viem/types";
import type { HardhatRuntimeEnvironment } from "hardhat/types/hre";
import type { EthereumProvider } from "hardhat/types/providers";

import assert from "node:assert/strict";
import { before, beforeEach, describe, it } from "node:test";

import {
  assertRejects,
  useEphemeralFixtureProject,
} from "@nomicfoundation/hardhat-test-utils";
import hardhatViem from "@nomicfoundation/hardhat-viem";
import { createHardhatRuntimeEnvironment } from "hardhat/hre";
import { encodeFunctionData } from "viem";

import hardhatViemAssertions from "../../../../src/index.js";
import { errorIncludesTestFile } from "../../../helpers/error-includes-test-file.js";
import { isExpectedError } from "../../../helpers/is-expected-error.js";

describe("emit", () => {
  let hre: HardhatRuntimeEnvironment;
  let viem: HardhatViemHelpers;
  let provider: EthereumProvider;

  useEphemeralFixtureProject("hardhat-project");

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({
      solidity: "0.8.24",
      plugins: [hardhatViem, hardhatViemAssertions],
    });

    await hre.tasks.getTask("build").run({});
  });

  beforeEach(async () => {
    ({ provider, viem } = await hre.network.create());
  });

  it("should check that the event was emitted", async () => {
    const contract = await viem.deployContract("Events");

    await viem.assertions.emit(
      contract.write.emitWithoutArgs(),
      contract,
      "WithoutArgs",
    );
  });

  it("should check that the event was emitted when given an already-awaited write result", async () => {
    const contract = await viem.deployContract("Events");

    const writeResult = await contract.write.emitWithoutArgs();

    await viem.assertions.emit(writeResult, contract, "WithoutArgs");
  });

  it("should check that the event was emitted when given a sendTransaction promise", async () => {
    const contract = await viem.deployContract("Events");
    const [walletClient] = await viem.getWalletClients();

    await viem.assertions.emit(
      walletClient.sendTransaction({
        to: contract.address,
        data: encodeFunctionData({
          abi: contract.abi,
          functionName: "emitWithoutArgs",
        }),
      }),
      contract,
      "WithoutArgs",
    );
  });

  it("should check that the event was emitted when given an already-awaited sendTransaction hash", async () => {
    const contract = await viem.deployContract("Events");
    const [walletClient] = await viem.getWalletClients();

    const hash = await walletClient.sendTransaction({
      to: contract.address,
      data: encodeFunctionData({
        abi: contract.abi,
        functionName: "emitWithoutArgs",
      }),
    });

    await viem.assertions.emit(hash, contract, "WithoutArgs");
  });

  it("should throw when txHash does not resolve to a transaction hash", async () => {
    const contract = await viem.deployContract("Events");

    await assertRejects(
      viem.assertions.emit(
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- intentionally passing a non-hash value to exercise the validation
        "not-a-hash" as `0x${string}`,
        contract,
        "WithoutArgs",
      ),
      (error) =>
        isExpectedError(
          error,
          `txHash must be a transaction hash or a promise resolving to one, but got: not-a-hash`,
          false,
          true,
        ),
    );
  });

  it("should throw because the event does not exists in the ABI", async () => {
    const contract = await viem.deployContract("Events");

    await assertRejects(
      viem.assertions.emit(contract.write.doNotEmit(), contract, "NotExists"),
      (error) =>
        isExpectedError(
          error,
          `Event "NotExists" not found in the contract ABI`,
          false,
          true,
        ),
    );
  });

  it("should throw because no event was emitted", async () => {
    const contract = await viem.deployContract("Events");

    await assertRejects(
      viem.assertions.emit(contract.write.doNotEmit(), contract, "WithoutArgs"),
      (error) =>
        isExpectedError(
          error,
          `No events were emitted for contract with address "${contract.address}" and event name "WithoutArgs"`,
          false,
          true,
        ),
    );
  });

  it("should not match an event emitted by a different tx in the same block", async () => {
    const contract = await viem.deployContract("Events");

    // Disable auto-mine so the two txs share one block, exercising the case
    // where the old `getLogs({ address })` implementation would surface tx1's
    // log when asserting against tx2.
    await provider.request({ method: "evm_setAutomine", params: [false] });

    await contract.write.emitWithoutArgs();
    const tx2Hash = await contract.write.doNotEmit();

    await provider.request({ method: "hardhat_mine", params: ["0x1"] });
    await provider.request({ method: "evm_setAutomine", params: [true] });

    await assertRejects(
      viem.assertions.emit(tx2Hash, contract, "WithoutArgs"),
      (error) =>
        isExpectedError(
          error,
          `No events were emitted for contract with address "${contract.address}" and event name "WithoutArgs"`,
          false,
          true,
        ),
    );
  });

  it("should check that the same event is independent from the following event", async () => {
    const contract = await viem.deployContract("Events");

    // It should emit the first event correctly
    await viem.assertions.emit(
      contract.write.emitWithoutArgs(),
      contract,
      "WithoutArgs",
    );

    // It should throw because the event emitted in the previous function should not be related to this one
    await assertRejects(
      viem.assertions.emit(contract.write.doNotEmit(), contract, "WithoutArgs"),
      (error) =>
        isExpectedError(
          error,
          `No events were emitted for contract with address "${contract.address}" and event name "WithoutArgs"`,
          false,
          true,
        ),
    );
  });

  it("awaits contractFn before throwing on missing event name", async () => {
    const contract = await viem.deployContract("Events");

    const writePromise = contract.write.doNotEmit();
    let writeSettled = false;
    writePromise.then(
      () => {
        writeSettled = true;
      },
      () => {
        writeSettled = true;
      },
    );

    await assertRejects(
      viem.assertions.emit(writePromise, contract, "NotExists"),
      (error) =>
        isExpectedError(
          error,
          `Event "NotExists" not found in the contract ABI`,
          false,
          true,
        ),
    );

    assert.equal(
      writeSettled,
      true,
      "emit must await contractFn before throwing when the event is not in the ABI, otherwise the tx leaks into the next test",
    );
  });

  it("should keep the stack frame of the test when throwing due to a reversion", async () => {
    const contract = await viem.deployContract("Events");

    const writePromise = contract.write.reverts();

    try {
      await viem.assertions.emit(writePromise, contract, "WithoutArgs");
    } catch (error) {
      assert.equal(
        errorIncludesTestFile(error, import.meta.filename),
        true,
        "emit must keep the stack frame of the test",
      );
      return;
    }

    assert.fail(
      "emit should have thrown due to the transaction reverting, but it did not",
    );
  });

  it("should keep the stack frame of the test when throwing due to an ABI mismatch", async () => {
    const contract = await viem.deployContract("Events");

    const writePromise = contract.write.reverts();

    try {
      await viem.assertions.emit(writePromise, contract, "NonExistingEvent");
    } catch (error) {
      assert.equal(
        errorIncludesTestFile(error, import.meta.filename),
        true,
        "emit must keep the stack frame of the test",
      );
      return;
    }

    assert.fail(
      "emit should have thrown due to the event not existing in the ABI",
    );
  });
});
