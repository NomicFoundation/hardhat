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
import { EIP1193JsonRpcClient } from "./jsonrpc-client";
import { createxArtifact, presignedTx } from "./strategy/createx-artifact";
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
import { NetworkInteractionType } from "./types/network-interaction";

// v0.1.0
const CREATE_X_ADDRESS = "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed";

const _existingDeployedAddresses: { [key: number]: string } = {
  1: CREATE_X_ADDRESS,
  10: CREATE_X_ADDRESS,
  25: CREATE_X_ADDRESS,
  42: CREATE_X_ADDRESS,
  56: CREATE_X_ADDRESS,
  97: CREATE_X_ADDRESS,
  100: CREATE_X_ADDRESS,
  122: CREATE_X_ADDRESS,
  123: CREATE_X_ADDRESS,
  137: CREATE_X_ADDRESS,
  169: CREATE_X_ADDRESS,
  250: CREATE_X_ADDRESS,
  288: CREATE_X_ADDRESS,
  314: CREATE_X_ADDRESS,
  338: CREATE_X_ADDRESS,
  999: CREATE_X_ADDRESS,
  1101: CREATE_X_ADDRESS,
  1284: CREATE_X_ADDRESS,
  1285: CREATE_X_ADDRESS,
  1287: CREATE_X_ADDRESS,
  1442: CREATE_X_ADDRESS,
  2888: CREATE_X_ADDRESS,
  4002: CREATE_X_ADDRESS,
  4201: CREATE_X_ADDRESS,
  5000: CREATE_X_ADDRESS,
  5001: CREATE_X_ADDRESS,
  7700: CREATE_X_ADDRESS,
  7701: CREATE_X_ADDRESS,
  8453: CREATE_X_ADDRESS,
  9000: CREATE_X_ADDRESS,
  9001: CREATE_X_ADDRESS,
  10200: CREATE_X_ADDRESS,
  17000: CREATE_X_ADDRESS,
  42161: CREATE_X_ADDRESS,
  42170: CREATE_X_ADDRESS,
  42220: CREATE_X_ADDRESS,
  43113: CREATE_X_ADDRESS,
  43114: CREATE_X_ADDRESS,
  44787: CREATE_X_ADDRESS,
  59140: CREATE_X_ADDRESS,
  59144: CREATE_X_ADDRESS,
  80001: CREATE_X_ADDRESS,
  84532: CREATE_X_ADDRESS,
  314159: CREATE_X_ADDRESS,
  421614: CREATE_X_ADDRESS,
  534351: CREATE_X_ADDRESS,
  534352: CREATE_X_ADDRESS,
  3441005: CREATE_X_ADDRESS,
  7777777: CREATE_X_ADDRESS,
  11155111: CREATE_X_ADDRESS,
  11155420: CREATE_X_ADDRESS,
  68840142: CREATE_X_ADDRESS,
  1313161554: CREATE_X_ADDRESS,
  1313161555: CREATE_X_ADDRESS,
  1666600000: CREATE_X_ADDRESS,
  1666700000: CREATE_X_ADDRESS,
};

/**
 * The most basic execution strategy, which sends a single transaction
 * for each deployment, call, and send data, and a single static call
 * per static call execution.
 */
export class Create2ExecutionStrategy implements ExecutionStrategy {
  public readonly name: string = "create2";
  private _createXAddress: string = CREATE_X_ADDRESS;

  constructor(
    private readonly _provider: EIP1193Provider,
    private readonly _loadArtifact: LoadArtifactFunction
  ) {}

  public async init(): Promise<void> {
    const client = new EIP1193JsonRpcClient(this._provider);
    const chainId = await client.getChainId();

    const existingDeployedAddress = _existingDeployedAddresses[chainId];

    // if there is an existing deployment, nothing more needs done
    if (existingDeployedAddress !== undefined) {
      this._createXAddress = existingDeployedAddress;

      return;
    } else if (chainId === 31337) {
      // No createX factory found because we're on a local hardhat node
      // deploy one using presigned tx from CreateX
      await this._provider.request({
        method: "hardhat_setBalance",
        params: [
          "0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5",
          "0x58D15E176280000",
        ],
      });

      const txHash = (await this._provider.request({
        method: "eth_sendRawTransaction",
        params: [presignedTx],
      })) as string;

      assertIgnitionInvariant(txHash !== "0x", "CreateX deployment failed");

      while (true) {
        const receipt = await client.getTransactionReceipt(txHash);

        if (receipt !== undefined) {
          assertIgnitionInvariant(
            receipt?.contractAddress !== undefined,
            "CreateX deployment should have an address"
          );

          this._createXAddress = receipt.contractAddress;
          return;
        }

        await new Promise((res) => setTimeout(res, 200));
      }
    } else {
      // No createX factory found, but we're not on a local chain
      // check if someone else has deployed CreateX on this chain
      const result = await this._provider.request({
        method: "eth_getCode",
        params: [existingDeployedAddress],
      });

      assertIgnitionInvariant(
        result !== "0x",
        "CreateX not deployed on current network"
      );

      this._createXAddress = existingDeployedAddress;

      return;
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
