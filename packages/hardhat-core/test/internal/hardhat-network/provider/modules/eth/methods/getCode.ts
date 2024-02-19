import { zeroAddress } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import {
  numberToRpcQuantity,
  rpcQuantityToNumber,
} from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { randomAddress } from "../../../../../../../src/internal/hardhat-network/provider/utils/random";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertInvalidInputError } from "../../../../helpers/assertions";
import { EXAMPLE_CONTRACT } from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_BLOCK_GAS_LIMIT,
  PROVIDERS,
} from "../../../../helpers/providers";
import { deployContract } from "../../../../helpers/transactions";

const PRECOMPILES_COUNT = 8;

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_getCode", async function () {
        it("Should return an empty buffer for non-contract accounts", async function () {
          assert.equal(
            await this.provider.send("eth_getCode", [zeroAddress()]),
            "0x"
          );
        });

        it("Should return an empty buffer for precompiles", async function () {
          for (let i = 1; i <= PRECOMPILES_COUNT; i++) {
            const precompileNumber = i.toString(16);
            const zero = zeroAddress();

            assert.equal(
              await this.provider.send("eth_getCode", [
                zero.substr(0, zero.length - precompileNumber.length) +
                  precompileNumber,
              ]),
              "0x"
            );
          }
        });

        it("Should return the deployed code", async function () {
          // This a deployment transaction that pushes 0x41 (i.e. ascii A) followed by 31 0s to
          // the stack, stores that in memory, and then returns the first byte from memory.
          // This deploys a contract which a single byte of code, 0x41.
          const contractAddress = await deployContract(
            this.provider,
            "0x7f410000000000000000000000000000000000000000000000000000000000000060005260016000f3"
          );

          assert.equal(
            await this.provider.send("eth_getCode", [contractAddress]),
            "0x41"
          );
        });

        it("Should leverage block tag parameter", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const exampleContract = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          assert.strictEqual(
            await this.provider.send("eth_getCode", [
              exampleContract,
              numberToRpcQuantity(firstBlockNumber),
            ]),
            "0x"
          );
        });

        it("Should return the deployed code in the context of a new block with 'pending' block tag param", async function () {
          const snapshotId = await this.provider.send("evm_snapshot");
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          assert.isNotNull(contractAddress);

          const contractCodeBefore = await this.provider.send("eth_getCode", [
            contractAddress,
            "latest",
          ]);

          await this.provider.send("evm_revert", [snapshotId]);
          await this.provider.send("evm_setAutomine", [false]);

          const txHash = await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `0x${EXAMPLE_CONTRACT.bytecode.object}`,
              gas: numberToRpcQuantity(DEFAULT_BLOCK_GAS_LIMIT),
            },
          ]);
          const txReceipt = await this.provider.send(
            "eth_getTransactionReceipt",
            [txHash]
          );
          const contractCodeAfter = await this.provider.send("eth_getCode", [
            contractAddress,
            "pending",
          ]);

          assert.isNull(txReceipt);
          assert.strictEqual(contractCodeAfter, contractCodeBefore);
        });

        it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
          const latestBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );
          const futureBlock = latestBlockNumber + 1;

          await assertInvalidInputError(
            this.provider,
            "eth_getCode",
            [randomAddress().toString(), numberToRpcQuantity(futureBlock)],
            `Received invalid block tag ${futureBlock}. Latest block number is ${latestBlockNumber}`
          );
        });
      });
    });
  });
});
