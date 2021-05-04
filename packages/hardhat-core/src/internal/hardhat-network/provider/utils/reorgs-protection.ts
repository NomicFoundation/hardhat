/**
 * This function returns a number that should be safe to consider as the
 * largest possible reorg in a network.
 *
 * If there's not such a number, or we aren't aware of it, this function
 * returns undefined.
 */
export function getLargestPossibleReorg(networkId: number): number | undefined {
  // mainnet
  if (networkId === 1) {
    return 5;
  }

  // Kovan
  if (networkId === 42) {
    return 5;
  }

  // Goerli
  if (networkId === 5) {
    return 5;
  }

  // Rinkeby
  if (networkId === 4) {
    return 5;
  }

  // Ropsten
  if (networkId === 3) {
    return 100;
  }
}

export const FALLBACK_MAX_REORG = 30;
