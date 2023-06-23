import { IgnitionError } from "../../../../errors";
import { DeploymentLoader } from "../../../types/deployment-loader";
import {
  CallFunctionInteractionMessage,
  CallFunctionResultMessage,
  DeployContractInteractionMessage,
  DeployContractResultMessage,
  OnchainInteractionMessage,
  OnchainResultMessage,
} from "../../../types/journal";
import {
  TransactionService,
  TransactionServiceOptions,
} from "../../../types/transaction-service";
import { collectLibrariesAndLink } from "../../utils/collectLibrariesAndLink";
import {
  isCallFunctionInteraction,
  isDeployContractInteraction,
} from "../guards";

import { ChainDispatcher } from "./chain-dispatcher";

/**
 * A service for managing on-chain interactions during the deployment.
 *
 * @beta
 */
export class TransactionServiceImplementation implements TransactionService {
  constructor(
    private _deploymentLoader: DeploymentLoader,
    private _chainDispatcher: ChainDispatcher
  ) {}

  public async onchain(
    interaction: OnchainInteractionMessage,
    options?: TransactionServiceOptions
  ): Promise<OnchainResultMessage> {
    if (isDeployContractInteraction(interaction)) {
      return this._dispatchDeployContract(interaction, options?.libraries);
    }

    if (isCallFunctionInteraction(interaction)) {
      return this._dispatchCallFunction(interaction);
    }

    throw new IgnitionError(
      "Transaction service not implemented for this interaction"
    );
  }

  private async _dispatchDeployContract(
    deployContractInteraction: DeployContractInteractionMessage,
    libraries: { [libraryName: string]: string } = {}
  ): Promise<DeployContractResultMessage> {
    const artifact = await this._deploymentLoader.loadArtifact(
      deployContractInteraction.storedArtifactPath
    );

    const from = deployContractInteraction.from;
    const args = deployContractInteraction.args;
    const value = BigInt(deployContractInteraction.value);

    const linkedByteCode = await collectLibrariesAndLink(artifact, libraries);

    // todo: i think chain dispatcher should only be passed a raw tx, and everything needed for that.
    // any process necessary to generating that transaction should happen here in transaction service
    const { contractAddress } = await this._chainDispatcher.sendTx({
      abi: artifact.abi,
      bytecode: linkedByteCode,
      args,
      value,
      from,
    });

    if (contractAddress === undefined) {
      throw new IgnitionError("Contract address not available on receipt");
    }

    return {
      type: "onchain-result",
      subtype: "deploy-contract",
      futureId: deployContractInteraction.futureId,
      transactionId: deployContractInteraction.transactionId,
      contractAddress,
    };
  }

  private async _dispatchCallFunction(
    callFunctionInteraction: CallFunctionInteractionMessage
  ): Promise<CallFunctionResultMessage> {
    const from = callFunctionInteraction.from;
    const args = callFunctionInteraction.args;
    const value = BigInt(callFunctionInteraction.value);
    const functionName = callFunctionInteraction.functionName;

    throw new Error(
      `not implemented yet${from}${args as any}${value}${functionName}`
    );
  }
}
