import { isFuture, isRuntimeValue } from "../../type-guards";
import {
  AccountRuntimeValue,
  ArgumentType,
  RuntimeValue,
} from "../../types/module";

export function validateAccountRuntimeValue(
  arv: AccountRuntimeValue,
  accounts: string[]
): string[] {
  const errors: string[] = [];

  if (arv.accountIndex < 0) {
    errors.push(`Account index cannot be a negative number`);
  }

  if (arv.accountIndex >= accounts.length) {
    errors.push(
      `Requested account index '${arv.accountIndex}' is greater than the total number of available accounts '${accounts.length}'`
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
