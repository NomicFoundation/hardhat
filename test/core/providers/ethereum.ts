import { assert } from "chai";
import { EventEmitter } from "events";
import { Callback, JsonRPCRequest, Provider } from "web3x/providers";

import { EthereumProvider } from "../../../src/core/providers/ethereum";

class MockedHttpProvider extends EventEmitter implements Provider {
  constructor() {
    super();
  }
  public send(request: JsonRPCRequest, callback: Callback) {
    if (request.method === "net_version") {
      callback(undefined, this._mockResponse(4));
    } else if (request.method === "bleep") {
      callback(new Error("Method not found"), undefined);
    } else if (request.method === "fail_method") {
      callback(
        undefined,
        this._mockResponse({
          error: "do not meet the requirements",
          code: -32345
        })
      );
    } else if (request.method === "return_params") {
      callback(undefined, this._mockResponse(request.params));
    }
  }
  public disconnect() {}

  private _mockResponse(value?: any): any {
    return {
      jsonrcp: "2.0",
      id: 2,
      result: value
    };
  }
}

describe("ethereum provider", () => {
  let provider: Provider;
  let ethereum: EthereumProvider;

  beforeEach(() => {
    provider = new MockedHttpProvider();
    ethereum = new EthereumProvider(provider);
  });

  it("should get response", async () => {
    ethereum
      .send("net_version")
      .then((response: number) => {
        assert.equal(response, 4);
      })
      .catch(() => {});
  });

  it("should return an error", async () => {
    ethereum
      .send("bleep")
      .then(() => {})
      .catch((err: Error) => {
        assert.equal(err.message, "Method not found");
      });
  });

  it("response should contains an error", async () => {
    ethereum
      .send("fail_method")
      .then(() => {})
      .catch((err: Error) => {
        assert.equal(err.message, "do not meet requirements");
      });
  });

  it("should keep payload unchanged", async () => {
    const params: any[] = ["hola", 123];
    ethereum
      .send("return_params", params)
      .catch(() => {})
      .then(response => {
        assert.equal(response, params);
      });
  });
});
