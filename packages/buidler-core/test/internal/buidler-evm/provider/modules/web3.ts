import { assert } from "chai";
import { keccak256, toBuffer } from "ethereumjs-util";

import { bufferToRpcData } from "../../../../../src/internal/buidler-evm/provider/output";
import { setCWD } from "../../helpers/cwd";
import { PROVIDERS } from "../../helpers/providers";

describe("Web3 module", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`Provider ${name}`, function () {
      setCWD();
      useProvider();

      describe("web3_clientVersion", async function () {
        // TODO: We skip this test for now. See the note in this call's
        //  implementation
        it.skip("Should return the right value", async function () {
          const res = await this.provider.send("web3_clientVersion");
          assert.isTrue(
            res.startsWith("HardhatNetwork/1.0.0-beta.13/ethereumjs-vm/4")
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
