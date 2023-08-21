import { assert } from "chai";

import {
  AccountRuntimeValueImplementation,
  ArtifactContractDeploymentFutureImplementation,
  ArtifactLibraryDeploymentFutureImplementation,
  ModuleParameterRuntimeValueImplementation,
  NamedContractCallFutureImplementation,
  NamedContractDeploymentFutureImplementation,
  NamedLibraryDeploymentFutureImplementation,
  NamedStaticCallFutureImplementation,
} from "../../../../../src/new-api/internal/module";
import { buildInitializeMessageFor } from "../../../../../src/new-api/internal/new-execution/future-processor/helpers/build-initialization-message-for";
import { deploymentStateReducer } from "../../../../../src/new-api/internal/new-execution/reducers/deployment-state-reducer";
import { DeploymentState } from "../../../../../src/new-api/internal/new-execution/types/deployment-state";
import { ExecutionResultType } from "../../../../../src/new-api/internal/new-execution/types/execution-result";
import { ExecutionSateType } from "../../../../../src/new-api/internal/new-execution/types/execution-state";
import {
  CallExecutionStateInitializeMessage,
  DeploymentExecutionStateInitializeMessage,
  JournalMessageType,
  StaticCallExecutionStateInitializeMessage,
} from "../../../../../src/new-api/internal/new-execution/types/messages";
import {
  ArtifactContractDeploymentFuture,
  ArtifactLibraryDeploymentFuture,
  FutureType,
  NamedContractCallFuture,
  NamedContractDeploymentFuture,
  NamedLibraryDeploymentFuture,
  NamedStaticCallFuture,
} from "../../../../../src/new-api/types/module";
import { exampleAccounts, fakeArtifact } from "../../../helpers";

