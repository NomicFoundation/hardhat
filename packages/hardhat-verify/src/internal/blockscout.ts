/**
 * Blockscout verification provider for verifying smart contracts.
 */
export class Blockscout {
  /**
   * Create a new instance of the Blockscout verification provider.
   * @param apiUrl - The Etherscan API URL, e.g. https://eth.blockscout.com/api.
   * @param browserUrl - The Blockscout browser URL, e.g. https://eth.blockscout.com.
   */
  constructor(public apiUrl: string, public browserUrl: string) {}
}
