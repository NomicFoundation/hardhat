import { assert } from "chai";

import {
  toCallFutureId,
  toContractFutureId,
  toReadEventArgumentFutureId,
  toSendDataFutureId,
} from "../../src/internal/utils/future-id-builders";

describe("future id rules", () => {
  describe("contract, library, contractAt ids", () => {
    it("the fallback id should be built based on the contract or library name", () => {
      assert.equal(
        toContractFutureId("MyModule", undefined, "MyContract"),
        "MyModule#MyContract"
      );
    });

    it("namespaces to the module a user provided id", () => {
      assert.equal(
        toContractFutureId("MyModule", "MyId", "MyContract"),
        "MyModule#MyId"
      );
    });
  });

  describe("call ids", () => {
    it("the fallback id should be built based on the contract id and function name if they belong to the same module", () => {
      assert.equal(
        toCallFutureId(
          "MyModule",
          undefined,
          "MyModule",
          "MyModule#MyContract",
          "MyFunction"
        ),
        "MyModule#MyContract.MyFunction"
      );
    });

    it("should name a call to a future coming from a module representing the submodule relationship, and including namespaced by module id", () => {
      assert.equal(
        toCallFutureId(
          "MyModule",
          undefined,
          "Submodule",
          "Submodule#MyContract",
          "MyFunction"
        ),
        "MyModule#Submodule~MyContract.MyFunction"
      );
    });

    it("namespaces the user provided id to the module", () => {
      assert.equal(
        toCallFutureId(
          "MyModule",
          "MyId",
          "MyModule",
          "MyModule#MyContract",
          "MyFunction"
        ),
        "MyModule#MyId"
      );
    });
  });

  describe("read event argument ids", () => {
    it("the fallback id should be built based on the contractName, event name, arg name and index", () => {
      assert.equal(
        toReadEventArgumentFutureId(
          "MyModule",
          undefined,
          "MyContract",
          "MyFunction",
          "MyArg",
          2
        ),
        "MyModule#MyContract.MyFunction.MyArg.2"
      );
    });

    it("the fallback id should be built even when the arg is an index", () => {
      assert.equal(
        toReadEventArgumentFutureId(
          "MyModule",
          undefined,
          "MyContract",
          "MyFunction",
          3,
          2
        ),
        "MyModule#MyContract.MyFunction.3.2"
      );
    });

    it("namespaces the user provided id to the module", () => {
      assert.equal(
        toReadEventArgumentFutureId(
          "MyModule",
          "MyId",
          "MyContract",
          "MyFunction",
          "MyArg",
          2
        ),
        "MyModule#MyId"
      );
    });
  });

  describe("send data ids", () => {
    it("namespaces the user provided id to the module", () => {
      assert.equal(toSendDataFutureId("MyModule", "MyId"), "MyModule#MyId");
    });
  });
});
