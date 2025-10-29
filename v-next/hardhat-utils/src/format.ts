import { getStringWidth } from "./internal/format.js";

export type TableRow = string[];
export interface TableDivider {
  type: "divider";
}
export type TableItem = TableRow | TableDivider;

export const divider: TableDivider = { type: "divider" };

/**
 * Formats an array of rows and dividers into a table string.
 *
 * @param items An array of table rows (string arrays) and dividers.
 * Dividers are objects with type: "divider" and will be rendered as table dividers.
 * @returns The formatted table as a string, ready to be rendered.
 *
 * @example
 * ```ts
 * formatTable([
 *   ["Name", "Age"],
 *   divider,
 *   ["Alice", "30"],
 *   ["Bob", "25"],
 *   divider,
 *   ["Average", "27.5"]
 * ]);
 *
 * // =>
 * // | Name    | Age  |
 * // | ------- | ---- |
 * // | Alice   | 30   |
 * // | Bob     | 25   |
 * // | ------- | ---- |
 * // | Average | 27.5 |
 * ```
 */
export function formatTable(items: TableItem[]): string {
  const widths: number[] = [];
  const dataRows: string[][] = [];

  for (const item of items) {
    if (Array.isArray(item)) {
      dataRows.push([...item]);
    }
  }

  // Calculate maximum width for each column
  for (const row of dataRows) {
    for (let i = 0; i < row.length; i++) {
      while (i >= widths.length) {
        widths.push(0);
      }
      widths[i] = Math.max(widths[i], getStringWidth(row[i]));
    }
  }

  const dividerRow = widths.map((width) => "-".repeat(width));
  const outputRows: string[][] = [];

  for (const item of items) {
    if (Array.isArray(item)) {
      const row = [...item];
      // Pad the row to match the number of columns
      while (row.length < widths.length) {
        row.push("");
      }
      outputRows.push(row);
    } else {
      outputRows.push([...dividerRow]);
    }
  }

  outputRows.forEach((row) => {
    for (let i = 0; i < row.length; i++) {
      const displayWidth = getStringWidth(row[i]);
      const actualLength = row[i].length;
      // Adjust padding to account for difference between display width and actual length
      row[i] = row[i].padEnd(widths[i] + actualLength - displayWidth);
    }
  });

  return outputRows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}
