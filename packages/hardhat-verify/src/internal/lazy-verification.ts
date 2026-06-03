import type {
  EtherscanCustomApiCallOptions,
  EtherscanResponseBody,
  EtherscanVerifyArgs,
  LazyEtherscan,
} from "./etherscan.types.js";
import type * as VerificationHelpersModule from "./verification-helpers.js";
import type { VerificationHelpers } from "../types.js";
import type {
  ChainDescriptorsConfig,
  VerificationProvidersConfig,
} from "hardhat/types/config";
import type { EthereumProvider } from "hardhat/types/providers";

import { bindAllMethods } from "@nomicfoundation/hardhat-utils/lang";

let VerificationImpl: typeof VerificationHelpersModule.Verification | undefined;

export class LazyVerification implements VerificationHelpers {
  public readonly etherscan: LazyEtherscan;

  readonly #provider: EthereumProvider;
  readonly #networkName: string;
  readonly #chainDescriptors: ChainDescriptorsConfig;
  readonly #verificationProvidersConfig: VerificationProvidersConfig;
  #impl: VerificationHelpersModule.Verification | undefined;

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
    this.etherscan = new LazyEtherscanForwarder(() => this.#getImpl());
    bindAllMethods(this);
  }

  async #getImpl(): Promise<VerificationHelpersModule.Verification> {
    if (VerificationImpl === undefined) {
      ({ Verification: VerificationImpl } = await import(
        "./verification-helpers.js"
      ));
    }

    if (this.#impl === undefined) {
      this.#impl = new VerificationImpl(
        this.#provider,
        this.#networkName,
        this.#chainDescriptors,
        this.#verificationProvidersConfig,
      );
    }

    return this.#impl;
  }
}

class LazyEtherscanForwarder implements LazyEtherscan {
  readonly #getImpl: () => Promise<VerificationHelpersModule.Verification>;

  constructor(getImpl: () => Promise<VerificationHelpersModule.Verification>) {
    this.#getImpl = getImpl;
    bindAllMethods(this);
  }

  public async getChainId(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.etherscan.getChainId();
  }

  public async getName(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.etherscan.getName();
  }

  public async getUrl(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.etherscan.getUrl();
  }

  public async getApiUrl(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.etherscan.getApiUrl();
  }

  public async getApiKey(): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.etherscan.getApiKey();
  }

  public async getContractUrl(address: string): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.etherscan.getContractUrl(address);
  }

  public async isVerified(address: string): Promise<boolean> {
    const impl = await this.#getImpl();
    return await impl.etherscan.isVerified(address);
  }

  public async verify(args: EtherscanVerifyArgs): Promise<string> {
    const impl = await this.#getImpl();
    return await impl.etherscan.verify(args);
  }

  public async pollVerificationStatus(
    guid: string,
    contractAddress: string,
    contractName: string,
  ): Promise<{ success: boolean; message: string }> {
    const impl = await this.#getImpl();
    return await impl.etherscan.pollVerificationStatus(
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
    return await impl.etherscan.customApiCall(params, options);
  }
}
