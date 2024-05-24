import type {
  ParameterType,
  ParameterTypeToValueType,
} from "../../types/common.js";

export function formatTaskId(taskId: string | string[]): string {
  if (typeof taskId === "string") {
    return taskId;
  }

  return taskId.join(" ");
}

const FILE_PROTOCOL_PATTERN = /^file:\/\/.+/;

export function isValidActionUrl(action: string): boolean {
  return FILE_PROTOCOL_PATTERN.test(action);
}

export function formatValue<T extends ParameterType>(
  value: ParameterTypeToValueType<T> | Array<ParameterTypeToValueType<T>>,
): string {
  return JSON.stringify(value, (_, v) =>
    typeof v === "bigint" ? v.toString() : v,
  );
}
