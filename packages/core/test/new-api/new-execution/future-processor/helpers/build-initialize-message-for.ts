import { assert } from "chai";

import {
  AccountRuntimeValueImplementation,
  ModuleParameterRuntimeValueImplementation,
  NamedContractDeploymentFutureImplementation,
  NamedLibraryDeploymentFutureImplementation,
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
import {
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
} from "../../../../../src/new-api/types/module";
import { exampleAccounts } from "../../../helpers";

describe("buildInitializeMessageFor", () => {
  const exampleAddress = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  const libraryAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  const basicStrategy = { name: "basic" } as any;

  let namedContractDeployment: NamedContractDeploymentFuture<string>;
  let anotherNamedContractDeployment: NamedContractDeploymentFuture<string>;
  let safeMathLibraryDeployment: NamedLibraryDeploymentFuture<string>;

  let exampleDeploymentState: DeploymentState;

  beforeEach(() => {
    const fakeModule = {} as any;

    safeMathLibraryDeployment = new NamedLibraryDeploymentFutureImplementation(
      "MyModule:SafeMath",
      fakeModule,
      "SafeMath",
      {},
      exampleAccounts[0]
    );

    anotherNamedContractDeployment =
      new NamedContractDeploymentFutureImplementation(
        "MyModule:AnotherContract",
        {} as any,
        fakeModule,
        [],
        {},
        BigInt(0),
        exampleAccounts[0]
      );

    namedContractDeployment = new NamedContractDeploymentFutureImplementation(
      "MyModule:TestContract",
      fakeModule,
      "TestContract",
      [BigInt(1), "b", anotherNamedContractDeployment, { sub: "d" }],
      {
        SafeMath: safeMathLibraryDeployment,
      },
      BigInt(10),
      exampleAccounts[0]
    );

    // This is typically done by the deployment builder
    namedContractDeployment.dependencies.add(anotherNamedContractDeployment);

    exampleDeploymentState = deploymentStateReducer(undefined as any);

    exampleDeploymentState.executionStates["MyModule:SafeMath"] = {
      type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
      result: {
        type: ExecutionResultType.SUCCESS,
        address: libraryAddress,
      },
    } as any;

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

      it("should resolve the address", () => {
        assert.deepStrictEqual(message.from, exampleAccounts[0]);
      });

      it("should resolve the libraries", () => {
        assert.deepStrictEqual(message.libraries, {
          SafeMath: libraryAddress,
        });
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

    describe("resolves from when runtime account used", () => {
      beforeEach(() => {
        namedContractDeployment.from = new AccountRuntimeValueImplementation(1);

        message = buildInitializeMessageFor(
          namedContractDeployment,
          basicStrategy,
          exampleDeploymentState,
          {},
          exampleAccounts
        ) as DeploymentExecutionStateInitializeMessage;
      });

      it("should record the value", async () => {
        assert.deepStrictEqual(message.from, exampleAccounts[1]);
      });
    });

    describe("defers resolving from when provided with undefined - it will be taken from accounts at execution", () => {
      beforeEach(() => {
        namedContractDeployment.from = undefined;

        message = buildInitializeMessageFor(
          namedContractDeployment,
          basicStrategy,
          exampleDeploymentState,
          {},
          exampleAccounts
        ) as DeploymentExecutionStateInitializeMessage;
      });

      it("should record the value", async () => {
        assert.deepStrictEqual(message.from, undefined);
      });
    });
  });
});
