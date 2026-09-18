const INVALID_PROXY_URL_MESSAGE =
  /^The proxy url configured in the (\S+) environment variable is not a valid url$/i;

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
  for (const chainedError of errorChain(error)) {
    if (chainedError.name !== "InvalidProxyUrlError") {
      continue;
    }

    const envVarName = extractEnvVarName(chainedError);
    if (envVarName !== undefined) {
      return { envVarName };
    }
  }

  return undefined;
}

function extractEnvVarName(error: Error): string | undefined {
  if ("envVarName" in error && typeof error.envVarName === "string") {
    return error.envVarName;
  }

  const match = error.message.match(INVALID_PROXY_URL_MESSAGE);
  return match?.[1];
}

function errorChain(error: Error): Error[] {
  const chain: Error[] = [];
  const seen = new Set<unknown>();
  let current: unknown = error;

  while (current instanceof Error && !seen.has(current)) {
    seen.add(current);
    chain.push(current);
    current = current.cause;
  }

  return chain;
}
