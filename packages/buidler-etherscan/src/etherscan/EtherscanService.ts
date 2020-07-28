import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { pluginName } from "../pluginContext";
import { EtherscanRequestParameters } from "./EtherscanVerifyContractRequest";

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Used for polling the result of the contract verification.
const verificationIntervalMs = 3000;

export async function verifyContract(
  url: URL,
  req: EtherscanRequestParameters
): Promise<EtherscanResponse> {
  const { default: fetch } = await import("node-fetch");
  const requestDetails = {
    method: 'post',
    body: JSON.stringify(req),
    headers: {'Content-Type': 'application/json'}
  };
  try {
    const response = await fetch(url, requestDetails);

    if (!response.ok) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.text();
      throw new BuidlerPluginError(pluginName, `The HTTP server response is not ok. Status code: ${response.status} Response text: ${responseText}`);
    }

    const etherscanResponse = new EtherscanResponse(await response.json());

    if (!etherscanResponse.isOk()) {
      throw new BuidlerPluginError(pluginName, etherscanResponse.message);
    }

    return etherscanResponse;
  } catch (error) {
    throw new BuidlerPluginError(
      pluginName,
      `Failed to send contract verification request.\n` +
        `Endpoint URL: ${url}\n` +
        `Reason: ${error.message}\n`,
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
  try {
    const response = await fetch(urlWithQuery);

    if (!response.ok) {
      // This could be always interpreted as JSON if there were any such guarantee in the Etherscan API.
      const responseText = await response.text();
      throw new BuidlerPluginError(pluginName, `The HTTP server response is not ok. Status code: ${response.status} Response text: ${responseText}`);
    }

    const etherscanResponse = new EtherscanResponse(await response.json());

    if (etherscanResponse.isPending()) {
      await delay(verificationIntervalMs);

      return getVerificationStatus(url, guid);
    }

    if (!etherscanResponse.isOk()) {
      throw new BuidlerPluginError(pluginName, etherscanResponse.message);
    }

    return etherscanResponse;
  } catch (error) {
    throw new BuidlerPluginError(
      pluginName,
      `Failed to verify contract.\n` +
        `Endpoint URL: ${urlWithQuery}\n` +
        `Reason: ${error.message}\n`,
      error
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
