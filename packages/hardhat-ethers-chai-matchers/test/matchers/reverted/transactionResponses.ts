import { describe, it } from "node:test";

import { assertRejects } from "@nomicfoundation/hardhat-test-utils";
import { AssertionError, expect } from "chai";
import { AbiCoder, Interface } from "ethers/abi";

import { addChaiMatchers } from "../../../src/internal/add-chai-matchers.js";

addChaiMatchers();

const BLOCK_NUMBER = 123;
const FROM = "0x0000000000000000000000000000000000000001";
const TO = "0x0000000000000000000000000000000000000002";
const HASH = `0x${"1".repeat(64)}`;

describe("Reverted transaction responses", () => {
  const noDataAssertions = [
    {
      name: "revertedWith",
      assertion: async (tx: unknown) => {
        await expect(tx).not.to.be.revertedWith("some reason");
      },
      message:
        "Expected transaction to be reverted with reason 'some reason', but the revert data couldn't be retrieved",
    },
    {
      name: "revertedWithCustomError",
      assertion: async (tx: unknown) => {
        const contract = {
          interface: new Interface(["error SomeCustomError()"]),
        };

        await expect(tx).not.to.be.revertedWithCustomError(
          contract,
          "SomeCustomError",
        );
      },
      message:
        "Expected transaction to be reverted with custom error 'SomeCustomError', but the revert data couldn't be retrieved",
    },
    {
      name: "revertedWithPanic",
      assertion: async (tx: unknown) => {
        await expect(tx).not.to.be.revertedWithPanic();
      },
      message:
        "Expected transaction to be reverted with some panic code, but the revert data couldn't be retrieved",
    },
    {
      name: "revertedWithoutReason",
      assertion: async (tx: unknown) => {
        await expect(tx).not.to.be.revertedWithoutReason(Object.create(null));
      },
      message:
        "Expected transaction to be reverted without a reason, but the revert data couldn't be retrieved",
    },
  ];

  it("fails negated assertions when revert data can't be recovered", async () => {
    for (const { name, assertion, message } of noDataAssertions) {
      const callError = new Error("replay call failed");
      const tx = createRevertedTransactionResponse({
        call: async () => {
          throw callError;
        },
      });

      await assertRejects(
        assertion(tx),
        (error) =>
          error instanceof AssertionError &&
          error.message.includes(message) &&
          // `in` narrowing exposes `cause` regardless of how chai's
          // `AssertionError` type is declared (chai v5's typings omit it).
          "cause" in error &&
          error.cause === callError,
        `Expected ${name} to fail and preserve the replay call error`,
      );
    }
  });

  it("preserves EIP-1559 envelope fields when replaying", async () => {
    let replayRequest: unknown;
    const accessList = [
      {
        address: TO,
        storageKeys: [`0x${"0".repeat(64)}`],
      },
    ];

    const tx = createRevertedTransactionResponse({
      accessList,
      call: async (request) => {
        replayRequest = request;
        throwErrorWithReason("some reason");
      },
    });

    await expect(tx).to.be.revertedWith("some reason");

    expect(replayRequest).to.deep.include({
      chainId: 31_337n,
      maxFeePerGas: 10n,
      maxPriorityFeePerGas: 2n,
      nonce: 7,
      type: 2,
      accessList,
    });
    expect(replayRequest).not.to.have.property("gasPrice");
  });

  it("preserves legacy gasPrice without adding EIP-1559 fees", async () => {
    let replayRequest: unknown;
    const tx = createRevertedTransactionResponse({
      maxFeePerGas: null,
      maxPriorityFeePerGas: null,
      type: 0,
      call: async (request) => {
        replayRequest = request;
        throwErrorWithReason("some reason");
      },
    });

    await expect(tx).to.be.revertedWith("some reason");

    expect(replayRequest).to.include({
      gasPrice: 8n,
      type: 0,
    });
    expect(replayRequest).not.to.have.property("maxFeePerGas");
    expect(replayRequest).not.to.have.property("maxPriorityFeePerGas");
  });
});

function createRevertedTransactionResponse({
  accessList = null,
  call,
  gasPrice = 8n,
  maxFeePerGas = 10n,
  maxPriorityFeePerGas = 2n,
  type = 2,
}: {
  accessList?: unknown;
  call: (request: unknown) => Promise<unknown>;
  gasPrice?: bigint;
  maxFeePerGas?: bigint | null;
  maxPriorityFeePerGas?: bigint | null;
  type?: number;
}) {
  return {
    accessList,
    authorizationList: null,
    blobVersionedHashes: null,
    chainId: 31_337n,
    data: "0x1234",
    from: FROM,
    gasLimit: 50_000n,
    gasPrice,
    hash: HASH,
    maxFeePerBlobGas: null,
    maxFeePerGas,
    maxPriorityFeePerGas,
    nonce: 7,
    provider: {
      call,
      waitForTransaction: async () => ({
        blockNumber: BLOCK_NUMBER,
        status: 0,
      }),
    },
    to: TO,
    type,
    value: 3n,
    wait: async () => ({
      blockNumber: BLOCK_NUMBER,
      status: 0,
    }),
  };
}

function throwErrorWithReason(reason: string): never {
  const abi = new AbiCoder();
  const data = `0x08c379a0${abi.encode(["string"], [reason]).slice(2)}`;
  const error = new Error("execution reverted");

  Object.assign(error, { data });
  throw error;
}
