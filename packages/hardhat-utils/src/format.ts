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

export interface TableTitle {
  type: "title";
  text: string;
}

export interface TableSectionHeader {
  type: "section-header";
  text: string;
}

export interface TableHeader {
  type: "header";
  cells: string[];
}

export interface TableRow {
  type: "row";
  cells: string[];
}

export type TableItem =
  | TableTitle
  | TableSectionHeader
  | TableHeader
  | TableRow;

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
 * formatTable([
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
export function formatTable(items: TableItem[]): string {
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
