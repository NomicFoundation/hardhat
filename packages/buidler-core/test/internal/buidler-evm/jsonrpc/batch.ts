import { assert } from "chai";
import sinon, { SinonStub } from "sinon";

import { JsonRpcRequestBatcher } from "../../../../src/internal/buidler-evm/jsonrpc/batch";
import { HttpRequestService } from "../../../../src/internal/buidler-evm/jsonrpc/http";

describe("JsonRpcRequestBatcher", () => {
  const batchingTime = 20;
  let batcher: JsonRpcRequestBatcher;
  let sendMock: SinonStub;

  beforeEach(() => {
    const httpService: HttpRequestService = {
      send: (...args: any[]) => sendMock(args),
    };
    batcher = new JsonRpcRequestBatcher(httpService, batchingTime);
  });

  describe("send", () => {
    it("makes a single http request for a single call", async () => {
      sendMock = sinon.mock().resolves(["0xdeadbeef"]);
      const blockNumber = await batcher.send("eth_blockNumber", []);
      assert.equal(sendMock.callCount, 1);
      assert.equal(blockNumber, "0xdeadbeef");
    });

    it("makes a single http request for two consecutive calls", async () => {
      sendMock = sinon.mock().resolves(["0x1", "0x2"]);
      const [blockOne, blockTwo] = await Promise.all([
        batcher.send("eth_blockNumber"),
        batcher.send("eth_blockNumber"),
      ]);
      assert.equal(sendMock.callCount, 1);
      assert.equal(blockOne, "0x1");
      assert.equal(blockTwo, "0x2");
    });

    /* tslint:disable:no-floating-promises */
    it("makes two http requests for two calls separated by a delay larger than batching time", async () => {
      const clock = sinon.useFakeTimers();
      sendMock = sinon
        .stub()
        .onFirstCall()
        .resolves(["0x1"])
        .onSecondCall()
        .resolves(["0x2"]);

      let blockOne;
      let blockTwo;
      batcher.send("eth_blockNumber").then((res) => (blockOne = res));
      clock.tick(batchingTime * 2);
      batcher.send("eth_blockNumber").then((res) => (blockTwo = res));
      await clock.runAllAsync();
      assert.equal(sendMock.callCount, 2);
      assert.equal(blockOne, "0x1");
      assert.equal(blockTwo, "0x2");

      clock.restore();
    });
    /* tslint:enable:no-floating-promises */

    it("converts errors to rejections", async () => {
      const clock = sinon.useFakeTimers();
      sendMock = sinon
        .mock()
        .resolves([new Error("oops"), "0x2", new Error("oh no")]);
      const promise1 = batcher.send("eth_blockNumber");
      const promise2 = batcher.send("eth_blockNumber");
      const promise3 = batcher.send("eth_blockNumber");

      // handle promise rejections
      promise1.catch(() => {});
      promise3.catch(() => {});

      await clock.runAllAsync();
      clock.restore();
      await assert.isRejected(promise1);
      await promise2;
      await assert.isRejected(promise3);
    });

    it("propagates rejection to all promises", async () => {
      const clock = sinon.useFakeTimers();
      sendMock = sinon.mock().rejects(new Error("dang it"));
      const promise1 = batcher.send("eth_blockNumber");
      const promise2 = batcher.send("eth_blockNumber");
      const promise3 = batcher.send("eth_blockNumber");

      // handle promise rejections
      promise1.catch(() => {});
      promise2.catch(() => {});
      promise3.catch(() => {});

      await clock.runAllAsync();
      clock.restore();
      await assert.isRejected(promise1);
      await assert.isRejected(promise2);
      await assert.isRejected(promise3);
    });
  });
});
