import type {
  EtherscanChainListResponse,
  EtherscanGetSourceCodeResponse,
  EtherscanResponse,
} from "./etherscan.types.js";
import type {
  VerificationProvider,
  VerificationResponse,
  VerificationStatusResponse,
  BaseVerifyFunctionArgs,
  CreateEtherscanOptions,
  ResolveConfigOptions,
} from "./types.js";
import type {
  Dispatcher,
  DispatcherOptions,
  HttpResponse,
} from "@nomicfoundation/hardhat-utils/request";
import type {
  ChainDescriptorsConfig,
  VerificationProvidersConfig,
} from "hardhat/types/config";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { sleep } from "@nomicfoundation/hardhat-utils/lang";
import {
  getProxyUrl,
  getRequest,
  postFormRequest,
  shouldUseProxy,
} from "@nomicfoundation/hardhat-utils/request";
import debug from "debug";

const log = debug("hardhat:hardhat-verify:etherscan");

export const ETHERSCAN_PROVIDER_NAME: keyof VerificationProvidersConfig =
  "etherscan";

const VERIFICATION_STATUS_POLLING_SECONDS = 3;

export const ETHERSCAN_API_URL = "https://api.etherscan.io/v2/api";

export interface EtherscanVerifyFunctionArgs extends BaseVerifyFunctionArgs {
  constructorArguments: string;
}

let supportedChainsCache: ChainDescriptorsConfig | undefined;

export class Etherscan implements VerificationProvider {
  public readonly chainId: string;
  public readonly name: string;
  public readonly url: string;
  public readonly apiUrl: string;
  public readonly apiKey: string;
  public readonly dispatcherOrDispatcherOptions?:
    | Dispatcher
    | DispatcherOptions;
  public readonly pollingIntervalMs: number;

