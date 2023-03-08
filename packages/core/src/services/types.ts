import { ethers } from "ethers";

import { IAccountsService } from "./AccountsService";
import { IArtifactsService } from "./ArtifactsService";
import { IConfigService } from "./ConfigService";
import { IContractsService } from "./ContractsService";
import { INetworkService } from "./NetworkService";
import { ITransactionsService } from "./TransactionsService";

export interface TransactionOptions {
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
  maxRetries: number;
  gasPriceIncrementPerRetry: ethers.BigNumber | null;
  pollingInterval: number;
  signer: ethers.Signer;
}

export interface Services {
  network: INetworkService;
  contracts: IContractsService;
  artifacts: IArtifactsService;
  transactions: ITransactionsService;
  config: IConfigService;
  accounts: IAccountsService;
}
