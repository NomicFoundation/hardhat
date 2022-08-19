import { Journal } from "../../journal/types";
import { Providers } from "../../providers";
import { ArtifactsService } from "../../services/ArtifactsService";
import { ConfigService } from "../../services/ConfigService";
import { ContractsService } from "../../services/ContractsService";
import { TransactionsService } from "../../services/TransactionsService";
import { Services } from "../../services/types";
import { TxSender } from "../../tx-sender";

export function createServices(
  recipeId: string,
  executorId: string,
  {
    providers,
    journal,
    txPollingInterval,
  }: { providers: Providers; journal: Journal; txPollingInterval: number }
): Services {
  const txSender = new TxSender(
    recipeId,
    executorId,
    providers.gasProvider,
    journal
  );

  const services: Services = {
    artifacts: new ArtifactsService(providers),
    contracts: new ContractsService(providers, txSender, {
      pollingInterval: txPollingInterval,
    }),
    transactions: new TransactionsService(providers),
    config: new ConfigService(providers),
  };

  return services;
}
