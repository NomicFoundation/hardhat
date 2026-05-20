import type { EdrNetworkConfig } from "../../../../types/config.js";

/**
 * Returns a copy of the resolved EDR network config with coverage-specific
 * overrides applied. When coverage is enabled and the user has not set the
 * field explicitly:
 *
 * - `allowUnlimitedContractSize` defaults to `true`, because coverage
 *   instrumentation can push the contract size over the limit.
 * - `blockGasLimit` and `transactionGasCap` default to `false` (disabled),
 *   so the added gas of coverage instrumentation does not push tests over
 *   the per-block or EIP-7825 transaction caps.
 *
 * Explicit user values are preserved in all three cases.
 *
 * When coverage is disabled, the config is returned unchanged.
 */
export function applyCoverageNetworkOverrides(
  config: EdrNetworkConfig,
  shouldEnableCoverage: boolean,
): EdrNetworkConfig {
  if (!shouldEnableCoverage) {
    return config;
  }

  return {
    ...config,
    allowUnlimitedContractSize: config.allowUnlimitedContractSize ?? true,
    blockGasLimit: config.blockGasLimit ?? false,
    transactionGasCap: config.transactionGasCap ?? false,
  };
}
