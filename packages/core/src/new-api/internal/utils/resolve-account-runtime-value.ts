import { IgnitionValidationError } from "../../../errors";
import { AccountRuntimeValue } from "../../types/module";

export function resolveAccountRuntimeValue(
  arv: AccountRuntimeValue,
  accounts: string[]
): string {
  if (arv.accountIndex < 0) {
    throw new IgnitionValidationError(
      `Account index cannot be a negative number`
    );
  }

  if (arv.accountIndex >= accounts.length) {
    throw new IgnitionValidationError(
      `Requested account index '${arv.accountIndex}' is greater than the total number of available accounts '${accounts.length}'`
    );
  }

  return accounts[arv.accountIndex];
}
