import { BuidlerPluginError } from "@nomiclabs/buidler/plugins";
import request from "request-promise";

export default class SolcVersions {
  public static async toLong(shortVersion: string) {
    const solc = new SolcVersions();
    return solc.getLongVersion(shortVersion);
  }

  public async getLongVersion(shortVersion: string) {
    const versions = await this.getVersions();
    return versions[shortVersion].replace(/(soljson-)(.*)(.js)/, "$2");
  }

  public async getVersions(): Promise<{ [key: string]: string }> {
    try {
      const response: any = await request.get(
        "https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/list.json",
        { json: true }
      );
      return response.releases;
    } catch (e) {
      throw new BuidlerPluginError(
        "Failed to send contract verification request. Reason: " + e.message
      );
    }
  }
}
