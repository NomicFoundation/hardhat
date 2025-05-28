import type {
  EtherscanGetSourceCodeResponse,
  EtherscanVerifySourceCodeResponse,
} from "./etherscan.types.js";
import type { HttpResponse } from "@nomicfoundation/hardhat-utils/request";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { sleep } from "@nomicfoundation/hardhat-utils/lang";
import {
  getRequest,
  postFormRequest,
} from "@nomicfoundation/hardhat-utils/request";

interface VerificationResponse {
  isPending(): boolean;
  isFailure(): boolean;
  isSuccess(): boolean;
  isOk(): boolean;
}

const VERIFICATION_STATUS_POLLING_SECONDS = 3;

export class Etherscan {
  public chainId: string;
  public name: string;
  public url: string;
  public apiUrl: string;
  public apiKey: string;

  constructor(etherscanConfig: {
    chainId: number;
    name?: string;
    url: string;
    apiUrl: string;
    apiKey: string;
  }) {
    this.chainId = String(etherscanConfig.chainId);
    this.name = etherscanConfig.name ?? "the block explorer";
    this.url = etherscanConfig.url;
    this.apiUrl = etherscanConfig.apiUrl; // TODO: etherscan v2 uses a fixed API URL
    this.apiKey = etherscanConfig.apiKey;
  }

  public getContractUrl(address: string) {
    return `${this.url}/address/${address}#code`;
  }

  public async isVerified(address: string): Promise<boolean> {
    let response: HttpResponse;
    let responseBody: EtherscanGetSourceCodeResponse | undefined;
    try {
      response = await getRequest(this.apiUrl, {
        queryParams: {
          module: "contract",
          action: "getsourcecode",
          chainid: this.chainId,
          apikey: this.apiKey,
          address,
        },
      });
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
          url: this.url,
          errorMessage: error.message,
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
          url: this.url,
          statusCode: response.statusCode,
          errorMessage: responseBody.result,
        },
      );
    }

    if (responseBody.message !== "OK") {
      return false;
    }

    const sourceCode = responseBody.result[0]?.SourceCode;
    return typeof sourceCode === "string" && sourceCode !== "";
  }

  public async verify(
    contractAddress: string,
    sourceCode: string,
    contractName: string,
    compilerVersion: string,
    constructorArguments: string,
  ): Promise<string> {
    let response: HttpResponse;
    let responseBody: EtherscanVerifySourceCodeResponse | undefined;
    try {
      response = await postFormRequest(this.apiUrl, {
        queryParams: {
          module: "contract",
          action: "verifysourcecode",
          chainid: this.chainId,
          apikey: this.apiKey,
          contractaddress: contractAddress,
          sourceCode,
          codeformat: "solidity-standard-json-input",
          contractname: contractName,
          compilerversion: compilerVersion,
          constructorArguments,
        },
      });
      responseBody =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to EtherscanVerifySourceCodeResponse because that's what we expect from the API
        TODO: check if the API returns a different type and throw an error if it does */
        (await response.body.json()) as EtherscanVerifySourceCodeResponse;
    } catch (error) {
      ensureError(error);

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
        {
          name: this.name,
          url: this.url,
          errorMessage: error.message,
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
          url: this.url,
          statusCode: response.statusCode,
          errorMessage: responseBody.result,
        },
      );
    }

    const etherscanResponse = new EtherscanResponse(responseBody);

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

    // TODO: is etherscanResponse.isPending() also a valid state here?
    if (!(etherscanResponse.isFailure() || etherscanResponse.isSuccess())) {
      // Reaching this point shouldn't be possible unless the API is behaving in a new way.
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
        { message: etherscanResponse.message },
      );
    }

    return etherscanResponse.message;
  }

  // TODO: we don't need to return the EtherscanResponse, we only need {success,  message}
  public async pollVerificationStatus(
    guid: string,
    contractAddress: string,
    contractName: string,
  ): Promise<EtherscanResponse> {
    let response: HttpResponse;
    let responseBody: EtherscanVerifySourceCodeResponse | undefined;
    try {
      response = await getRequest(this.apiUrl, {
        queryParams: {
          module: "contract",
          action: "checkverifystatus",
          chainid: this.chainId,
          apikey: this.apiKey,
          guid,
        },
      });
      responseBody =
        /* eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        -- Cast to EtherscanVerifySourceCodeResponse because that's what we expect from the API
        TODO: check if the API returns a different type and throw an error if it does */
        (await response.body.json()) as EtherscanVerifySourceCodeResponse;
    } catch (error) {
      ensureError(error);

      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_FAILED,
        {
          name: this.name,
          url: this.url,
          errorMessage: error.message,
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
          url: this.url,
          statusCode: response.statusCode,
          errorMessage: responseBody.result,
        },
      );
    }

    const etherscanResponse = new EtherscanResponse(responseBody);

    if (etherscanResponse.isPending()) {
      await sleep(VERIFICATION_STATUS_POLLING_SECONDS);

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

    if (!etherscanResponse.isOk()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_STATUS_POLLING_FAILED,
        { message: etherscanResponse.message },
      );
    }

    if (!(etherscanResponse.isFailure() || etherscanResponse.isSuccess())) {
      // Reaching this point shouldn't be possible unless the API is behaving in a new way.
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
        { message: etherscanResponse.message },
      );
    }

    return etherscanResponse;
  }
}

class EtherscanResponse implements VerificationResponse {
  public readonly status: number;
  public readonly message: string;

  constructor(response: EtherscanVerifySourceCodeResponse) {
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

  public isOk(): boolean {
    return this.status === 1;
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
}
