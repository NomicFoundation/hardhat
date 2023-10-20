import { assert } from "chai";
import path from "path";

import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import {
  EXAMPLE_CONTRACT,
  EXAMPLE_REVERT_CONTRACT,
} from "../../hardhat-network/helpers/contracts";
import { deployContract } from "../../hardhat-network/helpers/transactions";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../hardhat-network/helpers/providers";

describe("provider errors", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      useProvider();

      it("should show the right error message for revert reason strings", async function () {
        const contractAddress = await deployContract(
          this.provider,
          `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
        );

        await assert.isRejected(
          this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.revertsWithReasonString}`,
            },
          ]),
          "reverted with reason string 'a reason'"
        );
      });

      it("should show the right error message for out of gas errors", async function () {
        const contractAddress = await deployContract(
          this.provider,
          `0x${EXAMPLE_CONTRACT.bytecode.object}`
        );

        await assert.isRejected(
          this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: contractAddress,
              data: `${EXAMPLE_CONTRACT.selectors.modifiesState}0000000000000000000000000000000000000000000000000000000000000001`,
              gas: numberToRpcQuantity(21_204),
            },
          ]),
          "Transaction ran out of gas"
        );
      });

      it("should include the right file", async function () {
        // This test should prevents us from accidentally breaking the async stack
        // trace when using an http provider.

        const contractAddress = await deployContract(
          this.provider,
          `0x${EXAMPLE_REVERT_CONTRACT.bytecode.object}`
        );

        let error: any;
        try {
          await this.provider.send("eth_sendTransaction", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              to: contractAddress,
              data: `${EXAMPLE_REVERT_CONTRACT.selectors.revertsWithReasonString}`,
            },
          ]);
        } catch (e) {
          error = e;
        }

        assert.isDefined(error);
        assert.include(
          error.stack,
          path.join("test", "internal", "core", "providers", "errors.ts")
        );
      });
    });
  });
});
