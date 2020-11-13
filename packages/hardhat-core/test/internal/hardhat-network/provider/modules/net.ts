import { assert } from "chai";

import { numberToRpcQuantity } from "../../../../../src/internal/hardhat-network/provider/output";
import { setCWD } from "../../helpers/cwd";
import { PROVIDERS } from "../../helpers/providers";

describe("Net module", function () {
  PROVIDERS.forEach(({ name, useProvider, networkId }) => {
    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("net_listening", async function () {
        it("Should return true", async function () {
          assert.isTrue(await this.provider.send("net_listening"));
        });
      });

      describe("net_peerCount", async function () {
        it("Should return 0", async function () {
          assert.strictEqual(
            await this.provider.send("net_peerCount"),
            numberToRpcQuantity(0)
          );
        });
      });

      describe("net_version", async function () {
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
