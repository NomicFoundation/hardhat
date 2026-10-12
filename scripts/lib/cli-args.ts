import { parseArgs, type ParseArgsConfig } from "node:util";

export type CliOptions = NonNullable<ParseArgsConfig["options"]>;

export interface CliConfig<O extends CliOptions> {
  /** The invocation named in error hints, e.g. `pnpm bench`. */
  command: string;
  options: O;
  /** Whether tokens that are not options are accepted (default: no). */
  allowPositionals?: boolean;
}

const HELP_OPTION = { help: { type: "boolean", short: "h" } } as const;

type ParsedCli<O extends CliOptions> = ReturnType<
  typeof parseArgs<{
    options: O & typeof HELP_OPTION;
    strict: true;
    allowPositionals: true;
  }>
>;

/**
 * Parse `argv` strictly against `config.options`. Returns undefined for no
 * arguments, or for `--help` or `-h` anywhere outside an option's value. A
 * bare leading `--` is dropped, since `pnpm run <script> -- <args>` forwards
 * it. Any other problem throws an error that ends with the usage hint.
 */
export function parseCliArgs<O extends CliOptions>(
  argv: string[],
  config: CliConfig<O>,
): ParsedCli<O> | undefined {
  const args = argv[0] === "--" ? argv.slice(1) : argv;

  if (args.length === 0) {
    return undefined;
  }

  const options = { ...config.options, ...HELP_OPTION };
  // A strict parse rejects an unknown option before it reaches --help, so
  // help is looked up leniently first.
  const lenient = parseArgs({
    args,
    options,
    strict: false,
    allowPositionals: true,
  });

  if (lenient.values.help === true) {
    return undefined;
  }

  try {
    return parseArgs({
      args,
      options,
      strict: true,
      allowPositionals: config.allowPositionals ?? false,
    }) as ParsedCli<O>;
  } catch (error) {
    if (!isParseArgsError(error)) {
      throw error;
    }

    throw cliError(config, withoutDashDashAdvice(error.message));
  }
}

/** An error whose message ends with how to get the usage text. */
export function cliError(config: { command: string }, message: string): Error {
  return new Error(`${message}\nRun \`${config.command} --help\` for usage.`);
}

// Node advises a `--` before a dash-led positional. Under pnpm that takes
// two, because this parser drops the `--` pnpm forwards.
function withoutDashDashAdvice(message: string): string {
  return message.replace(/\. To specify a positional argument.*$/s, "");
}

function isParseArgsError(error: unknown): error is Error {
  return (
    error instanceof Error &&
    typeof (error as NodeJS.ErrnoException).code === "string" &&
    (error as NodeJS.ErrnoException).code.startsWith("ERR_PARSE_ARGS")
  );
}
