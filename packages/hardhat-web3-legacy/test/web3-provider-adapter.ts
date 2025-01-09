/* eslint-disable @typescript-eslint/strict-boolean-expressions */
import { assert } from "chai";
import Web3 from "web3";

import {
  JsonRpcRequest,
  JsonRpcResponse,
  Web3HTTPProviderAdapter,
} from "../src/web3-provider-adapter";

import { useEnvironment } from "./helpers";

let nextId = 1;

function createJsonRpcRequest(
  method: string,
  params: any[] = []
): JsonRpcRequest {
  return {
    id: nextId++,
    jsonrpc: "2.0",
    method,
    params,
  };
}

describe("Web3 provider adapter", function () {
  let realWeb3Provider: any;
  let adaptedProvider: Web3HTTPProviderAdapter;

  useEnvironment("hardhat-project");

  beforeEach(function () {
    realWeb3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
    adaptedProvider = new Web3HTTPProviderAdapter(this.env.network.provider);

    assert.isDefined(this.env.web3);
  });

  it("Should throw if send is called", async function () {
    assert.throws(
      () => adaptedProvider.send(),
      "Synchronous requests are not supported, use pweb3 instead"
    );

    assert.throws(
      () => adaptedProvider.send({ method: "asd" }),
      `Trying to call RPC method asd, but synchronous requests are not supported, use pweb3 instead`
    );
  });

  it("Should always return true when isConnected is called", function () {
    assert.isTrue(adaptedProvider.isConnected());
  });

  it("Should return the same as the real provider for single requests", function (done) {
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

  it("Should return the same as the real provider for batched requests", function (done) {
    const requests = [
      createJsonRpcRequest("eth_accounts"),
      createJsonRpcRequest("net_version"),
      createJsonRpcRequest("eth_accounts"),
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

  it("Should return the same on error", function (done) {
    // We disable this test for RskJ
    // See: https://github.com/rsksmart/rskj/issues/876
    this.env.network.provider
      .send("web3_clientVersion")
      .then((version) => {
        if (version.includes("RskJ")) {
          done();
          return;
        }

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
      })
      .then(
        () => {},
        () => {}
      );
  });

  it("Should let all requests complete, even if one of them fails", function (done) {
    const requests = [
      createJsonRpcRequest("eth_accounts"),
      createJsonRpcRequest("error_please"),
      createJsonRpcRequest("eth_accounts"),
    ];

    realWeb3Provider.sendAsync(
      requests,
      (error: Error | null, response?: JsonRpcResponse[]) => {
        adaptedProvider.sendAsync(requests, (error2, response2) => {
          assert.deepEqual(error2, error);
          assert.deepEqual(response2![0], response![0]);

          // Ganache doesn't return a value for requests after the failing one,
          // so we don't either. Otherwise, this should be tested.
          // assert.lengthOf(response2!, response!.length);
          // assert.isUndefined(responseFromAdapted![2]);![2]);

          // We disable this test for RskJ
          // See: https://github.com/rsksmart/rskj/issues/876
          this.env.network.provider
            .send("web3_clientVersion")
            .then((version) => {
              if (version.includes("RskJ")) {
                assert.equal(
                  response2![1].error!.message,
                  response![1].error!.message
                );
              }
            })
            .then(done, done);
        });
      }
    );
  });
});
