import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTable } from "../src/format.js";

describe("format", () => {
  describe("formatTable", () => {
    it("Should return an empty string for empty items", () => {
      assert.equal(formatTable([]), "");
    });

    it("Should create a table with a title", () => {
      const result = formatTable([{ type: "title", text: "My Title" }]);

      assert.equal(
        result,
        ["╔══════════╗", "║ My Title ║", "╚══════════╝"].join("\n"),
      );
    });

    it("Should create a table with a section header, header, and rows", () => {
      const result = formatTable([
        { type: "section-header", text: "User Data" },
        { type: "header", cells: ["Name", "Age"] },
        { type: "row", cells: ["Alice", "30"] },
        { type: "row", cells: ["Bob", "25"] },
      ]);

      assert.equal(
        result,
        [
          "╔═════════════╗",
          "║ User Data   ║",
          "╟───────┬─────╢",
          "║ Name  │ Age ║",
          "╟───────┼─────╢",
          "║ Alice │ 30  ║",
          "║ Bob   │ 25  ║",
          "╚═══════╧═════╝",
        ].join("\n"),
      );
    });

    it("Should create a table with title, section header, header, and rows", () => {
      const result = formatTable([
        { type: "title", text: "My Table" },
        { type: "section-header", text: "User Data" },
        { type: "header", cells: ["Name", "Age", "City"] },
        { type: "row", cells: ["Alice", "30", "NYC"] },
        { type: "row", cells: ["Bob", "25", "LA"] },
      ]);

      assert.equal(
        result,
        [
          "╔════════════════════╗",
          "║      My Table      ║",
          "╚════════════════════╝",
          "╔════════════════════╗",
          "║ User Data          ║",
          "╟───────┬─────┬──────╢",
          "║ Name  │ Age │ City ║",
          "╟───────┼─────┼──────╢",
          "║ Alice │ 30  │ NYC  ║",
          "║ Bob   │ 25  │ LA   ║",
          "╚═══════╧═════╧══════╝",
        ].join("\n"),
      );
    });

    it("Should handle multiple sections", () => {
      const result = formatTable([
        { type: "section-header", text: "Section A" },
        { type: "header", cells: ["Name", "Value"] },
        { type: "row", cells: ["x", "1"] },
        { type: "section-header", text: "Section B" },
        { type: "header", cells: ["Name", "Value"] },
        { type: "row", cells: ["y", "2"] },
      ]);

      assert.equal(
        result,
        [
          "╔══════════════╗",
          "║ Section A    ║",
          "╟──────┬───────╢",
          "║ Name │ Value ║",
          "╟──────┼───────╢",
          "║ x    │ 1     ║",
          "╚══════╧═══════╝",
          "╔══════════════╗",
          "║ Section B    ║",
          "╟──────┬───────╢",
          "║ Name │ Value ║",
          "╟──────┼───────╢",
          "║ y    │ 2     ║",
          "╚══════╧═══════╝",
        ].join("\n"),
      );
    });

    it("Should handle varying column widths", () => {
      const result = formatTable([
        { type: "section-header", text: "Data" },
        { type: "header", cells: ["A", "Very Long Header", "C"] },
        { type: "row", cells: ["Short", "B", "Very Long Content"] },
        { type: "row", cells: ["X", "Y", "Z"] },
      ]);

      assert.equal(
        result,
        [
          "╔══════════════════════════════════════════════╗",
          "║ Data                                         ║",
          "╟───────┬──────────────────┬───────────────────╢",
          "║ A     │ Very Long Header │ C                 ║",
          "╟───────┼──────────────────┼───────────────────╢",
          "║ Short │ B                │ Very Long Content ║",
          "║ X     │ Y                │ Z                 ║",
          "╚═══════╧══════════════════╧═══════════════════╝",
        ].join("\n"),
      );
    });

    it("Should handle ANSI escape codes in content", () => {
      const result = formatTable([
        { type: "section-header", text: "Status" },
        { type: "header", cells: ["Result", "Message"] },
        {
          type: "row",
          cells: ["\u001b[32mPASS\u001b[0m", "Test passed"],
        },
        {
          type: "row",
          cells: ["\u001b[31mFAIL\u001b[0m", "Test failed"],
        },
      ]);

      assert.equal(
        result,
        [
          "╔══════════════════════╗",
          "║ Status               ║",
          "╟────────┬─────────────╢",
          "║ Result │ Message     ║",
          "╟────────┼─────────────╢",
          "║ \u001b[32mPASS\u001b[0m   │ Test passed ║",
          "║ \u001b[31mFAIL\u001b[0m   │ Test failed ║",
          "╚════════╧═════════════╝",
        ].join("\n"),
      );
    });

    it("Should handle headers with different cell counts", () => {
      const result = formatTable([
        { type: "section-header", text: "Contract" },
        {
          type: "header",
          cells: ["Function", "Min", "Max", "Avg", "Calls"],
        },
        { type: "row", cells: ["transfer", "21000", "42000", "31500", "10"] },
        { type: "header", cells: ["Deployment", "Cost"] },
        { type: "row", cells: ["12345", "567"] },
      ]);

      assert.equal(
        result,
        [
          "╔════════════════════════════════════════════╗",
          "║ Contract                                   ║",
          "╟────────────┬───────┬───────┬───────┬───────╢",
          "║ Function   │ Min   │ Max   │ Avg   │ Calls ║",
          "╟────────────┼───────┼───────┼───────┼───────╢",
          "║ transfer   │ 21000 │ 42000 │ 31500 │ 10    ║",
          "╟────────────┼───────┼───────┴───────┴───────╢",
          "║ Deployment │ Cost  │                       ║",
          "╟────────────┼───────┤                       ║",
          "║ 12345      │ 567   │                       ║",
          "╚════════════╧═══════╧═══════════════════════╝",
        ].join("\n"),
      );
    });

    it("Should handle a single column", () => {
      const result = formatTable([
        { type: "section-header", text: "Items" },
        { type: "header", cells: ["Name"] },
        { type: "row", cells: ["Apple"] },
        { type: "row", cells: ["Banana"] },
        { type: "row", cells: ["Cherry"] },
      ]);

      assert.equal(
        result,
        [
          "╔════════╗",
          "║ Items  ║",
          "╟────────╢",
          "║ Name   ║",
          "╟────────╢",
          "║ Apple  ║",
          "║ Banana ║",
          "║ Cherry ║",
          "╚════════╝",
        ].join("\n"),
      );
    });

    it("Should handle empty strings in cells", () => {
      const result = formatTable([
        { type: "section-header", text: "Data" },
        { type: "header", cells: ["Name", "Value"] },
        { type: "row", cells: ["", "123"] },
        { type: "row", cells: ["Test", ""] },
        { type: "row", cells: ["", ""] },
      ]);

      assert.equal(
        result,
        [
          "╔══════════════╗",
          "║ Data         ║",
          "╟──────┬───────╢",
          "║ Name │ Value ║",
          "╟──────┼───────╢",
          "║      │ 123   ║",
          "║ Test │       ║",
          "║      │       ║",
          "╚══════╧═══════╝",
        ].join("\n"),
      );
    });

    it("Should expand last column when section header is wider than content", () => {
      const result = formatTable([
        { type: "section-header", text: "A Very Wide Section Header" },
        { type: "header", cells: ["A", "B"] },
        { type: "row", cells: ["1", "2"] },
      ]);

      assert.equal(
        result,
        [
          "╔════════════════════════════╗",
          "║ A Very Wide Section Header ║",
          "╟───┬────────────────────────╢",
          "║ A │ B                      ║",
          "╟───┼────────────────────────╢",
          "║ 1 │ 2                      ║",
          "╚═══╧════════════════════════╝",
        ].join("\n"),
      );
    });

    it("Should close a section when a title appears mid-table", () => {
      const result = formatTable([
        { type: "section-header", text: "Section A" },
        { type: "header", cells: ["X", "Y"] },
        { type: "row", cells: ["1", "2"] },
        { type: "title", text: "Break" },
        { type: "section-header", text: "Section B" },
        { type: "header", cells: ["X", "Y"] },
        { type: "row", cells: ["3", "4"] },
      ]);

      assert.equal(
        result,
        [
          "╔═══════════╗",
          "║ Section A ║",
          "╟───┬───────╢",
          "║ X │ Y     ║",
          "╟───┼───────╢",
          "║ 1 │ 2     ║",
          "╚═══╧═══════╝",
          "╔═══════════╗",
          "║   Break   ║",
          "╚═══════════╝",
          "╔═══════════╗",
          "║ Section B ║",
          "╟───┬───────╢",
          "║ X │ Y     ║",
          "╟───┼───────╢",
          "║ 3 │ 4     ║",
          "╚═══╧═══════╝",
        ].join("\n"),
      );
    });
  });
});
