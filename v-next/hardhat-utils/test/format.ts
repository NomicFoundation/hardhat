import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { formatTable } from "../src/format.js";

describe("format", () => {
  describe("formatTable", () => {
    it("Should return an empty string for empty items", () => {
      assert.equal(formatTable([]), "");
    });

    it("Should create a table with a title", () => {
      const result = formatTable([
        { type: "title", text: "My Title" },
      ]);

      assert.equal(
        result,
        [
          "╔══════════╗",
          "║ My Title ║",
          "╚══════════╝",
        ].join("\n"),
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

      assert.ok(
        result.includes("Very Long Header"),
        "Should contain the long header",
      );
      assert.ok(
        result.includes("Very Long Content"),
        "Should contain the long content",
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

      assert.ok(
        result.includes("\u001b[32mPASS\u001b[0m"),
        "Should contain ANSI-styled PASS",
      );
      assert.ok(
        result.includes("\u001b[31mFAIL\u001b[0m"),
        "Should contain ANSI-styled FAIL",
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

      assert.ok(
        result.includes("transfer"),
        "Should contain the function row",
      );
      assert.ok(
        result.includes("Deployment"),
        "Should contain the deployment header",
      );
    });
  });
});
