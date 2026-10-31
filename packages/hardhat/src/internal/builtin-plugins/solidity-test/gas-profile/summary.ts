import type { TestProfile, UnprofiledTest } from "./model.js";
import type { TableItem } from "@nomicfoundation/hardhat-utils/format";

import { styleText } from "node:util";

import { formatTable } from "@nomicfoundation/hardhat-utils/format";

import { formatGas, plural, share, times } from "./model.js";

const TOP = 5;

/** Names in the tables are cut to this many characters. */
const MAX_NAME_LENGTH = 60;

export const ISOLATION_NOTE =
  "Isolation is on: top-level call gas includes each call's transaction cost.";

/**
 * The terminal summary: the heaviest tests and functions, the hottest paths,
 * notes, and the tests that weren't profiled. `profiles` is sorted by gas.
 */
export function renderSummary(
  profiles: TestProfile[],
  unprofiled: UnprofiledTest[],
  isolation: boolean,
): string {
  const lines: string[] = [];
  const shown = profiles.slice(0, TOP);

  if (shown.length > 0) {
    const table: TableItem[] = [
      { type: "title", text: styleText("bold", "Gas profile") },
      {
        type: "section-header",
        text: `Tests by gas (top ${shown.length} of ${profiles.length})`,
      },
      header(["Test", "Result", "Test gas", "Heaviest call", "Share"]),
    ];
    for (const t of shown) {
      const heaviest = t.root.children.find((c) => c.role !== "group");
      table.push({
        type: "row",
        cells: [
          shorten(t.fullName),
          t.outcome === "failed" ? "FAILED" : t.outcome,
          formatGas(t.testGas),
          heaviest === undefined
            ? "–"
            : shorten(heaviest.name) + times(heaviest),
          heaviest === undefined ? "" : share(heaviest.total, t.executed),
        ],
      });
    }

    const byFunction = new Map<
      string,
      { self: number; calls: number; tests: number }
    >();
    let allSelf = 0;
    for (const t of profiles) {
      for (const row of t.table) {
        const entry = byFunction.get(row.name) ?? {
          self: 0,
          calls: 0,
          tests: 0,
        };
        entry.self += row.self;
        entry.calls += row.calls;
        entry.tests += 1;
        byFunction.set(row.name, entry);
        allSelf += row.self;
      }
    }
    table.push(
      {
        type: "section-header",
        text: `Functions by self gas (top ${Math.min(TOP, byFunction.size)} of ${byFunction.size}, share of all profiled gas)`,
      },
      header(["Function", "Self gas", "Share", "Calls", "Tests"]),
    );
    const topFunctions = [...byFunction.entries()]
      .sort((a, b) =>
        b[1].self !== a[1].self
          ? b[1].self - a[1].self
          : a[0].localeCompare(b[0]),
      )
      .slice(0, TOP);
    for (const [name, entry] of topFunctions) {
      table.push({
        type: "row",
        cells: [
          shorten(name),
          formatGas(entry.self),
          share(entry.self, allSelf),
          formatGas(entry.calls),
          formatGas(entry.tests),
        ],
      });
    }
    lines.push(formatTable(table));

    const hot = shown.filter((t) => t.hottest.length >= 2);
    if (hot.length > 0) {
      const width = hot.reduce(
        (w, t) => Math.max(w, shorten(t.fullName).length),
        0,
      );
      lines.push("", "  Hottest paths (share of the test's executed gas):");
      for (const t of hot) {
        const steps = t.hottest
          .map(
            (f) =>
              `${shorten(f.name)}${times(f)} ${share(f.total, t.executed)}`,
          )
          .join(" → ");
        lines.push(`  ${shorten(t.fullName).padEnd(width)}  ${steps}`);
      }
    }

    lines.push("", ...notes(profiles, isolation).map((note) => `  ${note}`));
  }

  if (unprofiled.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }
    lines.push(`  Not profiled (${plural(unprofiled.length, "test")}):`);
    for (const t of unprofiled) {
      lines.push(`  ${shorten(t.fullName)}: ${t.reason}`);
    }
  }

  return lines.join("\n");
}

function notes(profiles: TestProfile[], isolation: boolean): string[] {
  const list: string[] = [];
  if (isolation) {
    list.push(ISOLATION_NOTE);
  }
  list.push(
    "Internal functions count as the caller's self gas. Refunds aren't attributed to any call.",
    "Folded stacks write %, ;, tabs and line breaks in names as %xx (their hex code).",
  );
  if (profiles.some((t) => t.dropped.length > 0)) {
    list.push("Cheatcode and console.log calls cost no gas and aren't shown.");
  }
  const clamped = profiles.reduce((n, t) => n + t.clamped.length, 0);
  if (clamped > 0) {
    list.push(
      `Warning: ${plural(clamped, "frame")} reported less gas than their calls; their self gas is shown as 0.`,
    );
  }
  const unaccounted = profiles.filter((t) => t.unaccounted > 0);
  if (unaccounted.length > 0) {
    const tests = unaccounted
      .map((t) => `${shorten(t.fullName)} (+${formatGas(t.unaccounted)})`)
      .join(", ");
    list.push(
      `Warning: the test gas is higher than the trace's gas for ${tests}; the difference isn't attributed to any call.`,
    );
  }
  return list;
}

/** Cuts a long name to fit the terminal; the folded files keep it whole. */
export function shorten(name: string): string {
  const chars = [...name];
  return chars.length > MAX_NAME_LENGTH
    ? `${chars.slice(0, MAX_NAME_LENGTH - 1).join("")}…`
    : name;
}

function header(cells: string[]): TableItem {
  return { type: "header", cells: cells.map((c) => styleText("yellow", c)) };
}
