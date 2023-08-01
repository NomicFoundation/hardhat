import { Contract, ContractFactory, ethers } from "ethers";

import { IgnitionError } from "../../../errors";
import { Adapters } from "../../types/adapters";
import { ArgumentType } from "../../types/module";
import { assertIgnitionInvariant } from "../utils/assertions";

import { AccountsState } from "./execution-engine";
import { ChainDispatcher } from "./types";

export class ChainDispatcherImpl implements ChainDispatcher {
  private _accountsState: AccountsState;

  constructor(private _adapters: Adapters) {
    this._accountsState = {};
  }

  public async getPendingTransactionCount(address: string): Promise<number> {
    return this._adapters.transactions.getPendingTransactionCount(address);
  }

  public async getLatestTransactionCount(address: string): Promise<number> {
    return this._adapters.transactions.getLatestTransactionCount(address);
  }

  public async getCurrentBlock(): Promise<{ number: number; hash: string }> {
    return this._adapters.blocks.getBlock();
  }

  // TODO: should nonce management be separated out into its own
  // class?
  public async allocateNextNonceForAccount(address: string): Promise<number> {
    const pendingNonce = await this.getPendingTransactionCount(address);

    if (address in this._accountsState) {
      const expectedNextNonce = this._accountsState[address] + 1;

      if (pendingNonce < expectedNextNonce) {
        throw new IgnitionError(
          `The current transaction has been dropped for account ${address}`
        );
      }

      if (pendingNonce > expectedNextNonce) {
        throw new IgnitionError(
          `A transaction has been submitted on the account ${address} outside of the deployment`
        );
      }

      this._accountsState[address] = expectedNextNonce;
      return expectedNextNonce;
    }

    this._accountsState[address] = pendingNonce;

    return pendingNonce;
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

    // todo: temp fix
    // if user provided a function name with parenthesis, assume they know what they're doing
    // if not, add the open parenthesis for the regex test
    const userFnOrNormalized = functionName.endsWith(")")
      ? functionName.replace("(", "\\(").replace(")", "\\)")
      : `${functionName}\\(`;

    const matchingFunctions = Object.keys(contractInstance).filter((key) =>
      new RegExp(userFnOrNormalized).test(key)
    );

    assertIgnitionInvariant(
      matchingFunctions.length === 1,
      "Ignition does not yet support overloaded static calls"
    );

    const [validFunctionName] = matchingFunctions;

    const result = await contractInstance[validFunctionName](...args, {
      from,
    });

    return result;
  }

  public async getTransactionReceipt(
    txHash: string
  ): Promise<ethers.providers.TransactionReceipt | null | undefined> {
    return this._adapters.transactions.getTransactionReceipt(txHash);
  }

  public async getTransaction(
    txHash: string
  ): Promise<ethers.providers.TransactionResponse | null | undefined> {
    return this._adapters.transactions.getTransaction(txHash);
  }
}
