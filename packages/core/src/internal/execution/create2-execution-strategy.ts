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
const CREATE_X_DEPLOYED_BYTECODE_HASH =
  "0xbd8a7ea8cfca7b4e5f5041d7d4b17bc317c5ce42cfbc42066a00cf26b43eb53f";

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

    if (chainId === 31337) {
      await this._deployCreateXFactory(client);
    } else {
      // No createX factory found, but we're not on a local chain
      // check if someone else has deployed CreateX on this chain
      const result = await this._provider.request({
        method: "eth_getCode",
        params: [CREATE_X_ADDRESS],
      });

      assertIgnitionInvariant(
        typeof result === "string" && result !== "0x",
        "CreateX not deployed on current network"
      );

      assertIgnitionInvariant(
        ethers.keccak256(result) === CREATE_X_DEPLOYED_BYTECODE_HASH,
        "Deployed CreateX bytecode does not match expected bytecode"
      );

      this._createXAddress = CREATE_X_ADDRESS;

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

  private async _deployCreateXFactory(client: EIP1193JsonRpcClient) {
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

        assertIgnitionInvariant(
          receipt.contractAddress === CREATE_X_ADDRESS,
          `CreateX deployment should have the expected address ${CREATE_X_ADDRESS}, instead it is ${receipt.contractAddress}`
        );

        this._createXAddress = receipt.contractAddress;
        return;
      }

      await new Promise((res) => setTimeout(res, 200));
    }
  }
}
