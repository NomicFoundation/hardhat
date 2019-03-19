import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import request from "request-promise";

import EtherscanResponse from "./EtherscanResponse";
import EtherscanVerifyContractRequest from "./EtherscanVerifyContractRequest";

export default class EtherscanService {
  constructor(private readonly url: string) {}

  public async verifyContract(
    req: EtherscanVerifyContractRequest
  ): Promise<EtherscanResponse> {
    try {
      const response = new EtherscanResponse(
        await request.post(this.url, { form: req, json: true })
      );

      if (!response.isOk()) {
        throw new BuidlerPluginError(response.message);
      }
      return response;
    } catch (e) {
      throw new BuidlerPluginError(
        "Failed to send contract verification request. Reason: " + e.message,
        e
      );
    }
  }

  public async getVerificationStatus(guid: string): Promise<EtherscanResponse> {
    try {
      const response = new EtherscanResponse(
        await request.get(this.url, {
          json: true,
          qs: {
            module: "contract",
            action: "checkverifystatus",
            guid
          }
        })
      );
      if (response.isPending()) {
        await this.delay(2000);
        return this.getVerificationStatus(guid);
      }
      return response;
    } catch (e) {
      throw new BuidlerPluginError(
        "Failed to send verification status for " +
          guid +
          ". Error: " +
          e.message
      );
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(function(resolve) {
      setTimeout(resolve, ms);
    });
  }
}
