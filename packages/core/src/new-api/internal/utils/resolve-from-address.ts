import { isAccountRuntimeValue } from "../../type-guards";
import { AccountRuntimeValue } from "../../types/module";
import { isAddress } from "../utils";

import { assertIgnitionInvariant } from "./assertions";

export function resolveFromAddress(
  from: string | AccountRuntimeValue | undefined,
  { accounts }: { accounts: string[] }
): string {
  if (from === undefined) {
    const address = accounts[0];

    assertIgnitionInvariant(isAddress(address), `Account[0] is not an address`);

    return address;
  }

  if (typeof from === "string") {
    assertIgnitionInvariant(isAddress(from), `from is not an address`);

    return from;
  }

  assertIgnitionInvariant(
    isAccountRuntimeValue(from),
    `Could not resolve from address: ${JSON.stringify(from)}`
  );

  const runtimeAddress = accounts[from.accountIndex];

  assertIgnitionInvariant(
    isAddress(runtimeAddress),
    `From runtime account is not a usable address: ${runtimeAddress}`
  );

  return runtimeAddress;
}
