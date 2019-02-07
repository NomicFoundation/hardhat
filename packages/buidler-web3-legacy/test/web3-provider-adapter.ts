import { IEthereumProvider } from "@nomiclabs/buidler/types";
import { assert } from "chai";
import Web3 from "web3";

import {
  JsonRpcRequest,
  JsonRpcResponse,
  Web3HTTPProviderAdapter
} from "../src/web3-provider-adapter";

let nextId = 1;

function createJsonRpcRequest(
  method: string,
  params: any[] = []
): JsonRpcRequest {
  return {
    id: nextId++,
    jsonrpc: "2.0",
    method,
    params
  };
}

describe("Web3 provider adapter", () => {
  let realWeb3Provider: any;
  let adaptedProvider: Web3HTTPProviderAdapter;

  before("Setup buidler project", () => {
    process.chdir(__dirname);
    process.env.BUIDLER_NETWORK = "develop";
  });

  beforeEach(() => {
    const buidlerEnv = require("@nomiclabs/buidler");
    realWeb3Provider = new Web3.providers.HttpProvider("http://localhost:8545");
    adaptedProvider = new Web3HTTPProviderAdapter(buidlerEnv.ethereum);
  });

  it("Should throw if send is called", async () => {
    assert.throws(
      () => adaptedProvider.send({}),
      "Synchronous requests are not supported, use pweb3 instead"
    );
  });

  it("Should always return true when isConnected is called", () => {
    assert.isTrue(adaptedProvider.isConnected());
  });

  it("Should return the same as the real provider for sigle requests", done => {
    const request = createJsonRpcRequest("eth_accounts");
    realWeb3Provider.sendAsync(
      request,
      (error: Error | null, response?: JsonRpcResponse) => {
        adaptedProvider.sendAsync(request, (error2, response2) => {
          assert.deepEqual(error2, error);
          assert.deepEqual(response2, response);
          done();
        });
      }
    );
  });

  it("Should return the same as the real provider for batched requests", done => {
    const requests = [
      createJsonRpcRequest("eth_accounts"),
      createJsonRpcRequest("net_version"),
      createJsonRpcRequest("eth_accounts")
    ];

    realWeb3Provider.sendAsync(
      requests,
      (error: Error | null, response?: JsonRpcResponse[]) => {
        adaptedProvider.sendAsync(requests, (error2, response2) => {
          assert.deepEqual(error2, error);
          assert.deepEqual(response2, response);
          done();
        });
      }
    );
  });

  it("Should return the same on error", done => {
    const request = createJsonRpcRequest("error_please");

    realWeb3Provider.sendAsync(
      request,
      (error: Error | null, response?: JsonRpcResponse) => {
        adaptedProvider.sendAsync(request, (error2, response2) => {
          assert.deepEqual(error2, error);
          assert.equal(response2!.error!.message, response!.error!.message);
          done();
        });
      }
    );
  });

  it("Should let all requests complete, even if one of them fails", done => {
    const requests = [
      createJsonRpcRequest("eth_accounts"),
      createJsonRpcRequest("error_please"),
      createJsonRpcRequest("eth_accounts")
    ];

    realWeb3Provider.sendAsync(
      requests,
      (error: Error | null, response?: JsonRpcResponse[]) => {
        adaptedProvider.sendAsync(requests, (error2, response2) => {
          assert.deepEqual(error2, error);
          assert.lengthOf(response2!, response!.length);
          assert.deepEqual(response2![0], response![0]);
          assert.equal(
            response2![1].error!.message,
            response![1].error!.message
          );
          assert.isUndefined(response2![2]);
          done();
        });
      }
    );
  });
});
