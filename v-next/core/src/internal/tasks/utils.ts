export function formatTaskId(taskId: string | string[]): string {
  if (typeof taskId === "string") {
    return taskId;
  }

  return taskId.join(" ");
}

export function getActorFragment(pluginId: string | undefined): string {
  return pluginId !== undefined ? `Plugin ${pluginId} is` : "You are";
}

const FILE_PROTOCOL_PATTERN = /^file:\/\/.+/;

export function isValidActionUrl(action: string): boolean {
  return FILE_PROTOCOL_PATTERN.test(action);
}
