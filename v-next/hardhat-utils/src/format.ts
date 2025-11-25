import {
  getColumnWidths,
  getContentWidth,
  getHeadingWidth,
  getStringWidth,
  renderContentLine,
  renderHeaderOpen,
  renderRowSeparator,
  renderSectionClose,
} from "./internal/format.js";

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

export interface TableTitleV2 {
  type: "title";
  text: string;
}

export interface TableSectionHeaderV2 {
  type: "section-header";
  text: string;
}

export interface TableHeaderV2 {
  type: "header";
  cells: string[];
}

export interface TableRowV2 {
  type: "row";
  cells: string[];
}

export type TableItemV2 =
  | TableTitleV2
  | TableSectionHeaderV2
  | TableHeaderV2
  | TableRowV2;

/**
 * Formats an array of titles, section headers, headers, and rows into a table
 * string with box-drawing characters.
 *
 * Features:
 * - Titles are centered in a standalone box with double borders (╔═╗)
 * - Section headers group related content with automatic closing
 * - Headers and rows can have different numbers of cells
 * - Rows with fewer cells than max columns are handled with special rendering
 *
 * @param items An array of table items (titles, section headers, headers, and rows).
 * Sections are automatically closed when a new section-header or title appears, or
 * at the end of the table.
 * @returns The formatted table as a string, ready to be rendered.
 *
 * @example
 * ```ts
 * formatTableV2([
 *   { type: "title", text: "My Table" },
 *   { type: "section-header", text: "User Data" },
 *   { type: "header", cells: ["Name", "Age", "City"] },
 *   { type: "row", cells: ["Alice", "30", "NYC"] },
 *   { type: "row", cells: ["Bob", "25", "LA"] },
 *   { type: "section-header", text: "Summary" },
 *   { type: "header", cells: ["Total", "Count"] },
 *   { type: "row", cells: ["55", "2"] }
 * ]);
 *
 * // =>
 * // ╔═══════════════════╗
 * // ║     My Table      ║
 * // ╚═══════════════════╝
 * // ╔═══════════════════╗
 * // ║ User Data         ║
 * // ╟───────┬─────┬─────╢
 * // ║ Name  │ Age │ City║
 * // ╟───────┼─────┼─────╢
 * // ║ Alice │ 30  │ NYC ║
 * // ╟───────┼─────┼─────╢
 * // ║ Bob   │ 25  │ LA  ║
 * // ╚═══════╧═════╧═════╝
 * // ╔═══════════════════╗
 * // ║ Summary           ║
 * // ╟───────┬───────────╢
 * // ║ Total │ Count     ║
 * // ╟───────┼───────────╢
 * // ║ 55    │ 2         ║
 * // ╚═══════╧═══════════╝
 * ```
 */
export function formatTableV2(items: TableItemV2[]): string {
  if (items.length === 0) {
    return "";
  }

  const columnWidths = getColumnWidths(items);
  const contentWidth = getContentWidth(columnWidths);
  const headingWidth = getHeadingWidth(items);

  // If heading is wider than content, expand last column to fit
  if (headingWidth > contentWidth && columnWidths.length > 0) {
    const extraSpace = headingWidth - contentWidth;
    columnWidths[columnWidths.length - 1] += extraSpace;
  }

  const tableWidth = Math.max(contentWidth, headingWidth);

  const lines: string[] = [];
  let previousCellCount = 0; // Keep track of previous row/header cell count
  let inSection = false;

  for (let i = 0; i < items.length; i++) {
    const [previous, current] = [items[i - 1], items[i]];

    if (current.type === "title") {
      if (inSection) {
        lines.push(renderSectionClose(columnWidths, previousCellCount));
        inSection = false;
      }

      lines.push("╔" + "═".repeat(tableWidth) + "╗");
      const titleDisplayWidth = getStringWidth(current.text);
      const titleActualLength = current.text.length;
      const centeredTitle = current.text
        .padStart(
          (tableWidth + titleDisplayWidth) / 2 +
            (titleActualLength - titleDisplayWidth),
        )
        .padEnd(tableWidth + (titleActualLength - titleDisplayWidth));
      lines.push("║" + centeredTitle + "║");
      lines.push("╚" + "═".repeat(tableWidth) + "╝");
    } else if (current.type === "section-header") {
      if (inSection) {
        lines.push(renderSectionClose(columnWidths, previousCellCount));
      }

      lines.push("╔" + "═".repeat(tableWidth) + "╗");
      const headerDisplayWidth = getStringWidth(current.text);
      const headerActualLength = current.text.length;
      const paddedHeader = current.text.padEnd(
        tableWidth - 2 + (headerActualLength - headerDisplayWidth),
      );
      lines.push("║ " + paddedHeader + " ║");
      inSection = true;
    } else if (current.type === "header") {
      const currentCellCount = current.cells.length;
      const innerJoiner =
        previous !== undefined && previous.type === "section-header"
          ? "┬"
          : "┼";
      const needsTransition =
        previous !== undefined &&
        previous.type !== "section-header" &&
        currentCellCount < previousCellCount;

      lines.push(
        renderHeaderOpen(
          columnWidths,
          currentCellCount,
          innerJoiner,
          needsTransition,
        ),
      );
      lines.push(
        renderContentLine(current.cells, columnWidths, currentCellCount),
      );
      previousCellCount = currentCellCount;
    } else if (current.type === "row") {
      const currentCellCount = current.cells.length;

      // Only add separator if previous wasn't a row
      if (previous === undefined || previous.type !== "row") {
        lines.push(renderRowSeparator(columnWidths, currentCellCount));
      }
      lines.push(
        renderContentLine(current.cells, columnWidths, currentCellCount),
      );
      previousCellCount = currentCellCount;
    }
  }

  if (inSection) {
    lines.push(renderSectionClose(columnWidths, previousCellCount));
  }

  return lines.join("\n");
}
