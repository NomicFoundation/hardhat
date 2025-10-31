import type {
  SourcifyErrorResponse,
  SourcifyLookupResponse,
  SourcifyVerificationStatusResponse,
  SourcifyVerificationResponse,
} from "./sourcify.types.js";
import type {
  VerificationProvider,
  VerificationStatusResponse,
} from "./types.js";
import type {
  Dispatcher,
  DispatcherOptions,
  HttpResponse,
} from "@nomicfoundation/hardhat-utils/request";
import type { VerificationProvidersConfig } from "hardhat/types/config";
import type { CompilerInput } from "hardhat/types/solidity";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { sleep } from "@nomicfoundation/hardhat-utils/lang";
import {
  getProxyUrl,
  getRequest,
  postJsonRequest,
  ResponseStatusCodeError,
  shouldUseProxy,
} from "@nomicfoundation/hardhat-utils/request";

export const SOURCIFY_PROVIDER_NAME: keyof VerificationProvidersConfig =
  "sourcify";

const VERIFICATION_STATUS_POLLING_SECONDS = 3;

export const SOURCIFY_API_URL = "https://sourcify.dev/server";

export class Sourcify implements VerificationProvider {
  public readonly chainId: string;
  public readonly name: string;
  public readonly url: string;
  public readonly apiUrl: string;
  public readonly dispatcherOrDispatcherOptions?:
    | Dispatcher
    | DispatcherOptions;
  public readonly pollingIntervalMs: number;

  constructor(sourcifyConfig: {
    chainId: number;
    name?: string;
    apiUrl?: string;
    dispatcher?: Dispatcher;
  }) {
    this.chainId = String(sourcifyConfig.chainId);
    this.name = sourcifyConfig.name ?? "Sourcify";
    this.apiUrl = sourcifyConfig.apiUrl ?? SOURCIFY_API_URL;
    this.url = `${this.apiUrl}/repo-ui`;

    const proxyUrl = shouldUseProxy(this.apiUrl)
      ? getProxyUrl(this.apiUrl)
      : undefined;
    this.dispatcherOrDispatcherOptions =
      sourcifyConfig.dispatcher ??
      (proxyUrl !== undefined ? { proxy: proxyUrl } : {});

    this.pollingIntervalMs =
      sourcifyConfig.dispatcher !== undefined
        ? 0
        : VERIFICATION_STATUS_POLLING_SECONDS;
  }

  public getContractUrl(address: string): string {
    return `${this.url}/${this.chainId}/${address}`;
  }

  public getVerificationJobUrl(guid: string): string {
    return `${this.apiUrl}/verify-ui/jobs/${guid}`;
  }

  public async isVerified(address: string): Promise<boolean> {
    let response: HttpResponse;
    let responseBody: SourcifyLookupResponse | SourcifyErrorResponse;
    try {
      response = await getRequest(
        `${this.apiUrl}/v2/contract/${this.chainId}/${address}`,
        {},
        this.dispatcherOrDispatcherOptions,
      );
      responseBody = await response.body.json();
    } catch (error) {
      ensureError(error);

      if (
        error instanceof ResponseStatusCodeError &&
        isSourcifyLookupResponse(error?.body)
      ) {
        // Unverified contracts are returned with status 404
        return error.body.match !== null;
      }

      if (
        error instanceof ResponseStatusCodeError &&
        isSourcifyErrorResponse(error?.body)
      ) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.EXPLORER_REQUEST_STATUS_CODE_ERROR,
          {
            name: this.name,
            url: this.apiUrl,
            statusCode: error.statusCode,
            errorMessage: error.body.message,
          },
        );
      }

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

