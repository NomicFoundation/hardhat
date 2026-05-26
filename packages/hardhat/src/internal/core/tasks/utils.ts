import type { ArgumentType, ArgumentValue } from "../../../types/arguments.js";

export function formatTaskId(taskId: string | string[]): string {
  if (typeof taskId === "string") {
    return taskId;
  }

  return taskId.join(" ");
}

export function getActorFragment(pluginId: string | undefined): string {
  return pluginId !== undefined ? `Plugin ${pluginId} is` : "You are";
}

export function isOptionalArgumentType(type: ArgumentType): boolean {
  return type.endsWith("_WITHOUT_DEFAULT");
}

export function isArgumentRequired(
  type: ArgumentType,
  defaultValue: ArgumentValue | ArgumentValue[] | undefined,
): boolean {
  return defaultValue === undefined && !isOptionalArgumentType(type);
}
