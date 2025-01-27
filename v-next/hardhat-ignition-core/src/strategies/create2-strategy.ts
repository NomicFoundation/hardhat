import type { DeploymentLoader } from "../internal/deployment-loader/types";
import type { JsonRpcClient } from "../internal/execution/jsonrpc-client";
import type {
  CallExecutionState,
  DeploymentExecutionState,
  SendDataExecutionState,
  StaticCallExecutionState,
} from "../internal/execution/types/execution-state";
import type {
  CallStrategyGenerator,
  DeploymentStrategyGenerator,
  ExecutionStrategy,
  SendDataStrategyGenerator,
  StaticCallStrategyGenerator,
} from "../internal/execution/types/execution-strategy";

import { ethers } from "ethers";

import { NomicIgnitionPluginError } from "../errors";
import {
  decodeArtifactCustomError,
  decodeArtifactFunctionCallResult,
  encodeArtifactDeploymentData,
  encodeArtifactFunctionCall,
  executeOnchainInteractionRequest,
  executeStaticCallRequest,
  getEventArgumentFromReceipt,
  getStaticCallExecutionStateResultValue,
} from "../internal/execution/execution-strategy-helpers";
import {
  createxArtifact,
  presignedTx,
} from "../internal/execution/strategy/createx-artifact";
import { ExecutionResultType } from "../internal/execution/types/execution-result";
import { OnchainInteractionResponseType } from "../internal/execution/types/execution-strategy";
import { NetworkInteractionType } from "../internal/execution/types/network-interaction";
import { assertIgnitionInvariant } from "../internal/utils/assertions";

// v0.1.0
const CREATE_X_ADDRESS = "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed";
const CREATE_X_DEPLOYED_BYTECODE_HASH =
  "0xbd8a7ea8cfca7b4e5f5041d7d4b17bc317c5ce42cfbc42066a00cf26b43eb53f";
const CREATE_X_PRESIGNED_DEPLOYER_ADDRESS =
  "0xeD456e05CaAb11d66C4c797dD6c1D6f9A7F352b5";

/**
 * The create2 strategy extends the basic strategy, for deployment it replaces
 * a deployment transaction with a call to the CreateX factory contract
 * with a user provided salt.
 *
 * If deploying to the local Hardhat node, the CreateX factory will be
 * deployed if it does not exist. If the CreateX factory is not currently
 * available on the remote network, an error will be thrown halting the
 * deployment.
 *
 * Futures that perform calls or send data remain single transactions, and
 * static calls remain a single static call.
 *
 * The strategy requires a salt is provided in the Hardhat config. The same
 * salt will be used for all calls to CreateX.
 *
 * @example
 * {
 *   ...,
 *   ignition: {
 *     strategyConfig: {
 *       create2: {
 *         salt: "my-salt"
 *       }
 *     }
 *   },
 *   ...
 * }
 *
 * @beta
 */
export class Create2Strategy implements ExecutionStrategy {
  public readonly name: string = "create2";
  public readonly config: { salt: string };

  private _deploymentLoader: DeploymentLoader | undefined;
  private _jsonRpcClient: JsonRpcClient | undefined;

  constructor(config: { salt: string }) {
    this.config = config;
  }

  public async init(
    deploymentLoader: DeploymentLoader,
    jsonRpcClient: JsonRpcClient,
  ): Promise<void> {
    this._deploymentLoader = deploymentLoader;
    this._jsonRpcClient = jsonRpcClient;

    // Check if CreateX is deployed on the current network
    const result = await this._jsonRpcClient.getCode(CREATE_X_ADDRESS);

    // If CreateX factory is deployed (and bytecode matches) then nothing to do
    if (result !== "0x") {
      assertIgnitionInvariant(
        ethers.keccak256(result) === CREATE_X_DEPLOYED_BYTECODE_HASH,
        "Deployed CreateX bytecode does not match expected bytecode",
      );

      return;
    }

    const chainId = await this._jsonRpcClient.getChainId();

    // Otherwise if we're not on a local hardhat node, throw an error
    if (chainId !== 31337) {
      throw new NomicIgnitionPluginError(
        "create2",
        `CreateX not deployed on current network ${chainId}`,
      );
    }

    // On a local hardhat node, deploy the CreateX factory
    await this._deployCreateXFactory(this._jsonRpcClient);
  }

