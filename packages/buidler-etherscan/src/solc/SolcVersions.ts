import { CompilersList } from "@nomiclabs/buidler/internal/solidity/compiler/downloader";
import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import request from "request-promise";

const COMPILER_FILES_DIR_URL =
  "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/";

const COMPILERS_LIST_URL = COMPILER_FILES_DIR_URL + "list.json";

export default class SolcVersions {
  public static async toLong(shortVersion: string) {
    const solc = new SolcVersions();
    return solc.getLongVersion(shortVersion);
  }

  public async getLongVersion(shortVersion: string) {
    const versions = await this.getVersions();
    const fullVersion = versions.releases[shortVersion];
    if (!fullVersion) {
      throw new BuidlerPluginError("Given solc version doesn't exists");
    }
    return fullVersion.replace(/(soljson-)(.*)(.js)/, "$2");
  }

  public async getVersions(): Promise<CompilersList> {
    try {
      return await request.get(COMPILERS_LIST_URL, { json: true });
    } catch (e) {
      throw new BuidlerPluginError(
        "Failed to obtain full solc version. Reason: " + e.message
      );
    }
  }
}
