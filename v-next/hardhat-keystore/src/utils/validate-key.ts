import { io } from "../io.js";

export function validateKey(key: string): boolean {
  const KEY_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

  if (KEY_REGEX.test(key)) {
    return true;
  }

  const errMsg = `Invalid value for key: "${key}". Keys can only have alphanumeric characters and underscores, and they cannot start with a number.`;
  io.error(errMsg);

  return false;
}
