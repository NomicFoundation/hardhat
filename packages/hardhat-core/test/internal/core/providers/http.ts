import { assert } from "chai";
import Proxy from "proxy";

import { HttpProvider } from "../../../../src/internal/core/providers/http";
import { ALCHEMY_URL, INFURA_URL } from "../../../setup";

describe("HttpProvider", function () {
  describe("429 Too many requests - retries", function () {
    it("Retries are correctly handled for Alchemy", async function () {
      if (ALCHEMY_URL === undefined) {
        this.skip();
        return;
      }

      const provider = new HttpProvider(ALCHEMY_URL, "Alchemy");

      // We just make a bunch of requests that would otherwise fail
      const requests = [];
      for (let i = 0; i < 20; i++) {
        requests.push(
          provider.request({
            method: "eth_getTransactionCount",
            params: ["0x6b175474e89094c44da98b954eedeac495271d0f", "0x12"],
          })
        );
      }

      await Promise.all(requests);
    });
  });

  describe("Simple Request - HttpProxyAgent", function () {
    const rpcUrl = INFURA_URL;

    let env: typeof process.env;
    let proxy: any;
    let proxyPort: number;
    const simpleRequest = {
      method: "eth_getTransactionCount",
      params: ["0x0000000000000000000000000000000000000000", "latest"],
    };

    before(function (done) {
      // Setup Proxy Server
      proxy = new Proxy();
      proxy.listen(function () {
        proxyPort = proxy.address().port;
        done();
      });
    });

    describe("Simple Request without PROXY env", function () {
      it("Request is successful", async function () {
        if (rpcUrl === undefined) {
          this.skip();
        }

        const provider = new HttpProvider(rpcUrl, "Test");
        assert.isOk(await provider.request(simpleRequest));
      });
    });

    describe("Simple Request with HTTPS_PROXY env", function () {
      before(function () {
        // Save the Environment Settings and Set
        env = process.env;
        process.env.HTTPS_PROXY = `http://127.0.0.1:${proxyPort}`;
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

    describe("Simple Request with HTTP_PROXY env", function () {
      before(function () {
        // Save the Environment Settings and Set
        env = process.env;
        process.env.HTTP_PROXY = `http://127.0.0.1:${proxyPort}`;
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

    after(function (done) {
      // Shutdown Proxy Server
      proxy.once("close", function () {
        done();
      });
      proxy.close();
    });
  });
});
