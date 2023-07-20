import {
  isFuture,
  isModuleParameterRuntimeValue,
  isRuntimeValue,
} from "../../type-guards";
import {
  ArgumentType,
  ModuleParameterRuntimeValue,
  RuntimeValueType,
} from "../../types/module";

export function retrieveNestedRuntimeValues(
  args: ArgumentType[]
): Array<ModuleParameterRuntimeValue<any>> {
  return args.flatMap(checkForValues).filter(isModuleParameterRuntimeValue);
}

function checkForValues(
  arg: ArgumentType
):
  | Array<ModuleParameterRuntimeValue<any> | null>
  | ModuleParameterRuntimeValue<any>
  | null {
  if (isRuntimeValue(arg)) {
    if (arg.type === RuntimeValueType.ACCOUNT) {
      return null;
    }

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
