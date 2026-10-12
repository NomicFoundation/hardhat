export const Mode = {
  Both: "both",
  Js: "js",
  System: "system",
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];

export const DEFAULT_SAMPLE_RATE_HZ = 999;

/** Parses repeated `KEY=VALUE` pairs into an environment record. */
export function parseEnvPairs(pairs: string[]): Record<string, string> {
  const env: Record<string, string> = {};

  for (const pair of pairs) {
    const separator = pair.indexOf("=");

    if (separator <= 0) {
      throw new Error(`--env expects KEY=VALUE, got: ${pair}`);
    }

    env[pair.slice(0, separator)] = pair.slice(separator + 1);
  }

  return env;
}

export function parseMode(value: string | undefined): Mode {
  if (value === undefined) {
    return Mode.Both;
  }

  if (value !== Mode.System && value !== Mode.Js && value !== Mode.Both) {
    throw new Error(
      `--mode must be one of: ${Mode.System}, ${Mode.Js}, ${Mode.Both}; ` +
        `got "${value}"`,
    );
  }

  return value;
}

export function parseSampleRate(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_SAMPLE_RATE_HZ;
  }

  const rate = Number(value);

  if (!Number.isInteger(rate) || rate < 1 || rate > 100_000) {
    throw new Error(
      `--sample-rate must be an integer between 1 and 100000; got "${value}"`,
    );
  }

  return rate;
}
