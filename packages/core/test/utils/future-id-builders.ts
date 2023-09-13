import { assert } from "chai";

import {
  toCallFutureId,
  toDeploymentFutureId,
  toReadEventArgumentFutureId,
  toSendDataFutureId,
} from "../../src/internal/utils/future-id-builders";

describe("future id rules", () => {
  describe("contract, library, contractAt ids", () => {
    it("the fallback id should be built based on the contract or library name", () => {
      assert.equal(
        toDeploymentFutureId("MyModule", undefined, "MyContract"),
        "MyModule:MyContract"
      );
    });

    it("namespaces to the module a user provided id", () => {
      assert.equal(
        toDeploymentFutureId("MyModule", "MyId", "MyContract"),
        "MyModule:MyId"
      );
    });
  });

  describe("call ids", () => {
    it("the fallback id should be built based on the contractName and function name", () => {
      assert.equal(
        toCallFutureId("MyModule", undefined, "MyContract", "MyFunction"),
        "MyModule:MyContract#MyFunction"
      );
    });

    it("namespaces the user provided id to the module", () => {
      assert.equal(
        toCallFutureId("MyModule", "MyId", "MyContract", "MyFunction"),
        "MyModule:MyId"
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
        "MyModule:MyContract#MyFunction#MyArg#2"
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
        "MyModule:MyId"
      );
    });
  });

  describe("send data ids", () => {
    it("namespaces the user provided id to the module", () => {
      assert.equal(toSendDataFutureId("MyModule", "MyId"), "MyModule:MyId");
    });
  });
});
