/**
 * Converts a BIP-32 derivation path into the form the Device Management Kit
 * accepts.
 *
 * The DMK parses derivation paths with `DerivationPathUtils.splitPath` from
 * `@ledgerhq/signer-utils`, which throws `invalid number provided` on the
 * conventional `m/` prefix and only accepts the bare form:
 *
 * ```
 * splitPath("m/44'/60'/0'/0/0")  ->  throws
 * splitPath("44'/60'/0'/0/0")    ->  [2147483692, 2147483708, 2147483648, 0, 0]
 * ```
 *
 * `@ledgerhq/hw-app-eth` tolerated the prefix, so stripping it here is what
 * keeps the plugin's behaviour unchanged across the migration. Every signer
 * method and `GetAddressCommand` goes through `splitPath`, so every path handed
 * to the DMK has to be converted.
 *
 * The prefixed form stays in place everywhere it is observable: the
 * derivation-path cache file, the `pathStart`/`pathEnd` of error messages, and
 * the paths a user's `derivationFunction` returns.
 */
export function toDeviceDerivationPath(derivationPath: string): string {
  return derivationPath.replace(/^m\//iu, "");
}
