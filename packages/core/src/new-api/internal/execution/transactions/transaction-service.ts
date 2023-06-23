import { Contract, ContractFactory, ethers } from "ethers";

import { IgnitionError } from "../../../../errors";
import { SignerAdapter } from "../../../types/adapters";
import { DeploymentLoader } from "../../../types/deployment-loader";
import {
  CallFunctionInteractionMessage,
  DeployContractInteractionMessage,
  OnchainDeployContractSuccessMessage,
  OnchainFailureMessage,
  OnchainInteractionMessage,
  OnchainResultMessage,
  StaticCallInteractionMessage,
} from "../../../types/journal";
import {
  TransactionService,
  TransactionServiceOptions,
} from "../../../types/transaction-service";
import { assertIgnitionInvariant } from "../../utils/assertions";
import { collectLibrariesAndLink } from "../../utils/collectLibrariesAndLink";
import {
  isCallFunctionInteraction,
  isDeployContractInteraction,
  isStaticCallInteraction,
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
    private _signerLoader: SignerAdapter,
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

    if (isStaticCallInteraction(interaction)) {
      return this._dispatchStaticCall(interaction);
    }

    throw new IgnitionError(
      "Transaction service not implemented for this interaction"
    );
  }

  private async _dispatchDeployContract(
    deployContractInteraction: DeployContractInteractionMessage,
    libraries: { [libraryName: string]: string } = {}
  ): Promise<OnchainDeployContractSuccessMessage | OnchainFailureMessage> {
    const artifact = await this._deploymentLoader.loadArtifact(
      deployContractInteraction.storedArtifactPath
    );

    const from = deployContractInteraction.from;
    const args = deployContractInteraction.args;
    const value = BigInt(deployContractInteraction.value);

    const linkedByteCode = await collectLibrariesAndLink(artifact, libraries);

    const signer: ethers.Signer = await this._signerLoader.getSigner(from);

    const Factory = new ContractFactory(artifact.abi, linkedByteCode, signer);

    const tx = Factory.getDeployTransaction(...args, {
      value,
    });

    const result = await this._chainDispatcher.sendTx(tx, signer);

    if (result.type === "transaction-success") {
      assertIgnitionInvariant(
        result.contractAddress !== undefined,
        "Contract address not available on receipt"
      );

      return {
        type: "onchain-result",
        subtype: "deploy-contract-success",
        futureId: deployContractInteraction.futureId,
        transactionId: deployContractInteraction.transactionId,
        contractAddress: result.contractAddress,
      };
    } else {
      return {
        type: "onchain-result",
        subtype: "failure",
        futureId: deployContractInteraction.futureId,
        transactionId: deployContractInteraction.transactionId,
        error: result.error,
      };
    }
  }

  private async _dispatchCallFunction({
    futureId,
    transactionId,
    from,
    args,
    functionName,
    contractAddress,
    value,
    storedArtifactPath,
  }: CallFunctionInteractionMessage): Promise<OnchainResultMessage> {
    const artifact = await this._deploymentLoader.loadArtifact(
      storedArtifactPath
    );

    const signer: ethers.Signer = await this._signerLoader.getSigner(from);

    const contractInstance = new Contract(
      contractAddress,
      artifact.abi,
      signer
    );

    const unsignedTx = await contractInstance.populateTransaction[functionName](
      ...args,
      { value: BigInt(value), from: await signer.getAddress() }
    );

    const result = await this._chainDispatcher.sendTx(unsignedTx, signer);

    if (result.type === "transaction-success") {
      assertIgnitionInvariant(
        result.txId !== undefined,
        "Transaction hash not available on receipt"
      );

      return {
        type: "onchain-result",
        subtype: "call-function-success",
        futureId,
        transactionId,
        txId: result.txId,
      };
    } else {
      return {
        type: "onchain-result",
        subtype: "failure",
        futureId,
        transactionId,
        error: result.error,
      };
    }
  }

  private async _dispatchStaticCall({
    futureId,
    transactionId,
    from,
    args,
    functionName,
    contractAddress,
    storedArtifactPath,
  }: StaticCallInteractionMessage): Promise<OnchainResultMessage> {
    const artifact = await this._deploymentLoader.loadArtifact(
      storedArtifactPath
    );

    try {
      const signer: ethers.Signer = await this._signerLoader.getSigner(from);

      const contractInstance = new Contract(
        contractAddress,
        artifact.abi,
        signer
      );

      const result = await contractInstance[functionName](...args, {
        from: await signer.getAddress(),
      });

      assertIgnitionInvariant(
        result !== undefined,
        "Static call result not available"
      );

      return {
        type: "onchain-result",
        subtype: "static-call-success",
        futureId,
        transactionId,
        result,
      };
    } catch (error) {
      return {
        type: "onchain-result",
        subtype: "failure",
        futureId,
        transactionId,
        error:
          error instanceof Error
            ? error
            : new Error("Unknown static call error"),
      };
    }
  }
}
