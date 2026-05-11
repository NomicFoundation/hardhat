import type { VerificationHelpers } from "../types.js";
import type * as EtherscanModule from "./etherscan.js";
import type {
  EtherscanCustomApiCallOptions,
  EtherscanResponseBody,
  EtherscanVerifyArgs,
  LazyEtherscan,
} from "./etherscan.types.js";
import type {
  ChainDescriptorsConfig,
  VerificationProvidersConfig,
} from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";

import { bindAllMethods } from "@nomicfoundation/hardhat-utils/lang";

let LazyEtherscanImpl: typeof EtherscanModule.LazyEtherscanImpl | undefined;

export class LazyVerification implements VerificationHelpers {
  readonly #provider: EthereumProvider;
  readonly #networkName: string;
  readonly #chainDescriptors: ChainDescriptorsConfig;
  readonly #verificationProvidersConfig: VerificationProvidersConfig;
  #etherscan: LazyEtherscan | undefined;

  public readonly etherscan: LazyEtherscan;

  constructor(
    provider: EthereumProvider,
    networkName: string,
    chainDescriptors: ChainDescriptorsConfig,
    verificationProvidersConfig: VerificationProvidersConfig,
  ) {
    this.#provider = provider;
    this.#networkName = networkName;
    this.#chainDescriptors = chainDescriptors;
    this.#verificationProvidersConfig = verificationProvidersConfig;

    this.etherscan = new LazyEtherscanProxy(() => this.#getEtherscan());
  }

  async #getEtherscan(): Promise<LazyEtherscan> {
    if (LazyEtherscanImpl === undefined) {
      ({ LazyEtherscanImpl } = await import("./etherscan.js"));
    }

    if (this.#etherscan === undefined) {
      this.#etherscan = new LazyEtherscanImpl(
        this.#provider,
        this.#networkName,
        this.#chainDescriptors,
        this.#verificationProvidersConfig,
      );
    }

    return this.#etherscan;
  }
}

class LazyEtherscanProxy implements LazyEtherscan {
  readonly #getImpl: () => Promise<LazyEtherscan>;

  constructor(getImpl: () => Promise<LazyEtherscan>) {
    this.#getImpl = getImpl;
    bindAllMethods(this);
  }

  public async getChainId(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.getChainId();
  }

  public async getName(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.getName();
  }

  public async getUrl(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.getUrl();
  }

  public async getApiUrl(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.getApiUrl();
  }

  public async getApiKey(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.getApiKey();
  }

  public async getContractUrl(address: string): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.getContractUrl(address);
  }

  public async isVerified(address: string): Promise<boolean> {
    const impl = await this.#getImpl();
    return await impl.isVerified(address);
  }

  public async verify(args: EtherscanVerifyArgs): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.verify(args);
  }

  public async pollVerificationStatus(
    guid: string,
    contractAddress: string,
    contractName: string,
  ): Promise<{ success: boolean; message: string }> {
    const impl = await this.#getImpl();
    return await impl.pollVerificationStatus(
      guid,
      contractAddress,
      contractName,
    );
  }

  public async customApiCall(
    params: Record<string, unknown>,
    options?: EtherscanCustomApiCallOptions,
  ): Promise<EtherscanResponseBody> {
    const impl = await this.#getImpl();
    return await impl.customApiCall(params, options);
  }
}
