import { HardhatError } from "@ignored/hardhat-vnext-errors";

export function checkMissingKeyTaskArgument(
  key: string,
  taskName: string,
): void {
  if (key !== undefined) {
    return;
  }

  throw new HardhatError(
    HardhatError.ERRORS.TASK_DEFINITIONS.MISSING_VALUE_FOR_TASK_ARGUMENT,
    {
      task: taskName,
      argument: "key",
    },
  );
}
