import { assert } from "chai";
import sinon from "sinon";

import * as hh from "../../src";
import { resetInternal } from "../../src/helpers/reset";
import { useEnvironment } from "../test-utils";

describe("reset", function () {
  describe("integration", function () {
    useEnvironment("simple");

    it("should reset the non-forked network", async function () {
      assert.equal(await hh.time.latestBlock(), 0);
      await hh.mine();
      assert.equal(await hh.time.latestBlock(), 1);
      await hh.reset();
      assert.equal(await hh.time.latestBlock(), 0);
    });
  });

  describe("unit", function () {
    it("no forking config", async function () {
      const mockProvider = {
        request: sinon.spy(),
      };

      await resetInternal(mockProvider as any, undefined);

      assert.isTrue(
        mockProvider.request.calledOnceWith({
          method: "hardhat_reset",
          params: [],
        })
      );
    });

    it("disabled forking", async function () {
      const mockProvider = {
        request: sinon.spy(),
      };

      await resetInternal(mockProvider as any, {
        enabled: false,
        url: "node-url",
        httpHeaders: {},
      });

      assert.isTrue(
        mockProvider.request.calledOnceWith({
          method: "hardhat_reset",
          params: [],
        })
      );
    });

    it("forking without block number", async function () {
      const mockProvider = {
        request: sinon.spy(),
      };

      await resetInternal(mockProvider as any, {
        enabled: true,
        url: "node-url",
        httpHeaders: {},
      });

      assert.isTrue(
        mockProvider.request.calledOnceWith({
          method: "hardhat_reset",
          params: [
            {
              forking: {
                jsonRpcUrl: "node-url",
                blockNumber: undefined,
                httpHeaders: {},
              },
            },
          ],
        })
      );
    });

    it("forking with block number", async function () {
      const mockProvider = {
        request: sinon.spy(),
      };

      await resetInternal(mockProvider as any, {
        enabled: true,
        url: "node-url",
        blockNumber: 12345,
        httpHeaders: {},
      });

      assert.isTrue(
        mockProvider.request.calledOnceWith({
          method: "hardhat_reset",
          params: [
            {
              forking: {
                jsonRpcUrl: "node-url",
                blockNumber: 12345,
                httpHeaders: {},
              },
            },
          ],
        })
      );
    });

    it("forking without block number and http headers", async function () {
      const mockProvider = {
        request: sinon.spy(),
      };

      await resetInternal(mockProvider as any, {
        enabled: true,
        url: "node-url",
        httpHeaders: {
          Authorization: "Basic foobar",
        },
      });

      assert.isTrue(
        mockProvider.request.calledOnceWith({
          method: "hardhat_reset",
          params: [
            {
              forking: {
                jsonRpcUrl: "node-url",
                blockNumber: undefined,
                httpHeaders: {
                  Authorization: "Basic foobar",
                },
              },
            },
          ],
        })
      );
    });

    it("forking with block number and http headers", async function () {
      const mockProvider = {
        request: sinon.spy(),
      };

      await resetInternal(mockProvider as any, {
        enabled: true,
        url: "node-url",
        blockNumber: 12345,
        httpHeaders: {
          Authorization: "Basic foobar",
        },
      });

      assert.isTrue(
        mockProvider.request.calledOnceWith({
          method: "hardhat_reset",
          params: [
            {
              forking: {
                jsonRpcUrl: "node-url",
                blockNumber: 12345,
                httpHeaders: {
                  Authorization: "Basic foobar",
                },
              },
            },
          ],
        })
      );
    });
  });
});
