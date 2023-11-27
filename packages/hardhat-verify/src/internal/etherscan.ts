import type { EthereumProvider } from "hardhat/types";
import type { ChainConfig, ApiKey } from "../types";
import type {
  EtherscanGetSourceCodeResponse,
  EtherscanVerifyResponse,
} from "./etherscan.types";

import { HARDHAT_NETWORK_NAME } from "hardhat/plugins";

import {
  ContractStatusPollingInvalidStatusCodeError,
  ContractVerificationMissingBytecodeError,
  ContractVerificationInvalidStatusCodeError,
  HardhatVerifyError,
  MissingApiKeyError,
  ContractStatusPollingResponseNotOkError,
  ChainConfigNotFoundError,
  HardhatNetworkNotSupportedError,
  UnexpectedError,
} from "./errors";
import { isSuccessStatusCode, sendGetRequest, sendPostRequest } from "./undici";
import { ValidationResponse, sleep } from "./utilities";
import { builtinChains } from "./chain-config";

// Used for polling the result of the contract verification.
const VERIFICATION_STATUS_POLLING_TIME = 3000;

/**
 * Etherscan verification provider for verifying smart contracts.
 * It should work with other verification providers as long as the interface
 * is compatible with Etherscan's.
 */
export class Etherscan {
  /**
   * Create a new instance of the Etherscan verification provider.
   * @param apiKey - The Etherscan API key.
   * @param apiUrl - The Etherscan API URL, e.g. https://api.etherscan.io/api.
   * @param browserUrl - The Etherscan browser URL, e.g. https://etherscan.io.
   */
  constructor(
    public apiKey: string,
    public apiUrl: string,
    public browserUrl: string
  ) {}

  public static async getCurrentChainConfig(
    networkName: string,
    ethereumProvider: EthereumProvider,
    customChains: ChainConfig[]
  ): Promise<ChainConfig> {
    const currentChainId = parseInt(
      await ethereumProvider.send("eth_chainId"),
      16
    );

    const currentChainConfig = [
      // custom chains has higher precedence than builtin chains
      ...[...customChains].reverse(), // the last entry has higher precedence
      ...builtinChains,
    ].find(({ chainId }) => chainId === currentChainId);

    if (currentChainConfig === undefined) {
      if (networkName === HARDHAT_NETWORK_NAME) {
        throw new HardhatNetworkNotSupportedError();
      }

      throw new ChainConfigNotFoundError(currentChainId);
    }

    return currentChainConfig;
  }

  public static fromChainConfig(
    apiKey: ApiKey | undefined,
    chainConfig: ChainConfig
  ) {
    const resolvedApiKey = resolveApiKey(apiKey, chainConfig.network);
    const apiUrl = chainConfig.urls.apiURL;
    const browserUrl = chainConfig.urls.browserURL.trim().replace(/\/$/, "");

    return new Etherscan(resolvedApiKey, apiUrl, browserUrl);
  }

  /**
   * Check if a smart contract is verified on Etherscan.
   * @link https://docs.etherscan.io/api-endpoints/contracts#get-contract-source-code-for-verified-contract-source-codes
   * @param address - The address of the smart contract.
   * @returns True if the contract is verified, false otherwise.
   */
  public async isVerified(address: string) {
    const parameters = new URLSearchParams({
      apikey: this.apiKey,
      module: "contract",
      action: "getsourcecode",
      address,
    });

    const url = new URL(this.apiUrl);
    url.search = parameters.toString();

    try {
      const response = await sendGetRequest(url);
      const json =
        (await response.body.json()) as EtherscanGetSourceCodeResponse;

      if (!isSuccessStatusCode(response.statusCode)) {
        throw new ContractVerificationInvalidStatusCodeError(
          url.toString(),
          response.statusCode,
          JSON.stringify(json)
        );
      }

      if (json.message !== "OK") {
        return false;
      }

      const sourceCode = json.result[0]?.SourceCode;
      return (
        sourceCode !== undefined && sourceCode !== null && sourceCode !== ""
      );
    } catch (e) {
      if (e instanceof ContractVerificationInvalidStatusCodeError) {
        throw e;
      }
      throw new UnexpectedError(e, "Etherscan.isVerified");
    }
  }

