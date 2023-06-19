import type { Dispatcher } from "undici";

import {
  ContractStatusPollingError,
  ContractStatusPollingInvalidStatusCodeError,
  ContractVerificationRequestError,
  ContractVerificationMissingBytecodeError,
  ContractVerificationInvalidStatusCodeError,
  HardhatVerifyError,
  MissingApiKeyError,
  ContractStatusPollingResponseNotOkError,
} from "./errors";
import { sendGetRequest, sendPostRequest } from "./undici";

import { ChainConfig, ApiKey } from "./types";
import { sleep } from "./utilities";

interface EtherscanVerifyRequestParams {
  address: string;
  sourceCode: string;
  sourceName: string;
  contractName: string;
  compilerVersion: string;
  encodedConstructorArguments: string;
}

// Used for polling the result of the contract verification.
const VERIFICATION_STATUS_POLLING_TIME = 3000;

export class Etherscan {
  private _apiKey: string;
  private _apiUrl: string;
  private _browserUrl: string;

  constructor(apiKey: ApiKey | undefined, chainConfig: ChainConfig) {
    this._apiKey = resolveApiKey(apiKey, chainConfig.network);
    this._apiUrl = chainConfig.urls.apiURL;
    this._browserUrl = chainConfig.urls.browserURL.trim().replace(/\/$/, "");
  }

  // https://docs.etherscan.io/api-endpoints/contracts#get-contract-source-code-for-verified-contract-source-codes
  public async isVerified(address: string) {
    const parameters = new URLSearchParams({
      apikey: this._apiKey,
      module: "contract",
      action: "getsourcecode",
      address,
    });

    const url = new URL(this._apiUrl);
    url.search = parameters.toString();

    const response = await sendGetRequest(url);
    const json = await response.body.json();

    if (json.message !== "OK") {
      return false;
    }

    const sourceCode = json?.result?.[0]?.SourceCode;
    return sourceCode !== undefined && sourceCode !== "";
  }

  // https://docs.etherscan.io/api-endpoints/contracts#verify-source-code
  public async verify({
    address,
    sourceCode,
    sourceName,
    contractName,
    compilerVersion,
    encodedConstructorArguments,
  }: EtherscanVerifyRequestParams): Promise<EtherscanResponse> {
    const parameters = new URLSearchParams({
      apikey: this._apiKey,
      module: "contract",
      action: "verifysourcecode",
      contractaddress: address,
      sourceCode,
      codeformat: "solidity-standard-json-input",
      contractname: `${sourceName}:${contractName}`,
      compilerversion: `v${compilerVersion}`,
      constructorArguements: encodedConstructorArguments,
    });

    let response: Dispatcher.ResponseData;
    try {
      response = await sendPostRequest(
        new URL(this._apiUrl),
        parameters.toString()
      );
    } catch (error: any) {
      throw new ContractVerificationRequestError(this._apiUrl, error);
    }

    if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.body.text();
      throw new ContractVerificationInvalidStatusCodeError(
        this._apiUrl,
        response.statusCode,
        responseText
      );
    }

    const etherscanResponse = new EtherscanResponse(await response.body.json());

    if (etherscanResponse.isBytecodeMissingInNetworkError()) {
      throw new ContractVerificationMissingBytecodeError(this._apiUrl, address);
    }

    if (!etherscanResponse.isOk()) {
      throw new HardhatVerifyError(etherscanResponse.message);
    }

    return etherscanResponse;
  }

  // https://docs.etherscan.io/api-endpoints/contracts#check-source-code-verification-submission-status
  public async getVerificationStatus(guid: string): Promise<EtherscanResponse> {
    const parameters = new URLSearchParams({
      apikey: this._apiKey,
      module: "contract",
      action: "checkverifystatus",
      guid,
    });
    const url = new URL(this._apiUrl);
    url.search = parameters.toString();

    let response;
    try {
      response = await sendGetRequest(url);
    } catch (error: any) {
      throw new ContractStatusPollingError(url.toString(), error);
    }

    if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.body.text();

      throw new ContractStatusPollingInvalidStatusCodeError(
        response.statusCode,
        responseText
      );
    }

    const etherscanResponse = new EtherscanResponse(await response.body.json());

    if (etherscanResponse.isPending()) {
      await sleep(VERIFICATION_STATUS_POLLING_TIME);

      return this.getVerificationStatus(guid);
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
  }

  public getContractUrl(address: string) {
    return `${this._browserUrl}/address/${address}#code`;
  }
}

class EtherscanResponse {
  public readonly status: number;

  public readonly message: string;

  constructor(response: any) {
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
