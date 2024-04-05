import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../../src/internal/core/jsonrpc/types/base-types";
import { workaroundWindowsCiFailures } from "../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../helpers/cwd";
import { PROVIDERS } from "../../helpers/providers";

describe("Net module", function () {
  PROVIDERS.forEach(({ name, useProvider, networkId, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("net_listening", function () {
        it("Should return true", async function () {
          assert.isTrue(await this.provider.send("net_listening"));
        });
      });

      describe("net_peerCount", function () {
        it("Should return 0", async function () {
          assert.strictEqual(
            await this.provider.send("net_peerCount"),
            numberToRpcQuantity(0)
          );
        });
      });

      describe("net_version", function () {
        it("Should return the network id as a decimal string, not QUANTITY", async function () {
          assert.strictEqual(
            await this.provider.send("net_version"),
            networkId.toString()
          );
        });
      });
    });
  });
});
