import { OnchainInteractionMessage, OnchainResultMessage } from "./journal";

/**
 * A service for managing on-chain interactions as part of the deployment.
 *
 * @beta
 */
export interface TransactionService {
  onchain(
    interaction: OnchainInteractionMessage,
    options?: TransactionServiceOptions
  ): Promise<OnchainResultMessage>;
}

/**
 * Additional data needed to support various transaction types.
 *
 * @beta
 */
export interface TransactionServiceOptions {
  libraries?: {
    [libraryName: string]: string;
  };
}
