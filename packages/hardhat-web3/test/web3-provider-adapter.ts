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
  });

  it("Should always return true when isConnected is called", function () {
    assert.isTrue(adaptedProvider.isConnected());
  });

  it("Should return the same as the real provider for single requests", function (done) {
    const request = createJsonRpcRequest("eth_accounts");
    realWeb3Provider.send(
      request,
      (error: Error | null, response?: JsonRpcResponse) => {
        adaptedProvider.send(request, (error2, response2) => {
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

    realWeb3Provider.send(
      requests,
      (error: Error | null, response?: JsonRpcResponse[]) => {
        adaptedProvider.send(requests, (error2, response2) => {
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

        return realWeb3Provider.send(
          request,
          (error: Error | null, response?: JsonRpcResponse) => {
            adaptedProvider.send(request, (error2, response2) => {
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

    realWeb3Provider.send(
      requests,
      (error: Error | null, response?: JsonRpcResponse[]) => {
        adaptedProvider.send(requests, (error2, response2) => {
          assert.deepEqual(error2, error);
          assert.deepEqual(response2![0], response![0]);
          assert.equal(
            response2![1].error!.message,
            response![1].error!.message
          );

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
