import type { Response } from "@nomicfoundation/edr";

import chalk from "chalk";
import debug from "debug";

import { formatTraces } from "./trace-formatters.js";

const log = debug("hardhat:core:hardhat-network:provider");

// Rotating palette for per-connection coloring of trace headers.
const LABEL_COLORS: Array<(text: string) => string> = [
  chalk.cyan,
  chalk.magenta,
  chalk.blueBright,
  chalk.yellowBright,
  chalk.cyanBright,
  chalk.magentaBright,
];

// Keyed by `network name` (not connection label) so the map stays bounded
// by the number of distinct networks, not the number of connections.
const networkColorMap = new Map<string, (text: string) => string>();

// These methods run a simulation before the actual transaction. We skip
// their traces on success to avoid duplicates, but still show them on
// failure since the real transaction won't be sent.
const TRACE_SUPPRESSED_METHODS = new Set(["eth_estimateGas"]);

// Bounded set: receipt-polling deduplication only needs a small window.
// Once the cap is reached the set is cleared so memory stays bounded
// in long-running nodes.
const TRACED_TX_HASHES_CAP = 1024;

/**
 * Manages trace output formatting, deduplication, and coloring for a single
 * provider connection.
 */
export class TraceOutputManager {
  readonly #printLineFn: (line: string) => void;
  readonly #connectionLabel: string;
  readonly #labelColor: (text: string) => string;
  readonly #verbosity: number;
  readonly #tracedTxHashes = new Set<string>();

  constructor(
    printLineFn: (line: string) => void,
    connectionId: number,
    networkName: string,
    verbosity: number,
  ) {
    this.#printLineFn = printLineFn;
    this.#connectionLabel = `connection #${connectionId} (${networkName})`;
    this.#labelColor = this.#colorForNetwork(networkName);
    this.#verbosity = verbosity;
  }

  /**
   * Output call traces from an EDR response, applying deduplication and
   * suppression rules based on the verbosity level.
   */
  public outputCallTraces(
    edrResponse: Response,
    method: string,
    txHash: string | undefined,
    failed: boolean,
  ): void {
    try {
      // At verbosity < 5, suppress simulation-only methods on success and
      // deduplicate traces for the same transaction. At verbosity >= 5
      // (#showAllTraces), every RPC call with traces is shown.

      if (this.#verbosity < 5) {
        // Skip successful simulation-only methods, their trace will appear
        // again in the subsequent eth_sendTransaction. Failed simulations
        // are shown because the sendTransaction may never happen.
        if (!failed && TRACE_SUPPRESSED_METHODS.has(method)) {
          return;
        }

        // Dedup: skip if we already traced this transaction.
        // Prevents the same tx appearing multiple times from receipt polling.
        if (txHash !== undefined && this.#tracedTxHashes.has(txHash)) {
          return;
        }
      }

      const rawTraces = edrResponse.callTraces();

      // EDR returns duplicate traces for eth_estimateGas, take only the first.
      const callTraces =
        TRACE_SUPPRESSED_METHODS.has(method) && rawTraces.length > 1
          ? [rawTraces[0]]
          : rawTraces;

      if (callTraces.length === 0) {
        return;
      }

      if (txHash !== undefined) {
        if (this.#tracedTxHashes.size >= TRACED_TX_HASHES_CAP) {
          this.#tracedTxHashes.clear();
        }

        this.#tracedTxHashes.add(txHash);
      }

      const coloredLabel = this.#labelColor(this.#connectionLabel);
      const prefix = callTraces.length > 1 ? "Traces from" : "Trace from";
      const coloredPrefix = this.#labelColor(prefix);
      const styledMethod = failed ? chalk.red(method) : chalk.dim(method);
      const header = `${coloredPrefix} ${coloredLabel}: ${styledMethod}`;

      this.#printLineFn(`${header}\n${formatTraces(callTraces, "  ", chalk)}`);
    } catch (e) {
      log("Failed to get call traces: %O", e);
    }
  }

  /**
   * Clear the dedup set (e.g. on snapshot revert so replayed txs are traced again).
   */
  public clearTracedHashes(): void {
    this.#tracedTxHashes.clear();
  }

  #colorForNetwork(networkName: string): (text: string) => string {
    let color = networkColorMap.get(networkName);

    if (color === undefined) {
      const index = networkColorMap.size % LABEL_COLORS.length;
      color = LABEL_COLORS[index];
      networkColorMap.set(networkName, color);
    }

    return color;
  }
}
