import { NomicLabsHardhatPluginError } from "hardhat/plugins";

import { pluginName } from "../pluginContext";

import {
  EtherscanCheckStatusRequest,
  EtherscanVerifyRequest,
} from "./EtherscanVerifyContractRequest";

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Used for polling the result of the contract verification.
const verificationIntervalMs = 3000;

export async function verifyContract(
  url: URL,
  req: EtherscanVerifyRequest
): Promise<EtherscanResponse> {
  const { default: fetch } = await import("node-fetch");
  const parameters = new URLSearchParams({ ...req });
  const requestDetails = {
    method: "post",
    body: parameters,
  };
  try {
    const response = await fetch(url, requestDetails);

    if (!response.ok) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.text();
      throw new NomicLabsHardhatPluginError(
        pluginName,
        `The HTTP server response is not ok. Status code: ${response.status} Response text: ${responseText}`
      );
    }

    const etherscanResponse = new EtherscanResponse(await response.json());
    if (!etherscanResponse.isOk()) {
      throw new NomicLabsHardhatPluginError(
        pluginName,
        etherscanResponse.message
      );
    }

    return etherscanResponse;
  } catch (error) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Failed to send contract verification request.
Endpoint URL: ${url}
Reason: ${error.message}`,
      error
    );
  }
}

export async function getVerificationStatus(
  url: URL,
  req: EtherscanCheckStatusRequest
): Promise<EtherscanResponse> {
  const parameters = new URLSearchParams({ ...req });
  const urlWithQuery = new URL("", url);
  urlWithQuery.search = parameters.toString();

  const { default: fetch } = await import("node-fetch");
  let response;
  try {
    response = await fetch(urlWithQuery);

    if (!response.ok) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.text();
      const message = `The HTTP server response is not ok. Status code: ${response.status} Response text: ${responseText}`;

      throw new NomicLabsHardhatPluginError(pluginName, message);
    }
  } catch (error) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `Failure during etherscan status polling. The verification may still succeed but
should be checked manually.
Endpoint URL: ${urlWithQuery}
Reason: ${error.message}`,
      error
    );
  }

  const etherscanResponse = new EtherscanResponse(await response.json());

  if (etherscanResponse.isPending()) {
    await delay(verificationIntervalMs);

    return getVerificationStatus(url, req);
  }

  if (etherscanResponse.isVerificationFailure()) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The contract verification failed.
Reason: ${etherscanResponse.message}`
    );
  }

  if (!etherscanResponse.isOk()) {
    throw new NomicLabsHardhatPluginError(
      pluginName,
      `The Etherscan API responded with a failure status.
The verification may still succeed but should be checked manually.
Reason: ${etherscanResponse.message}`
    );
  }

  return etherscanResponse;
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

  public isVerificationFailure() {
    return this.message === "Fail - Unable to verify";
  }

  public isVerificationSuccess() {
    return this.message === "Pass - Verified";
  }

  public isOk() {
    return this.status === 1;
  }
}
