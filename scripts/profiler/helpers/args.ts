import { getArgValue } from "../../end-to-end/helpers/args.ts";

export const Mode = {
  Both: "both",
  Js: "js",
  System: "system",
} as const;

export type Mode = (typeof Mode)[keyof typeof Mode];

export const DEFAULT_SAMPLE_RATE_HZ = 999;

/** Collects every value of a repeatable flag, in order. */
export function getAllArgValues(args: string[], flag: string): string[] {
  const values: string[] = [];

  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === flag) {
      values.push(args[i + 1]);
    }
  }

  return values;
}

/**
 * Validates the flags and returns the positional arguments.
 *
 * Throws on an unknown `--flag`. Also throws on a value flag whose value is
 * missing — absent, or another flag. The positional arguments are the
 * remaining tokens: neither a flag nor a value consumed by one. Knowing each
 * flag's arity lets a stray token after a boolean flag surface as a
 * positional, instead of being mistaken for the flag's value.
 */
export function parsePositionalArgs(
  args: string[],
  valueFlags: string[],
  booleanFlags: string[] = [],
): string[] {
  const positionals: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (!arg.startsWith("--")) {
      positionals.push(arg);
      continue;
    }

    if (booleanFlags.includes(arg)) {
      continue;
    }

    if (!valueFlags.includes(arg)) {
      throw new Error(`unknown option: ${arg}`);
    }

    const value = args[i + 1];

    if (value === undefined || value.startsWith("--")) {
      throw new Error(`${arg} requires a value`);
    }

    i++;
  }

  return positionals;
}

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

export { getArgValue };
