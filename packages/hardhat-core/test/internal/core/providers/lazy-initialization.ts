import { assert } from "chai";
import sinon from "sinon";

import { LazyInitializationProvider } from "../../../../src/internal/core/providers/lazy-initialization";
import { JsonRpcRequest } from "../../../../src/types";

import { EthereumMockedProvider } from "./mocks";

describe("LazyInitializationProvider", () => {
  let mock: EthereumMockedProvider;
  let provider: LazyInitializationProvider;
  let initializationCount: number;
  let id: number;

  function createJsonRpcRequest(
    method: string,
    params: JsonRpcRequest["params"]
  ) {
    return { id: id++, jsonrpc: "2.0", method, params };
  }

  beforeEach(() => {
    initializationCount = 0;
    id = 1;

    mock = new EthereumMockedProvider();
    provider = new LazyInitializationProvider(async () => {
      initializationCount += 1;
      return mock;
    });
  });

  describe("EventEmitter", () => {
    let callTimes: number;
    function eventHandler() {
      callTimes += 1;
    }

    beforeEach(() => {
      callTimes = 0;
    });

    it("it should work as an emitter before being initialized", () => {
      provider.on("event", eventHandler);
      provider.on("otherevent", eventHandler);
      provider.once("onceevent", eventHandler);
      provider.emit("event"); // 1
      provider.emit("otherevent"); // 2
      provider.emit("onceevent"); // 3
      provider.emit("onceevent"); // 3
      provider.off("otherevent", eventHandler);
      provider.emit("otherevent"); // 3

      assert.equal(callTimes, 3);
    });

    it("should move the registered events to the provider after initialization", async () => {
      provider.on("event", eventHandler);
      provider.on("otherevent", eventHandler);
      provider.once("onceevent", eventHandler);

      await provider.request({ method: "a-method" }); // init the inner provider calling the constructor function
      provider.emit("event"); // 1
      provider.emit("otherevent"); // 2
      provider.emit("onceevent"); // 3
      provider.emit("onceevent"); // 3

      assert.deepEqual(callTimes, 3);
    });
  });

  describe("request", () => {
    it("should call the intialization function when called", async () => {
      await provider.request({ method: "method1", params: [1, 2, 3] });

      assert.equal(initializationCount, 1);
    });

    it("should call the intialization function only once", async () => {
      await provider.request({ method: "method1", params: [1, 2, 3] });
      await provider.request({ method: "method2", params: [66, 77] });
      await provider.request({ method: "method3", params: [99, 100] });

      assert.equal(initializationCount, 1);
    });

    it("should forward the method to the initialized provider", async () => {
      const requestSpy = sinon.spy(mock, "request");
      const requestParams = { method: "a-method" };
      await provider.request(requestParams); // init the inner provider calling the constructor function

      assert.equal(requestSpy.callCount, 1);
      assert.isTrue(requestSpy.calledOnceWith(requestParams));
    });
  });

  describe("send", () => {
    it("should call the intialization function when called", async () => {
      await provider.send("method1", [1, 2, 3]);

      assert.equal(initializationCount, 1);
    });

    it("should call the intialization function only once", async () => {
      await provider.send("method1", [1, 2, 3]);
      await provider.send("method2", [66, 77]);
      await provider.send("method3", [99, 100]);

      assert.equal(initializationCount, 1);
    });

    it("should forward the method to the initialized provider", async () => {
      const sendSpy = sinon.spy(mock, "send");
      const sendParams = [1, 2, 44];
      await provider.send("method", sendParams); // init the inner provider calling the constructor function

      assert.equal(sendSpy.callCount, 1);
      assert.isTrue(sendSpy.calledOnceWith("method", sendParams));
    });
  });

  describe("sendAsync", () => {
    it("should call the intialization function when called", () => {
      provider.sendAsync(createJsonRpcRequest("method1", [1, 2, 3]), () => {});

      assert.equal(initializationCount, 1);
    });

    it("should call the intialization function only once", () => {
      provider.sendAsync(createJsonRpcRequest("method1", [1, 2, 3]), () => {
        provider.sendAsync(createJsonRpcRequest("method2", [66, 77]), () => {
          provider.sendAsync(createJsonRpcRequest("method3", [99, 100]), () => {
            assert.equal(initializationCount, 1);
          });
        });
      });
    });

    it("should call the intialization function only once even for unresolved calls", () => {
      provider.sendAsync(createJsonRpcRequest("method1", [1, 2, 3]), () => {});
      provider.sendAsync(createJsonRpcRequest("method2", [66, 77]), () => {});
      provider.sendAsync(createJsonRpcRequest("method3", [99, 100]), () => {});
      assert.equal(initializationCount, 1);
    });

    it("should forward the method to the initialized provider", (done) => {
      const sendAsyncSpy = sinon.spy(mock, "sendAsync");
      const sendAsyncParams = createJsonRpcRequest("methodname", [
        "a",
        "b",
        33,
      ]);
      const asyncCallback = () => {
        assert.equal(sendAsyncSpy.callCount, 1);
        assert.isTrue(
          sendAsyncSpy.calledOnceWith(sendAsyncParams, asyncCallback)
        );
        done();
      };

      // init the inner provider calling the constructor function
      provider.sendAsync(sendAsyncParams, asyncCallback);
    });
  });
});
