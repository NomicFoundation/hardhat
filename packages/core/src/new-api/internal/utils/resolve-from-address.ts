import { IgnitionError } from "../../../errors";
import { isRuntimeValue } from "../../type-guards";
import { AccountRuntimeValue } from "../../types/module";
import { isAddress } from "../utils";

import { assertIgnitionInvariant } from "./assertions";

export function resolveFromAddress(
  from: string | AccountRuntimeValue | undefined,
  { accounts }: { accounts: string[] }
): string | undefined {
  if (from === undefined) {
    return from;
  }

  if (typeof from === "string") {
    if (!isAddress(from)) {
      throw new IgnitionError("From is not a usable address");
    }

    return from;
  }

  assertIgnitionInvariant(
    isRuntimeValue(from),
    `Could not resolve from address: ${JSON.stringify(from)}`
  );

  const runtimeAddress = accounts[from.accountIndex];

  assertIgnitionInvariant(
    isAddress(runtimeAddress),
    `From runtime account is not a usable address: ${runtimeAddress}`
  );

  return runtimeAddress;
}
