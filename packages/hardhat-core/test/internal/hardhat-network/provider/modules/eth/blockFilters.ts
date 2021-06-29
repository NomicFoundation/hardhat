import { assert } from "chai";

import { workaroundWindowsCiFailures } from "../../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../../helpers/cwd";
import { PROVIDERS } from "../../../helpers/providers";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("block filters", function () {
        it("Supports block filters", async function () {
          assert.isString(await this.provider.send("eth_newBlockFilter"));
        });

        it("Supports uninstalling an existing filter", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);
          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            filterId,
          ]);

          assert.isTrue(uninstalled);
        });

        it("Doesn't fail on uninstalling a non-existent filter", async function () {
          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            "0x1",
          ]);

          assert.isFalse(uninstalled);
        });

        it("should start returning at least one block", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);
          const blockHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isNotEmpty(blockHashes);
        });

        it("should not return the same block twice", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);

          await this.provider.send("eth_getFilterChanges", [filterId]);

          const blockHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isEmpty(blockHashes);
        });

        it("should return new blocks", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);

          const initialHashes = await this.provider.send(
            "eth_getFilterChanges",
            [filterId]
          );

          assert.lengthOf(initialHashes, 1);

          const empty = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isEmpty(empty);

          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);
          await this.provider.send("evm_mine", []);

          const blockHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.lengthOf(blockHashes, 3);
        });

        it("should return reorganized block", async function () {
          const filterId = await this.provider.send("eth_newBlockFilter", []);

          assert.lengthOf(
            await this.provider.send("eth_getFilterChanges", [filterId]),
            1
          );

          const snapshotId: string = await this.provider.send(
            "evm_snapshot",
            []
          );

          await this.provider.send("evm_mine", []);
          const block1 = await this.provider.send("eth_getBlockByNumber", [
            await this.provider.send("eth_blockNumber"),
            false,
          ]);

          await this.provider.send("evm_revert", [snapshotId]);

          await this.provider.send("evm_mine", []);
          const block2 = await this.provider.send("eth_getBlockByNumber", [
            await this.provider.send("eth_blockNumber"),
            false,
          ]);

          const blockHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.deepEqual(blockHashes, [block1.hash, block2.hash]);
        });
      });
    });
  });
});
