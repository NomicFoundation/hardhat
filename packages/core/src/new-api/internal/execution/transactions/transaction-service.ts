import { IgnitionError } from "../../../../errors";
import { ArtifactResolver } from "../../../types/artifact";
import {
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
import { isDeployContractInteraction } from "../guards";

import { ChainDispatcher } from "./chain-dispatcher";

/**
 * A service for managing on-chain interactions during the deployment.
 *
 * @beta
 */
export class TransactionServiceImplementation implements TransactionService {
  constructor(
    private _artifactLoader: ArtifactResolver,
    private _chainDispatcher: ChainDispatcher
  ) {}

  public async onchain(
    interaction: OnchainInteractionMessage,
    options?: TransactionServiceOptions
  ): Promise<OnchainResultMessage> {
    if (!isDeployContractInteraction(interaction)) {
      throw new IgnitionError(
        "Transaction service not implemented for this interaction"
      );
    }

    return this._dispatchDeployContract(interaction, options?.libraries);
  }

  private async _dispatchDeployContract(
    deployContractInteraction: DeployContractInteractionMessage,
    libraries: { [libraryName: string]: string } = {}
  ): Promise<DeployContractResultMessage> {
    // TODO: consider replacing this with a registry of artifacts
    const artifact = await this._artifactLoader.load(
      deployContractInteraction.contractName
    );
    const from = deployContractInteraction.from;
    const args = deployContractInteraction.args;
    const value = BigInt(deployContractInteraction.value);

    const linkedByteCode = await collectLibrariesAndLink(artifact, libraries);

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
      contractAddress,
    };
  }
}
