import { assert } from "chai";

import { NamedContractDeploymentFutureImplementation } from "../../../../../src/new-api/internal/module";
import { buildInitializeMessageFor } from "../../../../../src/new-api/internal/new-execution/future-processor/helpers/build-initialization-message-for";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
} from "../../../../../src/new-api/internal/new-execution/types/messages";
import { NamedContractDeploymentFuture } from "../../../../../src/new-api/types/module";

describe("buildInitializeMessageFor", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  // const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  const basicStrategy = { name: "basic" } as any;

  let namedContractDeployment: NamedContractDeploymentFuture<string>;
  let anotherNamedContractDeployment: NamedContractDeploymentFuture<string>;

  beforeEach(() => {
    const fakeModule = {} as any;

    anotherNamedContractDeployment =
      new NamedContractDeploymentFutureImplementation(
        "MyModule:AnotherContract",
        {} as any,
        "AnotherContract",
        [],
        {},
        BigInt(0),
        exampleAddress
      );

    namedContractDeployment = new NamedContractDeploymentFutureImplementation(
      "MyModule:TestContract",
      fakeModule,
      "TestContract",
      [anotherNamedContractDeployment],
      {},
      BigInt(10),
      exampleAddress
    );

    // This is typically done by the deployment builder
    namedContractDeployment.dependencies.add(anotherNamedContractDeployment);
  });

  describe("deployment state", () => {
    let message: DeploymentExecutionStateInitializeMessage;

    describe("named contract deployment", () => {
      beforeEach(() => {
        message = buildInitializeMessageFor(
          namedContractDeployment,
          basicStrategy,
          {}
        ) as DeploymentExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.equal(
          message.type,
          JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE
        );
      });

      it("should record the strategy name", () => {
        assert.equal(message.strategy, "basic");
      });

      it("should copy across the dependencies", async () => {
        assert.deepStrictEqual(message.dependencies, [
          "MyModule:AnotherContract",
        ]);
      });

      it("should record the value", async () => {
        assert.deepStrictEqual(message.value, BigInt(10));
      });
    });
  });
});
