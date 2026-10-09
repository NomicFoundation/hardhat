/**
 * Removes the `m/` prefix, which the DMK does not accept.
 *
 * Keep paths prefixed everywhere else for compatibility with existing configs,
 * cache files, and error messages.
 *
 * @example
 * toDeviceDerivationPath("m/44'/60'/0'/0/0")  ->  "44'/60'/0'/0/0"
 * toDeviceDerivationPath("M/44'/60'/0'/0/0")  ->  "44'/60'/0'/0/0"
 * toDeviceDerivationPath("44'/60'/0'/0/0")    ->  "44'/60'/0'/0/0"
 */
export function toDeviceDerivationPath(derivationPath: string): string {
  return derivationPath.replace(/^m\//iu, "");
}
