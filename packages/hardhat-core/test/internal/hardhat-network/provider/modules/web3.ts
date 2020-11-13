import { assert } from "chai";
import { keccak256, toBuffer } from "ethereumjs-util";

import { bufferToRpcData } from "../../../../../src/internal/hardhat-network/provider/output";
import { setCWD } from "../../helpers/cwd";
import { PROVIDERS } from "../../helpers/providers";

describe("Web3 module", function () {
  PROVIDERS.forEach(({ name, useProvider }) => {
    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("web3_clientVersion", async function () {
        it("Should return the right value", async function () {
          const res = await this.provider.send("web3_clientVersion");
          assert.match(res, /^HardhatNetwork\/.*\/ethereumjs-vm/);
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