  public async *executeDeployment(
    executionState: DeploymentExecutionState,
  ): DeploymentStrategyGenerator {
    assertIgnitionInvariant(
      this._deploymentLoader !== undefined && this._jsonRpcClient !== undefined,
      `Strategy ${this.name} not initialized`,
    );

    const artifact = await this._deploymentLoader.loadArtifact(
      executionState.artifactId,
    );

    const bytecodeToDeploy = encodeArtifactDeploymentData(
      artifact,
      executionState.constructorArgs,
      executionState.libraries,
    );

    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: CREATE_X_ADDRESS,
        data: encodeArtifactFunctionCall(
          createxArtifact,
          "deployCreate2(bytes32,bytes)",
          [this.config.salt, bytecodeToDeploy],
        ),
        value: executionState.value,
      },

      (returnData) =>
        decodeArtifactFunctionCallResult(
          createxArtifact,
          "deployCreate2(bytes32,bytes)",
          returnData,
        ),
      (returnData) => decodeArtifactCustomError(createxArtifact, returnData),
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
      CREATE_X_ADDRESS,
      "ContractCreation",
      0,
      "newContract",
    );

    assertIgnitionInvariant(
      typeof deployedAddress === "string",
      "Deployed event should return a string addr property",
    );

    return {
      type: ExecutionResultType.SUCCESS,
      address: deployedAddress,
    };
  }

  public async *executeCall(
    executionState: CallExecutionState,
  ): CallStrategyGenerator {
    assertIgnitionInvariant(
      this._deploymentLoader !== undefined && this._jsonRpcClient !== undefined,
      `Strategy ${this.name} not initialized`,
    );

    const artifact = await this._deploymentLoader.loadArtifact(
      executionState.artifactId,
    );

    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: executionState.contractAddress,
        data: encodeArtifactFunctionCall(
          artifact,
          executionState.functionName,
          executionState.args,
        ),
        value: executionState.value,
      },

      (returnData) =>
        decodeArtifactFunctionCallResult(
          artifact,
          executionState.functionName,
          returnData,
        ),
      (returnData) => decodeArtifactCustomError(artifact, returnData),
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
    executionState: SendDataExecutionState,
  ): SendDataStrategyGenerator {
    const transactionOrResult = yield* executeOnchainInteractionRequest(
      executionState.id,
      {
        id: 1,
        type: NetworkInteractionType.ONCHAIN_INTERACTION,
        to: executionState.to,
        data: executionState.data,
        value: executionState.value,
      },
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
    executionState: StaticCallExecutionState,
  ): StaticCallStrategyGenerator {
    assertIgnitionInvariant(
      this._deploymentLoader !== undefined && this._jsonRpcClient !== undefined,
      `Strategy ${this.name} not initialized`,
    );

    const artifact = await this._deploymentLoader.loadArtifact(
      executionState.artifactId,
    );

    const decodedResultOrError = yield* executeStaticCallRequest(
      {
        id: 1,
        type: NetworkInteractionType.STATIC_CALL,
        to: executionState.contractAddress,
        from: executionState.from,
        data: encodeArtifactFunctionCall(
          artifact,
          executionState.functionName,
          executionState.args,
        ),
        value: 0n,
      },
      (returnData) =>
        decodeArtifactFunctionCallResult(
          artifact,
          executionState.functionName,
          returnData,
        ),
      (returnData) => decodeArtifactCustomError(artifact, returnData),
    );

    if (decodedResultOrError.type === ExecutionResultType.STATIC_CALL_ERROR) {
      return decodedResultOrError;
    }

    return {
      type: ExecutionResultType.SUCCESS,
      value: getStaticCallExecutionStateResultValue(
        executionState,
        decodedResultOrError,
      ),
    };
  }

  /**
   * Within the context of a local development Hardhat chain, deploy
   * the CreateX factory contract using a presigned transaction.
   */
  private async _deployCreateXFactory(client: JsonRpcClient) {
    // The account that will deploy the CreateX factory needs to be funded
    // first
    await client.setBalance(
      CREATE_X_PRESIGNED_DEPLOYER_ADDRESS,
      400000000000000000n,
    );

    const txHash = await client.sendRawTransaction(presignedTx);

    assertIgnitionInvariant(txHash !== "0x", "CreateX deployment failed");

    while (true) {
      const receipt = await client.getTransactionReceipt(txHash);

      if (receipt !== undefined) {
        assertIgnitionInvariant(
          receipt?.contractAddress !== undefined,
          "CreateX deployment should have an address",
        );

        assertIgnitionInvariant(
          receipt.contractAddress === CREATE_X_ADDRESS,
          `CreateX deployment should have the expected address ${CREATE_X_ADDRESS}, instead it is ${receipt.contractAddress}`,
        );

        return;
      }

      await new Promise((res) => setTimeout(res, 200));
    }
  }
}
