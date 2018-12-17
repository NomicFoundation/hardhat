import { assert } from "chai";
import { EventEmitter } from "events";
import util from "util";
import {
  createJsonRpcPayload,
  JsonRpcRequest,
  JsonRpcResponse
} from "web3x/providers/jsonrpc";

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
}

describe("web3x ethereum provider", () => {
  let ethereum: MockedEthereumProvider;
  let wrapper: EthereumWeb3xProvider;
<<<<<<< HEAD
  let wrapperSend: (payload: JsonRpcRequest) => Promise<JsonRpcResponse>;
=======
  let wrapperSend: (payload: JsonRpcRequest) => Promise<FixedJsonRPCResponse>;
>>>>>>> wip

  beforeEach(() => {
    ethereum = new MockedEthereumProvider();
    wrapper = new EthereumWeb3xProvider(ethereum);
    wrapperSend = util.promisify(wrapper.send.bind(wrapper));
  });

  it("should get response", async () => {
    const payload = createJsonRpcPayload("net_version");
    const response = await wrapperSend(payload);
    assert.equal(response!.result, "4");
  });

  it("should return an error", async () => {
    const payload = createJsonRpcPayload("bleep");
    const response = await wrapperSend(payload);
    assert.equal(response.error!.message, "Method not found");
  });

  it("response should contain an error", async () => {
    const payload = createJsonRpcPayload("fail_method");

    const response = (await wrapperSend(payload)) as JsonRpcResponse;

    assert.isDefined(response.error);
    assert.equal(response.error!.message, "do not meet the requirements");
  });

  it("should keep payload unchanged", async () => {
    const params: any[] = ["hola", 123];

    const payload = createJsonRpcPayload("return_params", params);
    const { result } = await wrapperSend(payload);

    assert.deepEqual(result, params);
  });
});
