import { assert } from "chai";

import { workaroundWindowsCiFailures } from "../../../../../../utils/workaround-windows-ci-failures";
import {
  assertNotSupported,
  assertQuantity,
} from "../../../../helpers/assertions";
import { setCWD } from "../../../../helpers/cwd";
import {
  DEFAULT_ACCOUNTS_ADDRESSES,
  PROVIDERS,
} from "../../../../helpers/providers";
import { DEFAULT_COINBASE } from "../../../../../../../src/internal/hardhat-network/provider/provider";

/**
 * This file test the methods that are not covered by the other
 * files in this directory.
 */
describe("Eth module", function () {
  PROVIDERS.forEach(({ name, useProvider, isFork, chainId }) => {
    if (isFork) {
      this.timeout(50000);
    }

    workaroundWindowsCiFailures.call(this, { isFork });

    describe(`${name} provider`, function () {
      setCWD();
      useProvider();

      describe("eth_accounts", function () {
        it("should return the genesis accounts in lower case", async function () {
          const accounts = await this.provider.send("eth_accounts");

          assert.deepEqual(accounts, DEFAULT_ACCOUNTS_ADDRESSES);
        });
      });

      describe("eth_chainId", function () {
        it("should return the chain id as QUANTITY", async function () {
          assertQuantity(await this.provider.send("eth_chainId"), chainId);
        });
      });

      describe("eth_coinbase", function () {
        it("should return the default coinbase address", async function () {
          assert.equal(
            await this.provider.send("eth_coinbase"),
            DEFAULT_COINBASE
          );
        });
      });

      describe("eth_compileLLL", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_compileLLL");
        });
      });

      describe("eth_compileSerpent", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_compileSerpent");
        });
      });

      describe("eth_compileSolidity", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_compileSolidity");
        });
      });

      describe("eth_getCompilers", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_getCompilers");
        });
      });

      describe("eth_getProof", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_getProof");
        });
      });

      describe("eth_getUncleByBlockHashAndIndex", function () {
        it("is not supported", async function () {
          await assertNotSupported(
            this.provider,
            "eth_getUncleByBlockHashAndIndex"
          );
        });
      });

      describe("eth_getUncleByBlockNumberAndIndex", function () {
        it("is not supported", async function () {
          await assertNotSupported(
            this.provider,
            "eth_getUncleByBlockNumberAndIndex"
          );
        });
      });

      describe("eth_getUncleCountByBlockHash", function () {
        it("is not supported", async function () {
          await assertNotSupported(
            this.provider,
            "eth_getUncleCountByBlockHash"
          );
        });
      });

      describe("eth_getUncleCountByBlockNumber", function () {
        it("is not supported", async function () {
          await assertNotSupported(
            this.provider,
            "eth_getUncleCountByBlockNumber"
          );
        });
      });

      describe("eth_getWork", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_getWork");
        });
      });

      describe("eth_hashrate", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_hashrate");
        });
      });

      describe("eth_mining", function () {
        it("should return false", async function () {
          assert.deepEqual(await this.provider.send("eth_mining"), false);
        });
      });

      describe("eth_protocolVersion", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_protocolVersion");
        });
      });

      describe("eth_sign", function () {
        // TODO: Test this. Note that it's implementation is tested in one of
        // our provider wrappers, but re-test it here anyway.
      });

      describe("eth_signTransaction", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_signTransaction");
        });
      });

      describe("eth_signTypedData", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_signTypedData");
        });
      });

      describe("eth_signTypedData_v3", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_signTypedData_v3");
        });
      });

      describe("eth_submitHashrate", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_submitHashrate");
        });
      });

      describe("eth_submitWork", function () {
        it("is not supported", async function () {
          await assertNotSupported(this.provider, "eth_submitWork");
        });
      });

      describe("eth_syncing", function () {
        it("Should return false", async function () {
          assert.deepEqual(await this.provider.send("eth_syncing"), false);
        });
      });
    });
  });
});
