import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import request from "request-promise";

import { EtherscanRequestParameters } from "./EtherscanVerifyContractRequest";

async function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function verifyContract(
  url: string,
  req: EtherscanRequestParameters
): Promise<EtherscanResponse> {
  try {
    const response = new EtherscanResponse(
      // tslint:disable-next-line: await-promise
      await request.post(url, { form: req, json: true })
    );

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
  guid: string
): Promise<EtherscanResponse> {
  try {
    const response = new EtherscanResponse(
      // tslint:disable-next-line: await-promise
      await request.get(url, {
        json: true,
        qs: {
          module: "contract",
          action: "checkverifystatus",
          guid
        }
      })
    );
    if (response.isPending()) {
      await delay(1000);

      return getVerificationStatus(url, guid);
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
