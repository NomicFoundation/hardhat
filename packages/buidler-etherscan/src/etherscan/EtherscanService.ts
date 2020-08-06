import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";

import { pluginName } from "../pluginContext";

import { EtherscanRequestParameters } from "./EtherscanVerifyContractRequest";

export async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Used for polling the result of the contract verification.
const verificationIntervalMs = 3000;

export async function verifyContract(
  url: URL,
  req: EtherscanRequestParameters
): Promise<EtherscanResponse> {
  const { default: fetch } = await import("node-fetch");
  // The API expects the whole request in the search parameters.
  const urlWithQuery = new URL("", url);
  const parameters = new URLSearchParams({ ...req });
  urlWithQuery.search = parameters.toString();
  const requestDetails = {
    method: "post",
  };
  try {
    const response = await fetch(urlWithQuery, requestDetails);

    if (!response.ok) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.text();
      throw new BuidlerPluginError(
        pluginName,
        `The HTTP server response is not ok. Status code: ${response.status} Response text: ${responseText}`
      );
    }

    const etherscanResponse = new EtherscanResponse(await response.json());

    if (!etherscanResponse.isOk()) {
      throw new BuidlerPluginError(pluginName, etherscanResponse.message);
    }

    return etherscanResponse;
  } catch (error) {
    throw new BuidlerPluginError(
      pluginName,
      `Failed to send contract verification request.
Endpoint URL: ${url}
Reason: ${error.message}\n`,
      error
    );
  }
}

export async function getVerificationStatus(
  url: URL,
  guid: string
): Promise<EtherscanResponse> {
  const { default: fetch } = await import("node-fetch");
  const parameters = new URLSearchParams({
    module: "contract",
    action: "checkverifystatus",
    guid,
  });
  const urlWithQuery = new URL("", url);
  urlWithQuery.search = parameters.toString();
  let response;
  try {
    response = await fetch(urlWithQuery);

    if (!response.ok) {
      // TODO: A special case for HTTP status code 429, too many requests, could be implemented here.
      // The header Retry-After could be used to keep poll in a certain amount of time.
      // Other than that, it could be a good idea to just inform the user of this time until next retry.

      let message: string;
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.text();

      // TODO: inform about HTTP status code 429, too many requests, even when there's no Retry-After header?
      // Perhaps a dictionary for all HTTP status codes would be more useful here.
      // TODO: Actually parse the Retry-After header and see if it is sufficiently short to retry ourselves.
      // A warning should be printed in any case.
      if (response.status === 429 && response.headers.has("Retry-After")) {
        const retryHeader = response.headers.get("Retry-After");
        let retryHeaderMessage;
        if (String.prototype.startsWith.call(retryHeader, "Date")) {
          retryHeaderMessage = `the next request should be made on: ${retryHeader}`;
        } else {
          retryHeaderMessage = `the next request should be made in ${retryHeader} seconds`;
        }
        message = `The HTTP server responded that too many requests were sent, HTTP status 429.
In addition, the "Retry-After" header was present and indicated that ${retryHeaderMessage}
Response text: ${responseText}`;
      } else {
        // The response indicates some other error.
        message = `The HTTP server response is not ok. Status code: ${response.status} Response text: ${responseText}`;
      }

      throw new BuidlerPluginError(pluginName, message);
    }
  } catch (error) {
    throw new BuidlerPluginError(
      pluginName,
      `Failure during etherscan status polling. The verification may still succeed but
should be checked manually.
Endpoint URL: ${urlWithQuery}
Reason: ${error.message}\n`,
      error
    );
  }

  const etherscanResponse = new EtherscanResponse(await response.json());

  if (etherscanResponse.isPending()) {
    await delay(verificationIntervalMs);

    return getVerificationStatus(url, guid);
  }

  if (!etherscanResponse.isOk()) {
    throw new BuidlerPluginError(
      pluginName,
      `The contract verification failed.
Reason: ${etherscanResponse.message}\n`
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

  public isOk() {
    return this.status === 1;
  }
}
