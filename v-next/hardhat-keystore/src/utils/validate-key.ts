import type { RawInterruptions } from "../types.js";

export async function validateKey(
  key: string,
  interruptions: RawInterruptions,
): Promise<boolean> {
  const KEY_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

  if (KEY_REGEX.test(key)) {
    return true;
  }

  const errMsg = `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`;
  await interruptions.error(errMsg);

  return false;
}
