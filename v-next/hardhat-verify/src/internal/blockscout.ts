import type {
  BlockscoutChainListResponse,
  BlockscoutGetSourceCodeResponse,
  BlockscoutResponse,
} from "./blockscout.types.js";
import type {
  VerificationProvider,
  VerificationResponse,
  VerificationStatusResponse,
  BaseVerifyFunctionArgs,
  CreateBlockscoutOptions,
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

export const BLOCKSCOUT_PROVIDER_NAME: keyof VerificationProvidersConfig =
  "blockscout";

const VERIFICATION_STATUS_POLLING_SECONDS = 3;

export interface BlockscoutVerifyFunctionArgs extends BaseVerifyFunctionArgs {
  constructorArguments: string;
}

let supportedChainsCache: ChainDescriptorsConfig | undefined;

export class Blockscout implements VerificationProvider {
  public readonly name: string;
  public readonly url: string;
  public readonly apiUrl: string;
  public readonly dispatcherOrDispatcherOptions?:
    | Dispatcher
    | DispatcherOptions;
  public readonly pollingIntervalMs: number;

  public static async resolveConfig({
    chainId,
    networkName,
    chainDescriptors,
    dispatcher,
  }: ResolveConfigOptions): Promise<CreateBlockscoutOptions> {
    const chainDescriptor = chainDescriptors.get(toBigInt(chainId));

    let blockExplorerConfig = chainDescriptor?.blockExplorers.blockscout;
    if (blockExplorerConfig === undefined) {
      const supportedChains = await Blockscout.getSupportedChains();
      blockExplorerConfig = supportedChains.get(toBigInt(chainId))
        ?.blockExplorers.blockscout;
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
          verificationProvider: "Blockscout",
          chainId,
        },
      );
    }

    return {
      blockExplorerConfig,
      dispatcher,
    };
  }

  public static async create({
    blockExplorerConfig,
    dispatcher,
  }: CreateBlockscoutOptions): Promise<Blockscout> {
    return new Blockscout({
      ...blockExplorerConfig,
      dispatcher,
    });
  }

  public static async getSupportedChains(): Promise<ChainDescriptorsConfig> {
    if (supportedChainsCache !== undefined) {
      return supportedChainsCache;
    }

    const supportedChains: ChainDescriptorsConfig = new Map();

    try {
      const response = await getRequest(
        "https://chains.blockscout.com/api/chains",
      );
      const chainListData: BlockscoutChainListResponse =
        await response.body.json();

      for (const [chainId, chain] of Object.entries(chainListData)) {
        const blockExplorer = chain.explorers.find(
          (explorer) => explorer.hostedBy.toLowerCase() === "blockscout",
        );

        if (blockExplorer === undefined) {
          continue;
        }

        supportedChains.set(toBigInt(chainId), {
          name: chain.name,
          chainType: "generic",
          blockExplorers: {
            blockscout: {
              url: blockExplorer.url,
              apiUrl: `${blockExplorer.url}/api`,
            },
          },
        });
      }
    } catch {
      // ignore errors
    }

    supportedChainsCache = supportedChains;

    return supportedChains;
  }

  constructor(blockscoutConfig: {
    name?: string;
    url: string;
    apiUrl: string;
    dispatcher?: Dispatcher;
  }) {
    this.name = blockscoutConfig.name ?? "Blockscout";
    this.url = blockscoutConfig.url;
    this.apiUrl = blockscoutConfig.apiUrl;

    const proxyUrl = shouldUseProxy(this.apiUrl)
      ? getProxyUrl(this.apiUrl)
      : undefined;
    this.dispatcherOrDispatcherOptions =
      blockscoutConfig.dispatcher ??
      (proxyUrl !== undefined ? { proxy: proxyUrl } : {});

    this.pollingIntervalMs =
      blockscoutConfig.dispatcher !== undefined
        ? 0
        : VERIFICATION_STATUS_POLLING_SECONDS;
  }

  public getContractUrl(address: string): string {
    return `${this.url}/address/${address}#code`;
  }

  public async isVerified(address: string): Promise<boolean> {
    let response: HttpResponse;
    let responseBody: BlockscoutGetSourceCodeResponse | undefined;
    try {
      response = await getRequest(
        this.apiUrl,
        {
          queryParams: {
            module: "contract",
            action: "getsourcecode",
            address,
          },
        },
        this.dispatcherOrDispatcherOptions,
      );
      responseBody =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
          -- Cast to BlockscoutGetSourceCodeResponse because that's what we expect from the API
          TODO: check if the API returns a different type and throw an error if it does */
        (await response.body.json()) as BlockscoutGetSourceCodeResponse;
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
  }: BlockscoutVerifyFunctionArgs): Promise<string> {
    const body = {
      contractaddress: contractAddress,
      sourceCode: JSON.stringify(compilerInput),
      codeformat: "solidity-standard-json-input",
      contractname: contractName,
      compilerversion: compilerVersion,
      constructorArguments,
    };
    let response: HttpResponse;
    let responseBody: BlockscoutResponse | undefined;
    try {
      response = await postFormRequest(
        this.apiUrl,
        body,
        {
          queryParams: {
            module: "contract",
            action: "verifysourcecode",
          },
        },
        this.dispatcherOrDispatcherOptions,
      );
      responseBody =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to BlockscoutResponse because that's what we expect from the API
        TODO: check if the API returns a different type and throw an error if it does */
        (await response.body.json()) as BlockscoutResponse;
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

    const blockscoutResponse = new BlockscoutVerificationResponse(responseBody);

    if (blockscoutResponse.isBytecodeMissingInNetworkError()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_MISSING_BYTECODE,
        {
          url: this.apiUrl,
          address: contractAddress,
        },
      );
    }

    if (blockscoutResponse.isAlreadyVerified()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
        {
          contract: contractName,
          address: contractAddress,
        },
      );
    }

    if (blockscoutResponse.addressIsNotAContract()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.ADDRESS_NOT_A_CONTRACT,
        {
          verificationProvider: this.name,
          address: contractAddress,
        },
      );
    }

    if (!blockscoutResponse.isOk()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_REQUEST_FAILED,
        { message: blockscoutResponse.message },
      );
    }

    return blockscoutResponse.message;
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
    let responseBody: BlockscoutResponse | undefined;
    try {
      response = await getRequest(
        this.apiUrl,
        {
          queryParams: {
            module: "contract",
            action: "checkverifystatus",
            guid,
          },
        },
        this.dispatcherOrDispatcherOptions,
      );
      responseBody =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to BlockscoutResponse because that's what we expect from the API
        TODO: check if the API returns a different type and throw an error if it does */
        (await response.body.json()) as BlockscoutResponse;
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

    const blockscoutResponse = new BlockscoutVerificationStatusResponse(
      responseBody,
    );

    if (blockscoutResponse.isPending()) {
      await sleep(this.pollingIntervalMs);

      return this.pollVerificationStatus(guid, contractAddress, contractName);
    }

    if (blockscoutResponse.isAlreadyVerified()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
        {
          contract: contractName,
          address: contractAddress,
        },
      );
    }

    if (!blockscoutResponse.isOk()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_STATUS_POLLING_FAILED,
        { message: blockscoutResponse.message },
      );
    }

    if (!(blockscoutResponse.isFailure() || blockscoutResponse.isSuccess())) {
      // Reaching this point shouldn't be possible unless the API is behaving in a new way.
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
        { message: blockscoutResponse.message },
      );
    }

    return {
      success: blockscoutResponse.isSuccess(),
      message: blockscoutResponse.message,
    };
  }
}

