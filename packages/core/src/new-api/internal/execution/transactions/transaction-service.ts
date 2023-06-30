import { Contract, ContractFactory, ethers } from "ethers";

import { IgnitionError } from "../../../../errors";
import { SignerAdapter } from "../../../types/adapters";
import { DeploymentLoader } from "../../../types/deployment-loader";
import {
  CallFunctionInteractionMessage,
  ContractAtInteractionMessage,
  DeployContractInteractionMessage,
  OnchainCallFunctionSuccessMessage,
  OnchainContractAtSuccessMessage,
  OnchainDeployContractSuccessMessage,
  OnchainFailureMessage,
  OnchainInteractionMessage,
  OnchainReadEventArgumentSuccessMessage,
  OnchainResultMessage,
  OnchainSendDataSuccessMessage,
  OnchainStaticCallSuccessMessage,
  ReadEventArgumentInteractionMessage,
  SendDataInteractionMessage,
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
  isContractAtInteraction,
  isDeployContractInteraction,
  isReadEventArgumentInteraction,
  isSendDataInteraction,
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

    if (isReadEventArgumentInteraction(interaction)) {
      return this._dispatchReadEventArgument(interaction);
    }

    if (isSendDataInteraction(interaction)) {
      return this._dispatchSendData(interaction);
    }

    if (isContractAtInteraction(interaction)) {
      return this._dispatchContractAt(interaction);
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

      assertIgnitionInvariant(
        result.txId !== undefined,
        "Transaction hash not available on receipt"
      );

      return {
        type: "onchain-result",
        subtype: "deploy-contract-success",
        futureId: deployContractInteraction.futureId,
        transactionId: deployContractInteraction.transactionId,
        contractAddress: result.contractAddress,
        txId: result.txId,
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
  }: CallFunctionInteractionMessage): Promise<
    OnchainCallFunctionSuccessMessage | OnchainFailureMessage
  > {
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
  }: StaticCallInteractionMessage): Promise<
    OnchainStaticCallSuccessMessage | OnchainFailureMessage
  > {
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

  private async _dispatchReadEventArgument({
    futureId,
    transactionId,
    storedArtifactPath,
    eventName,
    argumentName,
    txToReadFrom,
    emitterAddress,
    eventIndex,
  }: ReadEventArgumentInteractionMessage): Promise<
    OnchainReadEventArgumentSuccessMessage | OnchainFailureMessage
  > {
    const artifact = await this._deploymentLoader.loadArtifact(
      storedArtifactPath
    );

    try {
      const contract = new Contract(emitterAddress, artifact.abi);
      const filter = contract.filters[eventName]();
      const eventNameTopic = filter.topics?.[0];

      assertIgnitionInvariant(
        eventNameTopic !== undefined,
        "Unknown event name"
      );

      const { logs } = await this._chainDispatcher.getTxReceipt(txToReadFrom);

      // only keep the requested eventName and ensure they're from the emitter
      const events = logs.filter(
        (log) =>
          log.address === filter.address && log.topics[0] === eventNameTopic
      );

      // sanity check to ensure the eventIndex isn't out of range
      if (events.length > 1 && eventIndex >= events.length) {
        throw new Error(
          `Given eventIndex '${eventIndex}' exceeds number of events emitted '${events.length}'`
        );
      }

      // this works in combination with the check above
      // because we default eventIndex to 0 if not set by user
      const eventLog = events[eventIndex];

      // parse the event through the emitter ABI and return the requested arg
      const result = contract.interface.parseLog(eventLog).args[argumentName];

      return {
        type: "onchain-result",
        subtype: "read-event-arg-success",
        futureId,
        transactionId,
        result: ethers.BigNumber.isBigNumber(result)
          ? result.toString()
          : result,
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
            : new Error("Unknown read event arg error"),
      };
    }
  }

  private async _dispatchSendData({
    futureId,
    transactionId,
    from,
    value,
    data,
    to,
  }: SendDataInteractionMessage): Promise<
    OnchainSendDataSuccessMessage | OnchainFailureMessage
  > {
    const signer: ethers.Signer = await this._signerLoader.getSigner(from);

    const unsignedTx: ethers.providers.TransactionRequest = {
      from,
      to,
      value: BigInt(value),
      data,
    };

    const result = await this._chainDispatcher.sendTx(unsignedTx, signer);

    if (result.type === "transaction-success") {
      assertIgnitionInvariant(
        result.txId !== undefined,
        "Transaction hash not available on receipt"
      );

      return {
        type: "onchain-result",
        subtype: "send-data-success",
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

  private async _dispatchContractAt({
    futureId,
    transactionId,
    contractAddress,
    contractName,
  }: ContractAtInteractionMessage): Promise<
    OnchainContractAtSuccessMessage | OnchainFailureMessage
  > {
    return {
      type: "onchain-result",
      subtype: "contract-at-success",
      futureId,
      transactionId,
      contractAddress,
      contractName,
    };
  }
}
