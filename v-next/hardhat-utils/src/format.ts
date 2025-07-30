import stringWidth from "string-width";

export function formatMarkdownTable(
  headerRow: string[] | undefined,
  rows: string[][],
  footerRow: string[] | undefined,
): string {
  const widths: number[] = [];

  const allRows = [];
  if (headerRow !== undefined) {
    allRows.push(headerRow);
  }

  for (const row of rows) {
    allRows.push(row);
  }

  if (footerRow !== undefined) {
    allRows.push(footerRow);
  }

  for (const row of allRows) {
    for (let i = 0; i < row.length; i++) {
      while (i >= widths.length) {
        widths.push(0);
      }
      widths[i] = Math.max(widths[i], stringWidth(row[i]));
    }
  }

  for (const row of allRows) {
    while (row.length < widths.length) {
      row.push("");
    }
  }

  const dividerRow = widths.map((width) => "-".repeat(width));

  if (headerRow !== undefined) {
    rows.unshift(dividerRow);
    rows.unshift(headerRow);
  }

  if (footerRow !== undefined) {
    rows.push(dividerRow);
    rows.push(footerRow);
  }

  rows.forEach((row) => {
    for (let i = 0; i < row.length; i++) {
      row[i] = row[i].padEnd(widths[i] + row[i].length - stringWidth(row[i]));
    }
  });

  return rows.map((row) => `| ${row.join(" | ")} |`).join("\n");
}
