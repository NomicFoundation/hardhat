import { CompilersList } from "@nomiclabs/buidler/internal/solidity/compiler/downloader";
import { NomicLabsBuidlerPluginError } from "@nomiclabs/buidler/plugins";
import { SolidityConfig } from "@nomiclabs/buidler/types";
import request from "request-promise";

const COMPILERS_LIST_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json";

export async function getVersions(): Promise<CompilersList> {
  try {
    // tslint:disable-next-line: await-promise
    return await request.get(COMPILERS_LIST_URL, { json: true });
  } catch (e) {
    throw new NomicLabsBuidlerPluginError(
      "@nomiclabs/buidler-etherscan",
      `Failed to obtain full solc version. Reason: ${e.message}`
    );
  }
}

function getSolcVersion(solidityConfig: SolidityConfig): string {
  if (typeof solidityConfig === "string") {
    return solidityConfig;
  }
  if ("version" in solidityConfig) {
    return solidityConfig.version;
  }

  return solidityConfig.compilers[0].version;
}

export async function getLongVersion(
  solidityConfig: SolidityConfig
): Promise<string> {
  const shortVersion = getSolcVersion(solidityConfig);
  const versions = await getVersions();
  const fullVersion = versions.releases[shortVersion];

  if (fullVersion === undefined || fullVersion === "") {
    throw new NomicLabsBuidlerPluginError(
      "@nomiclabs/buidler-etherscan",
      "Given solc version doesn't exists"
    );
  }

  return fullVersion.replace(/(soljson-)(.*)(.js)/, "$2");
}