  /**
   * Verify a smart contract on Etherscan.
   * @link https://docs.etherscan.io/api-endpoints/contracts#verify-source-code
   * @param contractAddress - The address of the smart contract to verify.
   * @param sourceCode - The source code of the smart contract.
   * @param contractName - The name of the smart contract, e.g. "contracts/Sample.sol:MyContract"
   * @param compilerVersion - The version of the Solidity compiler used, e.g. `v0.8.19+commit.7dd6d404`
   * @param constructorArguments - The encoded constructor arguments of the smart contract.
   * @returns A promise that resolves to an `EtherscanResponse` object.
   * @throws {ContractVerificationRequestError} if there is an error on the request.
   * @throws {ContractVerificationInvalidStatusCodeError} if the API returns an invalid status code.
   * @throws {ContractVerificationMissingBytecodeError} if the bytecode is not found on the block explorer.
   * @throws {HardhatVerifyError} if the response status is not OK.
   */
  public async verify(
    contractAddress: string,
    sourceCode: string,
    contractName: string,
    compilerVersion: string,
    constructorArguments: string
  ): Promise<EtherscanResponse> {
    const parameters = new URLSearchParams({
      apikey: this.apiKey,
      module: "contract",
      action: "verifysourcecode",
      contractaddress: contractAddress,
      sourceCode,
      codeformat: "solidity-standard-json-input",
      contractname: contractName,
      compilerversion: compilerVersion,
      constructorArguements: constructorArguments,
    });

    const url = new URL(this.apiUrl);
    try {
      const response = await sendPostRequest(url, parameters.toString(), {
        "Content-Type": "application/x-www-form-urlencoded",
      });
      const json = (await response.body.json()) as EtherscanVerifyResponse;

      if (!isSuccessStatusCode(response.statusCode)) {
        throw new ContractVerificationInvalidStatusCodeError(
          url.toString(),
          response.statusCode,
          JSON.stringify(json)
        );
      }

      const etherscanResponse = new EtherscanResponse(json);

      if (etherscanResponse.isBytecodeMissingInNetworkError()) {
        throw new ContractVerificationMissingBytecodeError(
          this.apiUrl,
          contractAddress
        );
      }

      if (!etherscanResponse.isOk()) {
        throw new HardhatVerifyError(etherscanResponse.message);
      }

      return etherscanResponse;
    } catch (e) {
      if (
        e instanceof ContractVerificationInvalidStatusCodeError ||
        e instanceof ContractVerificationMissingBytecodeError
      ) {
        throw e;
      }
      throw new UnexpectedError(e, "Etherscan.verify");
    }
  }

  /**
   * Get the verification status of a smart contract from Etherscan.
   * This method performs polling of the verification status if it's pending.
   * @link https://docs.etherscan.io/api-endpoints/contracts#check-source-code-verification-submission-status
   * @param guid - The verification GUID to check.
   * @returns A promise that resolves to an `EtherscanResponse` object.
   * @throws {ContractStatusPollingError} if there is an error on the request.
   * @throws {ContractStatusPollingInvalidStatusCodeError} if the API returns an invalid status code.
   * @throws {ContractStatusPollingResponseNotOkError} if the response status is not OK.
   */
  public async getVerificationStatus(guid: string): Promise<EtherscanResponse> {
    const parameters = new URLSearchParams({
      apikey: this.apiKey,
      module: "contract",
      action: "checkverifystatus",
      guid,
    });
    const url = new URL(this.apiUrl);
    url.search = parameters.toString();

    try {
      const response = await sendGetRequest(url);
      const json = (await response.body.json()) as EtherscanVerifyResponse;

      if (!isSuccessStatusCode(response.statusCode)) {
        throw new ContractStatusPollingInvalidStatusCodeError(
          response.statusCode,
          JSON.stringify(json)
        );
      }

      const etherscanResponse = new EtherscanResponse(json);

      if (etherscanResponse.isPending()) {
        await sleep(VERIFICATION_STATUS_POLLING_TIME);

        return await this.getVerificationStatus(guid);
      }

      if (etherscanResponse.isFailure()) {
        return etherscanResponse;
      }

      if (!etherscanResponse.isOk()) {
        throw new ContractStatusPollingResponseNotOkError(
          etherscanResponse.message
        );
      }

      return etherscanResponse;
    } catch (e) {
      if (
        e instanceof ContractStatusPollingInvalidStatusCodeError ||
        e instanceof ContractStatusPollingResponseNotOkError
      ) {
        throw e;
      }
      throw new UnexpectedError(e, "Etherscan.getVerificationStatus");
    }
  }

  /**
   * Get the Etherscan URL for viewing a contract's details.
   * @param address - The address of the smart contract.
   * @returns The URL to view the contract on Etherscan's website.
   */
  public getContractUrl(address: string) {
    return `${this.browserUrl}/address/${address}#code`;
  }
}

class EtherscanResponse implements ValidationResponse {
  public readonly status: number;
  public readonly message: string;

  constructor(response: EtherscanVerifyResponse) {
    this.status = parseInt(response.status, 10);
    this.message = response.result;
  }

  public isPending() {
    return this.message === "Pending in queue";
  }

  public isFailure() {
    return this.message === "Fail - Unable to verify";
  }

  public isSuccess() {
    return this.message === "Pass - Verified";
  }

  public isBytecodeMissingInNetworkError() {
    return this.message.startsWith("Unable to locate ContractCode at");
  }

  public isOk() {
    return this.status === 1;
  }
}

function resolveApiKey(apiKey: ApiKey | undefined, network: string) {
  if (apiKey === undefined || apiKey === "") {
    throw new MissingApiKeyError(network);
  }

  if (typeof apiKey === "string") {
    return apiKey;
  }

  const key = apiKey[network];

  if (key === undefined || key === "") {
    throw new MissingApiKeyError(network);
  }

  return key;
}
