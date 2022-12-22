import { ethers } from "ethers";

import { IArtifactsService } from "services/ArtifactsService";
import { IConfigService } from "services/ConfigService";
import { IContractsService } from "services/ContractsService";
import { INetworkService } from "services/NetworkService";
import { ITransactionsService } from "services/TransactionsService";
import { Services, TransactionOptions } from "services/types";
import { Artifact } from "types/hardhat";
import { HasParamResult } from "types/providers";

export function getMockServices() {
  const mockServices: Services = {
    network: new MockNetworkService(),
    contracts: new MockContractsService(),
    artifacts: new MockArtifactsService(),
    transactions: new MockTransactionService(),
    config: new MockConfigService(),
  };

  return mockServices;
}

class MockNetworkService implements INetworkService {
  public async getChainId(): Promise<number> {
    return 31337;
  }
}

class MockContractsService implements IContractsService {
  private contractCount: number;

  constructor() {
    this.contractCount = 0;
  }

  public async sendTx(
    _deployTransaction: ethers.providers.TransactionRequest,
    _txOptions?: TransactionOptions | undefined
  ): Promise<string> {
    this.contractCount++;

    return `0x0000${this.contractCount}`;
  }
}

class MockArtifactsService implements IArtifactsService {
  public async hasArtifact(_name: string): Promise<boolean> {
    return true;
  }

  public getArtifact(_name: string): Promise<Artifact> {
    throw new Error("Method not implemented.");
  }
}

class MockTransactionService implements ITransactionsService {
  public wait(_txHash: string): Promise<ethers.providers.TransactionReceipt> {
    return {} as any;
  }

  public waitForEvent(
    _filter: ethers.EventFilter,
    _durationMs: number
  ): Promise<ethers.providers.Log> {
    throw new Error("Method not implemented.");
  }
}

class MockConfigService implements IConfigService {
  public getParam(_paramName: string): Promise<string | number> {
    throw new Error("Method not implemented.");
  }

  public hasParam(_paramName: string): Promise<HasParamResult> {
    throw new Error("Method not implemented.");
  }
}
