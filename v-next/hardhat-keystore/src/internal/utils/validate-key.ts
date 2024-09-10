export async function validateKey(key: string): Promise<boolean> {
  const KEY_REGEX = /^[a-zA-Z_]+[a-zA-Z0-9_]*$/;

  if (KEY_REGEX.test(key)) {
    return true;
  }

  return false;
}
