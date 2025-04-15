import type { HardhatViemMatchersUtils } from "../types.js";

import { properAddress } from "./matchers/utils/proper-address.js";
import { properChecksumAddress } from "./matchers/utils/proper-checksum-address.js";

export class HardhatViemMatchersUtilsImpl implements HardhatViemMatchersUtils {
  public properAddress(address: string): void {
    properAddress(address);
  }

  public async properChecksumAddress(address: string): Promise<void> {
    await properChecksumAddress(address);
  }
}
