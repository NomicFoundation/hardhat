import { assert } from "chai";

import {
  ModuleParameterRuntimeValueImplementation,
  NamedContractDeploymentFutureImplementation,
} from "../../../../../src/new-api/internal/module";
import { buildInitializeMessageFor } from "../../../../../src/new-api/internal/new-execution/future-processor/helpers/build-initialization-message-for";
import { deploymentStateReducer } from "../../../../../src/new-api/internal/new-execution/reducers/deployment-state-reducer";
import { DeploymentState } from "../../../../../src/new-api/internal/new-execution/types/deployment-state";
import { ExecutionResultType } from "../../../../../src/new-api/internal/new-execution/types/execution-result";
import { ExecutionSateType } from "../../../../../src/new-api/internal/new-execution/types/execution-state";
import {
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
} from "../../../../../src/new-api/internal/new-execution/types/messages";
import { NamedContractDeploymentFuture } from "../../../../../src/new-api/types/module";
import { exampleAccounts } from "../../../helpers";

describe("buildInitializeMessageFor", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  const basicStrategy = { name: "basic" } as any;

  let namedContractDeployment: NamedContractDeploymentFuture<string>;
  let anotherNamedContractDeployment: NamedContractDeploymentFuture<string>;
  let exampleDeploymentState: DeploymentState;

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
      [BigInt(1), "b", anotherNamedContractDeployment, { sub: "d" }],
      {},
      BigInt(10),
      exampleAddress
    );

    // This is typically done by the deployment builder
    namedContractDeployment.dependencies.add(anotherNamedContractDeployment);

    exampleDeploymentState = deploymentStateReducer(undefined as any);
    exampleDeploymentState.executionStates["MyModule:AnotherContract"] = {
      type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
      result: {
        type: ExecutionResultType.SUCCESS,
        address: differentAddress,
      },
    } as any;
  });

  describe("deployment state", () => {
    let message: DeploymentExecutionStateInitializeMessage;

    describe("named contract deployment", () => {
      beforeEach(() => {
        message = buildInitializeMessageFor(
          namedContractDeployment,
          basicStrategy,
          exampleDeploymentState,
          {},
          exampleAccounts
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

      it("should resolve the constructor args", () => {
        assert.deepStrictEqual(message.constructorArgs, [
          BigInt(1),
          "b",
          differentAddress,
          { sub: "d" },
        ]);
      });
    });

    describe("resolves value when module parameter is used", () => {
      beforeEach(() => {
        namedContractDeployment.value =
          new ModuleParameterRuntimeValueImplementation<bigint>(
            "MyModule",
            "passedValue",
            undefined
          );

        message = buildInitializeMessageFor(
          namedContractDeployment,
          basicStrategy,
          exampleDeploymentState,
          {
            MyModule: {
              passedValue: BigInt(99),
            },
          },
          exampleAccounts
        ) as DeploymentExecutionStateInitializeMessage;
      });

      it("should record the value", async () => {
        assert.deepStrictEqual(message.value, BigInt(99));
      });
    });
  });
});
