import { assert } from "chai";

import { HttpProvider } from "../../../../src/internal/core/providers/http";
import { INFURA_URL, PROXY_URL } from "../../../setup";

describe("Request With Proxy", function () {
    const rpcUrl = INFURA_URL;

    let env: typeof process.env;
    const simpleRequest = {
      method: "eth_getTransactionCount",
      params: ["0x0000000000000000000000000000000000000000", "latest"],
    };

    describe("Assuming No HTTPS_PROXY environment", function () {
      it("Request is successful", async function () {
        if (rpcUrl === undefined) {
          this.skip();
        }

        const provider = new HttpProvider(rpcUrl, "Test");
        assert.isOk(await provider.request(simpleRequest));
      });
    });

    describe("Assuming HTTPS_PROXY environment", function () {
      before(function () {
        // Save the Environment Settings and Set
        env = process.env;
        process.env.HTTPS_PROXY = PROXY_URL;
      });

      it("Request is successful", async function () {
        if (rpcUrl === undefined) {
          this.skip();
        }

        const provider = new HttpProvider(rpcUrl, "Test");
        assert.isOk(await provider.request(simpleRequest));
      });

      after(function () {
        // restoring everything back to the environment
        process.env = env;
      });
    });

    describe("Request with HTTPS_PROXY environment", function () {
      before(function () {
        // Save the Environment Settings and Set
        env = process.env;
        process.env.HTTP_PROXY = PROXY_URL;
      });

      it("Request is successful", async function () {
        if (rpcUrl === undefined) {
          this.skip();
        }

        const provider = new HttpProvider(rpcUrl, "Test");
        assert.isOk(await provider.request(simpleRequest));
      });

      after(function () {
        // restoring everything back to the environment
        process.env = env;
      });
    });
  });