describe("buildInitializeMessageFor", () => {
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  const libraryAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  const basicStrategy = { name: "basic" } as any;

  let namedContractDeployment: NamedContractDeploymentFuture<string>;
  let anotherNamedContractDeployment: NamedContractDeploymentFuture<string>;
  let safeMathLibraryDeployment: NamedLibraryDeploymentFuture<string>;
  let artifactContractDeployment: ArtifactContractDeploymentFuture;
  let namedLibraryDeployment: NamedLibraryDeploymentFuture<string>;
  let artifactLibraryDeployment: ArtifactLibraryDeploymentFuture;
  let namedContractCall: NamedContractCallFuture<string, string>;
  let staticCall: NamedStaticCallFuture<string, string>;

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
        0n,
        exampleAccounts[0]
      );

    namedContractDeployment = new NamedContractDeploymentFutureImplementation(
      "MyModule:TestContract",
      fakeModule,
      "TestContract",
      [1n, "b", anotherNamedContractDeployment, { sub: "d" }],
      {
        SafeMath: safeMathLibraryDeployment,
      },
      10n,
      exampleAccounts[0]
    );

    // This is typically done by the deployment builder
    namedContractDeployment.dependencies.add(anotherNamedContractDeployment);
    namedContractDeployment.dependencies.add(safeMathLibraryDeployment);

    artifactContractDeployment =
      new ArtifactContractDeploymentFutureImplementation(
        "MyModule:ArtifactContract",
        fakeModule,
        "ArtifactContract",
        [1n, "b", anotherNamedContractDeployment, { sub: "d" }],
        fakeArtifact,
        {
          SafeMath: safeMathLibraryDeployment,
        },
        10n,
        exampleAccounts[0]
      );

    artifactContractDeployment.dependencies.add(anotherNamedContractDeployment);
    artifactContractDeployment.dependencies.add(safeMathLibraryDeployment);

    namedLibraryDeployment = new NamedLibraryDeploymentFutureImplementation(
      "MyModule:NamedLibrary",
      fakeModule,
      "NamedLibrary",
      {
        SafeMath: safeMathLibraryDeployment,
      },
      exampleAccounts[0]
    );

    namedLibraryDeployment.dependencies.add(safeMathLibraryDeployment);

    artifactLibraryDeployment =
      new ArtifactLibraryDeploymentFutureImplementation(
        "MyModule:ArtifactLibrary",
        fakeModule,
        "ArtifactLibrary",
        fakeArtifact,
        {
          SafeMath: safeMathLibraryDeployment,
        },
        exampleAccounts[0]
      );

    artifactLibraryDeployment.dependencies.add(safeMathLibraryDeployment);

    namedContractCall = new NamedContractCallFutureImplementation(
      "MyModule:Call",
      fakeModule,
      "test",
      anotherNamedContractDeployment,
      [1n, "b", safeMathLibraryDeployment, { sub: "d" }],
      0n,
      exampleAccounts[0]
    );

    namedContractCall.dependencies.add(anotherNamedContractDeployment);
    namedContractCall.dependencies.add(safeMathLibraryDeployment);

    staticCall = new NamedStaticCallFutureImplementation(
      "MyModule:StaticCall",
      fakeModule,
      "staticTest",
      anotherNamedContractDeployment,
      [BigInt(1), "b", safeMathLibraryDeployment, { sub: "d" }],
      exampleAccounts[0]
    );

    staticCall.dependencies.add(anotherNamedContractDeployment);
    staticCall.dependencies.add(safeMathLibraryDeployment);

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
          "MyModule:SafeMath",
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

    describe("artifact contract deployment", () => {
      beforeEach(() => {
        message = buildInitializeMessageFor(
          artifactContractDeployment,
          basicStrategy,
          exampleDeploymentState,
          {},
          exampleAccounts
        ) as DeploymentExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:ArtifactContract",
          futureType: FutureType.ARTIFACT_CONTRACT_DEPLOYMENT,
          strategy: "basic",
          dependencies: ["MyModule:AnotherContract", "MyModule:SafeMath"],
          artifactFutureId: "MyModule:ArtifactContract",
          constructorArgs: [
            1n,
            "b",
            differentAddress,
            {
              sub: "d",
            },
          ],
          contractName: "ArtifactContract",
          libraries: {
            SafeMath: libraryAddress,
          },
          value: 10n,
          from: exampleAccounts[0],
        });
      });
    });

    describe("named library deployment", () => {
      beforeEach(() => {
        message = buildInitializeMessageFor(
          namedLibraryDeployment,
          basicStrategy,
          exampleDeploymentState,
          {},
          exampleAccounts
        ) as DeploymentExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:NamedLibrary",
          futureType: FutureType.NAMED_LIBRARY_DEPLOYMENT,
          strategy: "basic",
          dependencies: ["MyModule:SafeMath"],
          artifactFutureId: "MyModule:NamedLibrary",
          constructorArgs: [],
          contractName: "NamedLibrary",
          libraries: {
            SafeMath: libraryAddress,
          },
          value: 0n,
          from: exampleAccounts[0],
        });
      });
    });

    describe("artifact library deployment", () => {
      beforeEach(() => {
        message = buildInitializeMessageFor(
          artifactLibraryDeployment,
          basicStrategy,
          exampleDeploymentState,
          {},
          exampleAccounts
        ) as DeploymentExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:ArtifactLibrary",
          futureType: FutureType.ARTIFACT_LIBRARY_DEPLOYMENT,
          strategy: "basic",
          dependencies: ["MyModule:SafeMath"],
          artifactFutureId: "MyModule:ArtifactLibrary",
          constructorArgs: [],
          contractName: "ArtifactLibrary",
          libraries: {
            SafeMath: libraryAddress,
          },
          value: 0n,
          from: exampleAccounts[0],
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

  describe("contract call state", () => {
    let message: CallExecutionStateInitializeMessage;

    describe("named library", () => {
      beforeEach(() => {
        message = buildInitializeMessageFor(
          namedContractCall,
          basicStrategy,
          exampleDeploymentState,
          {},
          exampleAccounts
        ) as CallExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:Call",
          strategy: "basic",
          dependencies: ["MyModule:AnotherContract", "MyModule:SafeMath"],
          artifactFutureId: "MyModule:AnotherContract",
          contractAddress: differentAddress,
          functionName: "test",
          args: [1n, "b", libraryAddress, { sub: "d" }],
          value: 0n,
          from: exampleAccounts[0],
        });
      });
    });
  });

  describe("static call state", () => {
    let message: StaticCallExecutionStateInitializeMessage;

    describe("named library", () => {
      beforeEach(() => {
        message = buildInitializeMessageFor(
          staticCall,
          basicStrategy,
          exampleDeploymentState,
          {},
          exampleAccounts
        ) as StaticCallExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:StaticCall",
          strategy: "basic",
          dependencies: ["MyModule:AnotherContract", "MyModule:SafeMath"],
          artifactFutureId: "MyModule:AnotherContract",
          contractAddress: differentAddress,
          functionName: "staticTest",
          args: [1n, "b", libraryAddress, { sub: "d" }],
          from: exampleAccounts[0],
        });
      });
    });
  });
});
