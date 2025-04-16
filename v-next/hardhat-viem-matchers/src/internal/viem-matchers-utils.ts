import type { HardhatViemMatchersUtils } from "../types.js";

import { areApproximatelyEqual } from "./matchers/utils/big-number/are-approximately-equal.js";
import { properAddress } from "./matchers/utils/proper-address.js";
import { properChecksumAddress } from "./matchers/utils/proper-checksum-address.js";

export class HardhatViemMatchersUtilsImpl implements HardhatViemMatchersUtils {
  public areApproximatelyEqual(n1: bigint, n2: bigint, variance: bigint): void {
    areApproximatelyEqual(n1, n2, variance);
  }

  public properAddress(address: string): void {
    properAddress(address);
  }

  public async properChecksumAddress(address: string): Promise<void> {
    await properChecksumAddress(address);
  }
}
