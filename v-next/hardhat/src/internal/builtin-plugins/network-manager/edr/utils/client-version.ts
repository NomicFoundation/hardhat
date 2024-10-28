import { getHardhatVersion } from "../../../../utils/package.js";

export async function clientVersion(edrClientVersion: string): Promise<string> {
  const hardhatVersion = await getHardhatVersion();
  const edrVersion = edrClientVersion.split("/")[1];
  return `HardhatNetwork/${hardhatVersion}/@ignored/edr-optimism/${edrVersion}`;
}
