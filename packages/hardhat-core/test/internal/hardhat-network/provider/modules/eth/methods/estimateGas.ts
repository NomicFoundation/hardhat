import { assert } from "chai";
import { BN, toBuffer, zeroAddress } from "ethereumjs-util";

import { numberToRpcQuantity } from "../../../../../../../internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertInvalidInputError } from "../../../../helpers/assertions";
import { EXAMPLE_CONTRACT } from "../../../../helpers/contracts";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { retrieveForkBlockNumber } from "../../../../helpers/retrieveForkBlockNumber";
import { deployContract } from "../../../../helpers/transactions";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

      describe("eth_estimateGas", async function () {
        it("should estimate the gas for a transfer", async function () {
          const estimation = await this.provider.send("eth_estimateGas", [
            {
              from: zeroAddress(),
              to: zeroAddress(),
            },
          ]);

          assert.isTrue(new BN(toBuffer(estimation)).lten(23000));
        });

        it("should leverage block tag parameter", async function () {
          const firstBlock = await getFirstBlock();
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

          const result = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            numberToRpcQuantity(firstBlock + 1),
          ]);

          const result2 = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          assert.isTrue(new BN(toBuffer(result)).gt(new BN(toBuffer(result2))));
        });

        it("should estimate gas in the context of pending block when called with 'pending' blockTag param", async function () {
          const contractAddress = await deployContract(
            this.provider,
            `0x${EXAMPLE_CONTRACT.bytecode.object}`
          );

          const newState =
            "000000000000000000000000000000000000000000000000000000000000000a";

          await this.provider.send("evm_setAutomine", [false]);

          await this.provider.send("eth_sendTransaction", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
          ]);

          const result = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            "latest",
          ]);

          const result2 = await this.provider.send("eth_estimateGas", [
            {
              to: contractAddress,
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data: EXAMPLE_CONTRACT.selectors.modifiesState + newState,
            },
            "pending",
          ]);

          assert.isTrue(new BN(toBuffer(result)).gt(new BN(toBuffer(result2))));
        });

        it("Should throw invalid input error if called in the context of a nonexistent block", async function () {
          const firstBlock = await getFirstBlock();
          const futureBlock = firstBlock + 1;

          await assertInvalidInputError(
            this.provider,
            "eth_estimateGas",
            [
              {
                from: DEFAULT_ACCOUNTS_ADDRESSES[0],
                to: DEFAULT_ACCOUNTS_ADDRESSES[1],
                value: numberToRpcQuantity(123),
              },
              numberToRpcQuantity(futureBlock),
            ],
            `Received invalid block tag ${futureBlock}. Latest block number is ${firstBlock}`
          );
        });

        it("Should use pending as default blockTag", async function () {
          if (isFork) {
            this.skip();
          }

          const blockNumber = await this.provider.send("eth_blockNumber");
          assert.equal(blockNumber, "0x0");

          // We estimate the deployment of a contract that asserts that block.number > 0,
          // which would fail if the estimation was run on `latest` right after the network is initialized
          const estimation = await this.provider.send("eth_estimateGas", [
            {
              from: DEFAULT_ACCOUNTS_ADDRESSES[0],
              data:
                "0x6080604052348015600f57600080fd5b5060004311601957fe5b603f8060266000396000f3fe6080604052600080fdfea2646970667358221220f77641956f2e98e8fd65e712d73442aba66a133641d08a3058907caec561bb2364736f6c63430007040033",
            },
          ]);

          // We know that it should fit in 100k gas
          assert.isTrue(new BN(toBuffer(estimation)).lten(100000));
        });
      });
    });
  });
});
