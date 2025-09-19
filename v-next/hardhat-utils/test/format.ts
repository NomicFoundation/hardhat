import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatMarkdownTable } from "../src/format.js";

describe("format", () => {
  describe("formatMarkdownTable", () => {
    it("Should create a basic table with header and rows", () => {
      const header = ["Name", "Age", "City"];
      const rows = [
        ["Alice", "25", "New York"],
        ["Bob", "30", "London"],
      ];
      const result = formatMarkdownTable(header, rows, undefined);

      assert.equal(
        result,
        `
| Name  | Age | City     |
| ----- | --- | -------- |
| Alice | 25  | New York |
| Bob   | 30  | London   |`.trim(),
      );
    });

    it("Should create a table without header", () => {
      const rows = [
        ["Alice", "25", "New York"],
        ["Bob", "30", "London"],
      ];
      const result = formatMarkdownTable(undefined, rows, undefined);

      assert.equal(
        result,
        `
| Alice | 25 | New York |
| Bob   | 30 | London   |`.trim(),
      );
    });

    it("Should create a table with header and footer", () => {
      const header = ["Name", "Age"];
      const rows = [
        ["Alice", "25"],
        ["Bob", "30"],
      ];
      const footer = ["Total", "55"];
      const result = formatMarkdownTable(header, rows, footer);

      assert.equal(
        result,
        `
| Name  | Age |
| ----- | --- |
| Alice | 25  |
| Bob   | 30  |
| ----- | --- |
| Total | 55  |`.trim(),
      );
    });

    it("Should create a table with only footer", () => {
      const rows = [
        ["Alice", "25"],
        ["Bob", "30"],
      ];
      const footer = ["Total", "55"];
      const result = formatMarkdownTable(undefined, rows, footer);

      assert.equal(
        result,
        `
| Alice | 25 |
| Bob   | 30 |
| ----- | -- |
| Total | 55 |`.trim(),
      );
    });

    it("Should handle varying column widths", () => {
      const header = ["A", "Very Long Header", "C"];
      const rows = [
        ["Short", "B", "Very Long Content"],
        ["X", "Y", "Z"],
      ];
      const result = formatMarkdownTable(header, rows, undefined);

      assert.equal(
        result,
        `
| A     | Very Long Header | C                 |
| ----- | ---------------- | ----------------- |
| Short | B                | Very Long Content |
| X     | Y                | Z                 |`.trim(),
      );
    });

    it("Should handle empty rows", () => {
      const header = ["A", "B", "C"];
      const rows: string[][] = [];
      const result = formatMarkdownTable(header, rows, undefined);

      assert.equal(
        result,
        `
| A | B | C |
| - | - | - |`.trim(),
      );
    });

    it("Should handle rows with different lengths", () => {
      const header = ["A", "B", "C", "D"];
      const rows = [
        ["1", "2"],
        ["3", "4", "5"],
        ["6", "7", "8", "9"],
      ];
      const result = formatMarkdownTable(header, rows, undefined);

      assert.equal(
        result,
        `
| A | B | C | D |
| - | - | - | - |
| 1 | 2 |   |   |
| 3 | 4 | 5 |   |
| 6 | 7 | 8 | 9 |`.trim(),
      );
    });

    it("Should handle single column table", () => {
      const header = ["Items"];
      const rows = [["Apple"], ["Banana"], ["Cherry"]];
      const result = formatMarkdownTable(header, rows, undefined);

      assert.equal(
        result,
        `
| Items  |
| ------ |
| Apple  |
| Banana |
| Cherry |`.trim(),
      );
    });

    it("Should handle empty strings in cells", () => {
      const header = ["Name", "Value"];
      const rows = [
        ["", "123"],
        ["Test", ""],
        ["", ""],
      ];
      const result = formatMarkdownTable(header, rows, undefined);

      assert.equal(
        result,
        `
| Name | Value |
| ---- | ----- |
|      | 123   |
| Test |       |
|      |       |`.trim(),
      );
    });

    it("Should handle ANSI escape codes in content", () => {
      const header = ["Status", "Message"];
      const rows = [
        ["\u001b[32mPASS\u001b[0m", "Test passed"],
        ["\u001b[31mFAIL\u001b[0m", "Test failed"],
      ];
      const result = formatMarkdownTable(header, rows, undefined);

      assert.equal(
        result,
        `
| Status | Message     |
| ------ | ----------- |
| \u001b[32mPASS\u001b[0m   | Test passed |
| \u001b[31mFAIL\u001b[0m   | Test failed |`.trim(),
      );
    });

    it("Should handle mixed ANSI and regular content", () => {
      const rows = [
        ["Normal", "\u001b[1mBold\u001b[0m", "Regular"],
        ["\u001b[33mYellow\u001b[0m", "Plain", "\u001b[4mUnderline\u001b[0m"],
      ];
      const result = formatMarkdownTable(undefined, rows, undefined);

      assert.equal(
        result,
        `
| Normal | \u001b[1mBold\u001b[0m  | Regular   |
| \u001b[33mYellow\u001b[0m | Plain | \u001b[4mUnderline\u001b[0m |`.trim(),
      );
    });
  });
});
