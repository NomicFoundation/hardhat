import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import { assertQuantity } from "../../../../helpers/assertions";
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

      describe("eth_gasPrice", function () {
        describe("with eip-1559", function () {
          useProvider();

          it("should return the next baseFeePerGas plus 1 gwei", async function () {
            const gasPrice = await this.provider.send("eth_gasPrice");

            const { baseFeePerGas: nextBlockBaseFeePerGas } =
              await this.provider.send("eth_getBlockByNumber", [
                "pending",
                false,
              ]);

            const expectedGasPrice = BigInt(nextBlockBaseFeePerGas) + 10n ** 9n;

            assertQuantity(gasPrice, expectedGasPrice);
          });
        });

        describe("without eip-1559", function () {
          useProvider({ hardfork: "berlin" });

          it("Should return a hardcoded value for non-eip1559 networks", async function () {
            assertQuantity(await this.provider.send("eth_gasPrice"), 8e9);
          });
        });
      });
    });
  });
});