  public static async resolveConfig({
    chainId,
    networkName,
    chainDescriptors,
    verificationProvidersConfig,
    dispatcher,
    shouldUseCache = true,
  }: ResolveConfigOptions): Promise<CreateEtherscanOptions> {
    const chainDescriptor = chainDescriptors.get(toBigInt(chainId));

    let blockExplorerConfig = chainDescriptor?.blockExplorers.etherscan;
    if (blockExplorerConfig === undefined) {
      const supportedChains = await Etherscan.getSupportedChains(
        dispatcher,
        shouldUseCache,
      );
      blockExplorerConfig = supportedChains.get(toBigInt(chainId))
        ?.blockExplorers.etherscan;
    }

    if (blockExplorerConfig === undefined) {
      if (chainDescriptor === undefined) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.NETWORK_NOT_SUPPORTED,
          {
            networkName,
            chainId,
          },
        );
      }

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.BLOCK_EXPLORER_NOT_CONFIGURED,
        {
          verificationProvider: "Etherscan",
          chainId,
        },
      );
    }

    return {
      blockExplorerConfig,
      verificationProviderConfig: verificationProvidersConfig.etherscan,
      chainId,
      dispatcher,
    };
  }

  public static async create({
    blockExplorerConfig,
    verificationProviderConfig,
    chainId,
    dispatcher,
  }: CreateEtherscanOptions): Promise<Etherscan> {
    return new Etherscan({
      chainId,
      ...blockExplorerConfig,
      apiKey: await verificationProviderConfig.apiKey.get(),
      dispatcher,
    });
  }

  public static async getSupportedChains(
    dispatcher?: Dispatcher,
    shouldUseCache = true,
  ): Promise<ChainDescriptorsConfig> {
    if (supportedChainsCache !== undefined && shouldUseCache) {
      return supportedChainsCache;
    }

    const supportedChains: ChainDescriptorsConfig = new Map();

    try {
      const response = await getRequest(
        "https://api.etherscan.io/v2/chainlist",
        undefined,
        dispatcher,
      );
      const responseBody: EtherscanChainListResponse =
        await response.body.json();

      const chainListData = responseBody.result;

      for (const chain of chainListData) {
        const chainId = toBigInt(chain.chainid);
        supportedChains.set(chainId, {
          name: chain.chainname,
          chainType: "generic",
          blockExplorers: {
            etherscan: {
              url: chain.blockexplorer,
            },
          },
        });
      }
    } catch (error) {
      // ignore errors
      log("Failed to fetch supported chains from Etherscan");
      log(error);
      return new Map();
    }

    if (shouldUseCache) {
      supportedChainsCache = supportedChains;
    }

    return supportedChains;
  }

  constructor(etherscanConfig: {
    chainId: number;
    name?: string;
    url: string;
    apiUrl?: string;
    apiKey: string;
    dispatcher?: Dispatcher;
  }) {
    this.chainId = String(etherscanConfig.chainId);
    this.name = etherscanConfig.name ?? "Etherscan";
    this.url = etherscanConfig.url;
    this.apiUrl = etherscanConfig.apiUrl ?? ETHERSCAN_API_URL;

    const proxyUrl = shouldUseProxy(this.apiUrl)
      ? getProxyUrl(this.apiUrl)
      : undefined;
    this.dispatcherOrDispatcherOptions =
      etherscanConfig.dispatcher ??
      (proxyUrl !== undefined ? { proxy: proxyUrl } : {});

    this.pollingIntervalMs =
      etherscanConfig.dispatcher !== undefined
        ? 0
        : VERIFICATION_STATUS_POLLING_SECONDS;

    if (etherscanConfig.apiKey === "") {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_API_KEY_EMPTY,
        {
          verificationProvider: this.name,
        },
      );
    }
    this.apiKey = etherscanConfig.apiKey;
  }

  public getContractUrl(address: string) {
    return `${this.url}/address/${address}#code`;
  }

  public async isVerified(address: string): Promise<boolean> {
    let response: HttpResponse;
    let responseBody: EtherscanGetSourceCodeResponse | undefined;
    try {
      response = await getRequest(
        this.apiUrl,
        {
          queryParams: {
            module: "contract",
            action: "getsourcecode",
            chainid: this.chainId,
            apikey: this.apiKey,
            address,
          },
        },
        this.dispatcherOrDispatcherOptions,
      );
      responseBody =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to EtherscanGetSourceCodeResponse because that's what we expect from the API
        TODO: check if the API returns a different type and throw an error if it does */
        (await response.body.json()) as EtherscanGetSourceCodeResponse;
    } catch (error) {
      ensureError(error);

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
        {
          name: this.name,
          url: this.apiUrl,
          errorMessage:
            error.cause instanceof Error ? error.cause.message : error.message,
        },
      );
    }

    const isSuccessStatusCode =
      response.statusCode >= 200 && response.statusCode <= 299;
    if (!isSuccessStatusCode) {
      // TODO: we should consider throwing EXPLORER_REQUEST_FAILED here too
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_STATUS_CODE_ERROR,
        {
          name: this.name,
          url: this.apiUrl,
          statusCode: response.statusCode,
          errorMessage: responseBody.result,
        },
      );
    }

    if (responseBody.status !== "1") {
      return false;
    }

    const sourceCode = responseBody.result[0]?.SourceCode;
    return typeof sourceCode === "string" && sourceCode !== "";
  }

  public async verify({
    contractAddress,
    compilerInput,
    contractName,
    compilerVersion,
    constructorArguments,
  }: EtherscanVerifyFunctionArgs): Promise<string> {
    const body = {
      contractaddress: contractAddress,
      sourceCode: JSON.stringify(compilerInput),
      codeformat: "solidity-standard-json-input",
      contractname: contractName,
      compilerversion: compilerVersion,
      constructorArguments,
    };
    let response: HttpResponse;
    let responseBody: EtherscanResponse | undefined;
    try {
      response = await postFormRequest(
        this.apiUrl,
        body,
        {
          queryParams: {
            module: "contract",
            action: "verifysourcecode",
            chainid: this.chainId,
            apikey: this.apiKey,
          },
        },
        this.dispatcherOrDispatcherOptions,
      );
      responseBody =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to EtherscanResponse because that's what we expect from the API
        TODO: check if the API returns a different type and throw an error if it does */
        (await response.body.json()) as EtherscanResponse;
    } catch (error) {
      ensureError(error);

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
        {
          name: this.name,
          url: this.apiUrl,
          errorMessage:
            error.cause instanceof Error ? error.cause.message : error.message,
        },
      );
    }

    const isSuccessStatusCode =
      response.statusCode >= 200 && response.statusCode <= 299;
    if (!isSuccessStatusCode) {
      // TODO: we should consider throwing EXPLORER_REQUEST_FAILED here too
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_STATUS_CODE_ERROR,
        {
          name: this.name,
          url: this.apiUrl,
          statusCode: response.statusCode,
          errorMessage: responseBody.result,
        },
      );
    }

    const etherscanResponse = new EtherscanVerificationResponse(responseBody);

    if (etherscanResponse.isBytecodeMissingInNetworkError()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_MISSING_BYTECODE,
        {
          url: this.apiUrl,
          address: contractAddress,
        },
      );
    }

    if (etherscanResponse.isAlreadyVerified()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
        {
          contract: contractName,
          address: contractAddress,
        },
      );
    }

    if (!etherscanResponse.isOk()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_REQUEST_FAILED,
        { message: etherscanResponse.message },
      );
    }

    return etherscanResponse.message;
  }

  public async pollVerificationStatus(
    guid: string,
    contractAddress: string,
    contractName: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    let response: HttpResponse;
    let responseBody: EtherscanResponse | undefined;
    try {
      response = await getRequest(
        this.apiUrl,
        {
          queryParams: {
            module: "contract",
            action: "checkverifystatus",
            chainid: this.chainId,
            apikey: this.apiKey,
            guid,
          },
        },
        this.dispatcherOrDispatcherOptions,
      );
      responseBody =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to EtherscanResponse because that's what we expect from the API
        TODO: check if the API returns a different type and throw an error if it does */
        (await response.body.json()) as EtherscanResponse;
    } catch (error) {
      ensureError(error);

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
        {
          name: this.name,
          url: this.apiUrl,
          errorMessage:
            error.cause instanceof Error ? error.cause.message : error.message,
        },
      );
    }

    const isSuccessStatusCode =
      response.statusCode >= 200 && response.statusCode <= 299;
    if (!isSuccessStatusCode) {
      // TODO: we should consider throwing EXPLORER_REQUEST_FAILED here too
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_STATUS_CODE_ERROR,
        {
          name: this.name,
          url: this.apiUrl,
          statusCode: response.statusCode,
          errorMessage: responseBody.result,
        },
      );
    }

    const etherscanResponse = new EtherscanVerificationStatusResponse(
      responseBody,
    );

    if (etherscanResponse.isPending()) {
      await sleep(this.pollingIntervalMs);

      return this.pollVerificationStatus(guid, contractAddress, contractName);
    }

    if (etherscanResponse.isAlreadyVerified()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
        {
          contract: contractName,
          address: contractAddress,
        },
      );
    }

    if (etherscanResponse.isFailure() || etherscanResponse.isSuccess()) {
      return {
        success: etherscanResponse.isSuccess(),
        message: etherscanResponse.message,
      };
    }

    if (!etherscanResponse.isOk()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_STATUS_POLLING_FAILED,
        { message: etherscanResponse.message },
      );
    }

    // Reaching this point shouldn't be possible unless the API is behaving in a new way.
    throw new HardhatError(
      HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
      { message: etherscanResponse.message },
    );
  }
}

