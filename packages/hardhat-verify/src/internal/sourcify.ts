import type { Dispatcher } from "undici";
import {
  ContractVerificationRequestError,
  ContractVerificationInvalidStatusCodeError,
  HardhatSourcifyError,
  MatchTypeNotSupportedError,
  SourcifyHardhatNetworkNotSupportedError,
  ChainConfigNotFoundError,
} from "./errors";
import { sendGetRequest, sendPostRequest } from "./undici";
import { EthereumProvider } from "hardhat/src/types";
import { ChainConfig } from "../types";
import { builtinChains } from "./chain-config";
import { HARDHAT_NETWORK_NAME } from "hardhat/src/plugins";

export class Sourcify {
  public _apiUrl: string;
  public _browserUrl: string;
  public _chainId: number;

  constructor(chainId: number) {
    this._apiUrl = "https://sourcify.dev/server";
    this._browserUrl = "https://repo.sourcify.dev";
    this._chainId = chainId;
  }

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
        throw new SourcifyHardhatNetworkNotSupportedError();
      }

      throw new ChainConfigNotFoundError(currentChainId);
    }

    return currentChainConfig;
  }

  // https://sourcify.dev/server/api-docs/#/Repository/get_check_all_by_addresses
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
      (_contract: { address: string }) => _contract.address === address
    );
    if (contract.status === "perfect" || contract.status === "partial") {
      return contract.status;
    } else {
      return false;
    }
  }

  // https://sourcify.dev/server/api-docs/#/Stateless%20Verification/post_verify
  public async verify(
    address: string,
    files: {
      [index: string]: string;
    },
    chosenContract?: number
  ): Promise<SourcifyResponse> {
    const parameters = {
      address,
      files,
      chosenContract,
      chain: `${this._chainId}`,
    };

    let response: Dispatcher.ResponseData;
    try {
      response = await sendPostRequest(
        new URL(this._apiUrl),
        JSON.stringify(parameters),
        { "Content-Type": "application/json" }
      );
    } catch (error) {
      throw new ContractVerificationRequestError(this._apiUrl, error as Error);
    }

    if (!(response.statusCode >= 200 && response.statusCode <= 299)) {
      const responseJson = await response.body.json();
      throw new ContractVerificationInvalidStatusCodeError(
        this._apiUrl,
        response.statusCode,
        JSON.stringify(responseJson)
      );
    }

    const responseJson = await response.body.json();
    const sourcifyResponse = new SourcifyResponse(responseJson);

    if (!sourcifyResponse.isOk()) {
      throw new HardhatSourcifyError(sourcifyResponse.error || "");
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
      throw new MatchTypeNotSupportedError(_matchType);
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

  public isSuccess() {
    return this.getError() === undefined;
  }

  public isOk() {
    return this.getStatus() === "perfect" || this.getStatus() === "partial";
  }

  public getStatus() {
    return this.result[0].status;
  }

  public getError() {
    return this.error;
  }
}
