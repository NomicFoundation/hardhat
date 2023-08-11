import { RawStaticCallResult, Transaction } from "./jsonrpc";

/**
 * An interaction with an Ethereum network.
 *
 * It can be either an OnchainInteraction or a StaticCall.
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
  nonce?: number;
  transactions: Transaction[];
}

/**
 * This interface represents a static call to the Ethereum network.
 *
 * Note that static calls are always immediately resolved, so their result
 * is always available.
 **/
export interface StaticCall {
  id: number;
  type: NetworkInteractionType.STATIC_CALL;
  to: string | undefined; // Undefined when it's a deployment transaction
  data: string;
  value: bigint;
  from: string;
  result?: RawStaticCallResult;
}
