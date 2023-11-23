import { zeroAddress } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import { rpcQuantityToNumber } from "../../../../../../src/internal/core/jsonrpc/types/base-types";
import { RpcBlockOutput } from "../../../../../../src/internal/hardhat-network/provider/output";
import { workaroundWindowsCiFailures } from "../../../../../utils/workaround-windows-ci-failures";
import {
  assertInvalidArgumentsError,
  assertQuantity,
} from "../../../helpers/assertions";
import { EXAMPLE_CONTRACT } from "../../../helpers/contracts";
import { setCWD } from "../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../helpers/providers";
import { deployContract } from "../../../helpers/transactions";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("block tags", function () {
        it("should allow EIP-1898 block tags", async function () {
          const firstBlockNumber = rpcQuantityToNumber(
            await this.provider.send("eth_blockNumber")
          );

          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000000a";

          await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const previousBlockNumber = `0x${(firstBlockNumber + 1).toString(
            16
          )}`;
          const previousBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            [previousBlockNumber, false]
          );

          assert.equal(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_CONTRACT.selectors.i,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              {
                blockNumber: previousBlock.number,
              },
            ]),
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );

          assert.equal(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_CONTRACT.selectors.i,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              {
                blockHash: previousBlock.hash,
              },
            ]),
            "0x0000000000000000000000000000000000000000000000000000000000000000"
          );

          const latestBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          assert.equal(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_CONTRACT.selectors.i,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              {
                blockNumber: latestBlock.number,
              },
            ]),
            `0x${newState}`
          );

          assert.equal(
            await this.provider.send("eth_call", [
              {
                to: contractAddress,
                data: EXAMPLE_CONTRACT.selectors.i,
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              },
              {
                blockHash: latestBlock.hash,
              },
            ]),
            `0x${newState}`
          );
        });

        it("should not accept an empty block tag", async function () {
          await assertInvalidArgumentsError(this.provider, "eth_getBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            {},
          ]);
        });

        it("should not accept both a blockNumber and a blockHash in a block tag", async function () {
          const latestBlock: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["latest", false]
          );

          await assertInvalidArgumentsError(this.provider, "eth_getBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            {
              blockNumber: "0x0",
              blockHash: latestBlock.hash,
            },
          ]);
        });

        it("should not accept both a blockNumber and requireCanonical", async function () {
          await assertInvalidArgumentsError(this.provider, "eth_getBalance", [
            DEFAULT_ACCOUNTS_ADDRESSES[0],
            {
              blockNumber: "0x0",
              requireCanonical: true,
            },
          ]);
        });

        it("should accept a requireCanonical flag", async function () {
          const block: RpcBlockOutput = await this.provider.send(
            "eth_getBlockByNumber",
            ["0x0", false]
          );

          assertQuantity(
            await this.provider.send("eth_getBalance", [
              zeroAddress(),
              {
                blockHash: block.hash,
                requireCanonical: true,
              },
            ]),
            0
          );

          assertQuantity(
            await this.provider.send("eth_getBalance", [
              zeroAddress(),
              {
                blockHash: block.hash,
                requireCanonical: false,
              },
            ]),
            0
          );
        });
      });
    });
  });
});
