import { OnchainInteractionMessage, OnchainResultMessage } from "./journal";

/**
 * A service for managing on-chain interactions as part of the deployment.
 *
 * @beta
 */
export interface TransactionService {
  onchain(
    interaction: OnchainInteractionMessage
  ): Promise<OnchainResultMessage>;
}
