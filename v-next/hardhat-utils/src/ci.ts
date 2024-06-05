/**
 * Returns 'true' if the current process is running in the GitHub CI environment.
 */
export function isCI() {
  return process.env.CI === "true";
}
