import type { TableItemV2 } from "../format.js";

/**
 * Calculate the display width of a string by removing ANSI escape codes.
 *
 * NOTE: This implementation only removes basic ANSI color/style codes and may
 * not handle all escape sequences (e.g., cursor movement, complex control
 * sequences).
 */
export function getStringWidth(str: string): number {
  // Remove ANSI escape codes if present
  const stripped = str.replace(/\u001b\[[0-9;]*m/g, "");
  return stripped.length;
}

/**
 * Calculates the minimum width needed by each column in the table
 * to fit its content (accounting for ANSI color codes).
 */
export function getColumnWidths(items: TableItemV2[]): number[] {
  const columnWidths: number[] = [];

  for (const item of items) {
    if (item.type === "row" || item.type === "header") {
      item.cells.forEach((cell, i) => {
        columnWidths[i] = Math.max(columnWidths[i] ?? 0, getStringWidth(cell));
      });
    }
  }

  return columnWidths;
}

/**
 * Calculates the inner width needed to fit the rows and headers
 * (excludes borders, which are added during rendering).
 *
 * Each column is padded by 1 space on each side, and columns are
 * separated by " │ " (3 spaces).
 */
export function getContentWidth(columnWidths: number[]): number {
  return (
    columnWidths.reduce((sum, w) => sum + w, 0) +
    (columnWidths.length - 1) * 3 +
    2
  );
}

/**
 * Calculates the inner width needed to fit titles and section headers
 * (excludes borders, which are added during rendering).
 *
 * Each title/header is padded by 1 space on each side.
 * Accounts for ANSI color codes.
 */
export function getHeadingWidth(items: TableItemV2[]): number {
  let headingWidth = 0;
  for (const item of items) {
    if (item.type === "section-header" || item.type === "title") {
      headingWidth = Math.max(headingWidth, getStringWidth(item.text) + 2);
    }
  }
  return headingWidth;
}

/**
 * Calculates the width needed for unused columns when a row/header has fewer
 * cells than the total column count (e.g., if table has 6 columns but row
 * only has 2 cells, calculates space for the remaining 4 columns).
 */
export function getUnusedColumnsWidth(
  columnWidths: number[],
  previousCellCount: number,
): number {
  const remainingWidths = columnWidths.slice(previousCellCount);
  return remainingWidths.reduce((sum, w) => sum + w + 3, 0) - 3;
}

/**
 * Renders a horizontal rule segment by repeating a character for each column
 * with padding, joined by a separator (e.g., "─────┼─────┼─────").
 */
export function renderRuleSegment(
  columnWidths: number[],
  char: string,
  joiner: string,
): string {
  return columnWidths.map((w) => char.repeat(w + 2)).join(joiner);
}

/**
 * Renders a complete horizontal rule with left and right borders
 * (e.g., "╟─────┼─────┼─────╢").
 */
export function renderHorizontalRule(
  leftBorder: string,
  columnWidths: number[],
  char: string,
  joiner: string,
  rightBorder: string,
): string {
  return (
    leftBorder + renderRuleSegment(columnWidths, char, joiner) + rightBorder
  );
}

/**
 * Renders a content line containing cells from either a header or row.
 *
 * Handles two cases:
 * - Full width: When all columns are used, cells are separated by " │ " and
 *   line ends with " ║" (e.g., "║ cell1 │ cell2 │ cell3 ║")
 * - Short line: When fewer columns are used, active cells are followed by
 *   " │ " and empty space, ending with "║" (e.g., "║ cell1 │ cell2 │       ║")
 *
 * Accounts for ANSI color codes when padding cells.
 */
export function renderContentLine(
  cells: string[],
  columnWidths: number[],
  currentCellCount: number,
): string {
  if (currentCellCount === columnWidths.length) {
    return (
      "║ " +
      cells
        .map((cell, j) => {
          const displayWidth = getStringWidth(cell);
          const actualLength = cell.length;
          // Adjust padding to account for ANSI escape codes
          return cell.padEnd(columnWidths[j] + actualLength - displayWidth);
        })
        .join(" │ ") +
      " ║"
    );
  } else {
    const usedWidths = columnWidths.slice(0, currentCellCount);
    const remainingWidth = getUnusedColumnsWidth(
      columnWidths,
      currentCellCount,
    );
    return (
      "║ " +
      cells
        .map((cell, j) => {
          const displayWidth = getStringWidth(cell);
          const actualLength = cell.length;
          // Adjust padding to account for ANSI escape codes
          return cell.padEnd(usedWidths[j] + actualLength - displayWidth);
        })
        .join(" │ ") +
      " │ " +
      " ".repeat(remainingWidth + 1) +
      "║"
    );
  }
}

/**
 * Renders the horizontal rule that appears above a header row.
 *
 * Handles three cases:
 * - Transition rule: When going from more columns to fewer, shows ┴ marks
 *   where columns collapse (e.g., "╟───┼───┼───┴───┴───╢")
 * - Full width: When header uses all columns (e.g., "╟───┬───┬───╢" or "╟───┼───┼───╢")
 * - Short header: When header uses fewer columns than max (e.g., "╟───┬─────────╢")
 *
 * The innerJoiner determines the separator character: ┬ after section-header, ┼ otherwise.
 */
export function renderHeaderOpen(
  columnWidths: number[],
  currentCellCount: number,
  innerJoiner: string,
  needsTransition: boolean,
): string {
  if (needsTransition) {
    const usedWidths = columnWidths.slice(0, currentCellCount);
    const collapsingWidths = columnWidths.slice(currentCellCount);
    return (
      "╟" +
      renderRuleSegment(usedWidths, "─", "┼") +
      "┼" +
      renderRuleSegment(collapsingWidths, "─", "┴") +
      "╢"
    );
  } else if (currentCellCount === columnWidths.length) {
    return renderHorizontalRule("╟", columnWidths, "─", innerJoiner, "╢");
  } else {
    const usedWidths = columnWidths.slice(0, currentCellCount);
    const remainingWidth = getUnusedColumnsWidth(
      columnWidths,
      currentCellCount,
    );
    return (
      "╟" +
      renderRuleSegment(usedWidths, "─", innerJoiner) +
      innerJoiner +
      "─".repeat(remainingWidth + 2) +
      "╢"
    );
  }
}

/**
 * Renders the horizontal rule that appears above a row.
 *
 * Handles two cases:
 * - Full width: When row uses all columns, renders with ┼ joiners and
 *   ends with ╢ (e.g., "╟───┼───┼───╢")
 * - Short row: When row uses fewer columns, renders active columns with
 *   ┼ joiners, ends with ┤, then fills remaining space and ends with ║
 *   (e.g., "╟───┼───┤         ║")
 */
export function renderRowSeparator(
  columnWidths: number[],
  currentCellCount: number,
): string {
  if (currentCellCount === columnWidths.length) {
    return renderHorizontalRule("╟", columnWidths, "─", "┼", "╢");
  } else {
    // Short row - ends with ┤ instead of ╢
    const usedWidths = columnWidths.slice(0, currentCellCount);
    const remainingWidth = getUnusedColumnsWidth(
      columnWidths,
      currentCellCount,
    );
    return (
      "╟" +
      renderRuleSegment(usedWidths, "─", "┼") +
      "┤" +
      " ".repeat(remainingWidth + 2) +
      "║"
    );
  }
}

/**
 * Renders the section's bottom border, placing ╧ marks under column
 * separators where the last row/header had cells (e.g., if the last row
 * looked like "║ a │ b │       ║", the bottom border would be
 *             "╚═══╧═══╧═══════╝").
 */
export function renderSectionClose(
  columnWidths: number[],
  previousCellCount: number,
): string {
  if (previousCellCount === columnWidths.length) {
    return renderHorizontalRule("╚", columnWidths, "═", "╧", "╝");
  } else {
    const usedWidths = columnWidths.slice(0, previousCellCount);
    const unusedWidth = getUnusedColumnsWidth(columnWidths, previousCellCount);
    return (
      "╚" +
      renderRuleSegment(usedWidths, "═", "╧") +
      "╧" +
      renderRuleSegment([unusedWidth], "═", "") +
      "╝"
    );
  }
}
