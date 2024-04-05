import { assert } from "chai";

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

      describe("eth_unsubscribe", function () {
        it("Supports unsubscribe", async function () {
          const filterId = await this.provider.send("eth_subscribe", [
            "newHeads",
          ]);

          assert.isTrue(
            await this.provider.send("eth_unsubscribe", [filterId])
          );
        });

        it("Doesn't fail when unsubscribe is called for a non-existent filter", async function () {
          assert.isFalse(await this.provider.send("eth_unsubscribe", ["0x1"]));
        });
      });
    });
  });
});
