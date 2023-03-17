import { MissingApiKeyError } from "./errors";
import { sendGetRequest } from "./undici";

import { ChainConfig, ApiKey } from "./types";

export class Etherscan {
  private apiKey: string;
  private chainConfig: ChainConfig;

  constructor(apiKey: ApiKey | undefined, chainConfig: ChainConfig) {
    this.apiKey = resolveApiKey(apiKey, chainConfig.network);
    this.chainConfig = chainConfig;
  }

  public async isVerified(address: string) {
    const parameters = new URLSearchParams({
      module: "contract",
      action: "getsourcecode",
      address,
      apikey: this.apiKey,
    });

    const url = new URL(this.chainConfig.urls.apiURL);
    url.search = parameters.toString();

    const response = await sendGetRequest(url);
    const json = await response.body.json();

    if (json.message !== "OK") {
      return false;
    }

    const sourceCode = json?.result?.[0]?.SourceCode;
    return sourceCode !== undefined && sourceCode !== "";
  }
}

const resolveApiKey = (apiKey: ApiKey | undefined, network: string) => {
  if (apiKey === undefined || apiKey === "") {
    throw new MissingApiKeyError(network);
  }

  if (typeof apiKey === "string") {
    return apiKey;
  }

  const key = apiKey[network];

  if (key === undefined || key === "") {
    throw new MissingApiKeyError(network);
  }

  return key;
};
