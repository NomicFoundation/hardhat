import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTable, divider } from "../src/format.js";

describe("format", () => {
  describe("formatTable", () => {
    it("Should create a basic table with a single divider", () => {
      const rows = [
        ["Name", "Age", "City"],
        divider,
        ["Alice", "25", "New York"],
        ["Bob", "30", "London"],
      ];
      const result = formatTable(rows);

      assert.equal(
        result,
        `
| Name  | Age | City     |
| ----- | --- | -------- |
| Alice | 25  | New York |
| Bob   | 30  | London   |`.trim(),
      );
    });

    it("Should create a table without dividers", () => {
      const rows = [
        ["Alice", "25", "New York"],
        ["Bob", "30", "London"],
      ];
      const result = formatTable(rows);

      assert.equal(
        result,
        `
| Alice | 25 | New York |
| Bob   | 30 | London   |`.trim(),
      );
    });

    it("Should create a table with multiple dividers", () => {
      const rows = [
        ["Name", "Age"],
        divider,
        ["Alice", "25"],
        ["Bob", "30"],
        divider,
        ["Total", "55"],
      ];
      const result = formatTable(rows);

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

    it("Should handle varying column widths", () => {
      const rows = [
        ["A", "Very Long Header", "C"],
        divider,
        ["Short", "B", "Very Long Content"],
        ["X", "Y", "Z"],
      ];
      const result = formatTable(rows);

      assert.equal(
        result,
        `
| A     | Very Long Header | C                 |
| ----- | ---------------- | ----------------- |
| Short | B                | Very Long Content |
| X     | Y                | Z                 |`.trim(),
      );
    });

    it("Should handle rows with different lengths", () => {
      const rows = [
        ["A", "B", "C", "D"],
        divider,
        ["1", "2"],
        ["3", "4", "5"],
        ["6", "7", "8", "9"],
      ];
      const result = formatTable(rows);

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
      const rows = [["Items"], divider, ["Apple"], ["Banana"], ["Cherry"]];
      const result = formatTable(rows);

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
      const rows = [
        ["Name", "Value"],
        divider,
        ["", "123"],
        ["Test", ""],
        ["", ""],
      ];
      const result = formatTable(rows);

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
      const rows = [
        ["Status", "Message"],
        divider,
        ["\u001b[32mPASS\u001b[0m", "Test passed"],
        ["\u001b[31mFAIL\u001b[0m", "Test failed"],
      ];
      const result = formatTable(rows);

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
      const result = formatTable(rows);

      assert.equal(
        result,
        `
| Normal | \u001b[1mBold\u001b[0m  | Regular   |
| \u001b[33mYellow\u001b[0m | Plain | \u001b[4mUnderline\u001b[0m |`.trim(),
      );
    });
  });
});
