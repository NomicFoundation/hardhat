/**
 * Returns the fallback sender to be used by the execution strategies.
 *
 * @param accounts The accounts provided by the integrator of ignition.
 * @returns The fallback sender.
 */
export function getFallbackSender(accounts: string[]): string {
  return accounts[0];
}