    if (!isSourcifyLookupResponse(responseBody)) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
        { message: JSON.stringify(responseBody) },
      );
    }

    return responseBody.match !== null;
  }

  public async verify(
    contractAddress: string,
    compilerInput: CompilerInput,
    contractName: string,
    compilerVersion: string,
    _constructorArguments?: string,
    creationTxHash?: string,
  ): Promise<string> {
    const body: {
      stdJsonInput: CompilerInput;
      contractIdentifier: string;
      compilerVersion: string;
      creationTransactionHash?: string;
    } = {
      stdJsonInput: compilerInput,
      contractIdentifier: contractName,
      compilerVersion,
    };

    if (creationTxHash !== undefined) {
      body.creationTransactionHash = creationTxHash;
    }

    let response: HttpResponse;
    let responseBody: SourcifyVerificationResponse | SourcifyErrorResponse;
    try {
      response = await postJsonRequest(
        `${this.apiUrl}/v2/verify/${this.chainId}/${contractAddress}`,
        body,
        {},
        this.dispatcherOrDispatcherOptions,
      );
      responseBody = await response.body.json();
    } catch (error) {
      ensureError(error);

      if (
        error instanceof ResponseStatusCodeError &&
        isSourcifyErrorResponse(error?.body)
      ) {
        if (error.body.customCode === "already_verified") {
          throw new HardhatError(
            HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
            {
              contract: contractName,
              address: contractAddress,
            },
          );
        }

        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_REQUEST_FAILED,
          { message: error.body.message },
        );
      }

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

    if (!isSourcifyVerificationResponse(responseBody)) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
        { message: JSON.stringify(responseBody) },
      );
    }

    return responseBody.verificationId;
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
    let responseBody:
      | SourcifyVerificationStatusResponse
      | SourcifyErrorResponse;
    try {
      response = await getRequest(
        `${this.apiUrl}/v2/verify/${guid}`,
        {},
        this.dispatcherOrDispatcherOptions,
      );
      responseBody = await response.body.json();
    } catch (error) {
      ensureError(error);

      if (
        error instanceof ResponseStatusCodeError &&
        isSourcifyErrorResponse(error?.body)
      ) {
        throw new HardhatError(
          HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_STATUS_POLLING_FAILED,
          { message: error.body.message },
        );
      }

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

    if (!isSourcifyVerificationStatusResponse(responseBody)) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
        { message: JSON.stringify(responseBody) },
      );
    }

    const verificationStatus = new SourcifyVerificationStatus(responseBody);

    if (verificationStatus.isPending()) {
      await sleep(this.pollingIntervalMs);

      return this.pollVerificationStatus(guid, contractAddress, contractName);
    }

    if (verificationStatus.isAlreadyVerified()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_ALREADY_VERIFIED,
        {
          contract: contractName,
          address: contractAddress,
        },
      );
    }

    if (verificationStatus.isBytecodeMissingInNetworkError()) {
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_MISSING_BYTECODE,
        {
          url: this.apiUrl,
          address: contractAddress,
        },
      );
    }

    if (!(verificationStatus.isFailure() || verificationStatus.isSuccess())) {
      // Reaching this point shouldn't be possible unless the API is behaving in a new way.
      throw new HardhatError(
        HardhatError.ERRORS.HARDHAT_VERIFY.GENERAL.CONTRACT_VERIFICATION_UNEXPECTED_RESPONSE,
        { message: verificationStatus.message },
      );
    }

    const success = verificationStatus.isSuccess();
    let message = verificationStatus.message;
    if (!success) {
      message = `${message}
         More info at: ${this.getVerificationJobUrl(guid)}`;
    }
    return {
      success,
      message,
    };
  }
}

function isSourcifyErrorResponse(
  response: any,
): response is SourcifyErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "customCode" in response &&
    "message" in response &&
    "errorId" in response
  );
}

function isSourcifyLookupResponse(
  response: any,
): response is SourcifyLookupResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "match" in response &&
    "creationMatch" in response &&
    "runtimeMatch" in response &&
    "chainId" in response &&
    "address" in response
  );
}

function isSourcifyVerificationResponse(
  response: any,
): response is SourcifyVerificationResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "verificationId" in response
  );
}

function isSourcifyVerificationStatusResponse(
  response: any,
): response is SourcifyVerificationStatusResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "isJobCompleted" in response &&
    "verificationId" in response &&
    "jobStartTime" in response &&
    "contract" in response
  );
}

class SourcifyVerificationStatus implements VerificationStatusResponse {
  public readonly response: SourcifyVerificationStatusResponse;

  constructor(response: SourcifyVerificationStatusResponse) {
    this.response = response;
  }

  public get message(): string {
    if (!this.response.isJobCompleted) {
      return "Pending in queue";
    }
    if (this.response.error !== undefined) {
      return this.response.error.message;
    }
    return `Contract verified with status "${this.response.contract.match}"`;
  }

  public isPending(): boolean {
    return !this.response.isJobCompleted;
  }

  public isFailure(): boolean {
    return this.response.isJobCompleted && this.response.error !== undefined;
  }

  public isSuccess(): boolean {
    return (
      this.response.isJobCompleted &&
      this.response.error === undefined &&
      this.response.contract.match !== null
    );
  }

  public isBytecodeMissingInNetworkError(): boolean {
    return (
      this.response.isJobCompleted &&
      this.response.error?.customCode === "contract_not_deployed"
    );
  }

  public isAlreadyVerified(): boolean {
    return (
      this.response.isJobCompleted &&
      this.response.error?.customCode === "already_verified"
    );
  }

  public isOk(): boolean {
    // This class is based on SourcifyVerificationStatusResponse, which already means that the request was successful.
    return true;
  }
}
