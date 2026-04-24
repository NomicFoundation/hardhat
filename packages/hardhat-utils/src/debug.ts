import { formatWithOptions } from "node:util";

import {
  NOOP,
  colorize,
  isEnabled,
  selectColor,
  useColors,
} from "./internal/debug.js";

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
  const prefix = colorize(`  ${namespace}`, color, true);
  let prev = 0;

  const logger = (format: unknown, ...args: unknown[]): void => {
    const now = Date.now();
    const diff = prev === 0 ? 0 : now - prev;
    prev = now;

    const body = formatWithOptions({ colors }, format, ...args);
    const suffix = colorize(`+${diff}ms`, color);

    process.stderr.write(`${prefix} ${body} ${suffix}\n`);
  };

  return Object.assign(logger, { enabled: true });
}
