import { assert } from "chai";
import { createJsonRpcPayload, JsonRpcRequest } from "web3x/providers/jsonrpc";

import { ERRORS } from "../../../src/core/errors";
import { IEthereumProvider } from "../../../src/core/providers/ethereum";
import { Web3HTTPProviderAdapter } from "../../../src/core/providers/web3-provider-adapter";
import { expectBuidlerError } from "../../helpers/errors";

import { ErrorProvider } from "./mocks";

describe("web3 provider adapter", () => {
  let provider: Web3HTTPProviderAdapter;
  let payload: JsonRpcRequest;
  let callback: (error: any, response: any) => any;
  let mockedProvider: IEthereumProvider;
  beforeEach(() => {
    mockedProvider = new ErrorProvider();
    provider = new Web3HTTPProviderAdapter(mockedProvider);
  });

  it("Should throw if send is called", async () => {
    expectBuidlerError(
      () => provider.send(payload, callback),
      ERRORS.NOT_SUPPORTED
    );
  });

  it("Should return always true", () => {
    assert.isTrue(provider.isConnected());
  });

  it("Should successfully send a payload", () => {
    const params = [1, 2, 3];
    payload = createJsonRpcPayload("method", params);
    callback = (error, response) => {
      if (response !== undefined) {
        assert.equal(response.result, params);
      }
    };
    provider.sendAsync(payload, callback);
  });

  it("Should successfully send multiple payloads", () => {
    const params = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const payloads = params.map(p => createJsonRpcPayload("method", p));
    callback = (error, response) => {
      if (response !== undefined) {
        assert.include(params, response.result);
        params.splice(params.indexOf(response.result), 1);
      }
    };
    provider.sendAsync(payloads, callback);
  });

  it("Should return the error data when an error occurred", () => {
    payload = createJsonRpcPayload("error_method");
    callback = (error, response) => {
      if (error !== undefined) {
        assert.equal(error.error.message, "an error has occurred");
      }
      assert.isUndefined(response);
    };
    provider.sendAsync(payload, callback);
  });

  it("Should preserve JsonRPC payload's id", () => {
    const params = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const payloads = params.map(p => createJsonRpcPayload("method", p));
    const payloadIds = payloads.map(p => p.id);
    callback = (error, response) => {
      if (response !== undefined) {
        assert.include(payloadIds, response.id);
        payloadIds.splice(payloadIds.indexOf(response.id), 1);
      }
    };
    provider.sendAsync(payloads, callback);
  });

  it("Should preserve JsonRPC payload order", () => {
    const params = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];
    const payloads = params.map(p => createJsonRpcPayload("method", p));
    let count = 0;
    callback = (error, response) => {
      if (response !== undefined) {
        assert.equal(response.result, params[count]);
        count++;
      }
    };
    provider.sendAsync(payloads, callback);
  });

  it("Should handle both success and failure requests", () => {
    const payloads = [
      createJsonRpcPayload("error_method", ["failure"]),
      createJsonRpcPayload("method", ["success"])
    ];
    callback = (error, response) => {
      if (response !== undefined) {
        assert.deepEqual(response.result, ["success"]);
      }
      if (error !== undefined) {
        assert.equal(error.error.message, "an error has occurred");
      }
    };
    provider.sendAsync(payloads, callback);
  });
});
