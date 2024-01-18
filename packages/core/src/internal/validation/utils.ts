import { IgnitionError } from "../../errors";
import { isFuture, isRuntimeValue } from "../../type-guards";
import {
  AccountRuntimeValue,
  ArgumentType,
  RuntimeValue,
} from "../../types/module";
import { ERRORS } from "../errors-list";

export function validateAccountRuntimeValue(
  arv: AccountRuntimeValue,
  accounts: string[]
): IgnitionError[] {
  const errors: IgnitionError[] = [];

  if (arv.accountIndex < 0) {
    errors.push(new IgnitionError(ERRORS.VALIDATION.NEGATIVE_ACCOUNT_INDEX));
  }

  if (arv.accountIndex >= accounts.length) {
    errors.push(
      new IgnitionError(ERRORS.VALIDATION.ACCOUNT_INDEX_TOO_HIGH, {
        accountIndex: arv.accountIndex,
        accountsLength: accounts.length,
      })
    );
  }

  return errors;
}

export function retrieveNestedRuntimeValues(
  args: ArgumentType[]
): RuntimeValue[] {
  return args.flatMap(checkForValues).filter(isRuntimeValue);
}

function checkForValues(
  arg: ArgumentType
): Array<RuntimeValue | null> | RuntimeValue | null {
  if (isRuntimeValue(arg)) {
    return arg;
  }

  if (Array.isArray(arg)) {
    return arg.flatMap(checkForValues);
  }

  if (!isFuture(arg) && typeof arg === "object" && arg !== null) {
    return Object.values(arg).flatMap(checkForValues);
  }

  return null;
}
