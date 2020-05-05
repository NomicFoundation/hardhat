import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import debug from "debug";
import request from "request-promise";

import { EtherscanRequestParameters } from "./EtherscanVerifyContractRequest";

const log = debug("buidler:etherscan:etherscan-service");

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function verifyContract(
  url: string,
  req: EtherscanRequestParameters
): Promise<EtherscanResponse> {
  try {
    log("verifyContract url=%s req=%o", url, req);

    const response = new EtherscanResponse(
      // tslint:disable-next-line: await-promise
      await request.post(url, { form: req, json: true })
    );

    log("verifyContract: response=%o", response);

    if (!response.isOk()) {
      throw new BuidlerPluginError(response.message);
    }

    return response;
  } catch (error) {
    throw new BuidlerPluginError(
      `Failed to send contract verification request. Reason: ${error.message}`,
      error
    );
  }
}

export async function getVerificationStatus(
  url: string,
  apikey: string,
  guid: string
): Promise<EtherscanResponse> {
  try {
    log("getVerificationStatus url=%s apikey=%s guid=%s", url, apikey, guid);

    const response = new EtherscanResponse(
      // tslint:disable-next-line: await-promise
      await request.get(url, {
        json: true,
        qs: {
          apikey,
          module: "contract",
          action: "checkverifystatus",
          guid,
        },
      })
    );

    log("getVerificationStatus: response=%o", response);

    if (response.isPending()) {
      await delay(3000);

      return getVerificationStatus(url, apikey, guid);
    }
    if (!response.isOk()) {
      throw new BuidlerPluginError(response.message);
    }

    return response;
  } catch (error) {
    throw new BuidlerPluginError(
      `Failed to verify contract. Reason: ${error.message}`
    );
  }
}

export async function getCode(
  url: string,
  apikey: string,
  address: string
): Promise<EtherscanGetResponse> {
  try {
    log("getCode url=%s apikey=%s address=%s", url, apikey, address);

    const response = new EtherscanGetResponse(
      // tslint:disable-next-line: await-promise
      await request.get(url, {
        qs: {
          module: "proxy",
          action: "eth_getCode",
          address,
          tag: "latest",
          apikey,
        },
      })
    );

    log("getCode: response=%o", response);

    if (response.isPending()) {
      await delay(1000);

      return getCode(url, apikey, address);
    }
    if (!response.isOk()) {
      throw new BuidlerPluginError(JSON.stringify(response.error));
    }

    return response;
  } catch (error) {
    throw new BuidlerPluginError(
      `Failed to get contract code. Reason: ${error.message}`
    );
  }
}

export class EtherscanGetResponse {
  public readonly error: string;

  public readonly result: string;

  public constructor(responseJson: any) {
    const response = JSON.parse(responseJson);
    this.error = response.error;
    this.result = response.result;
  }

  public isPending() {
    return this.result === "Pending in queue";
  }

  public isOk() {
    return this.error === undefined;
  }
}

export default class EtherscanResponse {
  public readonly status: number;

  public readonly message: string;

  public constructor(response: any) {
    this.status = parseInt(response.status, 10);
    this.message = response.result;
  }

  public isPending() {
    return this.message === "Pending in queue";
  }

  public isOk() {
    return this.status === 1;
  }
}
