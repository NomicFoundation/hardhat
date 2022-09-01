import { ethers } from "ethers";

import { HasParamResult } from "../../src/providers";
import { IContractsService } from "../../src/services/ContractsService";
import { Services, TransactionOptions } from "../../src/services/types";
import { IArtifactsService } from "../services/ArtifactsService";
import { IConfigService } from "../services/ConfigService";
import { ITransactionsService } from "../services/TransactionsService";
import { Artifact } from "../types";

export function getMockServices() {
  const mockServices: Services = {
    contracts: new MockContractsService(),
    artifacts: new MockArtifactsService(),
    transactions: new MockTransactionService(),
    config: new MockConfigService(),
  };

  return mockServices;
}

class MockContractsService implements IContractsService {
  public deploy(
    _artifact: Artifact,
    _args: any[],
    _libraries: { [k: string]: any },
    _txOptions?: TransactionOptions | undefined
  ): Promise<string> {
    throw new Error("Method not implemented.");
  }

  public call(
    _address: string,
    _abi: any[],
    _method: string,
    _args: any[],
    _txOptions?: TransactionOptions | undefined
  ): Promise<string> {
    throw new Error("Method not implemented.");
  }
}

class MockArtifactsService implements IArtifactsService {
  public getArtifact(_name: string): Promise<Artifact> {
    throw new Error("Method not implemented.");
  }

  public hasArtifact(_name: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
}

class MockTransactionService implements ITransactionsService {
  public wait(_txHash: string): Promise<ethers.providers.TransactionReceipt> {
    return {} as any;
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
