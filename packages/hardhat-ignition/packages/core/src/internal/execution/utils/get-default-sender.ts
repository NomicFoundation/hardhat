/**
 * Returns the default sender to be used as `from` in futures, transactions
 * and static calls.
 *
 * @param accounts The accounts provided by the integrator of ignition.
 * @returns The default sender.
 */
export function getDefaultSender(accounts: string[]): string {
  return accounts[0];
}
