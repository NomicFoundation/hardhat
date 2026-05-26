export function formatTaskId(taskId: string | string[]): string {
  if (typeof taskId === "string") {
    return taskId;
  }

  return taskId.join(" ");
}

export function getActorFragment(pluginId: string | undefined): string {
  return pluginId !== undefined ? `Plugin ${pluginId} is` : "You are";
}


export function isArgumentRequired(
  type: string,
  defaultValue: unknown,
): boolean {
  return defaultValue === undefined && !type.endsWith("_WITHOUT_DEFAULT");
}