class EtherscanVerificationResponse implements VerificationResponse {
  public readonly status: number;
  public readonly message: string;

  constructor(response: EtherscanResponse) {
    this.status = Number(response.status);
    this.message = response.result;
  }

  public isBytecodeMissingInNetworkError(): boolean {
    return this.message.startsWith("Unable to locate ContractCode at");
  }

  public isAlreadyVerified(): boolean {
    return (
      this.message.startsWith("Contract source code already verified") ||
      this.message.startsWith("Already Verified")
    );
  }

  public isOk(): boolean {
    return this.status === 1;
  }
}

class EtherscanVerificationStatusResponse
  implements VerificationStatusResponse
{
  public readonly status: number;
  public readonly message: string;

  constructor(response: EtherscanResponse) {
    this.status = Number(response.status);
    this.message = response.result;
  }

  public isPending(): boolean {
    return this.message === "Pending in queue";
  }

  public isFailure(): boolean {
    return this.message.startsWith("Fail - Unable to verify");
  }

  public isSuccess(): boolean {
    return this.message === "Pass - Verified";
  }

  public isAlreadyVerified(): boolean {
    return (
      this.message.startsWith("Contract source code already verified") ||
      this.message.startsWith("Already Verified")
    );
  }

  public isOk(): boolean {
    return this.status === 1;
  }
}
