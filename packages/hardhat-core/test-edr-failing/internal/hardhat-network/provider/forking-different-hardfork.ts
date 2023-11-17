import { assert } from "chai";

import {
  numberToRpcQuantity,
  rpcDataToBigInt,
} from "../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../utils/workaround-windows-ci-failures";
import { DAI_ADDRESS } from "../helpers/constants";
import { setCWD } from "../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  FORKED_PROVIDERS,
} from "../helpers/providers";

const TOTAL_SUPPLY_SELECTOR = "0x18160ddd";

const SHANGHAI_HARDFORK_BLOCK_NUMBER = 17_034_870;
const MERGE_HARDFORK_BLOCK_NUMBER = 15_537_394;

describe("Forking a block with a different hardfork", function () {
  FORKED_PROVIDERS.forEach(({ rpcProvider, useProvider }) => {
    workaroundWindowsCiFailures.call(this, { isFork: true });

    describe(`Using ${rpcProvider}`, function () {
      setCWD();

      describe("shanghai hardfork", function () {
        const hardfork = "shanghai";

        describe("forking a 'shanghai' block", function () {
          const forkBlockNumber = SHANGHAI_HARDFORK_BLOCK_NUMBER + 100;

          useProvider({
            hardfork,
            forkBlockNumber,
          });

          it("should mine transactions", async function () {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              },
            ]);
          });

          it("should make calls in the forked block", async function () {
            const daiSupply = await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DAI_ADDRESS.toString(),
                data: TOTAL_SUPPLY_SELECTOR,
              },
              numberToRpcQuantity(forkBlockNumber),
            ]);

            assert.equal(
              rpcDataToBigInt(daiSupply),
              5022305384218217259061852351n
            );
          });

          it("should make calls in blocks before the forked block", async function () {
            const daiSupply = await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DAI_ADDRESS.toString(),
                data: TOTAL_SUPPLY_SELECTOR,
              },
              numberToRpcQuantity(forkBlockNumber - 1),
            ]);

            assert.equal(
              rpcDataToBigInt(daiSupply),
              5022305384218217259061852351n
            );
          });
        });

        describe("forking a 'merge' block", function () {
          const forkBlockNumber = MERGE_HARDFORK_BLOCK_NUMBER + 100;

          useProvider({
            forkBlockNumber,
          });

          it("should mine transactions", async function () {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              },
            ]);
          });

          it("should make calls in the forked block", async function () {
            const daiSupply = await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DAI_ADDRESS.toString(),
                data: TOTAL_SUPPLY_SELECTOR,
              },
              numberToRpcQuantity(forkBlockNumber),
            ]);

            assert.equal(
              rpcDataToBigInt(daiSupply),
              6378560137543824474512862351n
            );
          });

          it("should make calls in blocks before the forked block", async function () {
            const daiSupply = await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DAI_ADDRESS.toString(),
                data: TOTAL_SUPPLY_SELECTOR,
              },
              numberToRpcQuantity(forkBlockNumber - 1),
            ]);

            assert.equal(
              rpcDataToBigInt(daiSupply),
              6378560137543824474512862351n
            );
          });
        });
      });

      describe("merge hardfork", function () {
        const hardfork = "merge";

        describe("forking a 'shanghai' block", function () {
          const forkBlockNumber = SHANGHAI_HARDFORK_BLOCK_NUMBER + 100;

          useProvider({
            forkBlockNumber,
            hardfork,
          });

          it("should mine transactions", async function () {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              },
            ]);
          });

          it("should make calls in the forked block", async function () {
            const daiSupply = await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DAI_ADDRESS.toString(),
                data: TOTAL_SUPPLY_SELECTOR,
              },
              numberToRpcQuantity(forkBlockNumber),
            ]);

            assert.equal(
              rpcDataToBigInt(daiSupply),
              5022305384218217259061852351n
            );
          });

          it("should make calls in blocks before the forked block", async function () {
            const daiSupply = await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DAI_ADDRESS.toString(),
                data: TOTAL_SUPPLY_SELECTOR,
              },
              numberToRpcQuantity(forkBlockNumber - 1),
            ]);

            assert.equal(
              rpcDataToBigInt(daiSupply),
              5022305384218217259061852351n
            );
          });
        });

        describe("forking a 'merge' block", function () {
          const forkBlockNumber = MERGE_HARDFORK_BLOCK_NUMBER + 100;

          useProvider({
            forkBlockNumber,
          });

          it("should mine transactions", async function () {
            await this.provider.send("eth_sendTransaction", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
              },
            ]);
          });

          it("should make calls in the forked block", async function () {
            const daiSupply = await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DAI_ADDRESS.toString(),
                data: TOTAL_SUPPLY_SELECTOR,
              },
              numberToRpcQuantity(forkBlockNumber),
            ]);

            assert.equal(
              rpcDataToBigInt(daiSupply),
              6378560137543824474512862351n
            );
          });

          it("should make calls in blocks before the forked block", async function () {
            const daiSupply = await this.provider.send("eth_call", [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DAI_ADDRESS.toString(),
                data: TOTAL_SUPPLY_SELECTOR,
              },
              numberToRpcQuantity(forkBlockNumber - 1),
            ]);

            assert.equal(
              rpcDataToBigInt(daiSupply),
              6378560137543824474512862351n
            );
          });
        });
      });
    });
  });
});
