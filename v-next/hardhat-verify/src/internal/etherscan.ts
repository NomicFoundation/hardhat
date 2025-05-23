import type { EtherscanGetSourceCodeResponse } from "./etherscan.types.js";
import type { HttpResponse } from "@nomicfoundation/hardhat-utils/request";

import { HardhatError } from "@nomicfoundation/hardhat-errors";
import { ensureError } from "@nomicfoundation/hardhat-utils/error";
import { getRequest } from "@nomicfoundation/hardhat-utils/request";

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
    this.chainId = etherscanConfig.chainId.toString();
    this.name = etherscanConfig.name ?? "the block explorer";
    this.url = etherscanConfig.url;
    this.apiUrl = etherscanConfig.apiUrl;
    this.apiKey = etherscanConfig.apiKey;
  }

  public async isVerified(address: string): Promise<boolean> {
    let response: HttpResponse;
    let responseBody: EtherscanGetSourceCodeResponse | undefined;
    try {
      response = await getRequest(this.apiUrl, {
        queryParams: {
          module: "contract",
          action: "getsourcecode",
          chainid: this.chainId.toString(),
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

  public getContractUrl(address: string) {
    return `${this.url}/address/${address}#code`;
  }
}
