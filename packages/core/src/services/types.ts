import { ethers } from "ethers";

import { ArtifactsService } from "./ArtifactsService";
import { ConfigService } from "./ConfigService";
import { ContractsService } from "./ContractsService";
import { TransactionsService } from "./TransactionsService";

export interface TransactionOptions {
  gasLimit?: ethers.BigNumberish;
  gasPrice?: ethers.BigNumberish;
}

export interface Services {
  contracts: ContractsService;
  artifacts: ArtifactsService;
  transactions: TransactionsService;
  config: ConfigService;
}
