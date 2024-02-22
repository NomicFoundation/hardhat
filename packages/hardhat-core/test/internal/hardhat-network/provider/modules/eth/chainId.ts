import { assert } from "chai";

import { workaroundWindowsCiFailures } from "../../../../../utils/workaround-windows-ci-failures";
import { EXAMPLE_CHAIN_ID_CONTRACT } from "../../../helpers/contracts";
import { setCWD } from "../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  DEFAULT_CHAIN_ID,
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

      describe("chain id", function () {
        it("should read the right chain id in the constructor", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CHAIN_ID_CONTRACT.bytecode.object}`
          );

          const chainIdHex = await this.provider.send("eth_call", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_CHAIN_ID_CONTRACT.selectors.chainId}`,
            },
          ]);

          const chainId = BigInt(chainIdHex);

          assert.strictEqual(chainId, BigInt(DEFAULT_CHAIN_ID));
        });

        it("should read the right chain id in a write function", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CHAIN_ID_CONTRACT.bytecode.object}`
          );

          await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_CHAIN_ID_CONTRACT.selectors.setChainId}`,
            },
          ]);

          const chainIdHex = await this.provider.send("eth_call", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_CHAIN_ID_CONTRACT.selectors.chainId}`,
            },
          ]);

          const chainId = BigInt(chainIdHex);

          assert.strictEqual(chainId, BigInt(DEFAULT_CHAIN_ID));
        });

        it("should read the right chain id in a view function", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CHAIN_ID_CONTRACT.bytecode.object}`
          );

          const chainIdHex = await this.provider.send("eth_call", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: `${EXAMPLE_CHAIN_ID_CONTRACT.selectors.getChainId}`,
            },
          ]);

          const chainId = BigInt(chainIdHex);

          assert.strictEqual(chainId, BigInt(DEFAULT_CHAIN_ID));
        });
      });
    });
  });
});
