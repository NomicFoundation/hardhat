/**
 * Returns the fallback sender to use for a transaction and static calls.
 *
 * @param accounts The accounts to local accounts.
 * @returns The sender.
 */
export function getFallbackSender(accounts: string[]): string {
  return accounts[0];
}
