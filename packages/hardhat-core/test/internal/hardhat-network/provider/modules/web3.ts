import { toBytes } from "@nomicfoundation/ethereumjs-util";
import { assert } from "chai";

import { bufferToRpcData } from "../../../../../src/internal/core/jsonrpc/types/base-types";
import { keccak256 } from "../../../../../src/internal/util/keccak";
import { workaroundWindowsCiFailures } from "../../../../utils/workaround-windows-ci-failures";
import { setCWD } from "../../helpers/cwd";
import { PROVIDERS } from "../../helpers/providers";

function toBuffer(x: Parameters<typeof toBytes>[0]) {
  return Buffer.from(toBytes(x));
}

describe("Web3 module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("web3_clientVersion", async function () {
        it("Should return the right value", async function () {
          const res = await this.provider.send("web3_clientVersion");
          assert.match(
            res,
            /^HardhatNetwork\/.*\/@nomicfoundation\/ethereumjs-vm/
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
