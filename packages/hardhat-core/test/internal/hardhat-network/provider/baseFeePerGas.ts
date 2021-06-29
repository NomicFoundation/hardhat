import { assert } from "chai";
import { BN } from "ethereumjs-util";

import { workaroundWindowsCiFailures } from "../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../helpers/cwd";
import { PROVIDERS } from "../helpers/providers";
import { retrieveForkBlockNumber } from "../helpers/retrieveForkBlockNumber";
import { useHelpers } from "../helpers/useHelpers";

describe("Block's baseFeePerGas", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      const initialBaseFeePerGas = new BN(1_000_000_000);
      setCWD();
      useProvider({
        blockGasLimit: 63000,
        initialBaseFeePerGas: initialBaseFeePerGas.toNumber(),
      });
      useHelpers();

      const getFirstBlock = async () =>
        isFork ? retrieveForkBlockNumber(this.ctx.hardhatNetworkProvider) : 0;

      it("Should start with the initial base fee", async function () {
        const baseFeePerGas = await this.getLatestBaseFeePerGas();

        assert(baseFeePerGas.eq(initialBaseFeePerGas));
      });

      it("Should reduce the base fee if the block is empty", async function () {
        await this.provider.send("evm_mine");

        const baseFeePerGas1 = await this.getLatestBaseFeePerGas();
        assert.equal(baseFeePerGas1.toString(), "875000000");

        await this.provider.send("evm_mine");

        const baseFeePerGas2 = await this.getLatestBaseFeePerGas();
        assert.equal(baseFeePerGas2.toString(), "765625000");
      });

      it("Should increase the base fee if the block is full", async function () {
        await this.provider.send("evm_setAutomine", [false]);

        const firstBlock = await getFirstBlock();

        // send 3 txs to fill the block
        const gasPrice = initialBaseFeePerGas.toNumber();
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.provider.send("evm_mine");

        // send 3 txs to fill the block
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.provider.send("evm_mine");
        // mine a new block to check the baseFeePerGas after the second full block
        await this.provider.send("evm_mine");

        // check baseFeePerGas after first full block
        const baseFeePerGas1 = await this.getBaseFeePerGas(firstBlock + 2);
        assert.equal(baseFeePerGas1.toString(), "984375000");

        // check baseFeePerGas after second full block
        const baseFeePerGas2 = await this.getBaseFeePerGas(firstBlock + 3);
        assert.equal(baseFeePerGas2.toString(), "1107421875");
      });

      it("Should increase the base fee if the block is full", async function () {
        await this.provider.send("evm_setAutomine", [false]);

        const firstBlock = await getFirstBlock();

        // send 3 txs to fill the block
        const gasPrice = initialBaseFeePerGas.toNumber();
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.provider.send("evm_mine");

        // send 3 txs to fill the block
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.provider.send("evm_mine");
        // mine a new block to check the baseFeePerGas after the second full block
        await this.provider.send("evm_mine");

        // check baseFeePerGas after first full block
        const baseFeePerGas1 = await this.getBaseFeePerGas(firstBlock + 2);
        assert.equal(baseFeePerGas1.toString(), "984375000");

        // check baseFeePerGas after second full block
        const baseFeePerGas2 = await this.getBaseFeePerGas(firstBlock + 3);
        assert.equal(baseFeePerGas2.toString(), "1107421875");
      });

      it("Should correctly update the base fee after a full and an empty block", async function () {
        await this.provider.send("evm_setAutomine", [false]);

        const firstBlock = await getFirstBlock();

        // send 3 txs to fill the block
        const gasPrice = initialBaseFeePerGas.toNumber();
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.sendTx({ gasPrice });
        await this.provider.send("evm_mine");

        // mine an empty block
        await this.provider.send("evm_mine");
        // mine a new block to check the baseFeePerGas after the empty block
        await this.provider.send("evm_mine");

        // check baseFeePerGas after first full block
        const baseFeePerGas1 = await this.getBaseFeePerGas(firstBlock + 2);
        assert.equal(baseFeePerGas1.toString(), "984375000");

        // check baseFeePerGas after second full block
        const baseFeePerGas2 = await this.getBaseFeePerGas(firstBlock + 3);
        assert.equal(baseFeePerGas2.toString(), "861328125");
      });
    });
  });
});
