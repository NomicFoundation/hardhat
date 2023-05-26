import { OnchainInteraction, OnchainResult } from "./journal";

/**
 * A service for managing on-chain interactions as part of the deployment.
 *
 * @beta
 */
export interface TransactionService {
  onchain(interaction: OnchainInteraction): Promise<OnchainResult>;
}
