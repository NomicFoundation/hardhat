import { CompilersList } from "@nomiclabs/buidler/internal/solidity/compiler/downloader";
import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import request from "request-promise";

const COMPILERS_LIST_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json";

export async function getVersions(): Promise<CompilersList> {
  try {
    // tslint:disable-next-line: await-promise
    return await request.get(COMPILERS_LIST_URL, { json: true });
  } catch (e) {
    throw new BuidlerPluginError(
      `Failed to obtain full solc version. Reason: ${e.message}`
    );
  }
}

export async function getLongVersion(shortVersion: string): Promise<string> {
  const versions = await getVersions();
  const fullVersion = versions.releases[shortVersion];

  if (fullVersion === undefined || fullVersion === "") {
    throw new BuidlerPluginError("Given solc version doesn't exists");
  }

  return fullVersion.replace(/(soljson-)(.*)(.js)/, "$2");
}
