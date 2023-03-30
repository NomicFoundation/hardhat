import { ethers } from "ethers";

import { IgnitionError } from "../../src/errors";
import { ExternalParamValue } from "../../src/internal/types/deploymentGraph";
import { Artifact } from "../../src/types/hardhat";
import { ModuleParams } from "../../src/types/module";
import {
  AccountsProvider,
  ArtifactsProvider,
  ConfigProvider,
  EIP1193Provider,
  GasProvider,
  HasParamResult,
  Providers,
  TransactionsProvider,
} from "../../src/types/providers";

export function getMockProviders(): Providers {
  const mockProviders: Providers = {
    artifacts: new MockArtifactsProvider(),
    ethereumProvider: new MockEthereumProvider(),
    gasProvider: new MockGasProvider(),
    transactions: new MockTransactionsProvider(),
    config: new MockConfigProvider(),
    accounts: new MockAccountsProvider(),
  };

  return mockProviders;
}

class MockArtifactsProvider implements ArtifactsProvider {
  public async getArtifact(_name: string): Promise<Artifact> {
    throw new IgnitionError("Method not implemented.");
  }
  public async getAllArtifacts(): Promise<Artifact[]> {
    throw new IgnitionError("Method not implemented.");
  }
  public async hasArtifact(_name: string): Promise<boolean> {
    return false;
  }
}

class MockEthereumProvider implements EIP1193Provider {
  public async request(_args: {
    method: string;
    params?: unknown[] | undefined;
  }): Promise<unknown> {
    throw new IgnitionError("Method not implemented.");
  }
}

class MockGasProvider implements GasProvider {
  public estimateGasLimit(
    _tx: ethers.providers.TransactionRequest
  ): Promise<ethers.BigNumber> {
    throw new IgnitionError("Method not implemented.");
  }

  public estimateGasPrice(): Promise<ethers.BigNumber> {
    throw new IgnitionError("Method not implemented.");
  }
}

class MockTransactionsProvider implements TransactionsProvider {
  public isConfirmed(_txHash: string): Promise<boolean> {
    throw new IgnitionError("Method not implemented.");
  }

  public isMined(_txHash: string): Promise<boolean> {
    throw new IgnitionError("Method not implemented.");
  }
}

class MockConfigProvider implements ConfigProvider {
  public parameters: ModuleParams | undefined;

  public setParams(_parameters: {
    [key: string]: ExternalParamValue;
  }): Promise<void> {
    throw new IgnitionError("Method not implemented.");
  }

  public getParam(_paramName: string): Promise<ExternalParamValue> {
    throw new IgnitionError("Method not implemented.");
  }

  public hasParam(_paramName: string): Promise<HasParamResult> {
    throw new IgnitionError("Method not implemented.");
  }
}

class MockAccountsProvider implements AccountsProvider {
  public getAccounts(): Promise<string[]> {
    throw new Error("Method not implemented.");
  }

  public getSigner(_address: string): Promise<ethers.Signer> {
    throw new Error("Method not implemented.");
  }
}
