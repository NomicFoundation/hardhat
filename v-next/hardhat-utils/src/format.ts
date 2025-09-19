import { getStringWidth } from "./internal/format.js";

/**
 * Formats a set of rows into a Markdown table string, with optional header and
 * footer rows.
 *
 * @param headerRow An optional row of column headers. If provided, a Markdown
 * divider row is inserted after it.
 * @param rows The main body rows of the table. Each inner array represents one
 * row.
 * @param footerRow An optional row of column footers. If provided, a Markdown
 * divider row is inserted before it.
 * @returns The formatted Markdown table as a string, ready to be rendered.
 *
 * @example
 * ```ts
 * formatMarkdownTable(
 *   ["Name", "Age"],
 *   [["Alice", "30"], ["Bob", "25"]],
 *   ["Average", "27.5"]
 * );
 *
 * // =>
 * // | Name   | Age |
 * // | ------ | --- |
 * // | Alice  | 30  |
 * // | Bob    | 25  |
 * // | ------ | --- |
 * // | Average| 27.5|
 * ```
 */
export function formatMarkdownTable(
  headerRow: string[] | undefined,
  rows: string[][],
  footerRow: string[] | undefined,
): string {
  const widths: number[] = [];

  const allRows: string[][] = [];
  if (headerRow !== undefined) {
    allRows.push([...headerRow]);
  }

  for (const row of rows) {
    allRows.push([...row]);
  }

  if (footerRow !== undefined) {
    allRows.push([...footerRow]);
  }

  // Calculate maximum width for each column
  for (const row of allRows) {
    for (let i = 0; i < row.length; i++) {
      while (i >= widths.length) {
        widths.push(0);
      }
      widths[i] = Math.max(widths[i], getStringWidth(row[i]));
    }
  }

  // Ensure all rows have the same number of columns
  for (const row of allRows) {
    while (row.length < widths.length) {
      row.push("");
    }
  }

  const dividerRow = widths.map((width) => "-".repeat(width));

  if (headerRow !== undefined) {
    allRows.splice(1, 0, dividerRow);
  }

  if (footerRow !== undefined) {
    allRows.splice(allRows.length - 1, 0, dividerRow);
  }

  allRows.forEach((row) => {
    for (let i = 0; i < row.length; i++) {
      const displayWidth = getStringWidth(row[i]);
      const actualLength = row[i].length;
      // Adjust padding to account for difference between display width and actual length
      row[i] = row[i].padEnd(widths[i] + actualLength - displayWidth);
    }
  });

  return allRows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}
