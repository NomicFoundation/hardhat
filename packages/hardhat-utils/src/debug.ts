import { formatWithOptions } from "node:util";

import { NOOP, isEnabled, selectColor, useColors } from "./internal/debug.js";

/**
 * A logger function returned by {@link createDebug}.
 * The `enabled` property is `true` when the logger will produce output.
 */
export interface DebugLogger {
  (format: unknown, ...args: unknown[]): void;
  readonly enabled: boolean;
}

/**
 * Creates a namespaced logger controlled by the `DEBUG` env var.
 *
 * If `namespace` matches `DEBUG`, the logger writes to `process.stderr`;
 * otherwise, it is a no-op. Additionally, `logger.enabled` is `true` when
 * the namespace matches `DEBUG`, allowing you to conditionally run expensive
 * diagnostics.
 *
 * `DEBUG` should be a comma- or whitespace-separated list of patterns.
 * `*` is a wildcard and a leading `-` negates a pattern (e.g.
 * `hardhat:*,-hardhat:noisy`).
 *
 * Messages are formatted using `node:util.format`, allowing you to use format
 * specifiers like `%O`, `%o`, `%s`, `%d`, `%j`. Extra arguments without a
 * matching specifier are inspected automatically.
 *
 * Output is colorized per namespace when `stderr` is a TTY. Set
 * `DEBUG_COLORS=no` or `false` to disable colors.
 *
 * @example
 * ```ts
 * const log = createDebug("hardhat:core:foo");
 * log("Starting up");
 * log("Received %O", payload);
 * log("Saved data", id, filePath);
 *
 * if (log.enabled) {
 *   // expensive diagnostics that should only run while debugging
 * }
 * ```
 *
 * ```sh
 * DEBUG="hardhat:*,-hardhat:noisy" DEBUG_COLORS=no pnpm hardhat run script.js
 * ```
 *
 * @param namespace Namespace used for filtering and as the log prefix.
 * @returns Logger function, or a shared no-op if disabled.
 */
export function createDebug(namespace: string): DebugLogger {
  if (!isEnabled(namespace, process.env.DEBUG ?? "")) {
    return NOOP;
  }

  const colors = useColors();
  const color = colors ? selectColor(namespace) : undefined;
  const prefix =
    color !== undefined
      ? `\x1b[3${color};1m  ${namespace}\x1b[0m`
      : `  ${namespace}`;
  const suffixOpen = color !== undefined ? `\x1b[3${color}m` : "";
  const suffixClose = color !== undefined ? `\x1b[0m` : "";
  let prev = 0;

  const logger = (format: unknown, ...args: unknown[]): void => {
    const now = Date.now();
    const diff = prev === 0 ? 0 : now - prev;
    prev = now;

    const body =
      args.length === 0 && typeof format === "string"
        ? format
        : formatWithOptions({ colors }, format, ...args);

    process.stderr.write(
      `${prefix} ${body} ${suffixOpen}+${diff}ms${suffixClose}\n`,
    );
  };

  return Object.assign(logger, { enabled: true });
}
