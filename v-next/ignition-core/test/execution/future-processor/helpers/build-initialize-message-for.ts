import { assert } from "chai";

import type { DeploymentLoader } from "../../../../src/internal/deployment-loader/types.js";
import { buildInitializeMessageFor } from "../../../../src/internal/execution/future-processor/helpers/build-initialize-message-for.js";
import { deploymentStateReducer } from "../../../../src/internal/execution/reducers/deployment-state-reducer.js";
import type { DeploymentState } from "../../../../src/internal/execution/types/deployment-state.js";
import { ExecutionResultType } from "../../../../src/internal/execution/types/execution-result.js";
import {
  type ContractAtExecutionState,
  type DeploymentExecutionState,
  ExecutionSateType,
  type ReadEventArgumentExecutionState,
  type StaticCallExecutionState,
} from "../../../../src/internal/execution/types/execution-state.js";
import {
  type Transaction,
  TransactionReceiptStatus,
} from "../../../../src/internal/execution/types/jsonrpc.js";
import {
  type CallExecutionStateInitializeMessage,
  type ContractAtExecutionStateInitializeMessage,
  type DeploymentExecutionStateInitializeMessage,
  type EncodeFunctionCallExecutionStateInitializeMessage,
  JournalMessageType,
  type ReadEventArgExecutionStateInitializeMessage,
  type SendDataExecutionStateInitializeMessage,
  type StaticCallExecutionStateInitializeMessage,
} from "../../../../src/internal/execution/types/messages.js";
import {
  NetworkInteractionType,
  type OnchainInteraction,
} from "../../../../src/internal/execution/types/network-interaction.js";
import { getDefaultSender } from "../../../../src/internal/execution/utils/get-default-sender.js";
import { MemoryJournal } from "../../../../src/internal/journal/memory-journal.js";
import {
  AccountRuntimeValueImplementation,
  ArtifactContractAtFutureImplementation,
  ArtifactContractDeploymentFutureImplementation,
  ArtifactLibraryDeploymentFutureImplementation,
  ModuleParameterRuntimeValueImplementation,
  NamedContractAtFutureImplementation,
  NamedContractCallFutureImplementation,
  NamedContractDeploymentFutureImplementation,
  NamedEncodeFunctionCallFutureImplementation,
  NamedLibraryDeploymentFutureImplementation,
  NamedStaticCallFutureImplementation,
  ReadEventArgumentFutureImplementation,
  SendDataFutureImplementation,
} from "../../../../src/internal/module.js";
import {
  type ContractAtFuture,
  type ContractCallFuture,
  type ContractDeploymentFuture,
  type EncodeFunctionCallFuture,
  FutureType,
  type LibraryDeploymentFuture,
  type NamedArtifactContractAtFuture,
  type NamedArtifactContractDeploymentFuture,
  type NamedArtifactLibraryDeploymentFuture,
  type ReadEventArgumentFuture,
  type SendDataFuture,
  type StaticCallFuture,
} from "../../../../src/types/module.js";
import {
  exampleAccounts,
  fakeArtifact,
  setupMockDeploymentLoader,
} from "../../../helpers.js";

