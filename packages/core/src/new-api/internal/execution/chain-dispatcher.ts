import { Contract, ContractFactory, ethers } from "ethers";

import { Adapters } from "../../types/adapters";
import { ArgumentType } from "../../types/module";
import { ChainDispatcher } from "../types/chain-dispatcher";
import { assertIgnitionInvariant } from "../utils/assertions";

import { AccountsState } from "./execution-engine";

export class ChainDispatcherImpl implements ChainDispatcher {
  private _accountsState: AccountsState;

  constructor(private _adapters: Adapters) {
    this._accountsState = {};
  }

  public async getCurrentBlock(): Promise<{ number: number; hash: string }> {
    return this._adapters.blocks.getBlock();
  }

  // TODO: should nonce management be separated out into its own
  // class?
  public async allocateNextNonceForAccount(address: string): Promise<number> {
    if (address in this._accountsState) {
      const nextNonce = this._accountsState[address] + 1;
      this._accountsState[address] = nextNonce;
      return nextNonce;
    }

    const onchainNonce = await this._getTransactionCount(address);
    this._accountsState[address] = onchainNonce;

    return onchainNonce;
  }

  public async constructDeployTransaction(
    byteCode: string,
    abi: any[],
    args: ArgumentType[],
    value: bigint,
    from: string
  ): Promise<ethers.providers.TransactionRequest> {
    const signer: ethers.Signer = await this._adapters.signer.getSigner(from);

    const Factory = new ContractFactory(abi, byteCode, signer);

    const tx = Factory.getDeployTransaction(...args, {
      value,
    });

    return tx;
  }

  public async constructCallTransaction(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: ArgumentType[],
    value: bigint,
    from: string
  ): Promise<ethers.providers.TransactionRequest> {
    const signer: ethers.Signer = await this._adapters.signer.getSigner(from);

    const contractInstance = new Contract(contractAddress, abi, signer);

    const unsignedTx: ethers.providers.TransactionRequest =
      await contractInstance.populateTransaction[functionName](...args, {
        value: BigInt(value),
        from,
      });

    return unsignedTx;
  }

  public async sendTx(
    tx: ethers.providers.TransactionRequest,
    from: string
  ): Promise<string> {
    const signer = await this._adapters.signer.getSigner(from);
    const response = await signer.sendTransaction(tx);
    const txHash = response.hash;

    return txHash;
  }

  public async getEventArgument(
    eventName: string,
    argumentName: string,
    txToReadFrom: string,
    eventIndex: number,
    emitterAddress: string,
    abi: any[]
  ): Promise<any> {
    const contract = new Contract(emitterAddress, abi);
    const filter = contract.filters[eventName]();
    const eventNameTopic = filter.topics?.[0];

    assertIgnitionInvariant(eventNameTopic !== undefined, "Unknown event name");

    const receipt = await this._adapters.transactions.getTransactionReceipt(
      txToReadFrom
    );

    // TODO: should this really return an error result
    assertIgnitionInvariant(
      receipt !== undefined && receipt !== null,
      `Receipt must be available: ${txToReadFrom}`
    );

    const { logs } = receipt;

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

    return ethers.BigNumber.isBigNumber(result)
      ? BigInt(result.toString())
      : result;
  }

  public async staticCallQuery(
    contractAddress: string,
    abi: any[],
    functionName: string,
    args: ArgumentType[],
    from: string
  ): Promise<any> {
    const signer: ethers.Signer = await this._adapters.signer.getSigner(from);

    const contractInstance = new Contract(contractAddress, abi, signer);

    const result = await contractInstance[functionName](...args, {
      from,
    });

    return result;
  }

  public async getTransactionReceipt(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt | null | undefined> {
    return this._adapters.transactions.getTransactionReceipt(txHash);
  }

  private async _getTransactionCount(address: string): Promise<number> {
    return this._adapters.transactions.getTransactionCount(address);
  }
}
