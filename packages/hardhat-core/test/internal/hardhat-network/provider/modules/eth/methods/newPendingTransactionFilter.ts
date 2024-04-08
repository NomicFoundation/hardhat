import { zeroAddress } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../../../helpers/cwd";
import { PROVIDERS } from "../../../../helpers/providers";

describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_newPendingTransactionFilter", function () {
        it("Supports pending transaction filter", async function () {
          assert.isString(
            await this.provider.send("eth_newPendingTransactionFilter")
          );
        });

        it("Supports uninstalling an existing filter", async function () {
          const filterId = await this.provider.send(
            "eth_newPendingTransactionFilter",
            []
          );
          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            filterId,
          ]);

          assert.isTrue(uninstalled);
        });

        it("Should return new pending transactions", async function () {
          const filterId = await this.provider.send(
            "eth_newPendingTransactionFilter",
            []
          );

          const accounts = await this.provider.send("eth_accounts");
          const burnTxParams = {
            from: accounts[0],
            to: zeroAddress(),
            gas: numberToRpcQuantity(21000),
          };

          await this.provider.send("eth_sendTransaction", [burnTxParams]);
          const txHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isNotEmpty(txHashes);
        });

        it("Should not return new pending transactions after uninstall", async function () {
          const filterId = await this.provider.send(
            "eth_newPendingTransactionFilter",
            []
          );

          const uninstalled = await this.provider.send("eth_uninstallFilter", [
            filterId,
          ]);

          assert.isTrue(uninstalled);

          const accounts = await this.provider.send("eth_accounts");
          const burnTxParams = {
            from: accounts[0],
            to: zeroAddress(),
            gas: numberToRpcQuantity(21000),
          };

          await this.provider.send("eth_sendTransaction", [burnTxParams]);
          const txHashes = await this.provider.send("eth_getFilterChanges", [
            filterId,
          ]);

          assert.isNull(txHashes);
        });
      });
    });
  });
});