describe("buildInitializeMessageFor", () => {
  const differentAddress = "0xBA12222222228d8Ba445958a75a0704d566BF2C8";
  const libraryAddress = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";
  const basicStrategy = { name: "basic", config: {} } as any;

  let namedContractDeployment: NamedArtifactContractDeploymentFuture<string>;
  let anotherNamedContractDeployment: NamedArtifactContractDeploymentFuture<string>;
  let safeMathLibraryDeployment: NamedArtifactLibraryDeploymentFuture<string>;
  let artifactContractDeployment: ContractDeploymentFuture;
  let namedLibraryDeployment: NamedArtifactLibraryDeploymentFuture<string>;
  let artifactLibraryDeployment: LibraryDeploymentFuture;
  let namedContractCall: ContractCallFuture<string, string>;
  let staticCall: StaticCallFuture<string, string>;
  let encodedCall: EncodeFunctionCallFuture<string, string>;
  let namedContractAt: NamedArtifactContractAtFuture<string>;
  let artifactContractAt: ContractAtFuture;
  let readEventArgument: ReadEventArgumentFuture;
  let sendData: SendDataFuture;

  let exampleDeploymentState: DeploymentState;
  let mockDeploymentLoader: DeploymentLoader;

  beforeEach(async () => {
    const fakeModule = {} as any;

    mockDeploymentLoader = setupMockDeploymentLoader(new MemoryJournal());

    safeMathLibraryDeployment = new NamedLibraryDeploymentFutureImplementation(
      "MyModule:SafeMath",
      fakeModule,
      "SafeMath",
      {},
      exampleAccounts[0],
    );

    anotherNamedContractDeployment =
      new NamedContractDeploymentFutureImplementation(
        "MyModule:AnotherContract",
        {} as any,
        fakeModule,
        [],
        {},
        0n,
        exampleAccounts[0],
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
      exampleAccounts[0],
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
        exampleAccounts[0],
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
      exampleAccounts[0],
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
        exampleAccounts[0],
      );

    artifactLibraryDeployment.dependencies.add(safeMathLibraryDeployment);

    namedContractCall = new NamedContractCallFutureImplementation(
      "MyModule:Call",
      fakeModule,
      "test",
      anotherNamedContractDeployment,
      [1n, "b", safeMathLibraryDeployment, { sub: "d" }],
      0n,
      exampleAccounts[0],
    );

    namedContractCall.dependencies.add(anotherNamedContractDeployment);
    namedContractCall.dependencies.add(safeMathLibraryDeployment);

    staticCall = new NamedStaticCallFutureImplementation(
      "MyModule:StaticCall",
      fakeModule,
      "staticTest",
      anotherNamedContractDeployment,
      [BigInt(1), "b", safeMathLibraryDeployment, { sub: "d" }],
      0,
      exampleAccounts[0],
    );

    staticCall.dependencies.add(anotherNamedContractDeployment);
    staticCall.dependencies.add(safeMathLibraryDeployment);

    encodedCall = new NamedEncodeFunctionCallFutureImplementation(
      "MyModule:EncodeFunctionCall",
      fakeModule,
      "test",
      anotherNamedContractDeployment,
      [1n, "b", safeMathLibraryDeployment, { sub: "d" }],
    );

    encodedCall.dependencies.add(anotherNamedContractDeployment);
    encodedCall.dependencies.add(safeMathLibraryDeployment);

    namedContractAt = new NamedContractAtFutureImplementation(
      "MyModule:NamedContractAt",
      fakeModule,
      "NamedContractAt",
      differentAddress,
    );

    artifactContractAt = new ArtifactContractAtFutureImplementation(
      "MyModule:ArtifactContractAt",
      fakeModule,
      "ArtifactContractAt",
      differentAddress,
      fakeArtifact,
    );

    readEventArgument = new ReadEventArgumentFutureImplementation(
      "MyModule:ReadEventArg",
      fakeModule,
      anotherNamedContractDeployment,
      "event1",
      "arg1",
      anotherNamedContractDeployment,
      0,
    );

    await mockDeploymentLoader.storeNamedArtifact(
      "MyModule:AnotherContract",
      "AnotherContract",
      {
        ...fakeArtifact,
        contractName: "AnotherContract",
        abi: [
          {
            type: "event",
            name: "event1",
            anonymous: false,
            inputs: [
              {
                name: "arg1",
                type: "uint256",
                internalType: "uint256",
                indexed: false,
              },
            ],
          },
          {
            type: "function",
            name: "test",
            inputs: [
              {
                name: "a",
                type: "uint256",
              },
              {
                name: "b",
                type: "string",
              },
              {
                name: "c",
                type: "address",
              },
              {
                name: "d",
                type: "tuple",
                components: [
                  {
                    name: "sub",
                    type: "string",
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    sendData = new SendDataFutureImplementation(
      "MyModule:SendData",
      fakeModule,
      exampleAccounts[4],
      2n,
      "fake-data",
      exampleAccounts[3],
    );

    exampleDeploymentState = deploymentStateReducer(undefined as any);

    const exampleConfirmedTransaction: Transaction = {
      hash: "0x1234",
      fees: {
        maxPriorityFeePerGas: 10n,
        maxFeePerGas: 100n,
      },
      receipt: {
        blockHash: "0xblock",
        blockNumber: 0,
        contractAddress: differentAddress,
        status: TransactionReceiptStatus.SUCCESS,
        logs: [
          {
            address: differentAddress,
            logIndex: 0,
            // encoded 1000000000000000000n
            data: "0x0000000000000000000000000000000000000000000000000de0b6b3a7640000",
            topics: [
              "0x84e603adc6c5752ecafe165459551af7ba28bb2e6a2bfacc9ccb8f0ae12c76e6", // matches event1
            ],
          },
        ],
      },
    };

    const exampleOnchainInteraction: OnchainInteraction = {
      id: 1,
      type: NetworkInteractionType.ONCHAIN_INTERACTION,
      to: undefined,
      data: "0x",
      value: 0n,
      nonce: 1,
      transactions: [exampleConfirmedTransaction],
      shouldBeResent: false,
    };

    const safeMathExState: Partial<DeploymentExecutionState> = {
      type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
      futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
      result: {
        type: ExecutionResultType.SUCCESS,
        address: libraryAddress,
      },
    };

    exampleDeploymentState.executionStates["MyModule:SafeMath"] =
      safeMathExState as any;

    const anotherContractExState: Partial<DeploymentExecutionState> = {
      type: ExecutionSateType.DEPLOYMENT_EXECUTION_STATE,
      networkInteractions: [exampleOnchainInteraction],
      result: {
        type: ExecutionResultType.SUCCESS,
        address: differentAddress,
      },
    };

    exampleDeploymentState.executionStates["MyModule:AnotherContract"] =
      anotherContractExState as any;
  });

  describe("deployment state", () => {
    let message: DeploymentExecutionStateInitializeMessage;

    describe("named contract deployment", () => {
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          namedContractDeployment,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.equal(
          message.type,
          JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
        );
      });

      it("should record the strategy name", () => {
        assert.equal(message.strategy, "basic");
      });

      it("should record the strategy config", () => {
        assert.deepEqual(message.strategyConfig, {});
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
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          artifactContractDeployment,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:ArtifactContract",
          futureType: FutureType.CONTRACT_DEPLOYMENT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: ["MyModule:AnotherContract", "MyModule:SafeMath"],
          artifactId: "MyModule:ArtifactContract",
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
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          namedLibraryDeployment,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:NamedLibrary",
          futureType: FutureType.NAMED_ARTIFACT_LIBRARY_DEPLOYMENT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: ["MyModule:SafeMath"],
          artifactId: "MyModule:NamedLibrary",
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
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          artifactLibraryDeployment,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should build an initialize message for a deployment", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.DEPLOYMENT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:ArtifactLibrary",
          futureType: FutureType.LIBRARY_DEPLOYMENT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: ["MyModule:SafeMath"],
          artifactId: "MyModule:ArtifactLibrary",
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
      beforeEach(async () => {
        namedContractDeployment.value =
          new ModuleParameterRuntimeValueImplementation<bigint>(
            "MyModule",
            "passedValue",
            undefined,
          );

        message = (await buildInitializeMessageFor(
          namedContractDeployment,
          exampleDeploymentState,
          basicStrategy,
          {
            MyModule: {
              passedValue: BigInt(99),
            },
          },
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should record the value", async () => {
        assert.deepStrictEqual(message.value, BigInt(99));
      });
    });

    describe("resolves value when module parameter is a global parameter", () => {
      beforeEach(async () => {
        namedContractDeployment.value =
          new ModuleParameterRuntimeValueImplementation<bigint>(
            "MyModule",
            "passedValue",
            undefined,
          );

        message = (await buildInitializeMessageFor(
          namedContractDeployment,
          exampleDeploymentState,
          basicStrategy,
          {
            $global: {
              passedValue: BigInt(99),
            },
          },
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should record the value", async () => {
        assert.deepStrictEqual(message.value, BigInt(99));
      });
    });

    describe("resolves to default value for module parameter when no deployment parameters have been given", () => {
      const expectedDefaultValue = BigInt(100);

      beforeEach(async () => {
        namedContractDeployment.value =
          new ModuleParameterRuntimeValueImplementation<bigint>(
            "MyModule",
            "passedValue",
            expectedDefaultValue,
          );

        const deploymentParameters = undefined as any;

        message = (await buildInitializeMessageFor(
          namedContractDeployment,
          exampleDeploymentState,
          basicStrategy,
          deploymentParameters,
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should record the default value", async () => {
        assert.deepStrictEqual(message.value, expectedDefaultValue);
      });
    });

    describe("resolves from when runtime account used", () => {
      beforeEach(async () => {
        namedContractDeployment.from = new AccountRuntimeValueImplementation(1);

        message = (await buildInitializeMessageFor(
          namedContractDeployment,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should record the value", async () => {
        assert.deepStrictEqual(message.from, exampleAccounts[1]);
      });
    });

    describe("When the from is undefined", () => {
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          namedContractDeployment,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as DeploymentExecutionStateInitializeMessage;
      });

      it("should record the default sender", async () => {
        assert.deepStrictEqual(message.from, getDefaultSender(exampleAccounts));
      });
    });
  });

  describe("contract call state", () => {
    let message: CallExecutionStateInitializeMessage;

    describe("named library", () => {
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          namedContractCall,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as CallExecutionStateInitializeMessage;
      });

      it("should build an initialize message", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.CALL_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:Call",
          strategy: "basic",
          strategyConfig: {},
          dependencies: ["MyModule:AnotherContract", "MyModule:SafeMath"],
          artifactId: "MyModule:AnotherContract",
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
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          staticCall,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as StaticCallExecutionStateInitializeMessage;
      });

      it("should build an initialize message", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.STATIC_CALL_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:StaticCall",
          strategy: "basic",
          strategyConfig: {},
          dependencies: ["MyModule:AnotherContract", "MyModule:SafeMath"],
          artifactId: "MyModule:AnotherContract",
          contractAddress: differentAddress,
          functionName: "staticTest",
          args: [1n, "b", libraryAddress, { sub: "d" }],
          nameOrIndex: 0,
          from: exampleAccounts[0],
        });
      });
    });
  });

  describe("encode function call state", () => {
    let message: EncodeFunctionCallExecutionStateInitializeMessage;

    beforeEach(async () => {
      message = (await buildInitializeMessageFor(
        encodedCall,
        exampleDeploymentState,
        basicStrategy,
        {},
        mockDeploymentLoader,
        exampleAccounts,
        getDefaultSender(exampleAccounts),
      )) as EncodeFunctionCallExecutionStateInitializeMessage;
    });

    it("should build an initialize message", async () => {
      assert.deepStrictEqual(message, {
        type: JournalMessageType.ENCODE_FUNCTION_CALL_EXECUTION_STATE_INITIALIZE,
        futureId: "MyModule:EncodeFunctionCall",
        strategy: "basic",
        strategyConfig: {},
        dependencies: ["MyModule:AnotherContract", "MyModule:SafeMath"],
        artifactId: "MyModule:AnotherContract",
        functionName: "test",
        args: [1n, "b", libraryAddress, { sub: "d" }],
        result:
          "0xd40c6f1500000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000080000000000000000000000000742d35cc6634c0532925a3b844bc454e4438f44e00000000000000000000000000000000000000000000000000000000000000c000000000000000000000000000000000000000000000000000000000000000016200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000016400000000000000000000000000000000000000000000000000000000000000",
      });
    });
  });

  describe("contract at state", () => {
    let message: ContractAtExecutionStateInitializeMessage;

    describe("named contract at", () => {
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          namedContractAt,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as ContractAtExecutionStateInitializeMessage;
      });

      it("should build an initialize message", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:NamedContractAt",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_AT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: [],
          artifactId: "MyModule:NamedContractAt",
          contractAddress: differentAddress,
          contractName: "NamedContractAt",
        });
      });
    });

    describe("artifact contract at", () => {
      beforeEach(async () => {
        message = (await buildInitializeMessageFor(
          artifactContractAt,
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        )) as ContractAtExecutionStateInitializeMessage;
      });

      it("should build an initialize message", async () => {
        assert.deepStrictEqual(message, {
          type: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:ArtifactContractAt",
          futureType: FutureType.CONTRACT_AT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: [],
          artifactId: "MyModule:ArtifactContractAt",
          contractAddress: differentAddress,
          contractName: "ArtifactContractAt",
        });
      });
    });

    describe("resolving address from module param", () => {
      it("should work based on the passed in deployment parameter", async () => {
        const m = await buildInitializeMessageFor(
          new NamedContractAtFutureImplementation(
            "MyModule:NamedContractAt",
            {} as any,
            "ArtifactContractAt",
            new ModuleParameterRuntimeValueImplementation<string>(
              "MyModule",
              "diffAddress",
              undefined,
            ),
          ),
          exampleDeploymentState,
          basicStrategy,
          {
            MyModule: {
              diffAddress: differentAddress,
            },
          },
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        );

        assert.deepStrictEqual(m, {
          type: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:NamedContractAt",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_AT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: [],
          artifactId: "MyModule:NamedContractAt",
          contractAddress: differentAddress,
          contractName: "ArtifactContractAt",
        });
      });
    });

    describe("resolving address from a deployment future", () => {
      it("should work based on the address of the deployed future", async () => {
        const m = await buildInitializeMessageFor(
          new NamedContractAtFutureImplementation(
            "MyModule:NamedContractAt",
            {} as any,
            "NamedContractAt",
            anotherNamedContractDeployment,
          ),
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        );

        assert.deepStrictEqual(m, {
          type: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:NamedContractAt",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_AT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: [],
          artifactId: "MyModule:NamedContractAt",
          contractAddress: differentAddress,
          contractName: "NamedContractAt",
        });
      });
    });

    describe("resolving address from another contractAt", () => {
      beforeEach(() => {
        const namedContractAtExState: Partial<ContractAtExecutionState> = {
          type: ExecutionSateType.CONTRACT_AT_EXECUTION_STATE,
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_AT,
          contractAddress: differentAddress,
        };

        exampleDeploymentState = {
          ...exampleDeploymentState,
          executionStates: {
            ...exampleDeploymentState.executionStates,
            ["MyModule:NamedContractAt"]: namedContractAtExState as any,
          },
        };
      });

      it("should work based on the address of the deployed future", async () => {
        const m = await buildInitializeMessageFor(
          new NamedContractAtFutureImplementation(
            "MyModule:SecondNamedContractAt",
            {} as any,
            "SecondNamedContractAt",
            namedContractAt,
          ),
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        );

        assert.deepStrictEqual(m, {
          type: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:SecondNamedContractAt",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_AT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: [],
          artifactId: "MyModule:SecondNamedContractAt",
          contractAddress: differentAddress,
          contractName: "SecondNamedContractAt",
        });
      });
    });

    describe("resolving address from read event argument future", () => {
      beforeEach(() => {
        const readEventArgExState: Partial<ReadEventArgumentExecutionState> = {
          type: ExecutionSateType.READ_EVENT_ARGUMENT_EXECUTION_STATE,
          result: differentAddress,
        };

        exampleDeploymentState = {
          ...exampleDeploymentState,
          executionStates: {
            ...exampleDeploymentState.executionStates,
            ["MyModule:ReadEventArg"]: readEventArgExState as any,
          },
        };
      });

      it("should work based on the arg result", async () => {
        const m = await buildInitializeMessageFor(
          new NamedContractAtFutureImplementation(
            "MyModule:NamedContractAt",
            {} as any,
            "NamedContractAt",
            readEventArgument,
          ),
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        );

        assert.deepStrictEqual(m, {
          type: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:NamedContractAt",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_AT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: [],
          artifactId: "MyModule:NamedContractAt",
          contractName: "NamedContractAt",
          contractAddress: differentAddress,
        });
      });
    });

    describe("resolving address from static call", () => {
      beforeEach(() => {
        const staticCallExState: Partial<StaticCallExecutionState> = {
          type: ExecutionSateType.STATIC_CALL_EXECUTION_STATE,
          result: {
            type: ExecutionResultType.SUCCESS,
            value: differentAddress,
          },
        };

        exampleDeploymentState = {
          ...exampleDeploymentState,
          executionStates: {
            ...exampleDeploymentState.executionStates,
            ["MyModule:StaticCall"]: staticCallExState as any,
          },
        };
      });

      it("should work based on the result of the static call", async () => {
        const m = await buildInitializeMessageFor(
          new NamedContractAtFutureImplementation(
            "MyModule:NamedContractAt",
            {} as any,
            "NamedContractAt",
            staticCall,
          ),
          exampleDeploymentState,
          basicStrategy,
          {},
          mockDeploymentLoader,
          exampleAccounts,
          getDefaultSender(exampleAccounts),
        );

        assert.deepStrictEqual(m, {
          type: JournalMessageType.CONTRACT_AT_EXECUTION_STATE_INITIALIZE,
          futureId: "MyModule:NamedContractAt",
          futureType: FutureType.NAMED_ARTIFACT_CONTRACT_AT,
          strategy: "basic",
          strategyConfig: {},
          dependencies: [],
          artifactId: "MyModule:NamedContractAt",
          contractName: "NamedContractAt",
          contractAddress: differentAddress,
        });
      });
    });
  });

  describe("read event argument state", () => {
    let message: ReadEventArgExecutionStateInitializeMessage;

    beforeEach(async () => {
      message = (await buildInitializeMessageFor(
        readEventArgument,
        exampleDeploymentState,
        basicStrategy,
        {},
        mockDeploymentLoader,
        exampleAccounts,
        getDefaultSender(exampleAccounts),
      )) as ReadEventArgExecutionStateInitializeMessage;
    });

    it("should build an initialize message", async () => {
      assert.deepStrictEqual(message, {
        type: JournalMessageType.READ_EVENT_ARGUMENT_EXECUTION_STATE_INITIALIZE,
        futureId: "MyModule:ReadEventArg",
        strategy: "basic",
        strategyConfig: {},
        dependencies: [],
        artifactId: "MyModule:AnotherContract",
        eventName: "event1",
        nameOrIndex: "arg1",
        txToReadFrom: "0x1234",
        emitterAddress: differentAddress,
        eventIndex: 0,
        result: 1000000000000000000n,
      });
    });
  });

  describe("send data state", () => {
    let message: SendDataExecutionStateInitializeMessage;

    beforeEach(async () => {
      message = (await buildInitializeMessageFor(
        sendData,
        exampleDeploymentState,
        basicStrategy,
        {},
        mockDeploymentLoader,
        exampleAccounts,
        getDefaultSender(exampleAccounts),
      )) as SendDataExecutionStateInitializeMessage;
    });

    it("should build an initialize message", async () => {
      assert.deepStrictEqual(message, {
        type: JournalMessageType.SEND_DATA_EXECUTION_STATE_INITIALIZE,
        futureId: "MyModule:SendData",
        strategy: "basic",
        strategyConfig: {},
        dependencies: [],
        to: exampleAccounts[4],
        data: "fake-data",
        from: exampleAccounts[3],
        value: 2n,
      });
    });
  });
});
