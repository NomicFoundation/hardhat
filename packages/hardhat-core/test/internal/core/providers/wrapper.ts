import { assert } from "chai";
import { ProviderWrapper } from "../../../../src/internal/core/providers/wrapper";
import { RequestArguments } from "../../../../src/types";
import { InvalidInputError } from "../../../../src/internal/core/providers/errors";
import { MockedProvider } from "./mocks";

describe("ProviderWrapper", () => {
  class WrappedProvider extends ProviderWrapper {
    public async request(args: RequestArguments): Promise<unknown> {
      return this._wrappedProvider.request(args);
    }

    public getParams(args: RequestArguments) {
      return this._getParams(args);
    }
  }

  let mock: MockedProvider;
  let provider: WrappedProvider;

  beforeEach(function () {
    mock = new MockedProvider();
    provider = new WrappedProvider(mock);
  });

  describe("EventEmitter", () => {
    let callTimes: number;
    function eventHandler() {
      callTimes += 1;
    }

    beforeEach(() => {
      callTimes = 0;
    });

    it("it should work as an emitter", () => {
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
  });

  describe("get params", () => {
    it("should parse the params and return an array", () => {
      const params = [1, "2", 3, "4"];
      const providerParams = provider.getParams({ method: "amethod", params });

      assert.deepEqual(params, providerParams);
    });

    it("should throw if the params are an object", () => {
      const params = { invalid: "params" };

      assert.throw(
        () => provider.getParams({ method: "amethod", params }),
        InvalidInputError,
        "Hardhat Network doesn't support JSON-RPC params sent as an object"
      );
    });
  });
});
