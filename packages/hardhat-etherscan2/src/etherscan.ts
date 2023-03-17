import { Dispatcher } from "undici";
import {
  ContractStatusPollingError,
  ContractStatusPollingInvalidStatusCodeError,
  ContractVerificationError,
  ContractVerificationMissingBytecodeError,
  ContractVerificationInvalidStatusCodeError,
  HardhatEtherscanError,
  MissingApiKeyError,
  ContractStatusPollingResponseNotOkError,
} from "./errors";
import { sendGetRequest, sendPostRequest } from "./undici";

import { ChainConfig, ApiKey } from "./types";
import { delay } from "./utilities";

interface EtherscanVerifyRequestParams {
  apiKey: string;
  contractAddress: string;
  sourceCode: string;
  sourceName: string;
  contractName: string;
  compilerVersion: string;
  constructorArguments: string;
}

// Used for polling the result of the contract verification.
const VERIFICATION_STATUS_POLLING_TIME = 3000;

export class Etherscan {
  private apiKey: string;
  private apiUrl: string;
  private browserUrl: string;

  constructor(apiKey: ApiKey | undefined, chainConfig: ChainConfig) {
    this.apiKey = resolveApiKey(apiKey, chainConfig.network);
    this.apiUrl = chainConfig.urls.apiURL;
    this.browserUrl = chainConfig.urls.browserURL.trim().replace(/\/$/, "");
  }

  public async isVerified(address: string) {
    const parameters = new URLSearchParams({
      module: "contract",
      action: "getsourcecode",
      address,
      apikey: this.apiKey,
    });

    const url = new URL(this.apiUrl);
    url.search = parameters.toString();

    const response = await sendGetRequest(url);
    const json = await response.body.json();

    if (json.message !== "OK") {
      return false;
    }

    const sourceCode = json?.result?.[0]?.SourceCode;
    return sourceCode !== undefined && sourceCode !== "";
  }

  public async verify({
    apiKey,
    contractAddress,
    sourceCode,
    sourceName,
    contractName,
    compilerVersion,
    constructorArguments,
  }: EtherscanVerifyRequestParams): Promise<EtherscanResponse> {
    const parameters = new URLSearchParams({
      apikey: apiKey,
      module: "contract",
      action: "verifysourcecode",
      contractaddress: contractAddress,
      sourceCode,
      codeformat: "solidity-standard-json-input",
      contractname: `${sourceName}:${contractName}`,
      compilerversion: compilerVersion,
      constructorArguements: constructorArguments,
    });

    let response: Dispatcher.ResponseData;
    try {
      response = await sendPostRequest(
        new URL(this.apiUrl),
        parameters.toString()
      );
    } catch (error: any) {
      throw new ContractVerificationError(this.apiUrl, error);
    }

    if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.body.text();
      throw new ContractVerificationInvalidStatusCodeError(
        this.apiUrl,
        response.statusCode,
        responseText
      );
    }

    const etherscanResponse = new EtherscanResponse(await response.body.json());

    if (etherscanResponse.isBytecodeMissingInNetworkError()) {
      throw new ContractVerificationMissingBytecodeError(
        this.apiUrl,
        contractAddress
      );
    }

    if (!etherscanResponse.isOk()) {
      throw new HardhatEtherscanError(etherscanResponse.message);
    }

    return etherscanResponse;
  }

  public async getVerificationStatus(guid: string): Promise<EtherscanResponse> {
    const parameters = new URLSearchParams({
      apikey: this.apiKey,
      module: "contract",
      action: "checkverifystatus",
      guid,
    });
    const url = new URL(this.apiUrl);
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
      await delay(VERIFICATION_STATUS_POLLING_TIME);

      return this.getVerificationStatus(guid);
    }

    if (etherscanResponse.isVerificationFailure()) {
      return etherscanResponse;
    }

    if (!etherscanResponse.isOk()) {
      throw new ContractStatusPollingResponseNotOkError(
        etherscanResponse.message
      );
    }

    return etherscanResponse;
  }

  public getContractUrl(address: string): string {
    return `${this.browserUrl}/address/${address}#code`;
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

  public isVerificationFailure() {
    return this.message === "Fail - Unable to verify";
  }

  public isVerificationSuccess() {
    return this.message === "Pass - Verified";
  }

  public isBytecodeMissingInNetworkError() {
    return this.message.startsWith("Unable to locate ContractCode at");
  }

  public isOk() {
    return this.status === 1;
  }
}

const resolveApiKey = (apiKey: ApiKey | undefined, network: string) => {
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
};
