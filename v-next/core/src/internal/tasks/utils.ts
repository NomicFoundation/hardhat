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
