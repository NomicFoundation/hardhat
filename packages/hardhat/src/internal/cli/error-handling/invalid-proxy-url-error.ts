import { getErrorChain } from "../telemetry/error-classification/helpers.js";

export interface InvalidProxyUrlFailure {
  /** The environment variable that holds the invalid proxy URL. */
  envVarName: string;
}

/**
 * Detect whether a given error was caused by an invalid HTTP(S) proxy URL in
 * the environment.
 *
 * `getDispatcher` wraps that failure as a `DispatcherError` whose cause is an
 * `InvalidProxyUrlError`. Download helpers may wrap it again as a HardhatError.
 * Walking the cause chain finds the original configuration error in every case.
 */
export function detectInvalidProxyUrl(
  error: Error,
): InvalidProxyUrlFailure | undefined {
  // Compared by name rather than with `hasErrorClassName`, as importing the
  // class as a value would load `hardhat-utils/request` at CLI startup.
  for (const chainedError of getErrorChain(error)) {
    if (
      chainedError.name === "InvalidProxyUrlError" &&
      "envVarName" in chainedError &&
      typeof chainedError.envVarName === "string"
    ) {
      return { envVarName: chainedError.envVarName };
    }
  }

  return undefined;
}
