/**
 * Arguments for a request to an EIP-1193 Provider.
 *
 * @public
 */
export interface RequestArguments {
  readonly method: string;
  readonly params?: readonly unknown[] | object;
}

/**
 * A provider for on-chain interactions.
 *
 * @public
 */
export interface EIP1193Provider {
  request(args: RequestArguments): Promise<any>;
}
