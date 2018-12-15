import { assert } from "chai";
import { EventEmitter } from "events";
import util from "util";
import { JsonRPCRequest, JsonRPCResponse } from "web3x/providers";
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
        reject(new Error("do not meet the requirements"));
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
  let wrapperSend: (payload: JsonRPCRequest) => Promise<JsonRPCResponse>;

  beforeEach(() => {
    ethereum = new MockedEthereumProvider();
    wrapper = new EthereumWeb3xProvider(ethereum);
    wrapperSend = util.promisify(wrapper.send.bind(wrapper));
  });

  it("should get response", async () => {
    const payload = toPayload("net_version");
    const response = await wrapperSend(payload);
    assert.equal(response!.result, "4");
  });

  it("should return an error", async () => {
    const payload = toPayload("bleep");
    try {
      await wrapperSend(payload);
      assert.fail("This should have thrown");
    } catch (err) {
      assert.equal(err!.message, "Method not found");
    }
  });

  it("response should contains an error", async () => {
    const payload = toPayload("fail_method");
    try {
      await wrapperSend(payload);
      assert.fail("This should have thrown");
    } catch (err) {
      assert.equal(err!.message, "do not meet the requirements");
    }
  });

  it("should keep payload unchanged", async () => {
    const params: any[] = ["hola", 123];

    const payload = toPayload("return_params", params);
    const { result } = await wrapperSend(payload);

    assert.deepEqual(result, params);
  });
});
