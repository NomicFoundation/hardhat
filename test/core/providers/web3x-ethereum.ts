import { assert } from "chai";
import { EventEmitter } from "events";
import { JsonRPCResponse } from "web3x/providers";
import { toPayload } from "web3x/request-manager/jsonrpc";

import { IEthereumProvider } from "../../../src/core/providers/ethereum";
import { EthereumWeb3xProvider } from "../../../src/core/providers/web3x-ethereum";

class MockedEthereumProvider extends EventEmitter implements IEthereumProvider {
  constructor() {
    super();
  }

  public send(method: string, params: any[]): Promise<any> {
    return new Promise((resolve, reject) => {
      if (method === "net_version") {
        resolve("4");
      } else if (method === "bleep") {
        reject(new Error("Method not found"));
      } else if (method === "fail_method") {
        reject({
          error: "do not meet the requirements",
          code: -32345
        });
      } else if (method === "return_params") {
        resolve(params);
      }
    });
  }

  public disconnect() {}
}

describe("web3x ethereum provider", () => {
  let ethereum: MockedEthereumProvider;
  let wrapper: EthereumWeb3xProvider;

  beforeEach(() => {
    ethereum = new MockedEthereumProvider();
    wrapper = new EthereumWeb3xProvider(ethereum);
  });

  it("should get response", async () => {
    const payload = toPayload("net_version");
    wrapper.send(payload, (err?: Error, response?: JsonRPCResponse) => {
      assert.isDefined(response);
      if (response !== undefined) {
        assert.equal(response.result, "4");
      }
    });
  });

  it("should return an error", async () => {
    const payload = toPayload("bleep");
    wrapper.send(payload, (err?: Error, response?: JsonRPCResponse) => {
      assert.isDefined(err);
      if (err !== undefined) {
        assert.equal(err.message, "Method not found");
      }
    });
  });

  it("response should contains an error", async () => {
    const payload = toPayload("fail_method");
    wrapper.send(payload, (err?: Error, response?: JsonRPCResponse) => {
      assert.isDefined(err);
      if (err !== undefined) {
        assert.equal(err.message, "do not meet requirements");
      }
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
