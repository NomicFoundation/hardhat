/**
 * An instance of this class is thrown to indicate that the executor is waiting
 * for some external event to happen, like a multisig that needs extra
 * confirmations or a timelocked contract.
 */

export class Hold {
  constructor(public readonly reason: string) {}
}
