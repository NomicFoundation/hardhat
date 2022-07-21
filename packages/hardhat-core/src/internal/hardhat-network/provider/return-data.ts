import { rawDecode } from "ethereumjs-abi";
import { BN } from "ethereumjs-util";

import { assertHardhatInvariant } from "../../core/errors";

// selector of Error(string)
const ERROR_SELECTOR = "08c379a0";
// selector of Panic(uint256)
const PANIC_SELECTOR = "4e487b71";

/**
 * Represents the returnData of a transaction, whose contents are unknown.
 */
export class ReturnData {
  private _selector: string | undefined;

  constructor(public value: Buffer) {
    if (value.length >= 4) {
      this._selector = value.slice(0, 4).toString("hex");
    }
  }

  public isEmpty(): boolean {
    return this.value.length === 0;
  }

  public matchesSelector(selector: Buffer): boolean {
    if (this._selector === undefined) {
      return false;
    }

    return this._selector === selector.toString("hex");
  }

  public isErrorReturnData(): boolean {
    return this._selector === ERROR_SELECTOR;
  }

  public isPanicReturnData(): boolean {
    return this._selector === PANIC_SELECTOR;
  }

  public decodeError(): string {
    if (this.isEmpty()) {
      return "";
    }

    assertHardhatInvariant(
      this._selector === ERROR_SELECTOR,
      "Expected return data to be a Error(string)"
    );

    const decoded = rawDecode(["string"], this.value.slice(4));
    return decoded.toString("utf8");
  }

  public decodePanic(): BN {
    assertHardhatInvariant(
      this._selector === PANIC_SELECTOR,
      "Expected return data to be a Panic(uint256)"
    );

    const [errorCode] = rawDecode(["uint256"], this.value.slice(4));

    return errorCode;
  }

  public getSelector(): string | undefined {
    return this._selector;
  }
}
