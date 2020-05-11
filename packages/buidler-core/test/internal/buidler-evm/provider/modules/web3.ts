import { assert } from "chai";
import { keccak256, toBuffer } from "ethereumjs-util";

import { bufferToRpcData } from "../../../../../src/internal/buidler-evm/provider/output";
import { setCWD } from "../../helpers/cwd";
import { PROVIDERS } from "../../helpers/useProvider";

describe("Web3 module", function () {
  PROVIDERS.forEach((provider) => {
    describe(`Provider ${provider.name}`, function () {
      setCWD();
      provider.useProvider();

      describe("web3_clientVersion", async function () {
        // TODO: We skip this test for now. See the note in this call's
        //  implementation
        it.skip("Should return the right value", async function () {
          const res = await this.provider.send("web3_clientVersion");
          assert.isTrue(
            res.startsWith("BuidlerEVM/1.0.0-beta.13/ethereumjs-vm/4")
          );
        });
      });

      describe("web3_sha3", async function () {
        it("Should return the keccak256 of the input", async function () {
          const data = "0x123a1b238123";
          const hashed = bufferToRpcData(keccak256(toBuffer(data)));

          const res = await this.provider.send("web3_sha3", [
            bufferToRpcData(toBuffer(data)),
          ]);

          assert.strictEqual(res, hashed);
        });
      });
    });
  });
});