class BlockscoutVerificationResponse implements VerificationResponse {
  public readonly status: number;
  public readonly message: string;

  constructor(response: BlockscoutResponse) {
    this.status = Number(response.status);
    this.message = response.result;
  }

  public isBytecodeMissingInNetworkError(): boolean {
    return this.message.startsWith("Unable to locate ContractCode at");
  }

  public isAlreadyVerified(): boolean {
    return this.message.startsWith("Smart-contract already verified.");
  }

  public addressIsNotAContract(): boolean {
    return this.message.startsWith("The address is not a smart contract");
  }

  public isOk(): boolean {
    return this.status === 1;
  }
}

class BlockscoutVerificationStatusResponse
  implements VerificationStatusResponse
{
  public readonly status: number;
  public readonly message: string;

  constructor(response: BlockscoutResponse) {
    this.status = Number(response.status);
    this.message = response.result;
  }

  public isPending(): boolean {
    return this.message === "Pending in queue";
  }

  public isFailure(): boolean {
    return this.message === "Fail - Unable to verify";
  }

  public isSuccess(): boolean {
    return this.message === "Pass - Verified";
  }

  public isAlreadyVerified(): boolean {
    return this.message.startsWith("Smart-contract already verified.");
  }

  public isOk(): boolean {
    return this.status === 1;
  }
}
