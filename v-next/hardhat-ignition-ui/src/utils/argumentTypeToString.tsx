import {
  ArgumentType,
  RuntimeValueType,
  isFuture,
  isRuntimeValue,
} from "@ignored/hardhat-vnext-ignition-core/ui-helpers";

export function argumentTypeToString(argument: ArgumentType): string {
  if (typeof argument === "bigint") {
    return `<BigInt ${argument.toString(10)}>`;
  }

  if (isFuture(argument)) {
    return `<Future ${argument.id}>`;
  }

  if (isRuntimeValue(argument)) {
    if (argument.type === RuntimeValueType.ACCOUNT) {
      return `<AccountRuntimeValue accountIndex=${argument.accountIndex}>`;
    }

    return `<ModuleParameterRuntimeValue name="${argument.name}" defaultValue=${
      argument.defaultValue === undefined
        ? "undefined"
        : argumentTypeToString(argument.defaultValue)
    }>`;
  }

  return JSON.stringify(argument, null, 2);
}
