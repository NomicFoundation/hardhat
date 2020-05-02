function getUID(): number | null {
  // Method getuid is not available on windows:
  if (process.platform !== "win32" && typeof process.getuid === "function") {
    return process.getuid();
  }
  return null;
}

export function isRootUser(uid: number | null): boolean {
  return uid === 0;
}

export function isFakeRoot(): boolean {
  return Boolean(process.env.FAKEROOTKEY);
}

export default isRootUser(getUID()) && !isFakeRoot();
