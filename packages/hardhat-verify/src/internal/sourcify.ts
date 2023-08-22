import type { Dispatcher } from "undici";
import {
  ContractVerificationRequestError,
  ContractVerificationInvalidStatusCodeError,
} from "./errors";
import { sendGetRequest, sendPostJSONRequest } from "./undici";
import { NomicLabsHardhatPluginError } from "hardhat/plugins";

class HardhatSourcifyError extends NomicLabsHardhatPluginError {
  constructor(message: string, parent?: Error) {
    super("@nomicfoundation/hardhat-verify", message, parent);
  }
}

interface SourcifyVerifyRequestParams {
  address: string;
  files: {
    [index: string]: string;
  };
  sourceName: string;
  chosenContract?: number;
}

// Used for polling the result of the contract verification.
const VERIFICATION_STATUS_POLLING_TIME = 3000;

export class Sourcify {
  private _apiUrl: string;
  private _browserUrl: string;
  private _chainId: number;

  constructor(chainId: number) {
    this._apiUrl = "https://sourcify.dev/server";
    this._browserUrl = "https://repo.sourcify.dev";
    this._chainId = chainId;
  }

  // https://docs.sourcify.dev/docs/api/server/check-all-by-addresses/
  public async isVerified(address: string) {
    const parameters = new URLSearchParams({
      addresses: address,
      chainIds: `${this._chainId}`,
    });

    const url = new URL(`${this._apiUrl}/check-all-by-addresses`);
    url.search = parameters.toString();

    const response = await sendGetRequest(url);
    const json = await response.body.json();

    const contract = json.find(
      (_contract: { address: string; status: string }) =>
        _contract.address === address
    );
    if (contract.status === "perfect" || contract.status === "partial") {
      return contract.status;
    } else {
      return false;
    }
  }

  // https://docs.sourcify.dev/docs/api/server/verify/
  public async verify({
    address,
    files,
    chosenContract,
  }: SourcifyVerifyRequestParams): Promise<SourcifyResponse> {
    const parameters = {
      address,
      files,
      chosenContract,
      chain: `${this._chainId}`,
    };

    let response: Dispatcher.ResponseData;
    try {
      response = await sendPostJSONRequest(
        new URL(this._apiUrl),
        JSON.stringify(parameters)
      );
    } catch (error) {
      throw new ContractVerificationRequestError(this._apiUrl, error as Error);
    }

    if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
      // This could be always interpreted as JSON if there were any such guarantee in the Sourcify API.
      const responseText = await response.body.text();
      throw new ContractVerificationInvalidStatusCodeError(
        this._apiUrl,
        response.statusCode,
        responseText
      );
    }

    const responseJson = await response.body.json();
    const sourcifyResponse = new SourcifyResponse(responseJson);

    if (!sourcifyResponse.isOk()) {
      throw new HardhatSourcifyError(sourcifyResponse.error);
    }

    return sourcifyResponse;
  }

  public getContractUrl(address: string, _matchType: string) {
    let matchType;
    if (_matchType === "perfect") {
      matchType = "full_match";
    } else if (_matchType === "partial") {
      matchType = "partial_match";
    } else {
      throw "Match type not supported";
    }
    return `${this._browserUrl}/contracts/${matchType}/${this._chainId}/${address}/`;
  }
}

interface SourcifyContract {
  address: string;
  chainId: string;
  status: string;
  storageTimestamp: string;
}

class SourcifyResponse {
  public readonly error: string;

  public readonly result: SourcifyContract[];

  constructor(response: any) {
    this.error = response.error;
    this.result = response.result;
  }

  public isFailure() {
    return this.error !== undefined;
  }

  public isSuccess() {
    return this.error === undefined;
  }

  public isOk() {
    return (
      this.result[0].status === "perfect" || this.result[0].status === "partial"
    );
  }

  public getStatus() {
    return this.result[0].status;
  }
}
