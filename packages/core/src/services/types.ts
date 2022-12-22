import { ethers } from "ethers";

import { IArtifactsService } from "./ArtifactsService";
import { IConfigService } from "./ConfigService";
import { IContractsService } from "./ContractsService";
import { INetworkService } from "./NetworkService";
import { ITransactionsService } from "./TransactionsService";

export interface TransactionOptions {
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  maxRetries: number;
  gasIncrementPerRetry: ethers.BigNumber | null;
  pollingInterval: number;
}

export interface Services {
  network: INetworkService;
  contracts: IContractsService;
  artifacts: IArtifactsService;
  transactions: ITransactionsService;
  config: IConfigService;
}
