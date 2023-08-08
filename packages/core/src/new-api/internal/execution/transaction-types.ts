/**
 * The relevant subset of a transaction log, as returned by eth_getTransactionReceipt.
 */
export interface TransactionLog {
  address: string;
  logIndex: string;
  data: string;
  topics: string[];
}

/**
 * The status of a transaction, as represented in its receipt.
 */
export enum TransactionReceiptStatus {
  FAILURE = 0,
  SUCCESS = 1,
}

/**
 * The relevant subset of the receipt, as returned by eth_getTransactionReceipt.
 */
export interface TransactionReceipt {
  contractAddress: string | null;
  status: TransactionReceiptStatus;
  logs: TransactionLog[];
}

/**
 * This interface represents a transaction that was sent to the network.
 */
export interface Transaction {
  hash: string;

  // Only available after the transaction has confirmed, with enough confirmations.
  receipt?: TransactionReceipt;

  // TODO: We may want to store the gas price because when we bump gas we need to know
  // which was the highest gas that we use for a particular nonce/onchain-interaction.
  // We don't really need to do this, as we can request it from the network. It's an
  // optimization.
}

/**
 * An interaction with an Ethereum network.
 *
 * It can be either an OnchainInteraction or a static call.
 *
 * OnchainInteractions are interactions that need to be executed with a transaction, while
 * StaticCalls are interactions that can be resolved by your local node.
 */
export type NetworkInteraction = OnchainInteraction | StaticCall;

/**
 * The different types of network interactions.
 */
export enum NetworkInteractionType {
  ONCHAIN_INTERACTION = "ONCHAIN_INTERACTION",
  STATIC_CALL = "STATIC_CALL",
}

/**
 * This interface represents an any kind of interaction between Ethereum accounts that
 * needs to be executed onchain.
 **/
export interface OnchainInteraction {
  id: number;
  type: NetworkInteractionType.ONCHAIN_INTERACTION;
  to: string | undefined; // Undefined when it's a deployment transaction
  data: string;
  value: bigint;
  from: string;
  nonce: number;
  transactions: Transaction[];
}

/**
 * This interface represents a static call to the Ethereum network.
 **/
export interface StaticCall {
  id: number;
  type: NetworkInteractionType.ONCHAIN_INTERACTION;
  to: string | undefined; // Undefined when it's a deployment transaction
  data: string;
  value: bigint;
  from: string;
  result?: string; // The result of the static call as returned by the RPC (i.e. a hex string with raw data)
}
