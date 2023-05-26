import {
  ArgumentType,
  RuntimeValueType,
  isFuture,
  isRuntimeValue,
} from "@ignored/ignition-core/ui-helpers";

export function argumentTypeToString(argument: ArgumentType): string {
  return JSON.stringify(
    argument,
    (_key, value) => {
      if (typeof value === "bigint") {
        return `<BigInt ${value.toString(10)}>`;
      }

      if (isFuture(value)) {
        return `<Future ${value.id}>`;
      }

      if (isRuntimeValue(value)) {
        if (value.type === RuntimeValueType.ACCOUNT) {
          return `<AccountRuntimeValue accountIndex=${value.accountIndex}>`;
        }

        return `<ModuleParameterRuntimeValue name="${
          value.name
        }" defaultValue=${
          value.defaultValue === undefined
            ? "undefined"
            : argumentTypeToString(value.defaultValue)
        }>`;
      }

      return value;
    },
    2
  );
}
