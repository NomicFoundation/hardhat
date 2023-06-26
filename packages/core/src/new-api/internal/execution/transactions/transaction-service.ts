import { Contract, ContractFactory, ethers } from "ethers";

import { IgnitionError } from "../../../../errors";
import { SignerAdapter } from "../../../types/adapters";
import { DeploymentLoader } from "../../../types/deployment-loader";
import {
  CallFunctionInteractionMessage,
  CallFunctionResultMessage,
  DeployContractInteractionMessage,
  DeployContractResultMessage,
  OnchainInteractionMessage,
  OnchainResultMessage,
  StaticCallInteractionMessage,
  StaticCallResultMessage,
} from "../../../types/journal";
import {
  TransactionService,
  TransactionServiceOptions,
} from "../../../types/transaction-service";
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
  ): Promise<DeployContractResultMessage> {
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

    const { contractAddress } = await this._chainDispatcher.sendTx(tx, signer);

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

  private async _dispatchCallFunction({
    futureId,
    transactionId,
    from,
    args,
    functionName,
    contractAddress,
    value,
    storedArtifactPath,
  }: CallFunctionInteractionMessage): Promise<CallFunctionResultMessage> {
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

    const { txId } = await this._chainDispatcher.sendTx(unsignedTx, signer);

    if (txId === undefined) {
      throw new IgnitionError("Transaction hash not available on receipt");
    }

    return {
      type: "onchain-result",
      subtype: "call-function",
      futureId,
      transactionId,
      txId,
    };
  }

  private async _dispatchStaticCall({
    futureId,
    transactionId,
    from,
    args,
    functionName,
    contractAddress,
    storedArtifactPath,
  }: StaticCallInteractionMessage): Promise<StaticCallResultMessage> {
    const artifact = await this._deploymentLoader.loadArtifact(
      storedArtifactPath
    );

    const signer: ethers.Signer = await this._signerLoader.getSigner(from);

    const contractInstance = new Contract(
      contractAddress,
      artifact.abi,
      signer
    );

    const result = await contractInstance[functionName](...args, {
      from: await signer.getAddress(),
    });

    if (result === undefined) {
      throw new IgnitionError("Static call result not available");
    }

    return {
      type: "onchain-result",
      subtype: "static-call",
      futureId,
      transactionId,
      result,
    };
  }
}
