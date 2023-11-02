import { ethers } from "ethers";

import { EIP1193Provider } from "../../types/provider";
import { assertIgnitionInvariant } from "../utils/assertions";

import {
  decodeArtifactCustomError,
  decodeArtifactFunctionCallResult,
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
  executeOnchainInteractionRequest,
  executeStaticCallRequest,
  getEventArgumentFromReceipt,
  getStaticCallExecutionStateResultValue,
} from "./execution-strategy-helpers";
import { sendTransactionForOnchainInteraction } from "./future-processor/helpers/network-interaction-execution";
import { EIP1193JsonRpcClient } from "./jsonrpc-client";
import { createxArtifact } from "./strategy/createx-artifact";
import { ExecutionResultType } from "./types/execution-result";
import {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "./types/execution-state";
import {
  CallStrategyGenerator,
  DeploymentStrategyGenerator,
  ExecutionStrategy,
  LoadArtifactFunction,
  OnchainInteractionResponseType,
  SendDataStrategyGenerator,
  StaticCallStrategyGenerator,
} from "./types/execution-strategy";
import {
  NetworkInteractionType,
  OnchainInteraction,
} from "./types/network-interaction";

const _existingDeployedAddresses: { [key: number]: string } = {
  11155111: "0xE398fcc3f8aBa19CAA6687B9eF7473673A12E6E0", // not the official version
  31337: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // assumes deployed from HH account 0
};

/**
 * The most basic execution strategy, which sends a single transaction
 * for each deployment, call, and send data, and a single static call
 * per static call execution.
 */
export class Create2ExecutionStrategy implements ExecutionStrategy {
  public readonly name: string = "create2";
  private _createXAddress: string =
    "0xE398fcc3f8aBa19CAA6687B9eF7473673A12E6E0";

  constructor(
    private readonly _provider: EIP1193Provider,
    private readonly _accounts: string[],
    private readonly _loadArtifact: LoadArtifactFunction
  ) {}

  public async init(): Promise<void> {
    const client = new EIP1193JsonRpcClient(this._provider);
    const chainId = await client.getChainId();

    const existingDeployedAddress = _existingDeployedAddresses[chainId];

    // if there is an existing deployment, nothing more needs done
    if (existingDeployedAddress !== undefined) {
      const result = await this._provider.request({
        method: "eth_getCode",
        params: [existingDeployedAddress],
      });

      assertIgnitionInvariant(
        chainId === 31337 || result !== "0x",
        "CreateX not deployed at expected address"
      );

      if (result !== "0x") {
        this._createXAddress = existingDeployedAddress;

        return;
      }
    }

    // No createX factory found, deploy one
    const defaultAccount = this._accounts.at(0);

    assertIgnitionInvariant(defaultAccount !== undefined, "No accounts found");

    const nextNonce = await client.getTransactionCount(
      defaultAccount,
      "pending"
    );

    const onchainInteraction: OnchainInteraction = {
      id: 1,
      type: NetworkInteractionType.ONCHAIN_INTERACTION,
      to: undefined,
      data: createxArtifact.bytecode,
      value: 0n,
      transactions: [],
      shouldBeResent: false,
    };

    const sendResult = await sendTransactionForOnchainInteraction(
      client,
      defaultAccount,
      onchainInteraction,
      async (_sender: string) => {
        return nextNonce;
      },
      // HACK: assuming no decode is required
      async () => undefined
    );

    assertIgnitionInvariant(
      sendResult.type === "TRANSACTION",
      "CreateX deployment failed"
    );

    while (true) {
      const receipt = await client.getTransactionReceipt(
        sendResult.transaction.hash
      );

      if (receipt !== undefined) {
        assertIgnitionInvariant(
          receipt?.contractAddress !== undefined,
          "CreateX deployment should have an address"
        );

        this._createXAddress = receipt.contractAddress;
        break;
      }

      await new Promise((res) => setTimeout(res, 200));
    }
  }

  public async *executeDeployment(
    executionState: DeploymentExecutionState
  ): DeploymentStrategyGenerator {
    const artifact = await this._loadArtifact(executionState.artifactId);
    const salt = ethers.id("test");

    const bytecodeToDeploy = encodeArtifactDeploymentData(
      artifact,
      executionState.constructorArgs,
      executionState.libraries
    );

    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: this._createXAddress,
        data: encodeArtifactFunctionCall(
          createxArtifact,
          "deployCreate2(bytes32,bytes)",
          [salt, bytecodeToDeploy]
        ),
        value: executionState.value,
      },

      (returnData) =>
        decodeArtifactFunctionCallResult(
          createxArtifact,
          "deployCreate2(bytes32,bytes)",
          returnData
        ),
      (returnData) => decodeArtifactCustomError(createxArtifact, returnData)
    );

    if (
      transactionOrResult.type !==
      OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION
    ) {
      return transactionOrResult;
    }

    const deployedAddress = getEventArgumentFromReceipt(
      transactionOrResult.transaction.receipt,
      createxArtifact,
      this._createXAddress,
      "ContractCreation",
      0,
      "newContract"
    );

    assertIgnitionInvariant(
      typeof deployedAddress === "string",
      "Deployed event should return a string addr property"
    );

    return {
      type: ExecutionResultType.SUCCESS,
      address: deployedAddress,
    };
  }

  public async *executeCall(
    executionState: CallExecutionState
  ): CallStrategyGenerator {
    const artifact = await this._loadArtifact(executionState.artifactId);

    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: executionState.contractAddress,
        data: encodeArtifactFunctionCall(
          artifact,
          executionState.functionName,
          executionState.args
        ),
        value: executionState.value,
      },

      (returnData) =>
        decodeArtifactFunctionCallResult(
          artifact,
          executionState.functionName,
          returnData
        ),
      (returnData) => decodeArtifactCustomError(artifact, returnData)
    );

    if (
      transactionOrResult.type !==
      OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION
    ) {
      return transactionOrResult;
    }

    return {
      type: ExecutionResultType.SUCCESS,
    };
  }

  public async *executeSendData(
    executionState: SendDataExecutionState
  ): SendDataStrategyGenerator {
    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: executionState.to,
        data: executionState.data,
        value: executionState.value,
      }
    );

    if (
      transactionOrResult.type !==
      OnchainInteractionResponseType.SUCCESSFUL_TRANSACTION
    ) {
      return transactionOrResult;
    }

    return {
      type: ExecutionResultType.SUCCESS,
    };
  }

  public async *executeStaticCall(
    executionState: StaticCallExecutionState
  ): StaticCallStrategyGenerator {
    const artifact = await this._loadArtifact(executionState.artifactId);

    const decodedResultOrError = yield* executeStaticCallRequest(
      {
        id: 1,
        type: NetworkInteractionType.STATIC_CALL,
        to: executionState.contractAddress,
        from: executionState.from,
        data: encodeArtifactFunctionCall(
          artifact,
          executionState.functionName,
          executionState.args
        ),
        value: 0n,
      },
      (returnData) =>
        decodeArtifactFunctionCallResult(
          artifact,
          executionState.functionName,
          returnData
        ),
      (returnData) => decodeArtifactCustomError(artifact, returnData)
    );

    if (decodedResultOrError.type === ExecutionResultType.STATIC_CALL_ERROR) {
      return decodedResultOrError;
    }

    return {
      type: ExecutionResultType.SUCCESS,
      value: getStaticCallExecutionStateResultValue(
        executionState,
        decodedResultOrError
      ),
    };
  }
}
