import { assert } from "chai";
import { EventEmitter } from "events";
import { EthereumProvider } from "../../../src/core/providers/ethereum";
import {
  Callback,
  JsonRPCRequest,
  JsonRPCResponse,
  Provider
} from "web3x/providers";
import { toPayload } from "web3x/request-manager/jsonrpc";

class MockedHttpProvider extends EventEmitter implements Provider {
  constructor(host: string) {
    super();
  }
  public send(payload: JsonRPCRequest, callback: Callback) {
    if (payload.method === "net_version") {
      callback(undefined, {
        jsonrpc: "2.0",
        id: 1,
        result: "4"
      });
    } else if (payload.method === "bleep") {
      callback(new Error("Method not found"), undefined);
    } else if (payload.method === "fail_method") {
      callback(undefined, {
        jsonrpc: "2.0",
        id: 2,
        result: {
          error: "do not meet the requirements",
          code: -32345
        }
      });
    } else {
      callback(undefined, payload);
    }
  }
  public disconnect() {}
}

describe("ethereum provider", () => {
  let provider: Provider;
  let ethereum: EthereumProvider;

  beforeEach(() => {
    provider = new MockedHttpProvider("http://localhost:8545");
    ethereum = new EthereumProvider(provider);
  });

  it("should get response", () => {
    ethereum
      .send("net_version")
      .then((response: JsonRPCResponse) => {
        assert.equal(response.result, "4");
      })
      .catch(err => {});
  });

  it("should return an error", () => {
    ethereum
      .send("bleep")
      .then(() => {})
      .catch((err: Error) => {
        assert.equal(err.message, "Method not found");
      });
  });

  it("response should contains an error", () => {
    ethereum
      .send("fail_method")
      .then(() => {})
      .catch((err: Error) => {
        assert.equal(err.message, "do not meet requirements");
      });
  });

  it("should keep payload unchanged", () => {
    ethereum
      .send("another_method")
      .catch(() => {})
      .then((response: JsonRPCResponse) => {
        assert.equal(response, toPayload("another_method"));
      });
  });
});
